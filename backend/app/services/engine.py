from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.models import Task, AggregationRule, TaskComponentStatus, AuditTrail, Status
from app.crud.crud import crud_task, crud_audit_trail
import logging

logger = logging.getLogger(__name__)

async def create_audit_log(
    db: AsyncSession, 
    task_id: int, 
    changed_by: str, 
    old_value: str, 
    new_value: str
) -> AuditTrail:
    """Mencatat perubahan status ke tabel audit_trails."""
    audit = AuditTrail(
        task_id=task_id,
        changed_by=changed_by,
        old_value=old_value,
        new_value=new_value
    )
    db.add(audit)
    await db.flush()
    return audit

async def evaluate_task_rules(
    db: AsyncSession, 
    task_id: int, 
    changed_by: str = "SYSTEM_AUTOMATION"
) -> bool:
    """
    Mengevaluasi semua aturan agregasi (rules) untuk project tempat Task berada.
    Jika kondisi terpenuhi, status makro task akan diperbarui secara otomatis.
    """
    # 1. Ambil detail Task dan status komponen saat ini
    stmt = (
        select(Task)
        .where(Task.id == task_id)
        .options(
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.status),
            selectinload(Task.macro_status)
        )
    )
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    
    if not task:
        logger.warning(f"Task dengan ID {task_id} tidak ditemukan untuk evaluasi rule.")
        return False

    # 2. Ambil aturan agregasi (rules) untuk project ini beserta kondisinya
    rules_stmt = (
        select(AggregationRule)
        .where(AggregationRule.project_id == task.project_id)
        .options(
            selectinload(AggregationRule.conditions),
            selectinload(AggregationRule.target_status)
        )
    )
    rules_res = await db.execute(rules_stmt)
    rules = rules_res.scalars().all()

    # 3. Bentuk mapping status komponen saat ini
    # component_id -> status_id
    current_statuses = {
        cs.component_id: cs.status_id for cs in task.component_statuses
    }

    # 4. Evaluasi setiap aturan
    triggered_rule = None
    for rule in rules:
        conditions = rule.conditions
        if not conditions:
            continue

        conditions_met = []
        for cond in conditions:
            # Apakah komponen ada di task ini dan statusnya sesuai dengan yang diharapkan?
            current_status_id = current_statuses.get(cond.component_id)
            is_met = (current_status_id == cond.expected_status_id)
            conditions_met.append(is_met)

        # Evaluasi operator AND/OR
        if rule.operator == "AND":
            is_rule_satisfied = all(conditions_met)
        elif rule.operator == "OR":
            is_rule_satisfied = any(conditions_met)
        else:
            is_rule_satisfied = False

        if is_rule_satisfied:
            # Cari rule yang prioritas (atau rule pertama yang terpenuhi dan berbeda status)
            if task.macro_status_id != rule.target_status_id:
                triggered_rule = rule
                break  # Berhenti pada rule pertama yang terpenuhi

    # 5. Jika ada rule yang terpicu, ubah status makro task
    if triggered_rule:
        old_status_name = task.macro_status.name if task.macro_status else f"ID {task.macro_status_id}"
        
        # Ambil nama target status
        target_status_stmt = select(Status).where(Status.id == triggered_rule.target_status_id)
        target_status_res = await db.execute(target_status_stmt)
        target_status = target_status_res.scalar_one_or_none()
        new_status_name = target_status.name if target_status else f"ID {triggered_rule.target_status_id}"

        # Update status makro task
        task.macro_status_id = triggered_rule.target_status_id
        await db.flush()

        # Catat ke audit trail
        description_old = f"Macro Status: {old_status_name}"
        description_new = f"Macro Status: {new_status_name} (Triggered by Rule ID {triggered_rule.id})"
        await create_audit_log(
            db=db,
            task_id=task.id,
            changed_by=changed_by,
            old_value=description_old,
            new_value=description_new
        )
        logger.info(f"Task {task.id} macro status updated to {new_status_name} by Automation Rule {triggered_rule.id}")
        return True

    return False
