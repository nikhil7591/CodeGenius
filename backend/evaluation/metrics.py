def precision(retrieved: list, relevant: list) -> float:
    """
    Precision: Fraction of retrieved documents that are relevant.
    """
    if not retrieved:
        return 0.0
    relevant_retrieved = [doc for doc in retrieved if doc in relevant]
    return len(relevant_retrieved) / len(retrieved)

def recall(retrieved: list, relevant: list) -> float:
    """
    Recall: Fraction of relevant documents that were retrieved.
    """
    if not relevant:
        return 0.0
    relevant_retrieved = [doc for doc in retrieved if doc in relevant]
    return len(relevant_retrieved) / len(relevant)

def mrr(retrieved: list, relevant: list) -> float:
    """
    Mean Reciprocal Rank (MRR): 1 / rank of the first relevant document.
    """
    if not relevant or not retrieved:
        return 0.0
    for i, doc in enumerate(retrieved):
        if doc in relevant:
            return 1.0 / (i + 1)
    return 0.0

def metric_score(precision_val: float, recall_val: float) -> float:
    """
    Metric Score (F1 Score): Harmonic mean of precision and recall.
    """
    if precision_val + recall_val == 0:
        return 0.0
    return 2 * (precision_val * recall_val) / (precision_val + recall_val)
