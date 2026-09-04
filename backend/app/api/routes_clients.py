from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_or_create_user
from app.models.project import Project
from app.models.project_role import ProjectRole
from app.models.user import User
from app.schemas.clients import ProjectClientOut

import uuid


router = APIRouter()


def _ensure_project(db: Session, project_id: uuid.UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/projects/{project_id}/clients", response_model=List[ProjectClientOut])
def list_project_clients(
    project_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_or_create_user),
) -> List[ProjectClientOut]:
    try:
        pid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    _ensure_project(db, pid)

    q = (
        db.query(ProjectRole, User)
        .join(User, ProjectRole.user_id == User.id)
        .filter(ProjectRole.project_id == pid)
    )

    out: List[ProjectClientOut] = []
    for pr, u in q.all():
        out.append(
            ProjectClientOut(
                user_email=u.email,
                role=pr.role,
                status=None,
            )
        )

    return out
