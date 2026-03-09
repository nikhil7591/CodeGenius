
"""
metrics.py — Updated Evaluation Metrics
=========================================
Original metrics: Precision, Recall, MRR, F1
New metrics added:
  - Faithfulness      : Answer sirf context se hai, bahar se nahi
  - Hallucination     : Context mein jo nahi tha wo answer mein aaya
  - Correctness       : Answer expected answer se kitna match karta hai
  - Completeness      : Expected keywords answer mein hain ya nahi
"""

import re
import os
import requests


# ══════════════════════════════════════════════════
# ORIGINAL METRICS (unchanged)
# ══════════════════════════════════════════════════

def precision(retrieved: list, relevant: list) -> float:
    """Precision: Fraction of retrieved documents that are relevant."""
    if not retrieved:
        return 0.0
    relevant_retrieved = [doc for doc in retrieved if doc in relevant]
    return len(relevant_retrieved) / len(retrieved)


def recall(retrieved: list, relevant: list) -> float:
    """Recall: Fraction of relevant documents that were retrieved."""
    if not relevant:
        return 0.0
    relevant_retrieved = [doc for doc in retrieved if doc in relevant]
    return len(relevant_retrieved) / len(relevant)


def mrr(retrieved: list, relevant: list) -> float:
    """MRR: 1 / rank of the first relevant document."""
    if not relevant or not retrieved:
        return 0.0
    for i, doc in enumerate(retrieved):
        if doc in relevant:
            return 1.0 / (i + 1)
    return 0.0


def metric_score(precision_val: float, recall_val: float) -> float:
    """F1 Score: Harmonic mean of precision and recall."""
    if precision_val + recall_val == 0:
        return 0.0
    return 2 * (precision_val * recall_val) / (precision_val + recall_val)


# ══════════════════════════════════════════════════
# HELPER — Token overlap
# ══════════════════════════════════════════════════

