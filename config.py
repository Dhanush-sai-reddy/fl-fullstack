"""fl-core config: centralized settings for the FL framework."""
from typing import List


class FlCoreSettings:
    """Centralized configuration for fl-core."""

    def __init__(self):
        # Aggregation strategies
        self.AVAILABLE_STRATEGIES: List[str] = [
            "fedavg", "fedprox", "trimmed_mean", "krum", "median"
        ]
        self.AGGREGATION_METHOD: str = "fedavg"
        self.TRIM_RATIO: float = 0.2
        self.KRUM_NUM_MALICIOUS: int = 1
        self.FEDPROX_MU: float = 0.01

        # Model backbones
        self.SUPPORTED_MODELS: List[str] = ["densenet121", "resnet50"]
        self.DEFAULT_MODEL: str = "densenet121"

        # PEFT
        self.PEFT_METHOD: str = "lora"
        self.LORA_R: int = 4
        self.LORA_ALPHA: int = 8
        self.LORA_DROPOUT: float = 0.1
        self.QLORA_BITS: int = 4

        # Training
        self.NUM_CLIENTS: int = 3
        self.NUM_ROUNDS: int = 3
        self.BATCH_SIZE: int = 32
        self.LR: float = 1e-3
        self.LOCAL_EPOCHS: int = 3

        # Triage
        self.CRITICAL_PATHOLOGIES: List[str] = ["Pneumothorax", "Edema"]
        self.URGENT_PATHOLOGIES: List[str] = [
            "Pneumonia", "Consolidation", "Effusion", "Infiltration"
        ]
        self.SAFETY_OVERRIDE_ENABLED: bool = True

        # Throughput / benchmark
        self.BENCHMARK_ENABLED: bool = True
        self.BENCHMARK_TARGET_ROUND_SEC: float = 300.0
        self.SLOW_CLIENT_THRESHOLD_SAMPLES_PER_SEC: float = 5.0

        # Ports
        self.DAEMON_PORT: int = 8004
        self.CLOUD_MANAGER_PORT: int = 8000

    def set_strategy(self, method: str, **kwargs):
        """Switch aggregation strategy."""
        if method not in self.AVAILABLE_STRATEGIES:
            raise ValueError(f"Unknown strategy: {method}")
        self.AGGREGATION_METHOD = method
        for k, v in kwargs.items():
            if hasattr(self, k.upper()):
                setattr(self, k.upper(), v)


settings = FlCoreSettings()
