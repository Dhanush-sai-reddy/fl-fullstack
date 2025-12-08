from typing import Optional

from pydantic import BaseModel

from app.models.project import ProjectStatus, TaskType
from app.models.model_config import PrecisionType, TuningStrategy


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: TaskType


class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    task_type: TaskType
    status: ProjectStatus
    invite_code: str
    role: Optional[str] = None

    class Config:
        from_attributes = True


class ModelConfigOut(BaseModel):
    base_model_id: str
    tuning_strategy: TuningStrategy
    precision: PrecisionType


class ProjectDetailOut(ProjectOut):
    model: Optional[ModelConfigOut] = None


class ProjectJoinRequest(BaseModel):
    invite_code: str

