from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.db import get_async_session
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.models.models import User, UserGroup
from app.schemas.schemas import UserCreate, UserRead, Token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate, 
    db: Annotated[AsyncSession, Depends(get_async_session)]
) -> User:
    # Cek username atau email unik
    stmt = select(User).where((User.username == user_in.username) | (User.email == user_in.email))
    res = await db.execute(stmt)
    existing = res.scalars().all()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username atau Email sudah terdaftar"
        )
    
    group_stmt = select(UserGroup).where(UserGroup.name == "Developer")
    group_res = await db.execute(group_stmt)
    group = group_res.scalar_one_or_none()

    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        username=user_in.username,
        email=user_in.email,
        role=group.name if group else "Developer",
        group_id=group.id if group else None,
        password_hash=hashed_pwd
    )
    db.add(user)
    await db.flush()
    await db.refresh(user, attribute_names=["group"])
    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_async_session)]
) -> Token:
    stmt = select(User).where(User.username == form_data.username).options(selectinload(User.group))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username atau Password salah"
        )
        
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return Token(access_token=access_token, token_type="bearer")

@router.get("/me", response_model=UserRead)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user
