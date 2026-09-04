import enum
import secrets
import uuid

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TokenType(str, enum.Enum):
    """Token types for different use cases."""
    project_client = "project_client"  # For clients joining a specific project
    user_api = "user_api"  # For general user API access


class ApiToken(Base):
    """API tokens for authenticating external clients (Colab, PyCharm, etc.)."""
    
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    token_type: Mapped[TokenType] = mapped_column(Enum(TokenType), nullable=False)
    
    # Project-scoped token (for client tokens)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("project.id"), nullable=True, index=True
    )
    
    # User who owns/created this token
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user.id"), nullable=True, index=True
    )
    
    # Token metadata
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Human-readable name
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Expiration (optional)
    expires_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Rate limiting per token
    requests_per_minute: Mapped[int | None] = mapped_column(default=60, nullable=True)
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(48)  # 64 chars when base64 encoded

