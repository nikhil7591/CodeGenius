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


class SimpleTextSplitter:

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []

        # If text fits in one chunk, return as-is
        if len(text) <= self.chunk_size:
            return [text.strip()]

        chunks = []
        text_len = len(text)
        start = 0

        while start < text_len:
            end = min(start + self.chunk_size, text_len)

            # Try to find a natural boundary (double newline, then single newline)
            if end < text_len:
                boundary = -1
                # Prefer paragraph break
                last_double = text.rfind('\n\n', start, end)
                if last_double > start + self.chunk_overlap:
                    boundary = last_double + 2
                else:
                    # Fall back to single newline
                    last_newline = text.rfind('\n', start + self.chunk_overlap, end)
                    if last_newline > start + self.chunk_overlap:
                        boundary = last_newline + 1

                if boundary > start:
                    end = boundary

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            # CRITICAL FIX: always advance start forward
            next_start = end - self.chunk_overlap
            # Guard: next_start must always be greater than current start
            if next_start <= start:
                next_start = start + max(1, self.chunk_size - self.chunk_overlap)

            start = next_start
            if start >= text_len:
                break

        return chunks if chunks else ([text.strip()] if text.strip() else [])


class RAGPipeline:

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.text_splitter = SimpleTextSplitter(
            chunk_size=800,
            chunk_overlap=100
        )
        self.repository_metadata = {}

    def process_repository(self, zip_path: str, repo_name: str, progress_callback=None) -> Dict[str, Any]:
        import time
        import gc
        extract_dir = None

        def _cb(msg: str, pct: int):
            """Fire progress callback if provided."""
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

            # Step 3: Chunk files
            print(f"\n[Step 3/4] Reading and chunking {len(files)} files...", flush=True)
            _cb(f'Chunking {len(files)} files...', 65)
            step_start = time.time()
            try:
                chunks, metadatas = self._chunk_files(files, extract_dir, progress_callback=_cb)
                chunk_time = time.time() - step_start
                embed_dim = self.vector_store.embedding_engine.get_embedding_dimension()

                # ── Terminal summary ────────────────────────────────────────
                print(f"\n  {'─'*54}", flush=True)
                print(f"  CHUNK SUMMARY for: {repo_name}.zip", flush=True)
                print(f"  {'─'*54}", flush=True)
                print(f"  Total files processed : {len(files)}", flush=True)
                print(f"  Total chunks created  : {len(chunks)}", flush=True)
                print(f"  Embedding dimension   : {embed_dim}", flush=True)
                print(f"  Chunking time         : {chunk_time:.1f}s", flush=True)
                print(f"  {'─'*54}\n", flush=True)

                # ── Save chunks to chunks/<repo_name>.json ──────────────────
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

                print(f"  [CHUNKS] Saved {len(chunks)} chunks → {chunks_file}", flush=True)
            except Exception as e:
                print(f"  ✗ Chunking FAILED: {str(e)}", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                raise

            if not chunks:
                raise ValueError("Failed to create chunks from files")

            # Free memory before embedding
            gc.collect()

            # Step 4: Create embeddings and store
            print(f"\n[Step 4/4] Creating embeddings & storing in vector database...", flush=True)
            print(f"  Total chunks to embed: {len(chunks)}", flush=True)
            print(f"  This may take a while on low-RAM systems...", flush=True)
            _cb(f'Embedding {len(chunks)} chunks into vector DB...', 80)
            step_start = time.time()
            try:
                self.vector_store.create_or_get_collection(repo_name)
                self.vector_store.add_documents(chunks, metadatas, progress_callback=_cb)
                print(f"  ✓ Embeddings created and stored in {time.time() - step_start:.1f}s", flush=True)
            except Exception as e:
                print(f"  ✗ Embedding/storage FAILED: {str(e)}", flush=True)
                traceback.print_exc()
                sys.stdout.flush()
                raise

            total_time = time.time() - total_start
            print(f"\n{'='*60}", flush=True)
            print(f"  ✓ COMPLETED in {total_time:.1f}s", flush=True)
            print(f"  Files: {len(files)} | Chunks: {len(chunks)}", flush=True)
            print(f"{'='*60}\n", flush=True)
            _cb(f'Done! {len(files)} files → {len(chunks)} chunks', 99)

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
                "message": f"Successfully processed {len(files)} files into {len(chunks)} chunks"
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

    def _chunk_files(self,
                    files: List[Tuple[str, str]],
                    base_dir: str,
                    progress_callback=None) -> Tuple[List[str], List[Dict[str, str]]]:
        all_chunks = []
        all_metadatas = []
        skipped = 0
        total_files = len(files)

        print(f"  Chunking {total_files} files:", flush=True)

        for idx, (abs_path, rel_path) in enumerate(files):
            file_num = idx + 1
            try:
                content = read_file_safely(abs_path)

                if not content or not content.strip():
                    print(f"  [{file_num:>3}/{total_files}] SKIP (empty)  {rel_path}", flush=True)
                    skipped += 1
                    continue

                chunks = self.text_splitter.split_text(content)

                if not chunks:
                    print(f"  [{file_num:>3}/{total_files}] SKIP (no chunks) {rel_path}", flush=True)
                    skipped += 1
                    continue

                file_chunk_count = 0
                for chunk_idx, chunk in enumerate(chunks):
                    if chunk and chunk.strip():
                        metadata = {
                            "filename": os.path.basename(abs_path),
                            "filepath": rel_path,
                            "chunk_index": str(chunk_idx),
                            "file_extension": Path(abs_path).suffix
                        }
                        all_chunks.append(chunk)
                        all_metadatas.append(metadata)
                        file_chunk_count += 1

                print(f"  [{file_num:>3}/{total_files}] {rel_path}  →  {file_chunk_count} chunks  (total: {len(all_chunks)})", flush=True)

                # Fire progress callback every file (65% → 78% range)
                if progress_callback and total_files > 0:
                    pct = 65 + int((file_num / total_files) * 13)
                    progress_callback(
                        f'Chunking files: {file_num}/{total_files} ({len(all_chunks)} chunks)...',
                        pct
                    )

            except Exception as e:
                print(f"  [{file_num:>3}/{total_files}] SKIP (error: {str(e)})  {rel_path}", flush=True)
                skipped += 1
                continue

        if skipped > 0:
            print(f"  [INFO] Skipped {skipped} files (empty or unreadable)", flush=True)

        return all_chunks, all_metadatas

    def retrieve(self,
                query: str,
                n_results: int = 5) -> Dict[str, Any]:
        try:
            results = self.vector_store.query(query, n_results=n_results)

            formatted_results = []
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'],
                results['metadatas'],
                results['distances']
            )):
                formatted_results.append({
                    "chunk": doc,
                    "source": f"{metadata.get('filepath', 'unknown')}",
                    "filename": metadata.get('filename', 'unknown'),
                    "relevance": round(max(0, 1 - distance), 4)
                })

            return {
                "status": "success",
                "query": query,
                "results": formatted_results
            }

        except Exception as e:
            print(f"[RAG] Retrieval error: {str(e)}", flush=True)
            return {"error": f"Retrieval failed: {str(e)}", "results": []}

    def get_repository_summary(self, repo_name: str) -> Dict[str, Any]:
        if repo_name not in self.repository_metadata:
            return {"status": "Repository not found"}

        return self.repository_metadata[repo_name]
