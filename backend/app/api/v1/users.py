from typing import Annotated, List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.db import get_async_session
from app.schemas.schemas import UserRead, UserCreate, UserUpdate
from app.core.security import get_current_user, get_password_hash, PermissionChecker, user_has_permission
from app.models.models import User, UserGroup

router = APIRouter(prefix="/users", tags=["users"])

require_manage_users = PermissionChecker(["manage_users"])


async def resolve_user_group(db: AsyncSession, group_id: int | None, role: str | None) -> UserGroup | None:
    if group_id:
        group = await db.get(UserGroup, group_id)
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group user tidak ditemukan"
            )
        return group
    if role:
        stmt = select(UserGroup).where(UserGroup.name == role)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()
    return None

@router.get("/", response_model=List[UserRead])
async def get_users(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> List[Any]:
    """Mengambil semua daftar user yang terdaftar di sistem."""
    stmt = select(User).options(selectinload(User.group)).order_by(User.username)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_users)]
) -> Any:
    """User dengan permission manage_users membuat user baru di sistem."""
    # Cek username/email unik
    stmt = select(User).where((User.username == user_in.username) | (User.email == user_in.email))
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username atau Email sudah terdaftar"
        )
    
    group = await resolve_user_group(db, user_in.group_id, user_in.role)
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        username=user_in.username,
        email=user_in.email,
        role=group.name if group else user_in.role,
        group_id=group.id if group else None,
        password_hash=hashed_pwd
    )
    db.add(user)
    await db.flush()
    await db.refresh(user, attribute_names=["group"])
    return user

@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> Any:
    """Admin user dapat memperbarui user apa saja. User biasa hanya profil sendiri."""
    # Ambil user dari DB
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan"
        )

    # Validasi otorisasi
    can_manage_users = user_has_permission(current_user, "manage_users")
    if not can_manage_users and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki wewenang untuk mengubah data user lain"
        )

    # Update fields
    if user_in.username is not None:
        user.username = user_in.username
    if user_in.email is not None:
        user.email = user_in.email
    if user_in.role is not None or user_in.group_id is not None:
        if not can_manage_users:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hanya user dengan permission manage_users yang dapat mengubah group/peran pengguna"
            )
        group = await resolve_user_group(db, user_in.group_id, user_in.role)
        user.role = group.name if group else user_in.role
        user.group_id = group.id if group else None
    if user_in.password is not None:
        user.password_hash = get_password_hash(user_in.password)

    await db.flush()
    await db.refresh(user, attribute_names=["group"])
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_users)]
) -> None:
    """User dengan permission manage_users menghapus user dari sistem."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda tidak dapat menghapus akun Anda sendiri"
        )

    await db.delete(user)
    await db.flush()
