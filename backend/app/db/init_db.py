from app.db.session import engine
from app.models.base import Base
import app.models  # noqa: F401  # ensure models are imported for metadata


def init_db() -> None:
    """Create all database tables.

    In a real system you would use Alembic migrations. For initial scaffolding
    we use metadata.create_all.
    """
    Base.metadata.create_all(bind=engine)
