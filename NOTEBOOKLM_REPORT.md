# FL Fullstack — Complete Codebase Report

## 1. Project Overview

**Repository:** `https://github.com/Dhanush-sai-reddy/fl-fullstack`

A full-stack federated learning platform consisting of four independent subsystems: a FastAPI backend, a React frontend dashboard, a Python client SDK, and a configurable FL core with cloud aggregation, edge daemons, and throughput benchmarking. The project's goal is privacy-preserving distributed model training where data never leaves the edge — only weight updates travel.

**Tech Stack:**
- Backend: FastAPI, SQLAlchemy 2.0, PostgreSQL, Pydantic, python-jose (JWT), slowapi (rate limiting)
- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Recharts, WebGPU, BroadcastChannel P2P
- Client SDK: Python, requests with retry
- FL Core: NumPy, configurable strategy registry, throughput benchmarking
- DevOps: Docker Compose (PostgreSQL + FastAPI + React)

---

## 2. File Inventory

### Root Level
| File | Purpose |
|------|---------|
| `__init__.py` | Package init, version 0.1.0 |
| `config.py` | Centralized FL settings (FlCoreSettings class) |
| `PROJECT_OVERVIEW.md` | Architecture docs |
| `README.md` | Project documentation |
| `.gitignore` | Git ignore rules |
| `docker-compose.yml` | Multi-service Docker deployment |

### Backend (`backend/`)
| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app entry point, CORS, rate limiting, router mounting |
| `app/core/config.py` | DATABASE_URL, JWT secret, rate limit settings |
| `app/core/auth.py` | JWT creation/verification, API token lookup, user extraction |
| `app/core/deps.py` | Dependency injection: get_db, get_or_create_user, require_auth |
| `app/core/rate_limit.py` | TokenRateLimiter class, per-token/IP rate limiting |
| `app/db/session.py` | SQLAlchemy engine + session factory |
| `app/db/init_db.py` | Creates all tables via metadata.create_all |
| `app/models/base.py` | SQLAlchemy declarative base |
| `app/models/user.py` | User model (email, hashed_password, is_active) |
| `app/models/project.py` | Project model (name, task_type, invite_code, status) |
| `app/models/project_role.py` | ProjectRole model (host/client/viewer per project) |
| `app/models/training_round.py` | TrainingRound model (round_number, status, min_clients) |
| `app/models/client_update.py` | ClientUpdate model (num_examples, avg_loss, weights_delta JSON) |
| `app/models/model_config.py` | ModelConfig model (base_model_id, tuning_strategy, precision, hyperparams) |
| `app/models/model_snapshot.py` | ModelSnapshot model (version, storage_path, source) |
| `app/models/api_token.py` | ApiToken model (token, type, project_id, expiration, rate limit) |
| `app/schemas/auth.py` | Pydantic schemas for auth endpoints |
| `app/schemas/fl.py` | Pydantic schemas: RoundStartRequest, RoundOut, ClientUpdateIn |
| `app/schemas/clients.py` | Pydantic schema: ProjectClientOut |
| `app/schemas/projects.py` | Pydantic schemas: ProjectCreate, ProjectOut, ProjectDetailOut, etc. |
| `app/api/routes_health.py` | GET /health/ready — readiness probe |
| `app/api/routes_auth.py` | POST/GET/DELETE /api/auth/tokens — API token CRUD |
| `app/api/routes_projects.py` | CRUD /api/projects — create, list, get, join by invite code |
| `app/api/routes_fl.py` | FL round lifecycle + browser client endpoints + telemetry |
| `app/api/routes_models.py` | GET /api/models/recommended, /api/models/all — HF model catalog |
| `app/api/routes_clients.py` | GET /api/projects/{id}/clients — list project members |
| `app/services/fedavg.py` | FedAvg weighted aggregation over JSON-friendly weight vectors |

