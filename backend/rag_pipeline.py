import os
import sys
import json
import traceback
from typing import List, Dict, Tuple, Any
from pathlib import Path

from vector_store import VectorStore
from utils import (
    extract_zip_file,
    get_supported_files,
    read_file_safely,
    cleanup_directory
)

# New Advanced RAG Modules
from rag.parent_child_retriever import ParentChildRetriever
from rag.hyde import HyDE
from security.jailbreak_guard import JailbreakGuard

class SimpleTextSplitter:
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []
        if len(text) <= self.chunk_size:
            return [text.strip()]

        chunks = []
        text_len = len(text)
        start = 0

        while start < text_len:
            end = min(start + self.chunk_size, text_len)
            if end < text_len:
                boundary = -1
                last_double = text.rfind('\n\n', start, end)
                if last_double > start + self.chunk_overlap:
                    boundary = last_double + 2
                else:
                    last_newline = text.rfind('\n', start + self.chunk_overlap, end)
                    if last_newline > start + self.chunk_overlap:
                        boundary = last_newline + 1
                if boundary > start:
                    end = boundary

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            next_start = end - self.chunk_overlap
            if next_start <= start:
                next_start = start + max(1, self.chunk_size - self.chunk_overlap)
            start = next_start
            if start >= text_len:
                break

        return chunks if chunks else ([text.strip()] if text.strip() else [])


