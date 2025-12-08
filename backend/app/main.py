from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_health import router as health_router
from app.api.routes_projects import router as projects_router
from app.api.routes_fl import router as fl_router
from app.api.routes_models import router as models_router
from app.api.routes_clients import router as clients_router
from app.db.init_db import init_db


app = FastAPI(title="FL Platform Backend", version="0.1.0")

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
app.include_router(projects_router, prefix="/api", tags=["projects"])
app.include_router(fl_router, prefix="/api", tags=["fl"])
app.include_router(models_router, prefix="/api", tags=["models"])
app.include_router(clients_router, prefix="/api", tags=["clients"])
