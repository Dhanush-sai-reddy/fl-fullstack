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


# ============================================================================
# Browser Client Endpoints (Device-ID based, simpler than project/round flow)
# ============================================================================

@router.post("/fl/updates")
def submit_browser_update(
    payload: ClientUpdateIn,
    db: Session = Depends(get_db),
) -> Dict[str, object]:
    """
    Simplified endpoint for browser clients.
    Auto-creates or finds the latest round for the model.
    """
    # For browser clients, we use a default project or create one
    # In production, you'd match by model_id or similar
    
    # Get or create a default browser-training project
    project = db.query(Project).filter(Project.name == "browser-training").first()
    if not project:
        project = Project(
            name="browser-training",
            description="Auto-created project for browser-based FL training",
            model_id="browser-lora",
            use_peft=True,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
    
    # Get or create current round
    tr = (
        db.query(TrainingRound)
        .filter(TrainingRound.project_id == project.id)
        .filter(TrainingRound.status == RoundStatus.collecting)
        .order_by(TrainingRound.round_number.desc())
        .first()
    )
    
    if not tr:
        round_number = _next_round_number(db, project.id)
        tr = TrainingRound(
            project_id=project.id,
            round_number=round_number,
            global_model_version=0,
            status=RoundStatus.collecting,
            expected_clients=10,
            min_clients=2,
        )
        db.add(tr)
        db.commit()
        db.refresh(tr)
    
    # Store update
    cu = ClientUpdate(
        round_id=tr.id,
        user_id=None,
        num_examples=payload.num_examples,
        avg_loss=payload.avg_loss,
        weights_delta=payload.weights_delta,
    )
    db.add(cu)
    db.commit()
    
    # Check aggregation
    updates = db.query(ClientUpdate).filter(ClientUpdate.round_id == tr.id).all()
    aggregated = False
    
    if len(updates) >= tr.min_clients and tr.status != RoundStatus.aggregated:
        updates_payload: List[ClientWeights] = [
            {"num_examples": u.num_examples, "weights_delta": u.weights_delta}
            for u in updates
        ]
        fedavg_weighted(updates_payload)
        tr.status = RoundStatus.aggregated
        db.add(tr)
        db.commit()
        aggregated = True
    
    return {
        "success": True,
        "roundId": str(tr.id),
        "aggregationStatus": "completed" if aggregated else "pending",
        "clientsInRound": len(updates),
    }


@router.post("/telemetry")
def receive_telemetry(
    payload: Dict[str, object],
) -> Dict[str, str]:
    """
    Receive real-time telemetry from browser clients.
    In production, you'd store this in a time-series DB or stream to a dashboard.
    """
    # Log telemetry (in production: store in InfluxDB, Prometheus, etc.)
    device_id = payload.get("deviceId", "unknown")
    epoch = payload.get("epoch", 0)
    batch = payload.get("batch", 0)
    loss = payload.get("loss", 0)
    speed = payload.get("speed", 0)
    
    print(f"[Telemetry] Device={device_id} Epoch={epoch} Batch={batch} Loss={loss:.4f} Speed={speed:.0f}")
    
    return {"status": "received"}


@router.get("/fl/models/{model_id}/weights")
def get_global_weights(
    model_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, object]:
    """
    Get the latest aggregated global weights for a model.
    Browser clients call this at the start of each round.
    """
    # Find the latest aggregated snapshot
    project = db.query(Project).filter(Project.name == "browser-training").first()
    if not project:
        raise HTTPException(status_code=404, detail="No training project found")
    
    snapshot = (
        db.query(ModelSnapshot)
        .filter(ModelSnapshot.project_id == project.id)
        .filter(ModelSnapshot.source == SnapshotSource.aggregated)
        .order_by(ModelSnapshot.version.desc())
        .first()
    )
    
    if not snapshot:
        # No aggregated weights yet - return empty (first round)
        return {
            "version": 0,
            "weights": None,
            "message": "No aggregated weights available yet",
        }
    
    # In production, you'd load actual weights from storage_path
    # For now, return metadata
    return {
        "version": snapshot.version,
        "roundId": str(snapshot.round_id),
        "storagePath": snapshot.storage_path,
        "weights": None,  # Would be actual weight data in production
    }

