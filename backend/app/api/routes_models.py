from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_or_create_user
from app.models.model_config import ModelConfig
from app.models.model_snapshot import ModelSnapshot
from app.models.project import Project
from app.models.user import User
from app.schemas.models import ModelSnapshotOut

import uuid


router = APIRouter()


def _ensure_project(db: Session, project_id: uuid.UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/projects/{project_id}/models", response_model=List[ModelSnapshotOut])
def list_model_snapshots(
    project_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_or_create_user),
) -> List[ModelSnapshotOut]:
    try:
        pid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found")

    _ensure_project(db, pid)

    cfg: Optional[ModelConfig] = (
        db.query(ModelConfig).filter(ModelConfig.project_id == pid).first()
    )

    snapshots = (
        db.query(ModelSnapshot)
        .filter(ModelSnapshot.project_id == pid)
        .order_by(ModelSnapshot.version.desc())
        .all()
    )

    out: List[ModelSnapshotOut] = []
    for s in snapshots:
        out.append(
            ModelSnapshotOut(
                version=s.version,
                source=s.source,
                base_model_id=cfg.base_model_id if cfg is not None else s.storage_path,
                tuning_strategy=cfg.tuning_strategy if cfg is not None else None,  # type: ignore[arg-type]
                precision=cfg.precision if cfg is not None else None,  # type: ignore[arg-type]
            )
        )

    return out
