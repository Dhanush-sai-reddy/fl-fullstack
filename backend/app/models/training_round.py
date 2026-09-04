import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RoundStatus(str, enum.Enum):
    pending = "pending"      # created, waiting to start
    collecting = "collecting"  # collecting client updates
    aggregated = "aggregated"  # aggregation done
    failed = "failed"


class TrainingRound(Base):
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("project.id"), nullable=False, index=True
    )

    round_number: Mapped[int] = mapped_column(Integer, nullable=False)

    global_model_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    status: Mapped[RoundStatus] = mapped_column(
        Enum(RoundStatus), nullable=False, default=RoundStatus.pending
    )

    # Optional: how many clients are expected and minimum required to aggregate
    expected_clients: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_clients: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
