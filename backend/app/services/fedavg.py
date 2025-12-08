from collections.abc import Iterable
from typing import Dict, List, TypedDict


class ClientWeights(TypedDict):
    num_examples: int
    weights_delta: Dict[str, List[float]]


def fedavg_weighted(updates: Iterable[ClientWeights]) -> Dict[str, List[float]]:
    """Simple FedAvg over JSON-friendly weight vectors.

    Each update provides num_examples and a mapping param_name -> list[float].
    Shapes for a given param_name must match across clients.
    """

    updates_list = list(updates)
    if not updates_list:
        return {}

    total_examples = sum(u["num_examples"] for u in updates_list)
    if total_examples == 0:
        # fall back to unweighted average
        total_examples = len(updates_list)
        weights = [1.0 / total_examples for _ in updates_list]
    else:
        weights = [u["num_examples"] / total_examples for u in updates_list]

    agg: Dict[str, List[float]] = {}

    for u, w in zip(updates_list, weights):
        for name, vec in u["weights_delta"].items():
            if name not in agg:
                agg[name] = [w * v for v in vec]
            else:
                acc = agg[name]
                # in-place update
                for i, v in enumerate(vec):
                    acc[i] += w * v

    return agg
