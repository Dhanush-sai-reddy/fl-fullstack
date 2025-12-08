from pydantic import BaseModel

from app.models.project_role import ProjectRoleType


class ProjectClientOut(BaseModel):
    user_email: str
    role: ProjectRoleType
    status: str | None = None
