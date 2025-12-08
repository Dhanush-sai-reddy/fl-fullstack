from typing import Generator, Optional

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_user(
    db: Session = Depends(get_db), x_user_email: Optional[str] = Header(default=None)
) -> Optional[User]:
    if not x_user_email:
        return None

    user = db.query(User).filter(User.email == x_user_email).first()
    if user:
        return user

    user = User(email=x_user_email, hashed_password="placeholder")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
