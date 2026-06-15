from typing import Annotated, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.db import get_async_session
from app.crud.crud import crud_task, crud_project, crud_status, crud_component, crud_task_component_status, crud_user
from app.models.models import User, Project, Task, TaskComponentStatus, Status, Component, AuditTrail
from app.schemas.schemas import (
    TaskCreate, TaskUpdate, TaskRead, TaskComponentStatusRead,
    ComponentStatusUpdatePayload, MacroStatusUpdatePayload, RejectBugPayload, AuditTrailRead
)
from app.core.security import get_current_user, PermissionChecker, user_has_permission
from app.services.engine import evaluate_task_rules, create_audit_log

router = APIRouter(prefix="/tasks", tags=["tasks"])

require_manage_tasks = PermissionChecker(["manage_tasks"])
require_update_component_or_task = PermissionChecker(["update_component_status", "manage_tasks"])
require_macro_status_access = PermissionChecker(["manage_tasks", "qa_gate"])
require_qa_gate = PermissionChecker(["qa_gate"])
require_assign_developers = PermissionChecker(["assign_developers"])

@router.get("/", response_model=List[TaskRead])
async def get_tasks(
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    project_id: Optional[int] = None
) -> List[Any]:
    """Mengambil daftar task, opsional difilter berdasarkan project_id."""
    stmt = (
        select(Task)
        .options(
            selectinload(Task.macro_status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.component),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.assignee).selectinload(User.group),
            selectinload(Task.dependencies),
        )
    )
    if project_id:
        stmt = stmt.where(Task.project_id == project_id)
        
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> Any:
    """Mengambil detail task tertentu."""
    stmt = (
        select(Task)
        .where(Task.id == task_id)
        .options(
            selectinload(Task.macro_status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.component),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.assignee).selectinload(User.group),
            selectinload(Task.dependencies),
        )
    )
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task tidak ditemukan"
        )
    return task

