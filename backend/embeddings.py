from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np
import sys
import gc
import traceback


class EmbeddingEngine:

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model_name = model_name
        print(f"Loading embedding model: {model_name}...", flush=True)
        self.model = SentenceTransformer(model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        print(f"Model loaded. Embedding dimension: {self.embedding_dim}", flush=True)

    def embed_text(self, text: str) -> List[float]:
        if not text or not text.strip():
            return [0.0] * self.embedding_dim

        embedding = self.model.encode(text, convert_to_tensor=False)
        return embedding.tolist()

    def embed_texts(self, texts: List[str], batch_size: int = 64) -> List[List[float]]:
        """Embed a list of texts in batches. Larger batch_size = faster on CPU."""
        if not texts:
            return []

        valid_indices = [i for i, t in enumerate(texts) if t and t.strip()]
        valid_texts = [texts[i] for i in valid_indices]

        if not valid_texts:
            return [[0.0] * self.embedding_dim] * len(texts)

        total_batches = (len(valid_texts) + batch_size - 1) // batch_size
        all_embeddings_valid = []

        for i in range(0, len(valid_texts), batch_size):
            batch = valid_texts[i:i + batch_size]
            batch_num = i // batch_size + 1
            try:
                print(f"    [EMBED] Batch {batch_num}/{total_batches} ({len(batch)} texts)...", flush=True)
                batch_embeddings = self.model.encode(
                    batch,
                    convert_to_tensor=False,
                    show_progress_bar=False,
                    normalize_embeddings=True
                )
                all_embeddings_valid.extend(batch_embeddings)
                print(f"    [EMBED] Batch {batch_num}/{total_batches} \u2713", flush=True)
            except Exception as e:
                print(f"    [EMBED] ERROR batch {batch_num}: {str(e)}", flush=True)
                traceback.print_exc()
                for _ in batch:
                    all_embeddings_valid.append(np.zeros(self.embedding_dim))

        # GC once at the end, not after every tiny batch
        gc.collect()

        # Reconstruct output preserving original indices (empty texts get zero vectors)
        result = [[0.0] * self.embedding_dim] * len(texts)
        for out_idx, orig_idx in enumerate(valid_indices):
            result[orig_idx] = all_embeddings_valid[out_idx].tolist()

        print(f"    [EMBED] All {len(result)} embeddings ready", flush=True)
        return result

    def get_embedding_dimension(self) -> int:
        return self.embedding_dim
