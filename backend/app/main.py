from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.routes_auth import router as auth_router
from app.api.routes_health import router as health_router
from app.api.routes_projects import router as projects_router
from app.api.routes_fl import router as fl_router
from app.api.routes_models import router as models_router
from app.api.routes_clients import router as clients_router
from app.core.rate_limit import limiter
from app.db.init_db import init_db


app = FastAPI(title="FL Platform Backend", version="0.1.0")

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """Initialize database schema on startup.

    For production you would replace this with Alembic migrations.
    """
    init_db()


app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(auth_router, prefix="/api", tags=["auth"])
app.include_router(projects_router, prefix="/api", tags=["projects"])
app.include_router(fl_router, prefix="/api", tags=["fl"])
app.include_router(models_router, prefix="/api", tags=["models"])
app.include_router(clients_router, prefix="/api", tags=["clients"])
