import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class TaskType(str, enum.Enum):
    text_classification = "text_classification"
    summarization = "summarization"
    qa = "qa"
    generation = "generation"


class ProjectStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    archived = "archived"


class Project(Base):
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    task_type: Mapped[TaskType] = mapped_column(Enum(TaskType), nullable=False)

    # Owner user; nullable for now until auth is wired
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user.id"), nullable=True
    )

    invite_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), nullable=False, default=ProjectStatus.active
    )

    # Relationships (optional usage for now)
    # owner = relationship("User", backref="owned_projects")
