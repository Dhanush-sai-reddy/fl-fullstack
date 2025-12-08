# Setup Guide

## Prerequisites

- Docker & Docker Compose (or Python 3.10+, Node.js 20+, PostgreSQL 15)
- Git

## First Time Setup

### 1. Clone and Navigate

```bash
git clone <repo-url>
cd fl-platform-fullstack
```

### 2. Start with Docker

```bash
docker-compose up
```

This will:
- Start PostgreSQL on port 5432
- Build and start the backend on port 8000
- Build and start the frontend on port 3000

First build might take a few minutes to download dependencies.

### 3. Verify It's Working

- Open http://localhost:3000 - should see the dashboard
- Open http://localhost:8000/docs - FastAPI docs
- Check http://localhost:8000/health/ready - should return `{"status": "ready"}`

## Development Setup

### Backend Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run with hot reload
uvicorn app.main:app --reload --port 8000
```

The backend will auto-reload on code changes.

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend hot-reloads automatically.

### Database Setup

If running without Docker, you need PostgreSQL:

```bash
# Using Docker for just the DB
docker run -d \
  --name fl-db \
  -e POSTGRES_USER=fl_user \
  -e POSTGRES_PASSWORD=fl_password \
  -e POSTGRES_DB=fl_platform \
  -p 5432:5432 \
  postgres:15

# Or install PostgreSQL locally and create the database
createdb fl_platform
```

The backend will create tables automatically on first startup.

## Environment Variables

Create a `.env` file in the project root (optional):

```env
# Database
DATABASE_URL=postgresql+psycopg2://fl_user:fl_password@localhost:5432/fl_platform

# Backend
SECRET_KEY=your-secret-key-change-this
DEFAULT_RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_ENABLED=true

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Troubleshooting

**Port already in use:**
```bash
# Check what's using the port
lsof -i :8000  # or netstat -ano | findstr :8000 on Windows

# Change ports in docker-compose.yml if needed
```

**Database connection errors:**
- Make sure PostgreSQL is running
- Check DATABASE_URL is correct
- Wait a few seconds after starting docker-compose (DB needs time to initialize)

**Frontend can't connect to backend:**
- Check NEXT_PUBLIC_API_BASE_URL matches your backend URL
- Make sure backend is running on port 8000
- Check CORS settings in backend/app/main.py

**Docker build fails:**
- Make sure Docker has enough memory (4GB+ recommended)
- Try `docker-compose build --no-cache` to rebuild from scratch

## Next Steps

1. Create a project via the web UI
2. Generate an API token (see AUTHENTICATION.md)
3. Connect a client using the SDK (see client_sdk/README.md)