def _tokenize(text: str) -> set:
    """Lowercase words, remove punctuation."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return set(text.split())


def _overlap_score(text_a: str, text_b: str) -> float:
    """
    Token overlap ratio between two texts.
    Score = |A ∩ B| / |A ∪ B|  (Jaccard similarity)
    Range: 0.0 (no overlap) to 1.0 (identical)
    """
    tokens_a = _tokenize(text_a)
    tokens_b = _tokenize(text_b)
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    union = tokens_a | tokens_b
    return len(intersection) / len(union)


# ══════════════════════════════════════════════════
# NEW METRIC 1 — FAITHFULNESS
# ══════════════════════════════════════════════════

def faithfulness(answer: str, context: str) -> float:
    """
    Faithfulness: Answer ke meaningful words context mein present hain ya nahi.

    Approach (Containment-based — Jaccard se behtar for RAG):
    - Answer ke saare tokens lo, stopwords hata do
    - Dekho kitne tokens context mein bhi hain
    - Score = matching_tokens / answer_tokens

    Score 1.0 → Answer poora context se grounded
    Score 0.0 → Answer context se bilkul alag
    """
    if not answer or not context:
        return 0.0

    # Common English + code stopwords jo dono mein rehte hain (noise)
    STOPWORDS = {
        'the','a','an','is','it','in','of','to','and','or','for',
        'this','that','with','are','was','be','as','by','from',
        'at','on','its','which','has','have','been','not','can',
        'will','would','should','does','do','if','else','return',
        'def','class','import','self','true','false','none',
        'function','const','var','let','new','get','set','use',
        'using','used','also','based','code','file','module','how',
        'what','where','when','all','any','each','some','more',
    }

    def meaningful_tokens(text: str) -> set:
        text = text.lower()
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        return {t for t in text.split() if t not in STOPWORDS and len(t) > 2}

    answer_tokens  = meaningful_tokens(answer)
    context_tokens = meaningful_tokens(context)

    if not answer_tokens:
        return 0.0

    # Containment: fraction of answer tokens found in context
    matched = answer_tokens & context_tokens
    score   = len(matched) / len(answer_tokens)
    return round(score, 4)


# ══════════════════════════════════════════════════
# NEW METRIC 2 — HALLUCINATION
# ══════════════════════════════════════════════════

def hallucination_score(answer: str, context: str) -> float:
    """
    Hallucination: Answer mein kitna content context se BAHAR hai.

    Hallucination = 1 - Faithfulness
    Score 0.0 → Koi hallucination nahi (best)
    Score 1.0 → Poora answer hallucinated (worst)

    Threshold:
    > 0.7  → HIGH hallucination   ❌
    0.4-0.7 → MEDIUM hallucination ⚠️
    < 0.4  → LOW hallucination    ✅
    """
    faith = faithfulness(answer, context)
    return round(1.0 - faith, 4)


def hallucination_label(score: float) -> str:
    """Human readable label for hallucination score."""
    if score < 0.4:
        return "LOW ✅"
    elif score < 0.7:
        return "MEDIUM ⚠️"
    else:
        return "HIGH ❌"


# ══════════════════════════════════════════════════
# NEW METRIC 3 — CORRECTNESS
# ══════════════════════════════════════════════════

def correctness(answer: str, expected_answer: str) -> float:
    """
    Correctness: Generated answer expected answer se kitna match karta hai.

    Token overlap use karta hai (Jaccard similarity).
    Score 1.0 → Perfect match
    Score 0.0 → Koi match nahi

    Note: Expected answer dataset mein define hota hai —
    ek reference/ideal answer jo hona chahiye tha.
    """
    if not answer or not expected_answer:
        return 0.0
    return round(_overlap_score(answer, expected_answer), 4)


# ══════════════════════════════════════════════════
# NEW METRIC 4 — COMPLETENESS
# ══════════════════════════════════════════════════

def completeness(answer: str, expected_keywords: list) -> float:
    """
    Completeness: Answer mein expected keywords/concepts hain ya nahi.

    expected_keywords = wo important terms jo answer mein hone chahiye
    (e.g., ['ChromaDB', 'PersistentClient', 'vector_store.py'])

    Score = keywords found / total expected keywords
    Score 1.0 → Saare important concepts cover hue
    Score 0.0 → Koi important concept cover nahi hua
    """
    if not answer or not expected_keywords:
        return 0.0

    answer_lower = answer.lower()
    found = 0
    for kw in expected_keywords:
        if kw.lower() in answer_lower:
            found += 1

    return round(found / len(expected_keywords), 4)


# ══════════════════════════════════════════════════
# LLM-BASED EVALUATION (Optional — Groq use karta hai)
# ══════════════════════════════════════════════════

def llm_evaluate(answer: str, context: str, query: str, groq_api_key: str = None) -> dict:
    """
    LLM-as-a-Judge: Groq se evaluate karao answer ko.

    Returns dict with scores 1-5 for:
    - faithfulness
    - correctness
    - completeness
    - overall

    Agar Groq available nahi → None return karta hai
    """
    if not groq_api_key:
        groq_api_key = os.getenv('GROQ_API_KEY', '').strip()

    if not groq_api_key:
        return None

    try:
        from groq import Groq
        client = Groq(api_key=groq_api_key)

        prompt = f"""You are an evaluation expert. Rate the following answer on a scale of 1-5 for each metric.

QUERY: {query}

CONTEXT (retrieved code):
{context[:2000]}

GENERATED ANSWER:
{answer[:1000]}

Rate ONLY in this exact JSON format, nothing else:
{{
  "faithfulness": <1-5>,
  "correctness": <1-5>,
  "completeness": <1-5>,
  "overall": <1-5>,
  "reasoning": "<one line reason>"
}}

Scoring guide:
- faithfulness: Is the answer supported by the context? (5=fully supported, 1=contradicts context)
- correctness: Is the answer factually correct about the code? (5=perfectly correct, 1=wrong)
- completeness: Does it cover all important aspects? (5=complete, 1=very incomplete)
- overall: Overall quality (5=excellent, 1=poor)"""

        response = client.chat.completions.create(
            model=os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant'),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256,
            temperature=0.1
        )

        raw = response.choices[0].message.content.strip()

        # JSON extract karo
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            import json
            result = json.loads(json_match.group(0))
            # Normalize 1-5 scale to 0-1
            return {
                "faithfulness_llm":  round(result.get("faithfulness", 3) / 5, 2),
                "correctness_llm":   round(result.get("correctness", 3) / 5, 2),
                "completeness_llm":  round(result.get("completeness", 3) / 5, 2),
                "overall_llm":       round(result.get("overall", 3) / 5, 2),
                "reasoning":         result.get("reasoning", "")
            }

    except Exception as e:
        print(f"  [LLM-JUDGE] Failed: {e}")

    return None