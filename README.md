# FL Platform

Full-stack federated learning platform. Run training rounds, aggregate model updates, and manage projects - all from one place.

## What's This?

A platform for coordinating federated learning experiments. Hosts create projects, clients join via invite codes, and everyone submits weight updates that get aggregated using FedAvg. Works great with Colab, PyCharm, or any Python environment.

## Quick Start

### With Docker (Recommended)

```bash
# Start everything
docker-compose up

# Or run in background
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop everything
docker-compose down
```

Once running:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### Without Docker

**Backend:**
```bash
cd backend
pip install -r requirements.txt

# Make sure PostgreSQL is running
# Set DATABASE_URL env var or edit app/core/config.py

uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Database:**
```bash
# Using Docker just for DB
docker run -d \
  -e POSTGRES_USER=fl_user \
  -e POSTGRES_PASSWORD=fl_password \
  -e POSTGRES_DB=fl_platform \
  -p 5432:5432 \
  postgres:15
```

Check out `client_sdk/` if you want to connect from external environments.

## Stack

- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Frontend**: Next.js
- **ML**: Hugging Face transformers, PEFT support

## Features

- Project management with invite codes
- Training rounds with status tracking
- FedAvg aggregation
- Model versioning and snapshots
- API token auth for external clients
- Rate limiting built-in

See `SETUP.md` for detailed setup instructions and `AUTHENTICATION.md` for connecting external clients.