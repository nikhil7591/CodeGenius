import os
import sys
import json
from metrics import precision, recall, mrr, metric_score

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rag_pipeline import RAGPipeline
from vector_store import VectorStore

def evaluate_retrieval(repo_name: str, dataset_path: str):
    print(f"Starting Evaluation for repo: {repo_name}...")
    
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)
        
    print(f"Loaded {len(dataset)} evaluation queries.")
    
    vector_store_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'chroma_data')
    vector_store = VectorStore(persist_directory=vector_store_path)
    
    if not vector_store.try_reconnect(repo_name):
        print(f"Error: Could not connect to vector store for {repo_name}.")
        return

    rag_pipeline = RAGPipeline(vector_store)
    
    total_precision = 0.0
    total_recall = 0.0
    total_mrr = 0.0
    total_metric_score = 0.0
    count = len(dataset)
    
    print("\n" + "="*50)
    for idx, item in enumerate(dataset):
        query = item.get("query")
        relevant_docs = item.get("relevant_docs", [])
        
        print(f"Query {idx+1}: {query}")
        print(f"Expected Sources: {relevant_docs}")
        
        # Optionally turn off HyDE for baseline evaluation if it's integrated by default
        result = rag_pipeline.retrieve(query, n_results=5)
        
        # We just want unique filenames to verify if correct file was fetched
        retrieved_docs = []
        if result.get("status") == "success":
            for res in result.get("results", []):
                fname = res.get("filename")
                if fname not in retrieved_docs:
                    retrieved_docs.append(fname)
                
        print(f"Retrieved Sources: {retrieved_docs}")
        
        p = precision(retrieved_docs, relevant_docs)
        r = recall(retrieved_docs, relevant_docs)
        m = mrr(retrieved_docs, relevant_docs)
        score = metric_score(p, r)
        
        print(f"Precision: {p:.2f} | Recall: {r:.2f} | MRR: {m:.2f} | Metric Score: {score:.2f}")
        print("-" * 50)
        
        total_precision += p
        total_recall += r
        total_mrr += m
        total_metric_score += score
        
    print(f"\nFINAL EVALUATION METRICS (Averaged across {count} queries):")
    print(f"Average Precision : {total_precision / count:.3f}")
    print(f"Average Recall    : {total_recall / count:.3f}")
    print(f"Average MRR       : {total_mrr / count:.3f}")
    print(f"Average Metric Score: {total_metric_score / count:.3f}")
    print("="*50)

if __name__ == "__main__":
    dataset_file = os.path.join(os.path.dirname(__file__), "dataset.json")
    repo_name = "IntelliChat-main"
    if len(sys.argv) > 1:
        repo_name = sys.argv[1]
        
    evaluate_retrieval(repo_name, dataset_file)
