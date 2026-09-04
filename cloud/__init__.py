"""Cloud module: configurable aggregation server.

Re-exports the strategy functions and provides the CloudAggregator class.
"""
from .aggregator import (
    fedavg,
    fedprox,
    trimmed_mean,
    krum,
    coordinate_median,
    get_strategy,
    STRATEGY_REGISTRY
)


class CloudAggregator:
    """Configurable cloud aggregator."""

    def __init__(self, method: str = "fedavg", **kwargs):
        self.method = method
        self.kwargs = kwargs
        self.aggregator = get_strategy(method, **kwargs)

    @staticmethod
    def available_strategies():
        return list(STRATEGY_REGISTRY.keys())

    def set_strategy(self, method: str, **kwargs):
        self.method = method
        self.kwargs = kwargs
        self.aggregator = get_strategy(method, **kwargs)

    def aggregate(self, updates):
        return self.aggregator(updates)

    def info(self) -> dict:
        return {
            "method": self.method,
            "available": self.available_strategies(),
            "params": self.kwargs
        }


__all__ = [
    "CloudAggregator",
    "get_strategy",
    "STRATEGY_REGISTRY",
    "fedavg",
    "fedprox",
    "trimmed_mean",
    "krum",
    "coordinate_median"
]
