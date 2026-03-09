"""
evaluator.py — FULLY UPDATED VERSION
══════════════════════════════════════════════════════════════
Original metrics: Precision, Recall, MRR
New metrics added:
  ✅ Faithfulness      - Answer sirf context se aaya?
  ✅ Hallucination     - Context ke bahar ki info toh nahi?
  ✅ Correctness       - Expected answer se kitna match?
  ✅ Completeness      - Important keywords cover hue?
  ✅ LLM-as-a-Judge    - Groq se bhi evaluate karo (optional)
══════════════════════════════════════════════════════════════
"""

import os
import sys
import json
from dotenv import load_dotenv

from metrics import (
    precision, recall, mrr, metric_score,
    faithfulness, hallucination_score, hallucination_label,
    correctness, completeness, llm_evaluate
)

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from vector_store import VectorStore


# ══════════════════════════════════════════════════════════════
# PATCHED RAG PIPELINE — Jailbreak bypass for evaluation
# ══════════════════════════════════════════════════════════════

class EvalRAGPipeline:
    """
    Evaluation ke liye special RAG pipeline.
    Jailbreak guard bypass karta hai — evaluation queries genuine hain.
    Answer generation bhi karta hai — naye metrics ke liye zaroori hai.
    """
    def __init__(self, vector_store: VectorStore):
        from rag_pipeline import RAGPipeline
        self._pipeline = RAGPipeline(vector_store)
        self._groq_key = os.getenv('GROQ_API_KEY', '').strip()

    def retrieve(self, query: str, n_results: int = 5):
        """Retrieval only — jailbreak bypass."""
        try:
            repo_name = self._pipeline.vector_store.current_repo
            if not repo_name:
                raise ValueError("No active repository.")

            try:
                expanded = self._pipeline.hyde.generate_hypothetical_answer(query)
            except Exception:
                expanded = query

            result = self._pipeline.parent_child_retriever.retrieve_parent_context(
                query=expanded,
                repo_name=repo_name,
                n_results=n_results
            )
            result["query"] = query
            return result

        except Exception as e:
            return {"error": str(e), "results": []}

    def generate_answer(self, context: str, query: str) -> dict:
        """
        LLM se answer generate karo — naye metrics ke liye.
        Groq use karta hai, fallback Ollama.
        """
        if not context or not context.strip():
            return {"answer": "", "model": "none"}

        # Try Groq
        if self._groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=self._groq_key)
                response = client.chat.completions.create(
                    model=os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant'),
                    messages=[
                        {"role": "system", "content": "You are a code analysis expert. Answer questions about code concisely and clearly based on the provided context only."},
                        {"role": "user", "content": f"Code Context:\n{context[:3000]}\n\nQuestion: {query}"}
                    ],
                    max_tokens=512,
                    temperature=0.3
                )
                answer = response.choices[0].message.content.strip()
                if answer:
                    return {"answer": answer, "model": "Groq"}
            except Exception as e:
                print(f"  [GEN] Groq failed: {e}")

        # Fallback — context se simple answer
        lines = context.strip().split('\n')
        snippet = '\n'.join(lines[:15])
        return {
            "answer": f"Based on retrieved context:\n{snippet}",
            "model": "context-only"
        }


# ══════════════════════════════════════════════════════════════
# DATASET SELECTION
# ══════════════════════════════════════════════════════════════

def get_dataset_path(repo_name: str) -> tuple:
    eval_dir     = os.path.dirname(__file__)
    datasets_dir = os.path.join(eval_dir, "datasets")
    repo_dataset = os.path.join(datasets_dir, f"{repo_name}.json")

    if os.path.exists(repo_dataset):
        with open(repo_dataset, encoding="utf-8") as f:
            data = json.load(f)
        print(f"\n  [DATASET] ✓ Found dataset: datasets/{repo_name}.json ({len(data)} queries)")
        return repo_dataset, "manual"

    print(f"\n  ERROR: Dataset not found: '{repo_dataset}'")
    print(f"  Please ensure the dataset exists.")
    sys.exit(1)


# ══════════════════════════════════════════════════════════════
# KEYWORD MATCHING
# ══════════════════════════════════════════════════════════════

