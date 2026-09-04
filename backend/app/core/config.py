import os
from datetime import timedelta


DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://fl_user:fl_password@db:5432/fl_platform",
)

# JWT Settings
SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

# Rate Limiting
DEFAULT_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("DEFAULT_RATE_LIMIT_PER_MINUTE", "60"))
RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
