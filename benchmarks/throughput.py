"""Throughput benchmark for FL aggregation planning.

Measures client training speed (samples/sec) and uses it to plan:
- Optimal aggregation interval
- Batch size per client
- When to drop slow clients
- Memory estimation per round
"""
import time
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from statistics import mean, median, stdev

from config import settings


@dataclass
class ClientProfile:
    """Throughput profile for a single client."""
    client_id: str
    num_samples: int = 0
    samples_per_sec: float = 0.0
    time_per_batch: float = 0.0
    estimated_epoch_sec: float = 0.0
    batch_size: int = 32
    class_distribution: Dict[str, int] = field(default_factory=dict)
    network_latency_ms: float = 0.0


@dataclass
class AggregationPlan:
    """Output of benchmark: plan for aggregation."""
    recommended_interval_sec: float
    recommended_min_clients: int
    recommended_batch_size: int
    expected_round_time_sec: float
    drop_slow_clients: List[str] = field(default_factory=list)
    reasoning: List[str] = field(default_factory=list)


class ThroughputBenchmark:
    """Measures client throughput and plans aggregation timing."""

    def __init__(self, target_round_time_sec: float = 300.0,
                 min_clients_for_aggregation: int = 2,
                 slow_client_threshold_samples_per_sec: float = 5.0):
        self.target_round_time = target_round_time_sec
        self.min_clients = min_clients_for_aggregation
        self.slow_threshold = slow_client_threshold_samples_per_sec
        self.profiles: Dict[str, ClientProfile] = {}

    def calibrate_client(self, client_id: str, num_samples: int,
                         time_per_batch: float, batch_size: int,
                         class_distribution: Optional[Dict[str, int]] = None,
                         network_latency_ms: float = 0.0) -> ClientProfile:
        """Record calibration data from a client."""
        samples_per_sec = batch_size / max(time_per_batch, 1e-6)
        total_batches = num_samples / batch_size
        epoch_sec = total_batches * time_per_batch

        profile = ClientProfile(
            client_id=client_id,
            num_samples=num_samples,
            samples_per_sec=samples_per_sec,
            time_per_batch=time_per_batch,
            estimated_epoch_sec=epoch_sec,
            batch_size=batch_size,
            class_distribution=class_distribution or {},
            network_latency_ms=network_latency_ms
        )
        self.profiles[client_id] = profile
        return profile

    def measure_locally(self, client_id: str, num_samples: int,
                        sample_train_batch_fn, batch_size: int = 32) -> ClientProfile:
        """Run a calibration batch locally and measure throughput."""
        start = time.time()
        sample_train_batch_fn()
        elapsed = time.time() - start
        return self.calibrate_client(
            client_id=client_id,
            num_samples=num_samples,
            time_per_batch=elapsed,
            batch_size=batch_size
        )

    def plan_aggregation(self, profiles: Optional[List[ClientProfile]] = None) -> AggregationPlan:
        """Use measured throughput to plan aggregation timing."""
        profiles = profiles or list(self.profiles.values())
        if not profiles:
            return AggregationPlan(
                recommended_interval_sec=self.target_round_time,
                recommended_min_clients=self.min_clients,
                recommended_batch_size=settings.BATCH_SIZE,
                expected_round_time_sec=self.target_round_time,
                reasoning=["No client profiles available; using defaults"]
            )

        reasoning = []
        speeds = [p.samples_per_sec for p in profiles]
        epochs = [p.estimated_epoch_sec for p in profiles]

        median_speed = median(speeds)
        max_epoch_time = max(epochs)
        min_epoch_time = min(epochs)

        reasoning.append(f"Median throughput: {median_speed:.1f} samples/sec")
        reasoning.append(f"Epoch range: {min_epoch_time:.1f}s (fastest) → {max_epoch_time:.1f}s (slowest)")

        drop_slow = []
        for p in profiles:
            if p.samples_per_sec < self.slow_threshold:
                drop_slow.append(p.client_id)
                reasoning.append(
                    f"Dropping slow client {p.client_id}: "
                    f"{p.samples_per_sec:.1f} < {self.slow_threshold} samples/sec"
                )

        active_profiles = [p for p in profiles if p.client_id not in drop_slow]

        if len(active_profiles) < self.min_clients:
            reasoning.append(
                f"WARNING: only {len(active_profiles)} active clients (min={self.min_clients})"
            )
            interval = max_epoch_time
            min_clients = max(1, len(active_profiles))
        else:
            interval = max_epoch_time
            min_clients = self.min_clients
            reasoning.append(f"Wait for slowest active client: {interval:.1f}s")

        expected_round = interval + sum(p.network_latency_ms for p in active_profiles) / 1000.0
        reasoning.append(f"Expected round time (incl. network): {expected_round:.1f}s")

        avg_batch = int(median([p.batch_size for p in active_profiles]))

        return AggregationPlan(
            recommended_interval_sec=interval,
            recommended_min_clients=min_clients,
            recommended_batch_size=avg_batch,
            expected_round_time_sec=expected_round,
            drop_slow_clients=drop_slow,
            reasoning=reasoning
        )

    def summary(self) -> Dict:
        """Return benchmark summary stats."""
        if not self.profiles:
            return {"num_clients": 0}

        speeds = [p.samples_per_sec for p in self.profiles.values()]
        return {
            "num_clients": len(self.profiles),
            "samples_per_sec": {
                "mean": mean(speeds),
                "median": median(speeds),
                "stdev": stdev(speeds) if len(speeds) > 1 else 0.0,
                "min": min(speeds),
                "max": max(speeds)
            },
            "total_samples": sum(p.num_samples for p in self.profiles.values()),
            "bottleneck_client": min(
                self.profiles.values(), key=lambda p: p.samples_per_sec
            ).client_id
        }
