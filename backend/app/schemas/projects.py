from typing import Optional

from pydantic import BaseModel

from app.models.project import ProjectStatus, TaskType
from app.models.model_config import PrecisionType, TuningStrategy


class ModelConfigCreate(BaseModel):
    base_model_id: Optional[str] = None  # If None, use recommended
    tuning_strategy: Optional[TuningStrategy] = None
    precision: Optional[PrecisionType] = None
    max_seq_len: Optional[int] = None
    learning_rate: Optional[float] = None
    num_train_epochs: Optional[int] = None
    batch_size: Optional[int] = None
    image_size: Optional[int] = None
    resize_strategy: Optional[str] = None
    normalize: Optional[bool] = None


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: TaskType
    model_config: Optional[ModelConfigCreate] = None  # Optional custom model config


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

