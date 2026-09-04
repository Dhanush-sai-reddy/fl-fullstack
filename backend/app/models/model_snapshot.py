import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SnapshotSource(str, enum.Enum):
    hf_hub = "hf_hub"        # direct from HuggingFace
    uploaded = "uploaded"    # host uploaded weights
    aggregated = "aggregated"  # FL aggregation result


class ModelSnapshot(Base):
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("project.id"), nullable=False, index=True
    )

    # Optional link to a training round that produced this snapshot
    round_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("traininground.id"), nullable=True, index=True
    )

    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Could be an HF repo id, or an S3/object-store path, or local path
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)

    source: Mapped[SnapshotSource] = mapped_column(
        Enum(SnapshotSource), nullable=False, default=SnapshotSource.hf_hub
    )
