from typing import Optional

from pydantic import BaseModel

from app.models.model_snapshot import SnapshotSource
from app.models.model_config import PrecisionType, TuningStrategy


class ModelSnapshotOut(BaseModel):
    version: int
    source: SnapshotSource
    base_model_id: str
    tuning_strategy: Optional[TuningStrategy] = None
    precision: Optional[PrecisionType] = None
