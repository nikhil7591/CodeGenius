import chromadb
from chromadb.config import Settings
import json
import sys
import gc
import traceback
from typing import List, Dict, Any
from embeddings import EmbeddingEngine


class VectorStore:

    def __init__(self, persist_directory: str = "./chroma_data"):
        self.persist_directory = persist_directory
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.embedding_engine = EmbeddingEngine()
        self.collection = None
        self.current_repo = None

        # Auto-reconnect: reload the last persisted collection on startup
        self._auto_reconnect()

    def _auto_reconnect(self) -> None:
        """Try to reload the most recent collection from ChromaDB on startup."""
        try:
            collections = self.client.list_collections()
            if collections:
                # Get the most recently created collection
                latest = collections[-1]
                name = latest if isinstance(latest, str) else latest.name
                self.collection = self.client.get_collection(name=name)
                self.current_repo = name
                count = self.collection.count()
                print(f"  [VECTOR] Auto-reconnected to collection '{name}' ({count} docs)", flush=True)
            else:
                print(f"  [VECTOR] No existing collections found — waiting for upload.", flush=True)
        except Exception as e:
            print(f"  [VECTOR] Auto-reconnect skipped: {str(e)}", flush=True)
            self.collection = None
            self.current_repo = None

    def try_reconnect(self, repo_name: str) -> bool:
        """Try to reconnect to a specific collection by name. Returns True on success."""
        try:
            self.collection = self.client.get_collection(name=repo_name)
            self.current_repo = repo_name
            print(f"  [VECTOR] Reconnected to collection '{repo_name}'", flush=True)
            return True
        except Exception as e:
            print(f"  [VECTOR] Could not reconnect to '{repo_name}': {str(e)}", flush=True)
            self.collection = None
            self.current_repo = None
            return False

    def create_or_get_collection(self, collection_name: str) -> None:
        try:
            try:
                self.client.delete_collection(name=collection_name)
                print(f"  [VECTOR] Deleted existing collection: {collection_name}", flush=True)
            except Exception:
                pass

            self.collection = self.client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            self.current_repo = collection_name
            print(f"  [VECTOR] Created collection: {collection_name}", flush=True)
        except Exception as e:
            print(f"  [VECTOR] ERROR creating collection: {str(e)}", flush=True)
            traceback.print_exc()
            sys.stdout.flush()
            raise Exception(f"Failed to create collection: {str(e)}")

    def add_documents(self,
                     documents: List[str],
                     metadatas: List[Dict[str, Any]],
                     ids: List[str] = None,
                     progress_callback=None) -> None:
        if not self.collection:
            raise ValueError("No collection initialized. Call create_or_get_collection() first.")

        if len(documents) != len(metadatas):
            raise ValueError("Documents and metadatas length mismatch")

        if ids is None:
            ids = [f"doc_{i}" for i in range(len(documents))]

        # FIXED: validate all IDs are unique (duplicate IDs cause silent failures in ChromaDB)
        if len(set(ids)) != len(ids):
            ids = [f"doc_{i}" for i in range(len(documents))]

        # Larger batches = fewer round-trips = significantly faster
        batch_size = 100
        total_batches = (len(documents) + batch_size - 1) // batch_size
        successful_docs = 0
        failed_batches = 0

        print(f"  [VECTOR] Adding {len(documents)} docs in {total_batches} batches (size={batch_size})", flush=True)

        try:
            for batch_num in range(total_batches):
                start = batch_num * batch_size
                end = min(start + batch_size, len(documents))

                batch_docs = documents[start:end]
                batch_metas = metadatas[start:end]
                batch_ids = ids[start:end]

                # FIXED: filter out empty documents that would cause embedding errors
                valid_indices = [i for i, d in enumerate(batch_docs) if d and d.strip()]
                if not valid_indices:
                    print(f"  [VECTOR] Batch {batch_num + 1}/{total_batches}: all empty, skipping", flush=True)
                    continue

                batch_docs = [batch_docs[i] for i in valid_indices]
                batch_metas = [batch_metas[i] for i in valid_indices]
                batch_ids = [batch_ids[i] for i in valid_indices]

                try:
                    print(f"  [VECTOR] Batch {batch_num + 1}/{total_batches}: embedding {len(batch_docs)} docs...", flush=True)
                    batch_embeddings = self.embedding_engine.embed_texts(batch_docs)

                    print(f"  [VECTOR] Batch {batch_num + 1}/{total_batches}: storing...", flush=True)
                    self.collection.add(
                        ids=batch_ids,
                        documents=batch_docs,
                        metadatas=batch_metas,
                        embeddings=batch_embeddings
                    )

                    successful_docs += len(batch_docs)
                    print(f"  [VECTOR] Batch {batch_num + 1}/{total_batches}: ✓ ({successful_docs}/{len(documents)} done)", flush=True)

                    # Fire progress callback: maps 80% -> 98% during embedding phase
                    if progress_callback and total_batches > 0:
                        pct = 80 + int(((batch_num + 1) / total_batches) * 18)
                        progress_callback(
                            f'Embedding & storing: {successful_docs}/{len(documents)} chunks done...',
                            pct
                        )

                except Exception as e:
                    failed_batches += 1
                    print(f"  [VECTOR] ERROR batch {batch_num + 1}: {str(e)}", flush=True)
                    traceback.print_exc()
                    sys.stdout.flush()
                    continue

            if successful_docs == 0:
                raise Exception(f"All {total_batches} batches failed. No documents were stored.")

            # Single GC at the end
            gc.collect()
            print(f"  [VECTOR] ✓ Stored {successful_docs}/{len(documents)} docs ({failed_batches} batches failed)", flush=True)

        except Exception as e:
            print(f"  [VECTOR] CRITICAL ERROR: {str(e)}", flush=True)
            traceback.print_exc()
            sys.stdout.flush()
            raise Exception(f"Failed to add documents: {str(e)}")

    def query(self,
             query_text: str,
             n_results: int = 5) -> Dict[str, Any]:
        if not self.collection:
            raise ValueError("No collection initialized. Please upload a repository first.")

        try:
            # FIXED: Clamp n_results to the actual collection count to avoid ChromaDB errors
            count = self.collection.count()
            if count == 0:
                return {
                    'ids': [],
                    'documents': [],
                    'metadatas': [],
                    'distances': []
                }
            n_results = min(n_results, count)

            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results,
                include=['documents', 'metadatas', 'distances']
            )

            return {
                'ids': results['ids'][0] if results['ids'] else [],
                'documents': results['documents'][0] if results['documents'] else [],
                'metadatas': results['metadatas'][0] if results['metadatas'] else [],
                'distances': results['distances'][0] if results['distances'] else []
            }
        except Exception as e:
            raise Exception(f"Query failed: {str(e)}")

    def get_collection_info(self) -> Dict[str, Any]:
        if not self.collection:
            return {"status": "No collection loaded"}

        try:
            count = self.collection.count()
            return {
                "collection": self.current_repo,
                "document_count": count
            }
        except Exception as e:
            return {"error": str(e)}

    def reset(self) -> None:
        try:
            collections = self.client.list_collections()
            for collection in collections:
                if isinstance(collection, str):
                    self.client.delete_collection(name=collection)
                else:
                    self.client.delete_collection(name=collection.name)
            self.collection = None
            self.current_repo = None
            print("Vector store reset successfully", flush=True)
        except Exception as e:
            print(f"Error resetting vector store: {str(e)}", flush=True)
