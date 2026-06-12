from typing import Annotated, List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.db import get_async_session
from app.crud.crud import crud_status
from app.schemas.schemas import StatusCreate, StatusRead, StatusUpdate
from app.core.security import PermissionChecker, get_current_user
from app.models.models import AggregationRule, RuleCondition, Status, Task, TaskComponentStatus, User

router = APIRouter(prefix="/statuses", tags=["statuses"])

require_manage_statuses = PermissionChecker(["manage_statuses"])

@router.get("/", response_model=List[StatusRead])
async def get_statuses(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> List[Any]:
    """Mengambil semua daftar status yang tersedia."""
    res = await crud_status.get_multi(db, limit=100)
    return res["data"]


@router.post("/", response_model=StatusRead, status_code=status.HTTP_201_CREATED)
async def create_status(
    status_in: StatusCreate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_statuses)]
) -> Any:
    """Supadmin membuat status baru untuk target makro atau kondisi rule."""
    try:
        return await crud_status.create(db, status_in)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama status sudah digunakan"
        )


@router.put("/{status_id}", response_model=StatusRead)
async def update_status(
    status_id: int,
    status_in: StatusUpdate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_statuses)]
) -> Any:
    """Supadmin memperbarui status."""
    status_obj = await db.get(Status, status_id)
    if not status_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status tidak ditemukan"
        )
    if status_in.name is not None:
        status_obj.name = status_in.name
    if status_in.category is not None:
        status_obj.category = status_in.category
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama status sudah digunakan"
        )
    return status_obj


async def status_reference_count(db: AsyncSession, status_id: int) -> int:
    reference_models = [
        (Task, Task.macro_status_id),
        (TaskComponentStatus, TaskComponentStatus.status_id),
        (AggregationRule, AggregationRule.target_status_id),
        (RuleCondition, RuleCondition.expected_status_id),
    ]
    total = 0
    for model, column in reference_models:
        stmt = select(func.count()).select_from(model).where(column == status_id)
        res = await db.execute(stmt)
        total += res.scalar_one()
    return total


@router.delete("/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_status(
    status_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_statuses)]
) -> None:
    """Supadmin menghapus status jika belum digunakan data lain."""
    status_obj = await db.get(Status, status_id)
    if not status_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status tidak ditemukan"
        )
    if await status_reference_count(db, status_id) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status masih digunakan task/rule dan tidak dapat dihapus"
        )
    await crud_status.delete(db, id=status_id)
