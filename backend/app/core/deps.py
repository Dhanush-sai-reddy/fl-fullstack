from typing import Generator, Optional

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_or_token, security
from app.core.rate_limit import token_rate_limiter
from app.db.session import SessionLocal
from app.models.api_token import ApiToken
from app.models.user import User


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_user(
    db: Session = Depends(get_db), x_user_email: Optional[str] = Header(default=None)
) -> Optional[User]:
    """Legacy email-based auth (for backward compatibility)."""
    if not x_user_email:
        return None

    user = db.query(User).filter(User.email == x_user_email).first()
    if user:
        return user

    user = User(email=x_user_email, hashed_password="placeholder")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_authenticated_user(
    request: Request,
    db: Session = Depends(get_db),
) -> tuple[Optional[User], Optional[ApiToken]]:
    """
    Get authenticated user via Bearer token (JWT or API token).
    Falls back to email header for backward compatibility.
    """
    # Try Bearer token authentication first
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from fastapi.security import HTTPAuthorizationCredentials
            token = auth_header.replace("Bearer ", "")
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            user, api_token, _ = get_current_user_or_token(credentials, db)
            # Apply rate limiting
            token_rate_limiter.check_rate_limit(api_token, request)
            return (user, api_token)
        except Exception:
            pass  # Fall through to email header
    
    # Fallback to email header (backward compatibility)
    x_user_email = request.headers.get("x-user-email")
    if x_user_email:
        user = get_or_create_user(db, x_user_email)
        return (user, None)
    
    return (None, None)


def require_auth(
    request: Request,
    db: Session = Depends(get_db),
) -> tuple[User, Optional[ApiToken]]:
    """
    Require authentication (either token or email).
    Raises 401 if not authenticated.
    """
    from fastapi import HTTPException, status
    
    user, api_token = get_authenticated_user(request, db)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide Bearer token or x-user-email header.",
        )
    
    return (user, api_token)
