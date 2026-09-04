from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.project import TaskType

router = APIRouter()


# Popular Hugging Face models by task type
HF_MODELS = {
    "text_classification": [
        {"id": "distilbert-base-uncased", "name": "DistilBERT Base", "recommended": True},
        {"id": "bert-base-uncased", "name": "BERT Base", "recommended": False},
        {"id": "roberta-base", "name": "RoBERTa Base", "recommended": False},
        {"id": "distilroberta-base", "name": "DistilRoBERTa Base", "recommended": False},
        {"id": "albert-base-v2", "name": "ALBERT Base", "recommended": False},
    ],
    "summarization": [
        {"id": "t5-small", "name": "T5 Small", "recommended": True},
        {"id": "t5-base", "name": "T5 Base", "recommended": False},
        {"id": "facebook/bart-large-cnn", "name": "BART Large CNN", "recommended": False},
        {"id": "google/pegasus-xsum", "name": "Pegasus XSum", "recommended": False},
    ],
    "qa": [
        {"id": "distilbert-base-cased-distilled-squad", "name": "DistilBERT SQuAD", "recommended": True},
        {"id": "bert-large-uncased-whole-word-masking-finetuned-squad", "name": "BERT Large SQuAD", "recommended": False},
        {"id": "deepset/roberta-base-squad2", "name": "RoBERTa SQuAD2", "recommended": False},
    ],
    "generation": [
        {"id": "gpt2", "name": "GPT-2", "recommended": True},
        {"id": "gpt2-medium", "name": "GPT-2 Medium", "recommended": False},
        {"id": "distilgpt2", "name": "DistilGPT-2", "recommended": False},
    ],
}


@router.get("/models/recommended")
def get_recommended_models(
    task_type: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Get recommended Hugging Face models for a task type."""
    try:
        task = TaskType(task_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid task type: {task_type}")
    
    models = HF_MODELS.get(task_type, [])
    return {
        "task_type": task_type,
        "models": models,
        "recommended": next((m for m in models if m.get("recommended")), models[0] if models else None),
    }


@router.get("/models/all")
def get_all_models(
    db: Session = Depends(get_db),
) -> Dict[str, List[Dict]]:
    """Get all available models organized by task type."""
    return HF_MODELS
