# fl-core: Configurable Federated Learning Framework

## Project Overview

fl-core is a heavily configurable federated learning (FL) framework for medical AI. It provides a complete cloud-edge infrastructure with multiple swappable components — aggregation strategies, model architectures, PEFT methods, and triage policies. The framework is built around throughput-based aggregation planning, so the aggregation frequency adapts to measured client speeds.

## Core Philosophy: Configurability First

Every major component of fl-core is configurable through a centralized settings system. Users can swap out:

1. **Aggregation strategies** (5 options)
2. **Model backbones** (2 options)
3. **PEFT methods** (2 options)
4. **Triage policies** (3 severity levels)
5. **Aggregation intervals** (computed from throughput)

## Configurable Aggregation Strategies

The framework ships with 5 federated aggregation strategies, all configurable via a registry pattern:

```python
STRATEGY_REGISTRY = {
    "fedavg": fedavg,             # Federated Averaging
    "fedprox": fedprox,           # FedProx (proximal regularization)
    "trimmed_mean": trimmed_mean, # Byzantine-robust trimmed mean
    "krum": krum,                 # Krum (selects most consistent client)
    "median": coordinate_median,  # Coordinate-wise median
}
```

Each strategy accepts configurable parameters:

| Strategy | Configurable Parameters |
|----------|------------------------|
| FedAvg | Sample weights |
| FedProx | `mu` (proximal term strength) |
| Trimmed Mean | `trim_ratio` (fraction to trim) |
| Krum | `num_malicious` (assumed adversaries) |
| Median | None |

Usage:
```python
from model.defenses import get_strategy

agg = get_strategy("trimmed_mean", trim_ratio=0.2)
new_weights = agg(updates)
```

## Configurable Model Architectures

The framework supports multiple model backbones:

```python
SUPPORTED_MODELS: List[str] = ["densenet121", "resnet50"]
DEFAULT_MODEL: str = "densenet121"
```

## Configurable PEFT (Parameter-Efficient Fine-Tuning)

Two PEFT methods are supported:

```python
PEFT_METHOD: str = "lora"  # or "qlora"
LORA_R: int = 4
LORA_ALPHA: int = 8
LORA_DROPOUT: float = 0.1
LORA_TARGET_MODULES: List[str] = ["conv2"]
QLORA_BITS: int = 4
```

## Configurable Triage Policy

The framework defines configurable pathology severity tiers:

```python
CRITICAL_PATHOLOGIES = ["Pneumothorax", "Edema"]
URGENT_PATHOLOGIES = ["Pneumonia", "Consolidation", "Effusion", "Infiltration"]
ROUTINE_PATHOLOGIES = ["Cardiomegaly", "Emphysema", ...]
SAFETY_OVERRIDE_ENABLED: bool = True
```

14 pathologies supported, grouped by clinical urgency.

## Throughput-Based Aggregation Planning

The framework's key innovation is **adaptive aggregation scheduling based on measured client throughput**. Each edge client reports its calibration data (samples/sec, time per batch, class distribution), and the cloud uses this to:

- Estimate the optimal aggregation interval (waits for the slowest active client)
- Drop stragglers below a configurable speed threshold
- Compute expected round time including network latency
- Pick a recommended batch size from client medians

Usage:
```python
from fl_core.benchmarks import ThroughputBenchmark, AdaptiveScheduler

bench = ThroughputBenchmark()
scheduler = AdaptiveScheduler(bench)

# Add clients as they calibrate
scheduler.update_profile(client_a_profile)
scheduler.update_profile(client_b_profile)

# Decide when to aggregate
if scheduler.should_aggregate(num_ready=2, elapsed_sec=180):
    trigger_aggregation()

plan = scheduler.get_plan()
print(f"Recommended interval: {plan.recommended_interval_sec}s")
print(f"Drop slow clients: {plan.drop_slow_clients}")
```

## Cloud-Edge Architecture

The framework has a two-tier architecture:

### Cloud Tier (Aggregator)
- Cloud manager (`cloud/manager.py`) with tenant management
- FL server (`fl/server.py`) with configurable strategy selection
- JWT authentication
- SQLite database for job tracking
- Background threads for periodic aggregation

### Edge Tier (Client)
- FL client (`fl/client.py`)
- Runs locally, sends only weight updates
- Configurable local epochs, batch size, learning rate

### Key Configurable Cloud Settings:
```python
DAEMON_PORT: int = 8004
CLOUD_MANAGER_PORT: int = 8000
JWT_SECRET: str
JWT_EXPIRE_MINUTES: int = 1440
NUM_ROUNDS: int = 3
NUM_CLIENTS: int = 3
LOCAL_EPOCHS: int = 3
```

## Federated Training Flow

1. Cloud manager spawns FL server with configured strategy
2. Edge clients connect with calibration data (samples, class distribution, timing)
3. Cloud runs throughput benchmark to plan aggregation interval
4. Server distributes current global weights
5. Clients train locally for `LOCAL_EPOCHS`
6. Clients send weight updates back to server
7. Server aggregates using configured strategy
8. New global weights version incremented
9. Repeat for `NUM_ROUNDS`

## Deployment Options

Multiple deployment configurations supported:

- **Local development**: Run server and clients locally
- **Kubernetes**: `k8s/superlink.yaml` deployment manifests
- **Systemd**: `systemd/` service files
- **Docker**: Container support via FastAPI

## Key Differentiators

1. **Heavily configurable** - Every major component has a registry/factory pattern
2. **Privacy-preserving** - Data never leaves the edge (only weight updates travel)
3. **Throughput-aware aggregation** - Interval adapts to measured client speeds
4. **Medical-grade** - Built specifically for healthcare AI with triage policies
5. **Production-ready** - JWT auth, tenant management, periodic aggregation

## Code Statistics

- Total Python files: 15+
- Lines of code: ~3,000+
- Aggregation strategies: 5
- Model backbones: 2
- PEFT methods: 2
- Supported pathologies: 14

## Summary

fl-core is a production-grade federated learning framework focused on **configurability and throughput-aware scheduling**. Every component — aggregation strategy, model architecture, PEFT method, triage policy, and aggregation interval — is swappable via a central configuration system. The core value is the FL infrastructure (cloud daemon + edge clients + configurable aggregation) enhanced with smart aggregation planning based on real client performance measurements.