def is_relevant(filename: str, keywords: list) -> bool:
    fc = filename.lower().replace("-", "").replace("_", "").replace(".", "")
    for kw in keywords:
        kc = kw.lower().replace("-", "").replace("_", "").replace(".", "")
        if kc in fc:
            return True
    return False


def mrr_from_retrieved(retrieved: list, keywords: list) -> float:
    for i, doc in enumerate(retrieved):
        if is_relevant(doc, keywords):
            return 1.0 / (i + 1)
    return 0.0


# ══════════════════════════════════════════════════════════════
# MAIN EVALUATION
# ══════════════════════════════════════════════════════════════

def evaluate_retrieval(repo_name: str, dataset_path: str, dataset_type: str):

    print(f"\n{'═'*70}")
    print(f"  CodeGenius RAG Evaluation — Extended Metrics")
    print(f"  Repo    : {repo_name}")
    print(f"  Dataset : {dataset_type}")
    print(f"{'═'*70}")

    with open(dataset_path, encoding="utf-8") as f:
        dataset = json.load(f)

    print(f"\n  Total queries: {len(dataset)}")

    # Check LLM judge availability
    groq_key = os.getenv('GROQ_API_KEY', '').strip()
    llm_judge_available = bool(groq_key)
    print(f"  LLM-as-a-Judge: {'✅ Groq available' if llm_judge_available else '❌ Not available (set GROQ_API_KEY)'}")
    print(f"  Answer Generation: {'✅ Enabled' if llm_judge_available else '⚠️  Context-only mode'}")

    # Vector store
    vector_store_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "chroma_data"
    )
    vector_store = VectorStore(persist_directory=vector_store_path)

    if not vector_store.try_reconnect(repo_name):
        print(f"\n  ERROR: Vector store not found for '{repo_name}'")
        print(f"  Upload the ZIP first via /api/upload")
        return

    rag = EvalRAGPipeline(vector_store)

    # ── Accumulators ──────────────────────────────────────────
    total_p = total_r = total_mrr = total_score = 0.0
    total_faith = total_halluc = total_correct = total_complete = 0.0
    total_llm_overall = 0.0
    llm_count = 0
    skipped = 0
    count = len(dataset)

    # ── Table Header ─────────────────────────────────────────
    print(f"\n{'─'*140}")
    print(f"{'Q#':<4} | {'Query':<45} | {'P':>5} | {'R':>5} | {'MRR':>5} | {'F1':>5} | {'Faith':>6} | {'Halluc':>7} | {'Correct':>8} | {'Complete':>9} | {'LLM':>5}")
    print(f"{'─'*140}")

    all_results = []

    for item in dataset:
        query            = item.get("query", "").strip()
        keywords         = item.get("relevant_docs_keywords", [])
        category         = item.get("category", "General")
        item_id          = item.get("id", "?")
        expected_answer  = item.get("expected_answer", "")
        answer_keywords  = item.get("answer_keywords", keywords)

        if not query or not keywords:
            skipped += 1
            count -= 1
            continue

        # ── 1. RETRIEVAL ──────────────────────────────────────
        result = rag.retrieve(query, n_results=15)
        retrieved_docs = []
        retrieved_contexts = []

        if result.get("status") == "success":
            for res in result.get("results", []):
                fname = res.get("filename")
                if not fname:
                    continue
                normalized = fname.replace("\\", "/")
                if any(x in normalized for x in ["evaluation/", "datasets/", "chunks/"]):
                    continue
                if fname not in retrieved_docs:
                    retrieved_docs.append(fname)
                    retrieved_contexts.append(res.get("chunk", ""))

        retrieved_docs     = retrieved_docs[:5]
        retrieved_contexts = retrieved_contexts[:5]
        combined_context   = "\n\n".join(retrieved_contexts)

        # ── 2. RETRIEVAL METRICS ──────────────────────────────
        relevant_retrieved = [d for d in retrieved_docs if is_relevant(d, keywords)]
        total_relevant     = max(len(item.get("matched_files", [])), 1)
        denominator        = min(len(retrieved_docs), total_relevant)

        p     = len(relevant_retrieved) / denominator if denominator > 0 else 0.0
        r     = len(relevant_retrieved) / total_relevant
        m     = mrr_from_retrieved(retrieved_docs, keywords)
        f1    = metric_score(p, r)

        # ── 3. GENERATE ANSWER ────────────────────────────────
        gen_result = rag.generate_answer(combined_context, query)
        answer     = gen_result.get("answer", "")

        # ── 4. NEW METRICS ────────────────────────────────────

        # Faithfulness: answer context se supported hai?
        faith = faithfulness(answer, combined_context)

        # Hallucination: context ke bahar ki info?
        halluc = hallucination_score(answer, combined_context)

        # Correctness: expected answer se match?
        correct = correctness(answer, expected_answer) if expected_answer else faith

        # Completeness: important keywords answer mein hain?
        complete = completeness(answer, answer_keywords)

        # LLM-as-a-Judge (optional)
        llm_scores = None
        llm_overall_str = "N/A"
        if llm_judge_available and answer:
            llm_scores = llm_evaluate(answer, combined_context, query, groq_key)
            if llm_scores:
                llm_overall_str = f"{llm_scores['overall_llm']:.2f}"
                total_llm_overall += llm_scores['overall_llm']
                llm_count += 1

        # ── Accumulate ────────────────────────────────────────
        total_p        += p
        total_r        += r
        total_mrr      += m
        total_score    += f1
        total_faith    += faith
        total_halluc   += halluc
        total_correct  += correct
        total_complete += complete

        # ── Print row ─────────────────────────────────────────
        dq = query[:45] if len(query) <= 45 else query[:42] + "..."
        print(
            f"Q{item_id:<3} | {dq:<45} | {p:>5.2f} | {r:>5.2f} | {m:>5.2f} | "
            f"{f1:>5.2f} | {faith:>6.2f} | {halluc:>7.2f} | {correct:>8.2f} | "
            f"{complete:>9.2f} | {llm_overall_str:>5}"
        )

        all_results.append({
            "id": item_id,
            "query": query,
            "category": category,
            "retrieved_files": retrieved_docs,
            "answer_snippet": answer[:200] if answer else "",
            "precision": p, "recall": r, "mrr": m, "f1": f1,
            "faithfulness": faith,
            "hallucination": halluc,
            "hallucination_label": hallucination_label(halluc),
            "correctness": correct,
            "completeness": complete,
            "llm_scores": llm_scores
        })

    print(f"{'─'*140}")

    if count == 0:
        print("\n  No valid queries found.")
        return

    # ── AVERAGES ──────────────────────────────────────────────
    avg_p        = total_p        / count
    avg_r        = total_r        / count
    avg_mrr      = total_mrr      / count
    avg_f1       = total_score    / count
    avg_faith    = total_faith    / count
    avg_halluc   = total_halluc   / count
    avg_correct  = total_correct  / count
    avg_complete = total_complete / count
    avg_llm      = total_llm_overall / llm_count if llm_count > 0 else None

    # ── FINAL RESULTS TABLE ───────────────────────────────────
    print(f"\n┌{'─'*58}┐")
    print(f"│ {'FINAL EVALUATION RESULTS':^56} │")
    print(f"│ {'(' + str(count) + ' queries evaluated)':^56} │")
    print(f"├{'─'*30}┬{'─'*27}┤")
    print(f"│ {'METRIC':<28} │ {'SCORE':^25} │")
    print(f"├{'─'*30}┼{'─'*27}┤")

    # Original metrics
    print(f"│ {'── RETRIEVAL METRICS ──':<28} │ {'':^25} │")
    print(f"│ {'Precision':<28} │ {avg_p:.3f}  ({avg_p*100:5.1f}%){'':<8} │")
    print(f"│ {'Recall':<28} │ {avg_r:.3f}  ({avg_r*100:5.1f}%){'':<8} │")
    print(f"│ {'MRR':<28} │ {avg_mrr:.3f}  ({avg_mrr*100:5.1f}%){'':<8} │")
    print(f"│ {'F1 Score':<28} │ {avg_f1:.3f}  ({avg_f1*100:5.1f}%){'':<8} │")
    print(f"├{'─'*30}┼{'─'*27}┤")

    # New metrics
    print(f"│ {'── GENERATION METRICS ──':<28} │ {'':^25} │")
    print(f"│ {'Faithfulness':<28} │ {avg_faith:.3f}  ({avg_faith*100:5.1f}%){'':<8} │")

    halluc_lbl = hallucination_label(avg_halluc)
    print(f"│ {'Hallucination':<28} │ {avg_halluc:.3f}  {halluc_lbl:<20} │")

    print(f"│ {'Correctness':<28} │ {avg_correct:.3f}  ({avg_correct*100:5.1f}%){'':<8} │")
    print(f"│ {'Completeness':<28} │ {avg_complete:.3f}  ({avg_complete*100:5.1f}%){'':<8} │")

    if avg_llm is not None:
        print(f"├{'─'*30}┼{'─'*27}┤")
        print(f"│ {'── LLM JUDGE (Groq) ──':<28} │ {'':^25} │")
        print(f"│ {'Overall Quality':<28} │ {avg_llm:.3f}  ({avg_llm*100:5.1f}%){'':<8} │")

    if skipped:
        print(f"├{'─'*30}┼{'─'*27}┤")
        print(f"│ {'Skipped queries':<28} │ {skipped:<25} │")

    print(f"└{'─'*30}┴{'─'*27}┘")

    # ── RAG QUALITY RATING ────────────────────────────────────
    # Combined score — retrieval + generation average
    gen_score = (avg_faith + avg_correct + avg_complete) / 3
    combined  = (avg_f1 + gen_score) / 2

    print(f"\n  Overall RAG Quality (Retrieval + Generation):")
    if combined >= 0.80:
        print(f"  ★★★★★  EXCELLENT  ({combined*100:.1f}%)")
    elif combined >= 0.60:
        print(f"  ★★★★☆  GOOD       ({combined*100:.1f}%)")
    elif combined >= 0.40:
        print(f"  ★★★☆☆  AVERAGE    ({combined*100:.1f}%)")
    elif combined >= 0.20:
        print(f"  ★★☆☆☆  POOR       ({combined*100:.1f}%)")
    else:
        print(f"  ★☆☆☆☆  VERY POOR  ({combined*100:.1f}%)")

    # ── HALLUCINATION SUMMARY ─────────────────────────────────
    low_h    = sum(1 for r in all_results if r["hallucination"] < 0.4)
    medium_h = sum(1 for r in all_results if 0.4 <= r["hallucination"] < 0.7)
    high_h   = sum(1 for r in all_results if r["hallucination"] >= 0.7)

    print(f"\n  Hallucination Breakdown ({count} queries):")
    print(f"  LOW    ✅  {low_h:>2} queries  ({low_h/count*100:.0f}%)")
    print(f"  MEDIUM ⚠️   {medium_h:>2} queries  ({medium_h/count*100:.0f}%)")
    print(f"  HIGH   ❌  {high_h:>2} queries  ({high_h/count*100:.0f}%)")

    # ── SAVE RESULTS ──────────────────────────────────────────
    output_path = os.path.join(
        os.path.dirname(__file__),
        f"results_{repo_name}.json"
    )
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "repo": repo_name,
            "total_queries": count,
            "averages": {
                "precision": round(avg_p, 4),
                "recall": round(avg_r, 4),
                "mrr": round(avg_mrr, 4),
                "f1": round(avg_f1, 4),
                "faithfulness": round(avg_faith, 4),
                "hallucination": round(avg_halluc, 4),
                "correctness": round(avg_correct, 4),
                "completeness": round(avg_complete, 4),
                "llm_overall": round(avg_llm, 4) if avg_llm else None,
                "combined_score": round(combined, 4)
            },
            "per_query": all_results
        }, f, indent=2, ensure_ascii=False)

    print(f"\n  💾 Detailed results saved → {output_path}")
    print(f"\n{'═'*70}\n")


# ══════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    repo_name = "CodeGenius"
    if len(sys.argv) > 1:
        repo_name = sys.argv[1]

    dataset_path, dataset_type = get_dataset_path(repo_name)
    evaluate_retrieval(repo_name, dataset_path, dataset_type)