@router.post("/", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_tasks)]
) -> Any:
    """User dengan permission manage_tasks membuat task baru beserta komponen terkait."""
    # 1. Validasi project
    project = await db.get(Project, task_in.project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyek tidak ditemukan"
        )

    # 2. Validasi macro status awal
    macro_status = await db.get(Status, task_in.macro_status_id)
    if not macro_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status makro awal tidak ditemukan"
        )

    # 3. Buat Task
    task = Task(
        title=task_in.title,
        description=task_in.description,
        macro_status_id=task_in.macro_status_id,
        due_date=task_in.due_date,
        project_id=task_in.project_id,
        dependencies=[]
    )
    db.add(task)
    await db.flush()

    # 3.5 Cek dan tambah dependensi task (memastikan tidak terjadi circular dependency dan berada di project yang sama)
    if task_in.dependencies:
        for dep_id in task_in.dependencies:
            if dep_id == task.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Task tidak dapat bergantung pada dirinya sendiri."
                )
            
            dep_task = await db.get(Task, dep_id)
            if not dep_task:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task dependensi dengan ID {dep_id} tidak ditemukan"
                )
            if dep_task.project_id != task_in.project_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Task dependensi dengan ID {dep_id} harus berada pada proyek yang sama ({task_in.project_id})"
                )
            task.dependencies.append(dep_task)
        await db.flush()

    # 4. Cari status default untuk komponen (sama dengan macro_status atau default "Backlog")
    default_status_stmt = select(Status).where(Status.name == "Backlog")
    default_status_res = await db.execute(default_status_stmt)
    default_status = default_status_res.scalar_one_or_none()
    initial_component_status_id = default_status.id if default_status else task_in.macro_status_id

    # 5. Buat TaskComponentStatus untuk setiap komponen yang dipilih
    for comp_id in task_in.components:
        comp = await db.get(Component, comp_id)
        if not comp or comp.project_id != task_in.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Komponen dengan ID {comp_id} tidak valid untuk proyek ini"
            )
        
        tc_status = TaskComponentStatus(
            task_id=task.id,
            component_id=comp_id,
            status_id=initial_component_status_id,
            assignee_id=None,
            estimated_hours=0.0
        )
        db.add(tc_status)
        
    await db.flush()

    # Audit log pembuatan task
    await create_audit_log(
        db=db,
        task_id=task.id,
        changed_by=current_user.username,
        old_value="None (Task Created)",
        new_value=f"Macro Status: {macro_status.name}"
    )

    # Return fully loaded task
    stmt = (
        select(Task)
        .where(Task.id == task.id)
        .options(
            selectinload(Task.macro_status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.component),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.assignee).selectinload(User.group),
            selectinload(Task.dependencies),
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one()

@router.put("/{task_id}/components/{component_id}/status", response_model=TaskComponentStatusRead)
async def update_component_status(
    task_id: int,
    component_id: int,
    payload: ComponentStatusUpdatePayload,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_update_component_or_task)]
) -> Any:
    """Mengubah status komponen teknis (Developer yang ditugaskan atau PM)."""
    # 1. Ambil TaskComponentStatus
    stmt = (
        select(TaskComponentStatus)
        .where((TaskComponentStatus.task_id == task_id) & (TaskComponentStatus.component_id == component_id))
        .options(
            selectinload(TaskComponentStatus.status),
            selectinload(TaskComponentStatus.component)
        )
    )
    res = await db.execute(stmt)
    tc_status = res.scalar_one_or_none()
    
    if not tc_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Komponen untuk task ini tidak ditemukan"
        )

    # 2. Validasi Hak Akses Developer
    if not user_has_permission(current_user, "manage_tasks"):
        # Pastikan dia adalah assignee dari komponen ini
        if tc_status.assignee_id != current_user.id:
            # Jika belum ada assignee, izinkan developer untuk menugaskan ke dirinya sendiri sekaligus update status
            if tc_status.assignee_id is None:
                tc_status.assignee_id = current_user.id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Developer hanya dapat mengubah status komponen yang ditugaskan kepada mereka"
                )

    # 3. Validasi status baru
    new_status = await db.get(Status, payload.status_id)
    if not new_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status target tidak ditemukan"
        )

    old_status_name = tc_status.status.name
    
    # 4. Update status komponen
    tc_status.status = new_status
    await db.flush()

    # 5. Catat audit trail
    await create_audit_log(
        db=db,
        task_id=task_id,
        changed_by=current_user.username,
        old_value=f"Komponen '{tc_status.component.name}' Status: {old_status_name}",
        new_value=f"Komponen '{tc_status.component.name}' Status: {new_status.name}"
    )

    # 6. Jalankan Smart Status Aggregation Engine
    await evaluate_task_rules(db=db, task_id=task_id, changed_by="SYSTEM_AUTOMATION")
    
    # Reload fully for return
    stmt_reload = (
        select(TaskComponentStatus)
        .where(TaskComponentStatus.id == tc_status.id)
        .options(
            selectinload(TaskComponentStatus.component),
            selectinload(TaskComponentStatus.status),
            selectinload(TaskComponentStatus.assignee).selectinload(User.group)
        )
    )
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalar_one()

@router.put("/{task_id}/macro-status", response_model=TaskRead)
async def update_macro_status(
    task_id: int,
    payload: MacroStatusUpdatePayload,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_macro_status_access)]
) -> Any:
    """PM mengoverride status makro secara manual, atau QA memindahkan status Testing ke Done."""
    # 1. Ambil task beserta status makronya
    stmt = (
        select(Task)
        .where(Task.id == task_id)
        .options(selectinload(Task.macro_status))
    )
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task tidak ditemukan"
        )

    # 2. Ambil status baru
    new_status = await db.get(Status, payload.status_id)
    if not new_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Status target tidak ditemukan"
        )

    # 3. Validasi Hak Akses & Matriks Peran (RBAC)
    if not user_has_permission(current_user, "manage_tasks"):
        # QA hanya boleh mengubah status makro dari kategori Review/Testing ke Done
        if new_status.category != "Done":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission qa_gate hanya dapat memindahkan status makro ke kategori 'Done'"
            )
        # Sesuai PRD, QA mengendalikan gerbang kualitas memindahkan status makro dari fase testing ke Done.
        # Jadi kita izinkan QA memindahkan status ke status berkategori Done.

    # 4. Update status makro
    old_status_name = task.macro_status.name
    task.macro_status = new_status
    await db.flush()

    # 5. Catat audit trail
    await create_audit_log(
        db=db,
        task_id=task_id,
        changed_by=current_user.username,
        old_value=f"Macro Status: {old_status_name}",
        new_value=f"Macro Status: {new_status.name} (Manual Override)"
    )

    # Reload task
    stmt_reload = (
        select(Task)
        .where(Task.id == task_id)
        .options(
            selectinload(Task.macro_status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.component),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.assignee).selectinload(User.group),
            selectinload(Task.dependencies),
        )
    )
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalar_one()

