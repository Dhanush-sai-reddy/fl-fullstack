"""Cloud aggregator: configurable aggregation strategies.

All strategies take a list of (weights, num_samples) and return aggregated weights.
"""
import numpy as np
from typing import List, Tuple, Dict, Callable

Weights = List[np.ndarray]


def _weighted_average(updates: List[Tuple[Weights, int]]) -> Weights:
    """Standard weighted average by sample count."""
    total = sum(n for _, n in updates)
    result = [np.zeros_like(w) for w in updates[0][0]]
    for weights, n in updates:
        for i, w in enumerate(weights):
            result[i] += w * (n / total)
    return result


def fedavg(updates: List[Tuple[Weights, int]], **kwargs) -> Weights:
    """Federated Averaging — weighted mean by dataset size."""
    return _weighted_average(updates)


def fedprox(updates: List[Tuple[Weights, int]], **kwargs) -> Weights:
    """FedProx — same aggregation as FedAvg (proximal term is client-side)."""
    return _weighted_average(updates)


def trimmed_mean(updates: List[Tuple[Weights, int]], trim_ratio: float = 0.2, **kwargs) -> Weights:
    """Coordinate-wise trimmed mean. Trims top/bottom trim_ratio fraction per coordinate."""
    all_weights = [w for w, _ in updates]
    n = len(all_weights)
    k = max(1, int(n * trim_ratio))

    result = []
    for layer_idx in range(len(all_weights[0])):
        stacked = np.stack([w[layer_idx] for w in all_weights], axis=0)
        sorted_stack = np.sort(stacked, axis=0)
        trimmed = sorted_stack[k:n - k] if n - 2 * k > 0 else sorted_stack
        result.append(np.mean(trimmed, axis=0))
    return result


def krum(updates: List[Tuple[Weights, int]], num_malicious: int = 1, **kwargs) -> Weights:
    """Krum — selects the client update closest to all others (most consistent)."""
    all_weights = [w for w, _ in updates]
    n = len(all_weights)
    n_select = n - num_malicious - 2

    if n_select < 1:
        n_select = 1

    flat = [np.concatenate([l.ravel() for l in w]) for w in all_weights]

    scores = []
    for i in range(n):
        dists = sorted([np.linalg.norm(flat[i] - flat[j]) ** 2
                        for j in range(n) if j != i])
        scores.append(sum(dists[:n_select]))

    best = int(np.argmin(scores))
    return all_weights[best]


def coordinate_median(updates: List[Tuple[Weights, int]], **kwargs) -> Weights:
    """Coordinate-wise median — robust to outliers."""
    all_weights = [w for w, _ in updates]
    result = []
    for layer_idx in range(len(all_weights[0])):
        stacked = np.stack([w[layer_idx] for w in all_weights], axis=0)
        result.append(np.median(stacked, axis=0))
    return result


STRATEGY_REGISTRY: Dict[str, Callable] = {
    "fedavg": fedavg,
    "fedprox": fedprox,
    "trimmed_mean": trimmed_mean,
    "krum": krum,
    "median": coordinate_median,
}


def get_strategy(method: str, **params) -> Callable:
    """Factory: returns a callable aggregator."""
    if method not in STRATEGY_REGISTRY:
        raise ValueError(
            f"Unknown strategy '{method}'. Choose from: {list(STRATEGY_REGISTRY.keys())}"
        )

    fn = STRATEGY_REGISTRY[method]

    def aggregator(updates: List[Tuple[Weights, int]]) -> Weights:
        return fn(updates, **params)

    return aggregator
