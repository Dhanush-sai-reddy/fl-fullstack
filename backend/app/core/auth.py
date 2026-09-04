from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import ALGORITHM, SECRET_KEY
from app.core.deps import get_db
from app.models.api_token import ApiToken, TokenType
from app.models.user import User


security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_user_from_token(token: str, db: Session) -> Optional[User]:
    """Get user from JWT token."""
    payload = verify_token(token)
    if payload is None:
        return None
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        return None
    try:
        import uuid
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        return user
    except (ValueError, AttributeError):
        return None


def get_api_token(token: str, db: Session) -> Optional[ApiToken]:
    """Get API token from database."""
    api_token = db.query(ApiToken).filter(
        ApiToken.token == token,
        ApiToken.is_active == True
    ).first()
    
    if api_token is None:
        return None
    
    # Check expiration
    if api_token.expires_at and api_token.expires_at < datetime.utcnow():
        return None
    
    return api_token


def get_current_user_or_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> tuple[Optional[User], Optional[ApiToken], Optional[str]]:
    """
    Authenticate user via JWT token or API token.
    Returns (user, api_token, auth_type).
    """
    token = credentials.credentials
    
    # Try API token first (for external clients)
    api_token = get_api_token(token, db)
    if api_token:
        user = None
        if api_token.user_id:
            user = db.query(User).filter(User.id == api_token.user_id).first()
        return (user, api_token, "api_token")
    
    # Try JWT token (for web users)
    user = get_user_from_token(token, db)
    if user:
        return (user, None, "jwt")
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def require_project_access(
    project_id: str,
    user: Optional[User] = None,
    api_token: Optional[ApiToken] = None,
    db: Session = None,
) -> bool:
    """
    Check if user/token has access to a project.
    Returns True if access is granted.
    """
    import uuid
    from app.models.project_role import ProjectRole
    
    try:
        pid = uuid.UUID(project_id)
    except ValueError:
        return False
    
    # API token with project_id must match
    if api_token and api_token.project_id:
        return api_token.project_id == pid
    
    # User must have a role in the project
    if user:
        role = db.query(ProjectRole).filter(
            ProjectRole.project_id == pid,
            ProjectRole.user_id == user.id
        ).first()
        return role is not None
    
    return False

