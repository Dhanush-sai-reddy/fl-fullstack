from fastapi import APIRouter

router = APIRouter()


@router.get("/ready")
async def readiness_probe() -> dict:
    return {"status": "ok"}