### Frontend (`frontend/`)
| File | Purpose |
|------|---------|
| `index.html` | HTML entry point |
| `index.tsx` | React root mount |
| `App.tsx` | Main app component with mode switching (landing/host/client/training) |
| `types.ts` | TypeScript types + TASK_HIERARCHY (multimodal/NLP/CV/Audio tasks) |
| `context/FLContext.tsx` | React context: device fingerprinting, WebGPU worker, OPFS, weight submission |
| `services/geminiService.ts` | Gemini API: model discovery, PEFT explanation, training script generation |
| `services/p2pService.ts` | BroadcastChannel-based P2P communication |
| `components/SetupWizard.tsx` | 3-step wizard: model selection, PEFT config, round setup |
| `components/HostDashboard.tsx` | Host view: client list, training rounds, charts, code generation |
| `components/ClientView.tsx` | Edge client view: file upload, session join, training simulation |
| `components/FLDashboard.tsx` | Browser training dashboard: config, WebGPU init, progress |
| `components/WebMCPBridge.tsx` | MCP server connectivity check (HuggingFace Space) |
| `workers/fl.worker.ts` | Web Worker: WebGPU init, training loop, OPFS checkpoints, telemetry |
| `workers/webgpu-engine.ts` | WGSL compute shaders for LoRA forward/backward pass |
| `utils/fl-api.ts` | Weight upload/download API (JSON + binary formats) |
| `package.json` | NPM dependencies |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite build config |
| `metadata.json` | App metadata |
| `index.css` | Global styles |

### Client SDK (`client_sdk/`)
| File | Purpose |
|------|---------|
| `fl_client.py` | FLClient class: auth headers, retry, project/round/update APIs |
| `example_colab.py` | Example Colab script using FLClient + PyTorch |
| `requirements.txt` | SDK dependencies (requests) |
| `README.md` | SDK documentation |

### FL Core — Cloud (`cloud/`)
| File | Purpose |
|------|---------|
| `__init__.py` | Re-exports + CloudAggregator class |
| `aggregator.py` | 5 strategies: fedavg, fedprox, trimmed_mean, krum, coordinate_median |

### FL Core — Edge (`edge/`)
| File | Purpose |
|------|---------|
| `__init__.py` | Re-exports EdgeDaemon |
| `daemon.py` | EdgeDaemon: calibrate, train_local, submit_update |

### FL Core — Benchmarks (`benchmarks/`)
| File | Purpose |
|------|---------|
| `__init__.py` | Re-exports all benchmark classes |
| `throughput.py` | ThroughputBenchmark, ClientProfile, AggregationPlan dataclasses |
| `scheduler.py` | AdaptiveScheduler: decide when to aggregate based on throughput |

---

## 3. Database Schema (PostgreSQL)

```
User
├── id: UUID (PK)
├── email: VARCHAR(255) UNIQUE
├── hashed_password: VARCHAR(255)
├── is_active: BOOLEAN
└── external_client_id: VARCHAR(255) NULL

Project
├── id: UUID (PK)
├── name: VARCHAR(255)
├── description: TEXT NULL
├── task_type: ENUM(text_classification|summarization|qa|generation)
├── owner_id: UUID FK -> User NULL
├── invite_code: VARCHAR(32) UNIQUE
└── status: ENUM(active|paused|archived)

ProjectRole
├── id: UUID (PK)
├── project_id: UUID FK -> Project
├── user_id: UUID FK -> User
└── role: ENUM(host|client|viewer)

ModelConfig
├── id: UUID (PK)
├── project_id: UUID FK -> Project
├── base_model_id: VARCHAR(255)
├── hf_task: ENUM(text_classification|summarization|qa|generation)
├── tuning_strategy: ENUM(full_finetune|lora|qlora)
├── precision: ENUM(fp32|fp16|int8|nf4)
├── max_seq_len: INT (default 512)
├── learning_rate: FLOAT (default 5e-5)
├── num_train_epochs: INT (default 3)
├── batch_size: INT (default 8)
├── image_size: INT NULL
├── resize_strategy: VARCHAR(50) NULL
└── normalize: BOOLEAN (default true)

TrainingRound
├── id: UUID (PK)
├── project_id: UUID FK -> Project
├── round_number: INT
├── global_model_version: INT (default 0)
├── status: ENUM(pending|collecting|aggregated|failed)
├── expected_clients: INT NULL
└── min_clients: INT (default 1)

ClientUpdate
├── id: UUID (PK)
├── round_id: UUID FK -> TrainingRound
├── user_id: UUID FK -> User NULL
├── num_examples: INT
├── avg_loss: FLOAT NULL
└── weights_delta: JSONB

ModelSnapshot
├── id: UUID (PK)
├── project_id: UUID FK -> Project
├── round_id: UUID FK -> TrainingRound NULL
├── version: INT
├── storage_path: VARCHAR(512)
└── source: ENUM(hf_hub|uploaded|aggregated)

ApiToken
├── id: UUID (PK)
├── token: VARCHAR(64) UNIQUE
├── token_type: ENUM(project_client|user_api)
├── project_id: UUID FK -> Project NULL
├── user_id: UUID FK -> User NULL
├── name: VARCHAR(255) NULL
├── is_active: BOOLEAN (default true)
├── expires_at: TIMESTAMP NULL
└── requests_per_minute: INT (default 60)
```

