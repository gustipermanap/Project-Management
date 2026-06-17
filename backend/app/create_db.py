import argparse
import asyncio
from sqlalchemy import func
from sqlalchemy.future import select
from app.core.db import engine, Base, async_session_maker
from app.core.permissions import DEFAULT_GROUPS
from datetime import date, datetime, timedelta
from app.models.models import (
    User, UserGroup, Status, Project, Component, AggregationRule, RuleCondition,
    Task, TaskComponentStatus, TaskComment, TaskChecklist, TimeLog, task_dependency_association
)
from app.core.security import get_password_hash


async def get_group_by_name(session, name: str) -> UserGroup | None:
    res = await session.execute(select(UserGroup).where(UserGroup.name == name))
    return res.scalar_one_or_none()


async def seed_groups(session) -> dict[str, UserGroup]:
    groups = {}
    for group_name, config in DEFAULT_GROUPS.items():
        group = await get_group_by_name(session, group_name)
        if not group:
            group = UserGroup(
                name=group_name,
                description=config["description"],
                is_system=True,
            )
            session.add(group)
        group.description = config["description"]
        group.permissions = config["permissions"]
        groups[group_name] = group
    await session.flush()
    return groups


async def seed_statuses(session) -> dict[str, int]:
    default_statuses = [
        ("Backlog", "Backlog"),
        ("In Progress", "In_Progress"),
        ("UI Ready", "Review"),
        ("API Ready", "Review"),
        ("Testing", "Review"),
        ("Under Revision", "In_Progress"),
        ("Ready for Integration", "Review"),
        ("Done", "Done"),
    ]
    for name, category in default_statuses:
        res = await session.execute(select(Status).where(Status.name == name))
        status_obj = res.scalar_one_or_none()
        if not status_obj:
            session.add(Status(name=name, category=category))
        else:
            status_obj.category = category
    await session.flush()

    res = await session.execute(select(Status))
    return {status_obj.name: status_obj.id for status_obj in res.scalars().all()}


async def seed_users(session, groups: dict[str, UserGroup]) -> None:
    default_users = [
        ("supadmin", "supadmin@example.com", "Supadmin"),
        ("pm", "pm@example.com", "PM"),
        ("developer1", "dev1@example.com", "Developer"),
        ("developer2", "dev2@example.com", "Developer"),
        ("qa", "qa@example.com", "QA"),
    ]
    for username, email, group_name in default_users:
        res = await session.execute(select(User).where(User.username == username))
        user = res.scalar_one_or_none()
        group = groups[group_name]
        if not user:
            user = User(
                username=username,
                email=email,
                role=group.name,
                group_id=group.id,
                password_hash=get_password_hash("password123"),
            )
            session.add(user)
        else:
            user.email = email
            user.role = group.name
            user.group_id = group.id
    await session.flush()


