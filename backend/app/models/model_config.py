import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.project import TaskType


class TuningStrategy(str, enum.Enum):
    full_finetune = "full_finetune"
    lora = "lora"
    qlora = "qlora"


class PrecisionType(str, enum.Enum):
    fp32 = "fp32"
    fp16 = "fp16"
    int8 = "int8"
    nf4 = "nf4"


class ModelConfig(Base):
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("project.id"), nullable=False, index=True
    )

    base_model_id: Mapped[str] = mapped_column(String(255), nullable=False)
    hf_task: Mapped[TaskType] = mapped_column(Enum(TaskType), nullable=False)

    tuning_strategy: Mapped[TuningStrategy] = mapped_column(
        Enum(TuningStrategy), nullable=False, default=TuningStrategy.lora
    )
    precision: Mapped[PrecisionType] = mapped_column(
        Enum(PrecisionType), nullable=False, default=PrecisionType.fp16
    )

    max_seq_len: Mapped[int] = mapped_column(Integer, nullable=False, default=512)
    learning_rate: Mapped[float] = mapped_column(Float, nullable=False, default=5e-5)
    num_train_epochs: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    
    # Data preprocessing
    batch_size: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    image_size: Mapped[int | None] = mapped_column(Integer, nullable=True)  # For vision tasks
    resize_strategy: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 'crop', 'pad', 'resize'
    normalize: Mapped[bool] = mapped_column(default=True, nullable=False)