---

## 4. API Endpoints

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health/ready` | None | Readiness probe |

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/tokens` | Bearer | Create API token |
| GET | `/api/auth/tokens` | Bearer | List user's tokens |
| DELETE | `/api/auth/tokens/{token_id}` | Bearer | Revoke token |

### Projects
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/projects` | x-user-email | Create project (auto-generates invite code) |
| GET | `/api/projects` | x-user-email | List user's projects |
| GET | `/api/projects/{project_id}` | x-user-email | Get project details |
| POST | `/api/projects/join` | x-user-email | Join project by invite code |

### FL Rounds
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/projects/{project_id}/rounds/start` | x-user-email | Start new training round |
| GET | `/api/projects/{project_id}/rounds` | x-user-email | List all rounds |
| GET | `/api/projects/{project_id}/rounds/current` | x-user-email | Get latest round |
| POST | `/api/projects/{project_id}/rounds/{round_id}/updates` | x-user-email | Submit client update (triggers aggregation at min_clients) |

### FL Browser (simplified)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/fl/updates` | None | Submit browser client update (auto-creates project/round) |
| POST | `/api/telemetry` | None | Receive training telemetry |
| GET | `/api/fl/models/{model_id}/weights` | None | Get latest aggregated weights |

### Models
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/models/recommended?task_type=X` | None | Get recommended HF models for task |
| GET | `/api/models/all` | None | Get all models by task type |

### Clients
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects/{project_id}/clients` | x-user-email | List project members |

---

## 5. Component Details

### 5.1 Backend Aggregation (`backend/app/services/fedavg.py`)

**Input format:** `List[ClientWeights]` where `ClientWeights = {"num_examples": int, "weights_delta": {"param_name": [float, ...]}}`

**Algorithm:** Weighted average. Each client's contribution is weighted by `num_examples / total_examples`. Operates in-place on float lists for JSON compatibility.

**Limitations:** Only supports FedAvg. No configurable strategy selection. No integration with the cloud/aggregator.py registry.

### 5.2 Cloud Aggregator (`cloud/aggregator.py`)

**Input format:** `List[Tuple[Weights, int]]` where `Weights = List[np.ndarray]` — a list of numpy arrays, one per layer, paired with sample count.

**Strategies:**
- `fedavg`: Weighted mean by sample count
- `fedprox`: Same as FedAvg (proximal term is client-side)
- `trimmed_mean`: Coordinate-wise, trims top/bottom `trim_ratio` fraction per coordinate
- `krum`: Selects the update closest to all others (Byzantine-robust)
- `coordinate_median`: Coordinate-wise median (outlier-robust)

**Factory pattern:** `get_strategy("krum", num_malicious=2)` returns a callable.

### 5.3 Edge Daemon (`edge/daemon.py`)

**Calibration:** Runs one training batch, measures elapsed time, computes samples/sec and estimated epoch time.

**Training:** Runs N epochs locally using a user-provided `train_fn` callback. Returns loss history.

**Update:** Builds payload dict with client_id, trained_on_version, num_samples, class_distribution, weights. **Does NOT make HTTP calls** — returns the dict for the caller to send.

### 5.4 Throughput Benchmark (`benchmarks/throughput.py`)

