from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_auth
from app.models.api_token import ApiToken, TokenType
from app.models.project import Project
from app.models.user import User
from app.schemas.auth import ApiTokenOut, TokenGenerateRequest
import uuid


router = APIRouter()


@router.post("/auth/tokens", response_model=ApiTokenOut)
def create_api_token(
    payload: TokenGenerateRequest,
    db: Session = Depends(get_db),
    user_and_token: tuple[User, Optional[ApiToken]] = Depends(require_auth),
) -> ApiTokenOut:
    """
    Generate an API token for external client access (Colab, PyCharm, etc.).
    
    - For project_client tokens: requires user to be part of the project
    - For user_api tokens: requires authenticated user
    """
    user, _ = user_and_token
    
    # Validate project access if project_id is provided
    project_id = None
    if payload.project_id:
        try:
            pid = uuid.UUID(payload.project_id)
            project = db.query(Project).filter(Project.id == pid).first()
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            # Check user has access to project
            from app.models.project_role import ProjectRole
            role = db.query(ProjectRole).filter(
                ProjectRole.project_id == pid,
                ProjectRole.user_id == user.id
            ).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this project"
                )
            
            project_id = pid
            token_type = TokenType.project_client
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid project_id format"
            )
    else:
        token_type = TokenType.user_api
    
    # Generate token
    token_str = ApiToken.generate_token()
    
    # Calculate expiration
    expires_at = None
    if payload.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=payload.expires_in_days)
    
    # Create token record
    api_token = ApiToken(
        token=token_str,
        token_type=token_type,
        project_id=project_id,
        user_id=user.id,
        name=payload.name,
        is_active=True,
        expires_at=expires_at,
        requests_per_minute=payload.requests_per_minute or 60,
    )
    
    db.add(api_token)
    db.commit()
    db.refresh(api_token)
    
    return ApiTokenOut(
        id=str(api_token.id),
        token=api_token.token,  # Only return token on creation
        token_type=api_token.token_type.value,
        project_id=str(api_token.project_id) if api_token.project_id else None,
        name=api_token.name,
        expires_at=api_token.expires_at.isoformat() if api_token.expires_at else None,
        requests_per_minute=api_token.requests_per_minute,
        created_at=api_token.created_at.isoformat(),
    )


@router.get("/auth/tokens", response_model=List[ApiTokenOut])
def list_api_tokens(
    db: Session = Depends(get_db),
    user_and_token: tuple[User, Optional[ApiToken]] = Depends(require_auth),
) -> List[ApiTokenOut]:
    """List all API tokens for the authenticated user."""
    user, _ = user_and_token
    
    tokens = db.query(ApiToken).filter(
        ApiToken.user_id == user.id,
        ApiToken.is_active == True
    ).order_by(ApiToken.created_at.desc()).all()
    
    return [
        ApiTokenOut(
            id=str(t.id),
            token="***" + t.token[-8:] if t.token else None,  # Mask token
            token_type=t.token_type.value,
            project_id=str(t.project_id) if t.project_id else None,
            name=t.name,
            expires_at=t.expires_at.isoformat() if t.expires_at else None,
            requests_per_minute=t.requests_per_minute,
            created_at=t.created_at.isoformat(),
        )
        for t in tokens
    ]


@router.delete("/auth/tokens/{token_id}")
def revoke_api_token(
    token_id: str,
    db: Session = Depends(get_db),
    user_and_token: tuple[User, Optional[ApiToken]] = Depends(require_auth),
) -> dict:
    """Revoke (deactivate) an API token."""
    user, _ = user_and_token
    
    try:
        tid = uuid.UUID(token_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    token = db.query(ApiToken).filter(
        ApiToken.id == tid,
        ApiToken.user_id == user.id
    ).first()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    token.is_active = False
    db.commit()
    
    return {"status": "revoked", "token_id": token_id}

