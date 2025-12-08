from typing import Dict, Iterable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_or_create_user
from app.models.client_update import ClientUpdate
from app.models.model_snapshot import ModelSnapshot, SnapshotSource
from app.models.project import Project
from app.models.training_round import RoundStatus, TrainingRound
from app.models.user import User
from app.schemas.fl import ClientUpdateIn, RoundOut, RoundStartRequest
from app.services.fedavg import ClientWeights, fedavg_weighted

import uuid


router = APIRouter()


def _ensure_project(db: Session, project_id: uuid.UUID) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _next_round_number(db: Session, project_id: uuid.UUID) -> int:
    last = (
        db.query(TrainingRound)
        .filter(TrainingRound.project_id == project_id)
        .order_by(TrainingRound.round_number.desc())
        .first()
    )
    return (last.round_number + 1) if last else 1


def _round_out(round_obj: TrainingRound) -> RoundOut:
    return RoundOut(
        id=str(round_obj.id),
        round_number=round_obj.round_number,
        status=round_obj.status,
        expected_clients=round_obj.expected_clients,
        min_clients=round_obj.min_clients,
    )


@router.post("/projects/{project_id}/rounds/start", response_model=RoundOut)
def start_round(
    project_id: str,
    payload: RoundStartRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_or_create_user),
) -> RoundOut:
    # In a real system you would verify that the user is the host.
    try:
        pid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    _ensure_project(db, pid)

    round_number = _next_round_number(db, pid)

    tr = TrainingRound(
        project_id=pid,
        round_number=round_number,
        global_model_version=0,
        status=RoundStatus.collecting,
        expected_clients=payload.expected_clients,
        min_clients=payload.min_clients,
    )
    db.add(tr)
    db.commit()
    db.refresh(tr)

    return _round_out(tr)


@router.get("/projects/{project_id}/rounds", response_model=List[RoundOut])
def list_rounds(
    project_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_or_create_user),
) -> List[RoundOut]:
    try:
        pid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    _ensure_project(db, pid)

    rounds = (
        db.query(TrainingRound)
        .filter(TrainingRound.project_id == pid)
        .order_by(TrainingRound.round_number.desc())
        .all()
    )

    return [_round_out(r) for r in rounds]


@router.get("/projects/{project_id}/rounds/current", response_model=Optional[RoundOut])
def get_current_round(
    project_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_or_create_user),
) -> Optional[RoundOut]:
    try:
        pid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    _ensure_project(db, pid)

    tr = (
        db.query(TrainingRound)
        .filter(TrainingRound.project_id == pid)
        .order_by(TrainingRound.round_number.desc())
        .first()
    )

    if not tr:
        return None

    return _round_out(tr)


@router.post("/projects/{project_id}/rounds/{round_id}/updates")
def submit_update(
    project_id: str,
    round_id: str,
    payload: ClientUpdateIn,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_or_create_user),
) -> Dict[str, object]:
    try:
        pid = uuid.UUID(project_id)
        rid = uuid.UUID(round_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project or round not found")

    _ensure_project(db, pid)

    tr = db.query(TrainingRound).filter(TrainingRound.id == rid, TrainingRound.project_id == pid).first()
    if not tr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Round not found")

    cu = ClientUpdate(
        round_id=tr.id,
        user_id=user.id if user is not None else None,
        num_examples=payload.num_examples,
        avg_loss=payload.avg_loss,
        weights_delta=payload.weights_delta,
    )
    db.add(cu)
    db.commit()

    # Check if we have enough updates to aggregate
    updates = db.query(ClientUpdate).filter(ClientUpdate.round_id == tr.id).all()

    aggregated = False
    created_snapshot_version: Optional[int] = None

    if len(updates) >= tr.min_clients and tr.status != RoundStatus.aggregated:
        updates_payload: List[ClientWeights] = [
            {
                "num_examples": u.num_examples,
                "weights_delta": u.weights_delta,
            }
            for u in updates
        ]

        agg = fedavg_weighted(updates_payload)

        tr.status = RoundStatus.aggregated
        db.add(tr)

        # create a new aggregated model snapshot marker
        last_snapshot = (
            db.query(ModelSnapshot)
            .filter(ModelSnapshot.project_id == pid)
            .order_by(ModelSnapshot.version.desc())
            .first()
        )
        next_version = (last_snapshot.version + 1) if last_snapshot else 1

        snapshot = ModelSnapshot(
            project_id=pid,
            round_id=tr.id,
            version=next_version,
            storage_path=f"aggregated:round-{tr.round_number}",
            source=SnapshotSource.aggregated,
        )
        db.add(snapshot)
        db.commit()

        aggregated = True
        created_snapshot_version = next_version

    return {
        "status": "ok",
        "aggregated": aggregated,
        "created_snapshot_version": created_snapshot_version,
    }
