from typing import Annotated, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.crud.crud import crud_component, crud_project
from app.models.models import User
from app.schemas.schemas import ComponentCreate, ComponentRead, ComponentUpdate
from app.core.security import get_current_user, PermissionChecker

router = APIRouter(prefix="/components", tags=["components"])

require_manage_components = PermissionChecker(["manage_components"])

@router.get("/", response_model=List[ComponentRead])
async def get_components(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    project_id: Optional[int] = None
) -> List[Any]:
    """Mengambil semua komponen, opsional difilter berdasarkan project_id."""
    if project_id:
        res = await crud_component.get_multi(db, project_id=project_id, limit=100)
    else:
        res = await crud_component.get_multi(db, limit=100)
    return res["data"]

@router.post("/", response_model=ComponentRead, status_code=status.HTTP_201_CREATED)
async def create_component(
    component_in: ComponentCreate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_components)]
) -> Any:
    """User dengan permission manage_components menambahkan komponen teknis."""
    # Cek apakah project valid
    project = await crud_project.get(db, id=component_in.project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyek tidak ditemukan"
        )
    return await crud_component.create(db, component_in)


@router.put("/{component_id}", response_model=ComponentRead)
async def update_component(
    component_id: int,
    component_in: ComponentUpdate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_components)]
) -> Any:
    """User dengan permission manage_components memperbarui komponen teknis."""
    component = await crud_component.get(db, id=component_id)
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Komponen tidak ditemukan"
        )
    if component_in.project_id is not None:
        project = await crud_project.get(db, id=component_in.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyek tidak ditemukan"
            )
    return await crud_component.update(db, component_in, id=component_id)

@router.delete("/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(
    component_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_components)]
) -> None:
    """User dengan permission manage_components menghapus komponen teknis."""
    component = await crud_component.get(db, id=component_id)
    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Komponen tidak ditemukan"
        )
    await crud_component.delete(db, id=component_id)
