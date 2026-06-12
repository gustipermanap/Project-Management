from typing import Annotated, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.db import get_async_session
from app.crud.crud import crud_aggregation_rule, crud_project, crud_status, crud_component
from app.models.models import User, AggregationRule, RuleCondition
from app.schemas.schemas import AggregationRuleCreate, AggregationRuleRead, AggregationRuleUpdate
from app.core.security import get_current_user, PermissionChecker

router = APIRouter(prefix="/rules", tags=["rules"])

require_manage_rules = PermissionChecker(["manage_rules"])


async def load_rule_with_relations(db: AsyncSession, rule_id: int) -> AggregationRule | None:
    stmt = (
        select(AggregationRule)
        .where(AggregationRule.id == rule_id)
        .options(
            selectinload(AggregationRule.target_status),
            selectinload(AggregationRule.conditions).selectinload(RuleCondition.component),
            selectinload(AggregationRule.conditions).selectinload(RuleCondition.expected_status)
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def validate_rule_references(
    db: AsyncSession,
    project_id: int,
    target_status_id: int,
    conditions: List[Any],
) -> None:
    project = await crud_project.get(db, id=project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyek tidak ditemukan"
        )

    status_obj = await crud_status.get(db, id=target_status_id)
    if not status_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status target tidak ditemukan"
        )

    for cond_in in conditions:
        comp = await crud_component.get(db, id=cond_in.component_id)
        if not comp or comp.project_id != project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Komponen dengan ID {cond_in.component_id} tidak valid untuk proyek ini"
            )

        exp_status = await crud_status.get(db, id=cond_in.expected_status_id)
        if not exp_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Status expected dengan ID {cond_in.expected_status_id} tidak ditemukan"
            )

@router.get("/", response_model=List[AggregationRuleRead])
async def get_rules(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    project_id: Optional[int] = None
) -> List[Any]:
    """Mengambil aturan otomatisasi agregasi, opsional difilter berdasarkan project_id."""
    stmt = (
        select(AggregationRule)
        .options(
            selectinload(AggregationRule.target_status),
            selectinload(AggregationRule.conditions).selectinload(RuleCondition.component),
            selectinload(AggregationRule.conditions).selectinload(RuleCondition.expected_status)
        )
    )
    if project_id:
        stmt = stmt.where(AggregationRule.project_id == project_id)
        
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/", response_model=AggregationRuleRead, status_code=status.HTTP_201_CREATED)
async def create_rule(
    rule_in: AggregationRuleCreate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_rules)]
) -> Any:
    """User dengan permission manage_rules membuat aturan agregasi status baru."""
    await validate_rule_references(
        db=db,
        project_id=rule_in.project_id,
        target_status_id=rule_in.target_status_id,
        conditions=rule_in.conditions,
    )

    # 3. Simpan AggregationRule
    rule = AggregationRule(
        project_id=rule_in.project_id,
        operator=rule_in.operator,
        target_status_id=rule_in.target_status_id
    )
    db.add(rule)
    await db.flush()

    # 4. Simpan RuleConditions
    for cond_in in rule_in.conditions:
        cond = RuleCondition(
            rule_id=rule.id,
            component_id=cond_in.component_id,
            expected_status_id=cond_in.expected_status_id
        )
        db.add(cond)
    
    await db.flush()
    
    # 5. Fetch fully loaded rule for response matching AggregationRuleRead
    stmt = (
        select(AggregationRule)
        .where(AggregationRule.id == rule.id)
        .options(
            selectinload(AggregationRule.target_status),
            selectinload(AggregationRule.conditions).selectinload(RuleCondition.component),
            selectinload(AggregationRule.conditions).selectinload(RuleCondition.expected_status)
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one()


@router.get("/{rule_id}", response_model=AggregationRuleRead)
async def get_rule(
    rule_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> Any:
    """Mengambil detail satu aturan agregasi."""
    rule = await load_rule_with_relations(db, rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aturan agregasi tidak ditemukan"
        )
    return rule


@router.put("/{rule_id}", response_model=AggregationRuleRead)
async def update_rule(
    rule_id: int,
    rule_in: AggregationRuleUpdate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_rules)]
) -> Any:
    """User dengan permission manage_rules memperbarui operator, target, dan kondisi rule."""
    rule = await load_rule_with_relations(db, rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aturan agregasi tidak ditemukan"
        )

    target_status_id = rule_in.target_status_id if rule_in.target_status_id is not None else rule.target_status_id
    conditions = rule_in.conditions if rule_in.conditions is not None else rule.conditions
    await validate_rule_references(
        db=db,
        project_id=rule.project_id,
        target_status_id=target_status_id,
        conditions=conditions,
    )

    if rule_in.operator is not None:
        rule.operator = rule_in.operator
    if rule_in.target_status_id is not None:
        rule.target_status_id = rule_in.target_status_id
    if rule_in.conditions is not None:
        for existing_condition in list(rule.conditions):
            await db.delete(existing_condition)
        await db.flush()
        for cond_in in rule_in.conditions:
            db.add(
                RuleCondition(
                    rule_id=rule.id,
                    component_id=cond_in.component_id,
                    expected_status_id=cond_in.expected_status_id,
                )
            )

    await db.flush()
    return await load_rule_with_relations(db, rule_id)

@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_rules)]
) -> None:
    """User dengan permission manage_rules menghapus aturan otomatisasi agregasi."""
    rule = await crud_aggregation_rule.get(db, id=rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aturan agregasi tidak ditemukan"
        )
    await crud_aggregation_rule.delete(db, id=rule_id)