**ClientProfile dataclass:** Stores per-client throughput metrics (samples/sec, time/batch, epoch estimate, class distribution, network latency).

**AggregationPlan dataclass:** Output of planning — recommended interval, min clients, batch size, expected round time, list of slow clients to drop, reasoning strings.

**ThroughputBenchmark class:** Records calibration data, measures locally, plans aggregation timing. Key logic: waits for slowest active client, drops stragglers below threshold, computes expected round time including network latency.

### 5.5 Adaptive Scheduler (`benchmarks/scheduler.py`)

Wraps ThroughputBenchmark. `should_aggregate(num_clients_ready, elapsed_sec)` returns True when enough clients are ready and enough time has elapsed. `update_profile()` replans when new client data arrives.

### 5.6 Frontend P2P Service (`frontend/services/p2pService.ts`)

Uses `BroadcastChannel` API for same-browser tab-to-tab communication. Session code becomes the channel name (`fl_session_{code}`). Messages: JOIN_REQUEST, JOIN_ACCEPT, START_ROUND, CLIENT_UPDATE, ROUND_COMPLETE, SESSION_CLOSED.

**Limitation:** BroadcastChannel only works within the same browser. Not real network P2P.

### 5.7 Frontend Gemini Service (`frontend/services/geminiService.ts`)

Four AI-powered functions:
- `getModelRecommendations`: Queries Gemini for HF model suggestions based on task/params
- `explainPeftConfig`: Generates PEFT optimization explanation
- `generateSimulationLog`: Generates training telemetry narrative
- `generateTrainingScript`: Generates a complete Python Flower/PEFT training script

### 5.8 WebGPU Training Worker (`frontend/workers/fl.worker.ts`)

Runs in a Web Worker thread. Initializes WebGPU device, manages OPFS checkpoints, runs training loop (currently simulated — not real GPU compute). Streams telemetry to backend. Saves checkpoints per epoch for crash recovery.

### 5.9 WebGPU Engine (`frontend/workers/webgpu-engine.ts`)

WGSL compute shaders for LoRA:
- Forward: `output = W_base * input + scale * A * B * input`
- Backward: Computes gradients for LoRA A and B matrices

Manages GPU buffers for base weights, LoRA A/B, gradients. Provides weight serialization/deserialization for network transfer.

### 5.10 FL Context (`frontend/context/FLContext.tsx`)

React context providing: device fingerprinting (FingerprintJS), WebGPU worker lifecycle, OPFS dataset selection, training progress, weight submission to backend (`POST /api/fl/updates`). Hardcodes `num_examples: 1000` and `avg_loss: 0.5` for submissions.

### 5.11 Client SDK (`client_sdk/fl_client.py`)

Python client with retry strategy (3 retries, exponential backoff, retries on 429/5xx). Auth via Bearer token header. Endpoints: get_project, get_current_round, list_rounds, submit_update, get_model_config, health_check. Also provides `extract_weights_from_model()` and `compute_weight_delta()` PyTorch helpers.

---

## 6. Data Flow Analysis

### Flow A: Browser-Based Training (What actually happens)
```
1. User opens frontend → Landing page
2. SetupWizard: picks category/task → Gemini suggests models → configures PEFT → sets rounds
3. Host gets session code (random 6 chars)
4. Client opens another tab → enters session code → selects local file
5. P2P: Client sends JOIN_REQUEST via BroadcastChannel
6. P2P: Host sends JOIN_ACCEPT with config
7. Host clicks "INIT BROADCAST" → P2P sends START_ROUND
8. Client: simulateTraining() runs 3-second timer → sends CLIENT_UPDATE
9. Host receives CLIENT_UPDATE → marks client complete
10. When all clients complete → finishRound() → Gemini generates log → accuracy incremented
11. After all rounds → training complete
```
**Backend involvement: NONE.** The P2P flow never touches the FastAPI backend.

