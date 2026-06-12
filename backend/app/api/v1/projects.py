from typing import Annotated, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.crud.crud import crud_project
from app.models.models import Project, User
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectRead
from app.core.security import get_current_user, PermissionChecker

router = APIRouter(prefix="/projects", tags=["projects"])

require_manage_projects = PermissionChecker(["manage_projects"])

@router.get("/", response_model=List[ProjectRead])
async def get_projects(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> List[Any]:
    """Mengambil semua daftar proyek yang ada."""
    res = await crud_project.get_multi(db, limit=100)
    return res["data"]

@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_projects)]
) -> Any:
    """User dengan permission manage_projects membuat proyek baru."""
    return await crud_project.create(db, project_in)

@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> Any:
    """Mengambil informasi detail suatu proyek."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyek tidak ditemukan"
        )
    return project

@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_projects)]
) -> Any:
    """User dengan permission manage_projects memperbarui informasi proyek."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyek tidak ditemukan"
        )
    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
    await db.flush()
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_projects)]
) -> None:
    """User dengan permission manage_projects menghapus proyek beserta task dan komponen."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyek tidak ditemukan"
        )
    await db.delete(project)
    await db.flush()
