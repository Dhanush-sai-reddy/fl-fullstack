# FL Fullstack

A configurable federated learning platform with a FastAPI backend, React frontend dashboard, Python client SDK, and throughput-aware aggregation scheduling. Data never leaves the edge — only weight updates travel.

## Project Structure

```
fl-fullstack/
├── backend/              FastAPI server (auth, projects, FL aggregation, models)
│   └── app/
│       ├── api/          Route handlers
│       ├── core/         Config, auth, rate limiting
│       ├── db/           SQLAlchemy models, session management
│       ├── models/       DB models (users, projects, rounds, clients)
│       ├── schemas/      Pydantic request/response schemas
│       └── services/     FedAvg aggregation, business logic
├── frontend/             React 19 dashboard (Vite + Tailwind)
│   └── components/       SetupWizard, HostDashboard, ClientView, FLDashboard
├── client_sdk/           Python SDK for edge clients (Colab, PyCharm, etc.)
├── cloud/                Configurable aggregation strategies (5 options)
├── edge/                 Edge daemon (client-side FL worker)
├── benchmarks/           Throughput measurement and aggregation scheduling
├── config.py             Centralized settings
├── docker-compose.yml    One-command deployment
└── PROJECT_OVERVIEW.md   Detailed architecture docs
```

## What It Does

1. **Host** creates a project, selects an aggregation strategy, and gets a session code
2. **Edge clients** connect using the Python SDK or browser, calibrate their throughput
3. **Cloud** measures client speeds and computes optimal aggregation intervals
4. **Aggregation** runs on the server using the configured strategy (FedAvg, FedProx, etc.)
5. **Dashboard** shows real-time training metrics, client status, and round history

## Configurable Aggregation Strategies

| Strategy | What It Does | Configurable Parameters |
|----------|-------------|------------------------|
| `fedavg` | Weighted mean by dataset size | Sample weights |
| `fedprox` | FedAvg + proximal regularization (client-side) | `mu` |
| `trimmed_mean` | Byzantine-robust trimmed mean | `trim_ratio` |
| `krum` | Selects the most consistent client update | `num_malicious` |
| `median` | Coordinate-wise median | None |

Switch strategies via config:
```python
from config import settings
settings.set_strategy("krum", num_malicious=2)
```

## Throughput-Based Aggregation

The cloud doesn't just aggregate blindly — it measures how fast each client trains and schedules aggregation accordingly:

- Waits for the slowest active client before aggregating
- Drops stragglers below a configurable speed threshold
- Computes expected round time including network latency
- Recommends batch size from client median speeds

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/Dhanush-sai-reddy/fl-fullstack.git
cd fl-fullstack
docker-compose up --build
```

Open `http://localhost:5173` for the dashboard.

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Client SDK:**
```bash
cd client_sdk
pip install -r requirements.txt
python example_colab.py
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/auth/login` | POST | Login, get JWT token |
| `/api/projects` | CRUD | Manage FL projects |
| `/api/fl/rounds` | GET | Get training rounds |
| `/api/fl/updates` | POST | Submit weight updates |
| `/api/fl/models` | GET | Get global model weights |
| `/api/clients` | GET | List connected clients |

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Pydantic
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts
- **Client SDK**: Python, requests
- **FL Core**: NumPy, configurable aggregation registry
- **DevOps**: Docker Compose

## License

MIT
