from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_or_create_user
from app.models.model_config import ModelConfig, PrecisionType, TuningStrategy
from app.models.model_snapshot import ModelSnapshot, SnapshotSource
from app.models.project import Project, ProjectStatus, TaskType
from app.models.project_role import ProjectRole, ProjectRoleType
from app.models.user import User
from app.schemas.projects import (
    ModelConfigOut,
    ProjectCreate,
    ProjectDetailOut,
    ProjectOut,
    ProjectJoinRequest,
)
import secrets
import uuid


router = APIRouter()


def _generate_invite_code() -> str:
    return secrets.token_hex(4).upper()


def _recommend_model_for_task(task_type: TaskType) -> tuple[str, TuningStrategy, PrecisionType]:
    if task_type == TaskType.text_classification:
        return "distilbert-base-uncased", TuningStrategy.lora, PrecisionType.fp16
    if task_type == TaskType.summarization:
        return "t5-small", TuningStrategy.lora, PrecisionType.fp16
    if task_type == TaskType.qa:
        return "distilbert-base-cased-distilled-squad", TuningStrategy.lora, PrecisionType.fp16
    # default for other text generation-like tasks
    return "gpt2", TuningStrategy.lora, PrecisionType.fp16


def _project_role_for_user(db: Session, project_id: uuid.UUID, user_id: uuid.UUID) -> Optional[ProjectRoleType]:
    role = (
        db.query(ProjectRole)
        .filter(ProjectRole.project_id == project_id, ProjectRole.user_id == user_id)
        .first()
    )
    return role.role if role else None


@router.post("/projects", response_model=ProjectDetailOut)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_or_create_user),
) -> ProjectDetailOut:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing x-user-email header")

    invite_code = _generate_invite_code()

    project = Project(
        name=payload.name,
        description=payload.description,
        task_type=payload.task_type,
        owner_id=user.id,
        invite_code=invite_code,
        status=ProjectStatus.active,
    )
    db.add(project)
    db.flush()

    base_model_id, tuning_strategy, precision = _recommend_model_for_task(payload.task_type)
    model_cfg = ModelConfig(
        project_id=project.id,
        base_model_id=base_model_id,
        hf_task=payload.task_type,
        tuning_strategy=tuning_strategy,
        precision=precision,
    )
    db.add(model_cfg)

    # initial snapshot representing the base HF model
    snapshot = ModelSnapshot(
        project_id=project.id,
        round_id=None,
        version=1,
        storage_path=base_model_id,
        source=SnapshotSource.hf_hub,
    )
    db.add(snapshot)

    # assign host role
    role = ProjectRole(project_id=project.id, user_id=user.id, role=ProjectRoleType.host)
    db.add(role)

    db.commit()
    db.refresh(project)

    model_out = ModelConfigOut(
        base_model_id=model_cfg.base_model_id,
        tuning_strategy=model_cfg.tuning_strategy,
        precision=model_cfg.precision,
    )

    return ProjectDetailOut(
        id=str(project.id),
        name=project.name,
        description=project.description,
        task_type=project.task_type,
        status=project.status,
        invite_code=project.invite_code,
        role=ProjectRoleType.host.value,
        model=model_out,
    )


@router.get("/projects", response_model=List[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_or_create_user),
) -> List[ProjectOut]:
    if user is None:
        return []

    q = (
        db.query(Project, ProjectRole)
        .join(ProjectRole, Project.id == ProjectRole.project_id)
        .filter(ProjectRole.user_id == user.id)
    )

    results: List[ProjectOut] = []
    for project, role in q.all():
        results.append(
            ProjectOut(
                id=str(project.id),
                name=project.name,
                description=project.description,
                task_type=project.task_type,
                status=project.status,
                invite_code=project.invite_code,
                role=role.role.value,
            )
        )

    return results


@router.get("/projects/{project_id}", response_model=ProjectDetailOut)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_or_create_user),
) -> ProjectDetailOut:
    try:
        pid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project = db.query(Project).filter(Project.id == pid).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    role_value: Optional[str] = None
    if user is not None:
        role = _project_role_for_user(db, pid, user.id)
        role_value = role.value if role else None

    model_cfg = db.query(ModelConfig).filter(ModelConfig.project_id == pid).first()
    model_out: Optional[ModelConfigOut] = None
    if model_cfg is not None:
        model_out = ModelConfigOut(
            base_model_id=model_cfg.base_model_id,
            tuning_strategy=model_cfg.tuning_strategy,
            precision=model_cfg.precision,
        )

    return ProjectDetailOut(
        id=str(project.id),
        name=project.name,
        description=project.description,
        task_type=project.task_type,
        status=project.status,
        invite_code=project.invite_code,
        role=role_value,
        model=model_out,
    )


@router.post("/projects/join", response_model=ProjectOut)
def join_project(
    payload: ProjectJoinRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_or_create_user),
) -> ProjectOut:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing x-user-email header")

    project = (
        db.query(Project)
        .filter(Project.invite_code == payload.invite_code, Project.status == ProjectStatus.active)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    existing = (
        db.query(ProjectRole)
        .filter(ProjectRole.project_id == project.id, ProjectRole.user_id == user.id)
        .first()
    )
    if not existing:
        role = ProjectRole(project_id=project.id, user_id=user.id, role=ProjectRoleType.client)
        db.add(role)
        db.commit()
        db.refresh(project)
        role_value = ProjectRoleType.client.value
    else:
        role_value = existing.role.value

    return ProjectOut(
        id=str(project.id),
        name=project.name,
        description=project.description,
        task_type=project.task_type,
        status=project.status,
        invite_code=project.invite_code,
        role=role_value,
    )