async def seed_project_components_and_rules(session, status_map: dict[str, int]) -> None:
    res = await session.execute(select(Project).where(Project.name == "Smart E-Commerce Launch"))
    project = res.scalar_one_or_none()
    if not project:
        project = Project(
            name="Smart E-Commerce Launch",
            description="Peluncuran aplikasi e-commerce modern dengan multi-komponen.",
        )
        session.add(project)
        await session.flush()

    component_names = ["Frontend", "Backend", "QA Testing"]
    component_map = {}
    for component_name in component_names:
        res = await session.execute(
            select(Component).where(
                Component.project_id == project.id,
                Component.name == component_name,
            )
        )
        component = res.scalar_one_or_none()
        if not component:
            component = Component(name=component_name, project_id=project.id)
            session.add(component)
        component_map[component_name] = component
    await session.flush()

    rules_count_res = await session.execute(
        select(func.count()).select_from(AggregationRule).where(AggregationRule.project_id == project.id)
    )
    if rules_count_res.scalar_one() > 0:
        return

    rule1 = AggregationRule(
        project_id=project.id,
        operator="AND",
        target_status_id=status_map["Ready for Integration"],
    )
    session.add(rule1)
    await session.flush()
    session.add_all([
        RuleCondition(
            rule_id=rule1.id,
            component_id=component_map["Frontend"].id,
            expected_status_id=status_map["UI Ready"],
        ),
        RuleCondition(
            rule_id=rule1.id,
            component_id=component_map["Backend"].id,
            expected_status_id=status_map["API Ready"],
        ),
    ])

    rule2 = AggregationRule(
        project_id=project.id,
        operator="OR",
        target_status_id=status_map["Testing"],
    )
    session.add(rule2)
    await session.flush()
    session.add(
        RuleCondition(
            rule_id=rule2.id,
            component_id=component_map["QA Testing"].id,
            expected_status_id=status_map["Testing"],
        )
    )
    await session.flush()

    # Seed Tasks
    backlog_status_id = status_map["Backlog"]
    in_progress_status_id = status_map["In Progress"]

    pm_user = (await session.execute(select(User).where(User.username == "pm"))).scalar_one()
    dev1_user = (await session.execute(select(User).where(User.username == "developer1"))).scalar_one()
    dev2_user = (await session.execute(select(User).where(User.username == "developer2"))).scalar_one()

    tasks_count = (await session.execute(select(func.count()).select_from(Task))).scalar_one()
    if tasks_count == 0:
        # Task 1: Auth & Login Module
        task1 = Task(
            title="Implementasi Auth & Login Module",
            description="Buat sistem autentikasi pengguna dengan JWT dan validasi RBAC.",
            macro_status_id=in_progress_status_id,
            project_id=project.id,
        )
        session.add(task1)
        await session.flush()

        # Task 2: Payment Gateway Integration (Depends on Auth)
        task2 = Task(
            title="Integrasi Payment Gateway",
            description="Sambungkan API Midtrans untuk metode pembayaran E-Wallet dan Virtual Account.",
            macro_status_id=backlog_status_id,
            project_id=project.id,
        )
        session.add(task2)
        await session.flush()

        await session.execute(
            task_dependency_association.insert().values(
                task_id=task2.id,
                dependency_id=task1.id
            )
        )

        t1_fe = TaskComponentStatus(
            task_id=task1.id,
            component_id=component_map["Frontend"].id,
            status_id=status_map["UI Ready"],
            assignee_id=dev1_user.id,
            estimated_hours=8.0
        )
        t1_be = TaskComponentStatus(
            task_id=task1.id,
            component_id=component_map["Backend"].id,
            status_id=status_map["In Progress"],
            assignee_id=dev2_user.id,
            estimated_hours=12.0
        )
        session.add_all([t1_fe, t1_be])
        await session.flush()

        t2_fe = TaskComponentStatus(
            task_id=task2.id,
            component_id=component_map["Frontend"].id,
            status_id=backlog_status_id,
            assignee_id=dev1_user.id,
            estimated_hours=16.0
        )
        t2_be = TaskComponentStatus(
            task_id=task2.id,
            component_id=component_map["Backend"].id,
            status_id=backlog_status_id,
            assignee_id=dev2_user.id,
            estimated_hours=24.0
        )
        session.add_all([t2_fe, t2_be])
        await session.flush()

        comment1 = TaskComment(
            task_id=task1.id,
            user_id=pm_user.id,
            content="Tolong selesaikan modul backend API login hari ini agar QA bisa mulai testing."
        )
        comment2 = TaskComment(
            task_id=task1.id,
            user_id=dev2_user.id,
            content="Siap, sedang saya integrasikan dengan router FastAPI. Backend hampir selesai."
        )
        session.add_all([comment1, comment2])

        checklist1 = TaskChecklist(task_id=task1.id, name="Desain UI form login di Figma", is_completed=True)
        checklist2 = TaskChecklist(task_id=task1.id, name="Slicing UI frontend ke React components", is_completed=True)
        checklist3 = TaskChecklist(task_id=task1.id, name="Implementasi API endpoint login & register", is_completed=False)
        checklist4 = TaskChecklist(task_id=task1.id, name="Integrasi unit testing QA", is_completed=False)
        session.add_all([checklist1, checklist2, checklist3, checklist4])

        log1 = TimeLog(
            task_component_status_id=t1_fe.id,
            user_id=dev1_user.id,
            start_time=datetime.now() - timedelta(hours=4),
            end_time=datetime.now() - timedelta(hours=2),
            duration_seconds=7200,
            description="Mengerjakan setup Router & redux store untuk auth"
        )
        log2 = TimeLog(
            task_component_status_id=t1_fe.id,
            user_id=dev1_user.id,
            start_time=datetime.now() - timedelta(hours=1),
            end_time=datetime.now() - timedelta(minutes=30),
            duration_seconds=1800,
            description="Slicing halaman login responsive"
        )
        log3 = TimeLog(
            task_component_status_id=t1_be.id,
            user_id=dev2_user.id,
            start_time=datetime.now() - timedelta(minutes=45),
            end_time=None,
            duration_seconds=None,
            description="Menulis query SQLAlchemy untuk schema user"
        )
        session.add_all([log1, log2, log3])


async def seed_data(reset: bool = False) -> None:
    print("Menyiapkan skema tabel database...")
    async with engine.begin() as conn:
        if reset:
            await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Skema database siap.")

    async with async_session_maker() as session:
        groups = await seed_groups(session)
        status_map = await seed_statuses(session)
        await seed_users(session, groups)
        await seed_project_components_and_rules(session, status_map)
        await session.commit()

    print("Seed data selesai.")
    print("Akun default: supadmin, pm, developer1, developer2, qa")
    print("Password default semua akun: password123")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Initialize SQLite database and default seed data.")
    parser.add_argument("--reset", action="store_true", help="Drop all tables before creating and seeding data.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_data(reset=args.reset))
