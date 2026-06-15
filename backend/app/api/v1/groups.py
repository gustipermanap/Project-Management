from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.db import get_async_session
from app.core.permissions import ALL_PERMISSION_KEYS
from app.core.security import PermissionChecker, get_current_user
from app.models.models import User, UserGroup
from app.schemas.schemas import PermissionCatalog, UserGroupCreate, UserGroupRead, UserGroupUpdate

router = APIRouter(prefix="/groups", tags=["groups"])

require_manage_groups = PermissionChecker(["manage_groups"])


def validate_permissions(permissions: List[str]) -> List[str]:
    unknown_permissions = [permission for permission in permissions if permission not in ALL_PERMISSION_KEYS]
    if unknown_permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Permission tidak dikenal: {unknown_permissions}"
        )
    unique_permissions = []
    for permission in permissions:
        if permission not in unique_permissions:
            unique_permissions.append(permission)
    return unique_permissions


@router.get("/permissions", response_model=PermissionCatalog)
async def get_permission_catalog(
    current_user: Annotated[User, Depends(get_current_user)]
) -> PermissionCatalog:
    """Mengambil daftar permission key yang tersedia untuk group."""
    return PermissionCatalog(permissions=ALL_PERMISSION_KEYS)


@router.get("/", response_model=List[UserGroupRead])
async def get_groups(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> List[Any]:
    """Mengambil daftar group dan permission aktifnya."""
    stmt = select(UserGroup).order_by(UserGroup.name)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/", response_model=UserGroupRead, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_in: UserGroupCreate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_groups)]
) -> UserGroup:
    """Supadmin membuat group user baru."""
    group = UserGroup(
        name=group_in.name,
        description=group_in.description,
        is_system=False
    )
    group.permissions = validate_permissions(group_in.permissions)
    db.add(group)
    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama group sudah digunakan"
        )
    return group


@router.put("/{group_id}", response_model=UserGroupRead)
async def update_group(
    group_id: int,
    group_in: UserGroupUpdate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_groups)]
) -> UserGroup:
    """Supadmin memperbarui nama, deskripsi, dan permission group."""
    group = await db.get(UserGroup, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group tidak ditemukan"
        )

    update_data = group_in.model_dump(exclude_unset=True)
    if "name" in update_data:
        if group.is_system and update_data["name"] != group.name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nama group sistem tidak dapat diubah"
            )
        group.name = update_data["name"]
    if "description" in update_data:
        group.description = update_data["description"]
    if "permissions" in update_data:
        group.permissions = validate_permissions(update_data["permissions"])

    try:
        await db.flush()
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nama group sudah digunakan"
        )
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_groups)]
) -> None:
    """Supadmin menghapus group jika group belum dipakai user."""
    group = await db.get(UserGroup, group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group tidak ditemukan"
        )

    if group.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group sistem tidak dapat dihapus"
        )

    count_stmt = select(func.count()).select_from(User).where(User.group_id == group_id)
    count_res = await db.execute(count_stmt)
    user_count = count_res.scalar_one()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group masih digunakan user dan tidak dapat dihapus"
        )

    await db.delete(group)
    await db.flush()
