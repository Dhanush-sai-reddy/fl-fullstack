import os


DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://fl_user:fl_password@db:5432/fl_platform",
)