class RAGPipeline:

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.repository_metadata = {}
        
        # Initialize advanced components
        self.parent_child_retriever = ParentChildRetriever(vector_store)
        self.hyde = HyDE()
        self.jailbreak_guard = JailbreakGuard()

    def process_repository(self, zip_path: str, repo_name: str, progress_callback=None) -> Dict[str, Any]:
        import time
        import gc
        extract_dir = None

        def _cb(msg: str, pct: int):
            if progress_callback:
                try:
                    progress_callback(msg, pct)
                except Exception:
                    pass

        try:
            total_start = time.time()

            # Step 1: Extract ZIP
            print(f"\n{'='*60}", flush=True)
            print(f"  PROCESSING REPOSITORY: {repo_name}", flush=True)
            print(f"{'='*60}", flush=True)

            extract_dir = os.path.join("./uploads", f"extracted_{repo_name}")
            os.makedirs(extract_dir, exist_ok=True)

            print(f"\n[Step 1/4] Extracting ZIP file...", flush=True)
            _cb('Extracting ZIP file...', 60)
            step_start = time.time()
            try:
                extract_zip_file(zip_path, extract_dir)
                print(f"  ✓ ZIP extracted in {time.time() - step_start:.1f}s", flush=True)
            except Exception as e:
                print(f"  ✗ ZIP extraction FAILED: {str(e)}", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                raise

            # Step 2: Scan for files
            print(f"\n[Step 2/4] Scanning for code files...", flush=True)
            _cb('Scanning for code files...', 63)
            step_start = time.time()
            try:
                files = get_supported_files(extract_dir)
                print(f"  ✓ Found {len(files)} supported files in {time.time() - step_start:.1f}s", flush=True)
            except Exception as e:
                print(f"  ✗ File scanning FAILED: {str(e)}", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                raise

            if files:
                for i, (_, rel_path) in enumerate(files[:10]):
                    print(f"    - {rel_path}", flush=True)
                if len(files) > 10:
                    print(f"    ... and {len(files) - 10} more files", flush=True)

            if not files:
                raise ValueError("No supported code files found in ZIP")

            # Step 3: Chunk files using Parent-Child strategy
            print(f"\n[Step 3/4] Reading and chunking {len(files)} files via Parent-Child...", flush=True)
            _cb(f'Chunking {len(files)} files...', 65)
            step_start = time.time()
            try:
                chunks, metadatas = self.parent_child_retriever.split_parent_child_documents(files, repo_name, progress_callback=_cb)
                chunk_time = time.time() - step_start
                embed_dim = self.vector_store.embedding_engine.get_embedding_dimension()

                print(f"\n  {'─'*54}", flush=True)
                print(f"  CHUNK SUMMARY for: {repo_name}.zip", flush=True)
                print(f"  {'─'*54}", flush=True)
                print(f"  Total files processed : {len(files)}", flush=True)
                print(f"  Total child chunks    : {len(chunks)}", flush=True)
                print(f"  Embedding dimension   : {embed_dim}", flush=True)
                print(f"  Chunking time         : {chunk_time:.1f}s", flush=True)
                print(f"  {'─'*54}\n", flush=True)

                chunks_dir = os.path.join(os.path.dirname(__file__), "chunks")
                os.makedirs(chunks_dir, exist_ok=True)
                chunks_file = os.path.join(chunks_dir, f"{repo_name}.json")

                chunks_data = {
                    "repo_name": repo_name,
                    "total_chunks": len(chunks),
                    "total_files": len(files),
                    "embedding_dimension": embed_dim,
                    "chunking_time_seconds": round(chunk_time, 2),
                    "chunks": [
                        {
                            "index": i,
                            "filename": metadatas[i].get("filename"),
                            "filepath": metadatas[i].get("filepath"),
                            "chunk_index": metadatas[i].get("chunk_index"),
                            "text": chunks[i]
                        }
                        for i in range(len(chunks))
                    ]
                }

                with open(chunks_file, "w", encoding="utf-8") as f:
                    json.dump(chunks_data, f, indent=2, ensure_ascii=False)

                print(f"  [CHUNKS] Saved {len(chunks)} child chunks -> {chunks_file}", flush=True)
            except Exception as e:
                print(f"  ✗ Chunking FAILED: {str(e)}", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                raise

            if not chunks:
                raise ValueError("Failed to create child chunks from files")

            gc.collect()

            # Step 4: Create embeddings and store child chunks
            print(f"\n[Step 4/4] Creating embeddings & storing children in vector DB...", flush=True)
            print(f"  Total children to embed: {len(chunks)}", flush=True)
            _cb(f'Embedding {len(chunks)} children...', 80)
            step_start = time.time()
            try:
                self.parent_child_retriever.store_child_embeddings(chunks, metadatas, repo_name, progress_callback=_cb)
                print(f"  ✓ Embeddings created and stored in {time.time() - step_start:.1f}s", flush=True)
            except Exception as e:
                print(f"  ✗ Embedding/storage FAILED: {str(e)}", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                raise

            total_time = time.time() - total_start
            print(f"\n{'='*60}", flush=True)
            print(f"  ✓ COMPLETED in {total_time:.1f}s", flush=True)
            print(f"  Files: {len(files)} | Children: {len(chunks)}", flush=True)
            print(f"{'='*60}\n", flush=True)
            _cb(f'Done! {len(files)} files -> {len(chunks)} children', 99)

            self.repository_metadata[repo_name] = {
                "file_count": len(files),
                "chunk_count": len(chunks),
                "files": [f[1] for f in files]
            }

            return {
                "status": "success",
                "repo_name": repo_name,
                "file_count": len(files),
                "chunk_count": len(chunks),
                "message": f"Successfully processed {len(files)} files into {len(chunks)} children chunks"
            }

        except Exception as e:
            print(f"\n  ✗ PIPELINE ERROR: {str(e)}", flush=True)
            traceback.print_exc()
            sys.stdout.flush()
            raise Exception(f"Pipeline error: {str(e)}")
        finally:
            if extract_dir and os.path.exists(extract_dir):
                print(f"  [CLEANUP] Removing extracted files...", flush=True)
                cleanup_directory(extract_dir)
                print(f"  [CLEANUP] Done", flush=True)

    def retrieve(self, query: str, n_results: int = 5) -> Dict[str, Any]:
        """
        Retrive context for the given query using the Advanced RAG flow:
        1. Jailbreak Guard
        2. HyDE
        3. Parent-Child retrieval
        """
        try:
            # 1. Jailbreak Check
            if not self.jailbreak_guard.is_safe_query(query):
                print(f"[SECURITY] Jailbreak detected for query: {query}", flush=True)
                return {
                    "error": "Query blocked due to security policy.",
                    "results": []
                }
            
            # 2. HyDE Expansion
            print(f"[HyDE] Expanding query...", flush=True)
            expanded_query = self.hyde.generate_hypothetical_answer(query)
            
            # 3. Parent-Child Retrieval
            repo_name = self.vector_store.current_repo
            if not repo_name:
                raise ValueError("No active repository to query against.")
                
            print(f"[RETRIEVE] Fetching parent contexts for repo {repo_name}...", flush=True)
            retrieval_result = self.parent_child_retriever.retrieve_parent_context(
                query=expanded_query, 
                repo_name=repo_name, 
                n_results=n_results
            )
            
            # Wrap the actual query back onto the results directly so the caller has it
            retrieval_result["query"] = query
            return retrieval_result

        except Exception as e:
            print(f"[RAG] Retrieval error: {str(e)}", flush=True)
            return {"error": f"Retrieval failed: {str(e)}", "results": []}

    def get_repository_summary(self, repo_name: str) -> Dict[str, Any]:
        if repo_name not in self.repository_metadata:
            return {"status": "Repository not found"}
        return self.repository_metadata[repo_name]
