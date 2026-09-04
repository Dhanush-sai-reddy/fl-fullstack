from typing import Optional

from pydantic import BaseModel


class TokenGenerateRequest(BaseModel):
    """Request to generate an API token."""
    name: Optional[str] = None  # Human-readable name for the token
    project_id: Optional[str] = None  # For project-scoped tokens
    expires_in_days: Optional[int] = None  # Token expiration (None = never expires)
    requests_per_minute: Optional[int] = 60  # Rate limit for this token


class ApiTokenOut(BaseModel):
    """API token response."""
    id: str
    token: Optional[str] = None  # Only returned on creation, masked in list
    token_type: str
    project_id: Optional[str] = None
    name: Optional[str] = None
    expires_at: Optional[str] = None
    requests_per_minute: Optional[int] = None
    created_at: str
    
    class Config:
        from_attributes = True

