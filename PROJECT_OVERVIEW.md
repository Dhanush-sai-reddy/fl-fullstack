# FL Fullstack — Architecture Overview

## What This Is

A full-stack federated learning platform. Cloud server aggregates model updates from edge clients. Every major component — aggregation strategy, model backbone, PEFT method, training hyperparameters — is configurable.

## Core Components

### 1. Backend (FastAPI)

- JWT authentication with token-based access control
- Project management (create, list, configure FL jobs)
- FL round lifecycle (start round, collect updates, aggregate, increment version)
- Client registration and heartbeat tracking
- Model snapshot storage and distribution
- Rate limiting per endpoint

### 2. Frontend (React)

- Setup wizard for configuring FL projects
- Host dashboard showing connected clients, round status, training metrics
- Client view for monitoring local training
- FL dashboard with real-time loss/accuracy charts (Recharts)

### 3. Client SDK (Python)

- Simple `FLClient` class for connecting from Colab, PyCharm, or any Python environment
- Automatic retry with exponential backoff
- Round lifecycle management (get current round, submit update, fetch weights)
- Works with any PyTorch/TF model — just pass weight deltas as dicts

### 4. Cloud Aggregation (fl-core/cloud/)

Five pluggable aggregation strategies:

```python
from cloud import get_strategy, CloudAggregator

# Use any strategy with the same interface
agg = CloudAggregator("fedprox", mu=0.01)
aggregated_weights = agg.aggregate(client_updates)
```

- **FedAvg**: Weighted average by sample count
- **FedProx**: Same aggregation, proximal term applied client-side
- **Trimmed Mean**: Removes top/bottom fraction per coordinate (Byzantine-robust)
- **Krum**: Selects the update closest to all others
- **Median**: Coordinate-wise median (robust to outliers)

### 5. Edge Daemon (fl-core/edge/)

Client-side worker that:
- Calibrates by measuring training throughput (samples/sec)
- Reports class distribution and timing to the cloud
- Trains locally for configurable epochs
- Submits weight updates

### 6. Throughput Benchmark (fl-core/benchmarks/)

Measures client performance and plans aggregation:

- Records samples/sec, time/batch, estimated epoch time per client
- Identifies bottleneck client (slowest)
- Computes optimal aggregation interval (waits for slowest active client)
- Drops stragglers below configurable threshold
- Recommends batch size from client median speeds

## Training Flow

```
1. Host creates project, selects strategy (e.g. "fedprox")
2. Edge clients connect, submit calibration data
3. Cloud runs throughput benchmark → plans aggregation interval
4. Cloud distributes current global weights (version N)
5. Clients train locally for LOCAL_EPOCHS
6. Clients submit weight deltas to /api/fl/updates
7. Cloud aggregates using configured strategy
8. Version incremented to N+1
9. Repeat from step 4
```

## Configuration

All settings in `config.py`:

```python
from config import settings

# Switch aggregation strategy
settings.set_strategy("krum", num_malicious=2)

# Training hyperparameters
settings.LOCAL_EPOCHS = 5
settings.BATCH_SIZE = 64
settings.LR = 0.001

# Model selection
settings.DEFAULT_MODEL = "densenet121"
settings.PEFT_METHOD = "lora"
```

## Deployment

```bash
docker-compose up --build
```

Services:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Key Design Decisions

1. **Data never leaves the edge** — only weight deltas (floats) are transmitted
2. **Strategy-agnostic backend** — any aggregation method plugs in via registry
3. **Throughput-aware scheduling** — aggregation interval adapts to measured client speeds, not fixed timers
4. **Client SDK is model-agnostic** — works with any framework, just pass weight dicts
5. **JWT auth on all endpoints** — no open endpoints except health check