@router.post("/{task_id}/reject", response_model=TaskRead)
async def reject_task_by_qa(
    task_id: int,
    payload: RejectBugPayload,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_qa_gate)]
) -> Any:
    """
    QA memicu rollback / reject ketika menemukan bug/defect.
    1. Status makro diturunkan ke 'Under Revision'.
    2. Status komponen terpilih diturunkan kembali ke 'In Progress'.
    3. Log audit trail mencatat alasan secara mendetail.
    """
    # 1. Ambil task
    stmt = (
        select(Task)
        .where(Task.id == task_id)
        .options(
            selectinload(Task.macro_status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.component),
        )
    )
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task tidak ditemukan"
        )

    # 2. Dapatkan status 'Under Revision' dan 'In Progress' dari DB
    under_revision_status_stmt = select(Status).where(Status.name == "Under Revision")
    under_revision_res = await db.execute(under_revision_status_stmt)
    under_revision_status = under_revision_res.scalar_one_or_none()
    
    in_progress_status_stmt = select(Status).where(Status.name == "In Progress")
    in_progress_res = await db.execute(in_progress_status_stmt)
    in_progress_status = in_progress_res.scalar_one_or_none()

    if not under_revision_status or not in_progress_status:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Status sistem default ('Under Revision' atau 'In Progress') belum terkonfigurasi di DB"
        )

    # 3. Turunkan status makro task
    old_macro_name = task.macro_status.name
    task.macro_status = under_revision_status
    
    # 4. Turunkan status komponen terpilih dan bentuk catatan detail komponen mana yang di-reject
    rejected_components_names = []
    for comp_status in task.component_statuses:
        if comp_status.component_id in payload.buggy_component_ids:
            comp_status.status = in_progress_status
            rejected_components_names.append(comp_status.component.name)

    await db.flush()

    # 5. Buat audit trail detail
    buggy_list_str = ", ".join(rejected_components_names)
    old_val_str = f"Macro Status: {old_macro_name}"
    new_val_str = f"Macro Status: Under Revision (Rejected by QA. Buggy components: [{buggy_list_str}]. Reason: {payload.description})"

    await create_audit_log(
        db=db,
        task_id=task_id,
        changed_by=current_user.username,
        old_value=old_val_str,
        new_value=new_val_str
    )

    # Reload task
    stmt_reload = (
        select(Task)
        .where(Task.id == task_id)
        .options(
            selectinload(Task.macro_status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.component),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.assignee).selectinload(User.group),
            selectinload(Task.dependencies),
        )
    )
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalar_one()