### Flow B: FL Context Training (Browser WebGPU path)
```
1. FLProvider mounts → FingerprintJS generates deviceId
2. User initializes → Worker created → WebGPU device requested → OPFS checkpoint dir created
3. User starts training → Worker runs simulated training loop
4. Worker streams telemetry → POST /api/telemetry (hits backend)
5. Worker completes → FLContext.submitWeights() → POST /api/fl/updates (hits backend)
6. Backend auto-creates "browser-training" project and round
7. Backend checks if min_clients reached → runs fedavg_weighted if so
```
**Backend involvement: YES.** This path actually uses the backend API.

### Flow C: Python Client SDK (The intended FL path)
```
1. Host creates project via POST /api/projects
2. Host creates API token via POST /api/auth/tokens
3. Client installs SDK, gets token from host
4. Client: FLClient(api_base_url, api_token)
5. Client: get_current_round(project_id) → gets round info
6. Client trains locally with PyTorch
7. Client: compute_weight_delta(model_before, model_after)
8. Client: submit_update(project_id, round_id, num_examples, weights_delta)
9. Backend stores ClientUpdate → when min_clients reached → fedavg_weighted
10. Client: get_current_round() → sees new version → downloads new weights
```
**Backend involvement: YES.** This is the complete working path.

### Flow D: Edge Daemon (FL Core)
```
1. EdgeDaemon(client_id, server_url, num_samples, class_dist)
2. daemon.calibrate(train_batch_fn) → returns calibration payload dict
3. daemon.train_local(train_fn, val_fn) → trains N epochs, returns history
4. daemon.submit_update(weights, version) → returns payload dict
```
**Backend involvement: NONE.** EdgeDaemon never makes HTTP calls. It only builds dicts.

---

## 7. Integration Status

### What Actually Connects

| From | To | Status | Notes |
|------|----|--------|-------|
| Frontend FLContext | Backend /api/fl/updates | CONNECTED | Submits weights after WebGPU training |
| Frontend FLContext | Backend /api/telemetry | CONNECTED | Streams training progress |
| Frontend SetupWizard | Gemini API | CONNECTED | Model recommendations, PEFT explanation |
| Frontend HostDashboard | Gemini API | CONNECTED | Training script generation, simulation logs |
| Frontend WebMCPBridge | HuggingFace Space | CONNECTED | MCP server ping |
| Client SDK | Backend API | CONNECTED | Full FL round lifecycle |
| Backend routes_fl | Backend services/fedavg | CONNECTED | Aggregation triggers at min_clients |
| Backend routes_auth | Backend auth | CONNECTED | JWT + API token auth |

### What Does NOT Connect

| From | To | Status | Problem |
|------|----|--------|---------|
| Frontend P2P flow | Backend API | DISCONNECTED | P2P training never calls backend |
| Edge Daemon | Backend API | DISCONNECTED | submit_update returns dict, no HTTP |
| Cloud Aggregator | Backend | DISCONNECTED | Different interface (numpy vs JSON), never imported |
| Benchmarks | Anywhere | DISCONNECTED | Never called by any component |
| Config settings | Anywhere | DISCONNECTED | FlCoreSettings never read by backend/frontend |
| Edge Daemon | Cloud Aggregator | DISCONNECTED | Different data formats |
| Backend aggregation | Cloud strategies | DISCONNECTED | Backend hardcodes FedAvg, ignores registry |

---

## 8. Authentication System

### Three Auth Methods (inconsistent)

**1. x-user-email header (legacy)**
- Used by: Project routes, FL round routes, client list
- Behavior: Auto-creates user if email not found
- No password required

**2. Bearer JWT token**
- Used by: Auth token routes
- Created via: jose JWT library with SECRET_KEY
- Verified via: get_current_user_or_token()

**3. API Token (database-stored)**
- Used by: Client SDK
- Created via: POST /api/auth/tokens
- Stored in: ApiToken table
- Supports: per-token rate limiting, project scoping, expiration

