import os
import json
import traceback
from typing import List, Dict, Tuple, Any

from utils import read_file_safely

class ParentChildRetriever:
    def __init__(self, vector_store):
        self.vector_store = vector_store
        # Children chunks should be small for precision
        from rag_pipeline import SimpleTextSplitter
        self.text_splitter = SimpleTextSplitter(chunk_size=400, chunk_overlap=50)
        
        # Local JSON-based store for parents
        self.parent_store_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "parent_docs")
        os.makedirs(self.parent_store_dir, exist_ok=True)

    def _get_parent_path(self, repo_name: str, file_id: str) -> str:
        repo_dir = os.path.join(self.parent_store_dir, repo_name)
        os.makedirs(repo_dir, exist_ok=True)
        return os.path.join(repo_dir, f"{file_id}.txt")

    def split_parent_child_documents(self, files: List[Tuple[str, str]], repo_name: str, progress_callback=None) -> Tuple[List[str], List[Dict[str, str]]]:
        """
        1. Split code files into parent documents (full file).
        2. Split each parent into smaller child chunks.
        """
        all_child_chunks = []
        all_child_metadatas = []
        total_files = len(files)
        skipped = 0
        
        for idx, (abs_path, rel_path) in enumerate(files):
            file_num = idx + 1
            try:
                parent_content = read_file_safely(abs_path)
                if not parent_content or not parent_content.strip():
                    skipped += 1
                    continue
                
                # File ID as a secure unique identifier within the repo
                file_id = f"parent_{idx}"
                
                # Store parent document in an offline folder
                parent_path = self._get_parent_path(repo_name, file_id)
                with open(parent_path, "w", encoding="utf-8") as f:
                    f.write(parent_content)
                
                # Create smaller children chunks
                child_chunks = self.text_splitter.split_text(parent_content)
                
                file_chunk_count = 0
                for c_idx, child in enumerate(child_chunks):
                    if child and child.strip():
                        all_child_chunks.append(child)
                        all_child_metadatas.append({
                            "parent_id": file_id,
                            "filename": os.path.basename(abs_path),
                            "filepath": rel_path,
                            "chunk_index": str(c_idx),
                            "is_child": "true"
                        })
                        file_chunk_count += 1
                
                if progress_callback and total_files > 0:
                    pct = 65 + int((file_num / total_files) * 13)
                    progress_callback(
                        f'Chunking files into parent/child: {file_num}/{total_files} ({len(all_child_chunks)} children)...',
                        pct
                    )
            except Exception as e:
                print(f"Error splitting {rel_path}: {e}")
                skipped += 1
                
        print(f"  [ParentChild] Created {len(all_child_chunks)} children chunks. Skipped {skipped} empty files.")
        return all_child_chunks, all_child_metadatas

    def store_child_embeddings(self, chunks: List[str], metadatas: List[Dict[str, str]], repo_name: str, progress_callback=None):
        """
        3. Store embeddings only for child chunks.
        """
        if not chunks:
            print("  [ParentChild] No chunks to embed!")
            return
            
        self.vector_store.create_or_get_collection(repo_name)
        self.vector_store.add_documents(chunks, metadatas, progress_callback=progress_callback)

    def retrieve_parent_context(self, query: str, repo_name: str, n_results: int = 5) -> Dict[str, Any]:
        """
        4. During retrieval: Search child chunks -> Return corresponding parent document.
        """
        try:
            # Query the vector store for nearest children
            results = self.vector_store.query(query, n_results=n_results)
            
            # Map children to parents and keep the best similarity score
            unique_parents = {}
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'],
                results['metadatas'],
                results['distances']
            )):
                parent_id = metadata.get("parent_id")
                if parent_id and parent_id not in unique_parents:
                    # distance is typically L2 or Cosine, convert roughly to relevance
                    unique_parents[parent_id] = {
                        "metadata": metadata,
                        "relevance": round(max(0, 1 - distance), 4)
                    }
            
            # Formulate the response with parent full content
            formatted_results = []
            for parent_id, data in unique_parents.items():
                metadata = data["metadata"]
                parent_path = self._get_parent_path(repo_name, parent_id)
                parent_text = "Content not found."
                if os.path.exists(parent_path):
                    with open(parent_path, "r", encoding="utf-8") as f:
                        parent_text = f.read()
                        
                formatted_results.append({
                    "chunk": parent_text, 
                    "source": f"{metadata.get('filepath', 'unknown')}",
                    "filename": metadata.get('filename', 'unknown'),
                    "relevance": data["relevance"]
                })

            return {
                "status": "success",
                "query": query,
                "results": formatted_results
            }

        except Exception as e:
            traceback.print_exc()
            return {"error": f"Parent retrieval failed: {str(e)}", "results": []}