@router.get("/{task_id}/audit-trail", response_model=List[AuditTrailRead])
async def get_task_audit_trail(
    task_id: int,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> List[Any]:
    """Mengambil riwayat log audit (audit trail) untuk task tertentu."""
    stmt = select(AuditTrail).where(AuditTrail.task_id == task_id).order_by(AuditTrail.timestamp.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.put("/{task_id}/components/{component_id}/assignee", response_model=TaskComponentStatusRead)
async def assign_component_developer(
    task_id: int,
    component_id: int,
    assignee_id: Optional[int],
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_assign_developers)]
) -> Any:
    """PM menetapkan assignee developer ke komponen tertentu."""
    stmt = (
        select(TaskComponentStatus)
        .where((TaskComponentStatus.task_id == task_id) & (TaskComponentStatus.component_id == component_id))
        .options(
            selectinload(TaskComponentStatus.status),
            selectinload(TaskComponentStatus.component)
        )
    )
    res = await db.execute(stmt)
    tc_status = res.scalar_one_or_none()
    
    if not tc_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Komponen untuk task ini tidak ditemukan"
        )

    # Validasi developer jika assignee_id diberikan
    old_assignee_name = "None"
    new_assignee_name = "None"
    
    if tc_status.assignee_id:
        old_user = await db.get(User, tc_status.assignee_id)
        if old_user:
            old_assignee_name = old_user.username

    if assignee_id is not None:
        user_stmt = select(User).where(User.id == assignee_id).options(selectinload(User.group))
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if not user or not user_has_permission(user, "update_component_status"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee harus berupa user dengan permission update_component_status"
            )
        tc_status.assignee_id = assignee_id
        new_assignee_name = user.username
    else:
        tc_status.assignee_id = None

    await db.flush()

    # Log audit
    await create_audit_log(
        db=db,
        task_id=task_id,
        changed_by=current_user.username,
        old_value=f"Komponen '{tc_status.component.name}' Assignee: {old_assignee_name}",
        new_value=f"Komponen '{tc_status.component.name}' Assignee: {new_assignee_name}"
    )

    # Reload
    stmt_reload = (
        select(TaskComponentStatus)
        .where(TaskComponentStatus.id == tc_status.id)
        .options(
            selectinload(TaskComponentStatus.component),
            selectinload(TaskComponentStatus.status),
            selectinload(TaskComponentStatus.assignee).selectinload(User.group)
        )
    )
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalar_one()

@router.put("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: int,
    task_in: TaskUpdate,
    db: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(require_manage_tasks)]
) -> Any:
    """PM mengupdate detail task (title, description, due_date, dependencies)."""
    stmt = (
        select(Task)
        .where(Task.id == task_id)
        .options(
            selectinload(Task.macro_status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.component),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.assignee).selectinload(User.group),
            selectinload(Task.dependencies),
        )
    )
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task tidak ditemukan"
        )

    old_values = []
    new_values = []
    
    if task_in.title is not None and task_in.title != task.title:
        old_values.append(f"Title: '{task.title}'")
        task.title = task_in.title
        new_values.append(f"Title: '{task_in.title}'")
        
    if task_in.description is not None and task_in.description != task.description:
        old_values.append(f"Desc: '{task.description}'")
        task.description = task_in.description
        new_values.append(f"Desc: '{task_in.description}'")

    if task_in.due_date is not None and task_in.due_date != task.due_date:
        old_values.append(f"Due Date: {task.due_date}")
        task.due_date = task_in.due_date
        new_values.append(f"Due Date: {task_in.due_date}")

    if task_in.macro_status_id is not None and task_in.macro_status_id != task.macro_status_id:
        macro_status = await db.get(Status, task_in.macro_status_id)
        if not macro_status:
            raise HTTPException(status_code=404, detail="Status makro tidak ditemukan")
        old_values.append(f"Macro Status: {task.macro_status.name if task.macro_status else task.macro_status_id}")
        task.macro_status_id = task_in.macro_status_id
        new_values.append(f"Macro Status: {macro_status.name}")

    if task_in.dependencies is not None:
        task.dependencies.clear()
        for dep_id in task_in.dependencies:
            if dep_id == task.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Task tidak dapat bergantung pada dirinya sendiri."
                )
            dep_task = await db.get(Task, dep_id)
            if not dep_task:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Task dependensi dengan ID {dep_id} tidak ditemukan"
                )
            if dep_task.project_id != task.project_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Task dependensi dengan ID {dep_id} harus berada pada proyek yang sama"
                )
            task.dependencies.append(dep_task)
        old_values.append("Dependencies updated")
        new_values.append(f"Dependencies: {task_in.dependencies}")

    await db.flush()

    if old_values:
        await create_audit_log(
            db=db,
            task_id=task.id,
            changed_by=current_user.username,
            old_value=", ".join(old_values),
            new_value=", ".join(new_values)
        )

    stmt_reload = (
        select(Task)
        .where(Task.id == task.id)
        .options(
            selectinload(Task.macro_status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.component),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.status),
            selectinload(Task.component_statuses).selectinload(TaskComponentStatus.assignee).selectinload(User.group),
            selectinload(Task.dependencies),
        )
    )
    res_reload = await db.execute(stmt_reload)
    return res_reload.scalar_one()
