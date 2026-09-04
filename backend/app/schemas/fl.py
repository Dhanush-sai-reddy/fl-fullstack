from typing import Dict, List, Optional

from pydantic import BaseModel

from app.models.training_round import RoundStatus


class RoundStartRequest(BaseModel):
    expected_clients: Optional[int] = None
    min_clients: int = 1


class RoundOut(BaseModel):
    id: str
    round_number: int
    status: RoundStatus
    expected_clients: Optional[int]
    min_clients: int

    class Config:
        from_attributes = True


class ClientUpdateIn(BaseModel):
    num_examples: int
    avg_loss: Optional[float] = None
    weights_delta: Dict[str, List[float]]