**4. No auth**
- Used by: /health/ready, /api/fl/updates (browser), /api/telemetry, /api/fl/models/{id}/weights, /api/models/*

### Rate Limiting
- slowapi for IP-based limiting
- TokenRateLimiter for per-token limiting
- Default: 60 requests/minute

---

## 9. Known Bugs and Issues

### Critical
1. **Edge daemon never sends updates to server** — `submit_update()` returns a dict, no HTTP call
2. **Cloud aggregator not integrated** — Backend hardcodes `fedavg_weighted`, ignores the 5-strategy registry
3. **Benchmarks never called** — AdaptiveScheduler and ThroughputBenchmark exist but nothing invokes them
4. **Config settings ignored** — `FlCoreSettings` is never read by any component

### Medium
5. **P2P only works same-browser** — BroadcastChannel can't cross network boundaries
6. **Docker compose wrong env var** — `NEXT_PUBLIC_API_BASE_URL` (Vite uses `VITE_*`)
7. **Docker compose wrong port** — Frontend on 3000 but Vite serves on 5173
8. **WebGPU training simulated** — Worker does `Math.random()` updates, not real GPU compute
9. **ClientUpdate hardcodes values** — FLContext submits `num_examples: 1000, avg_loss: 0.5` always
10. **Gemini script generation prompt vague** — "Raw Python Flower/PEFT MCP client script" doesn't specify backend API format

### Low
11. **Auth inconsistency** — Three different auth methods across routes
12. **No graceful degradation** — Frontend fails silently if Gemini API is down
13. **Client SDK example uses localhost** — Hardcoded `http://localhost:8000`

---

## 10. Configurable Components (fl-core/config.py)

```python
class FlCoreSettings:
    # Aggregation
    AVAILABLE_STRATEGIES = ["fedavg", "fedprox", "trimmed_mean", "krum", "median"]
    AGGREGATION_METHOD = "fedavg"
    TRIM_RATIO = 0.2
    KRUM_NUM_MALICIOUS = 1
    FEDPROX_MU = 0.01

    # Models
    SUPPORTED_MODELS = ["densenet121", "resnet50"]
    DEFAULT_MODEL = "densenet121"

    # PEFT
    PEFT_METHOD = "lora"  # or "qlora"
    LORA_R = 4
    LORA_ALPHA = 8
    LORA_DROPOUT = 0.1
    QLORA_BITS = 4

    # Training
    NUM_CLIENTS = 3
    NUM_ROUNDS = 3
    BATCH_SIZE = 32
    LR = 1e-3
    LOCAL_EPOCHS = 3

    # Throughput
    BENCHMARK_ENABLED = True
    BENCHMARK_TARGET_ROUND_SEC = 300.0
    SLOW_CLIENT_THRESHOLD_SAMPLES_PER_SEC = 5.0

    # Ports
    DAEMON_PORT = 8004
    CLOUD_MANAGER_PORT = 8000
```

---

## 11. What Works End-to-End

### Path 1: Python Client SDK → Backend (Fully working)
Host creates project → client joins → host starts round → client trains PyTorch model → client submits weight deltas → backend aggregates when min_clients reached → new model version created.

### Path 2: Browser WebGPU → Backend (Partially working)
User initializes WebGPU → training runs (simulated) → telemetry streamed to backend → weights submitted to /api/fl/updates → backend aggregates.

### What Does NOT Work End-to-End
- Edge Daemon → Cloud → Aggregation → Model distribution (Edge never calls Cloud)
- Frontend P2P training → Backend metrics (P2P is isolated)
- Config settings → Strategy selection (Config is never read)
- Throughput benchmark → Aggregation scheduling (Benchmarks are never called)
- Gemini script generation → Edge execution (Generated scripts don't match backend API)

---

## 12. Summary

The codebase is a well-structured but disconnected set of components. The backend is production-quality with proper auth, rate limiting, database schema, and API design. The frontend is polished with a futuristic UI, WebGPU support, and AI integration. The FL core has solid algorithm implementations and throughput benchmarking.

The main gap is integration: the four subsystems (backend, frontend, SDK, FL core) were built independently and don't communicate. The most impactful fixes would be:

1. Wire Edge Daemon → Backend (add HTTP calls)
2. Wire Cloud Aggregator → Backend (replace hardcoded FedAvg)
3. Wire Benchmarks → Scheduler (call AdaptiveScheduler from backend)
4. Wire Config → All components (read FlCoreSettings from backend)
5. Fix Docker Compose (correct env vars and ports)
