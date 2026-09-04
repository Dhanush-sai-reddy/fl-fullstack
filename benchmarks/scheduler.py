"""Adaptive aggregation scheduler.

Uses throughput benchmark to decide:
- When to trigger aggregation
- How long to wait for slow clients
- Whether to drop stragglers
"""
from typing import List, Optional, Callable
from .throughput import ThroughputBenchmark, ClientProfile, AggregationPlan


class AdaptiveScheduler:
    """Schedules FL aggregation rounds based on measured throughput."""
    
    def __init__(self, benchmark: ThroughputBenchmark = None):
        self.benchmark = benchmark or ThroughputBenchmark()
        self.current_plan: Optional[AggregationPlan] = None
    
    def update_profile(self, profile: ClientProfile):
        """Update throughput for one client and replan."""
        self.benchmark.profiles[profile.client_id] = profile
        self.current_plan = self.benchmark.plan_aggregation()
    
    def should_aggregate(self, num_clients_ready: int, elapsed_sec: float) -> bool:
        """Decide whether to trigger aggregation now."""
        if self.current_plan is None:
            self.current_plan = self.benchmark.plan_aggregation()
        
        if num_clients_ready >= self.current_plan.recommended_min_clients:
            if elapsed_sec >= self.current_plan.recommended_interval_sec:
                return True
        return False
    
    def get_plan(self) -> Optional[AggregationPlan]:
        return self.current_plan
    
    def reset(self):
        self.benchmark.profiles.clear()
        self.current_plan = None
