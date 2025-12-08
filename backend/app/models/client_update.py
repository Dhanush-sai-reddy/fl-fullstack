import uuid

from sqlalchemy import Float, ForeignKey, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ClientUpdate(Base):
    round_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("traininground.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user.id"), nullable=True, index=True
    )

    num_examples: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_loss: Mapped[float | None] = mapped_column(Float, nullable=True)

    # JSON blob holding parameter deltas or full weights in a simple mapping:
    # {"param_name": [..floats..]}
    weights_delta: Mapped[dict] = mapped_column(JSON, nullable=False)
