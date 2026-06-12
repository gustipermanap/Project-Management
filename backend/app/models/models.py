import json
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy import Boolean, ForeignKey, String, Text, Date, Float, DateTime, func, Table, Column, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.core.permissions import ALL_PERMISSION_KEYS


class UserGroup(Base):
    __tablename__ = "user_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    permissions_json: Mapped[str] = mapped_column("permissions", Text, default="[]", nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    users: Mapped[List["User"]] = relationship(back_populates="group")

    @property
    def permissions(self) -> List[str]:
        try:
            raw_permissions = json.loads(self.permissions_json or "[]")
        except json.JSONDecodeError:
            raw_permissions = []
        return [permission for permission in raw_permissions if permission in ALL_PERMISSION_KEYS]

    @permissions.setter
    def permissions(self, values: List[str]) -> None:
        unique_permissions = []
        for permission in values:
            if permission in ALL_PERMISSION_KEYS and permission not in unique_permissions:
                unique_permissions.append(permission)
        self.permissions_json = json.dumps(unique_permissions)

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # Backward-compatible role/group label
    group_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user_groups.id", ondelete="SET NULL"), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    group: Mapped[Optional["UserGroup"]] = relationship(back_populates="users")
    component_statuses: Mapped[List["TaskComponentStatus"]] = relationship(back_populates="assignee")

    @property
    def group_name(self) -> str:
        return self.group.name if self.group else self.role

    @property
    def permissions(self) -> List[str]:
        if self.role == "Supadmin":
            return ALL_PERMISSION_KEYS
        if self.group:
            return self.group.permissions
        return []


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    tasks: Mapped[List["Task"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    components: Mapped[List["Component"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    rules: Mapped[List["AggregationRule"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Status(Base):
    __tablename__ = "statuses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)  # "Backlog", "In_Progress", "Review", "Done"


class Component(Base):
    __tablename__ = "components"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="components")
    task_statuses: Mapped[List["TaskComponentStatus"]] = relationship(back_populates="component", cascade="all, delete-orphan")
    conditions: Mapped[List["RuleCondition"]] = relationship(back_populates="component", cascade="all, delete-orphan")


task_dependency_association = Table(
    "task_dependencies",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("dependency_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    macro_status_id: Mapped[int] = mapped_column(ForeignKey("statuses.id"), nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="tasks")
    macro_status: Mapped["Status"] = relationship()
    component_statuses: Mapped[List["TaskComponentStatus"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    audit_trails: Mapped[List["AuditTrail"]] = relationship(back_populates="task", cascade="all, delete-orphan")
    
    dependencies: Mapped[List["Task"]] = relationship(
        "Task",
        secondary=task_dependency_association,
        primaryjoin="Task.id==task_dependencies.c.task_id",
        secondaryjoin="Task.id==task_dependencies.c.dependency_id",
        backref="blocked_tasks",
        lazy="selectin"
    )


class TaskComponentStatus(Base):
    __tablename__ = "task_component_statuses"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    component_id: Mapped[int] = mapped_column(ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    status_id: Mapped[int] = mapped_column(ForeignKey("statuses.id"), nullable=False)
    assignee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    estimated_hours: Mapped[float] = mapped_column(Float, default=0.0)

    task: Mapped["Task"] = relationship(back_populates="component_statuses")
    component: Mapped["Component"] = relationship(back_populates="task_statuses")
    status: Mapped["Status"] = relationship()
    assignee: Mapped[Optional["User"]] = relationship(back_populates="component_statuses")


class AggregationRule(Base):
    __tablename__ = "aggregation_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    operator: Mapped[str] = mapped_column(String(10), default="AND")  # "AND", "OR"
    target_status_id: Mapped[int] = mapped_column(ForeignKey("statuses.id"), nullable=False)

    project: Mapped["Project"] = relationship(back_populates="rules")
    target_status: Mapped["Status"] = relationship()
    conditions: Mapped[List["RuleCondition"]] = relationship(back_populates="rule", cascade="all, delete-orphan")


class RuleCondition(Base):
    __tablename__ = "rule_conditions"

    id: Mapped[int] = mapped_column(primary_key=True)
    rule_id: Mapped[int] = mapped_column(ForeignKey("aggregation_rules.id", ondelete="CASCADE"), nullable=False)
    component_id: Mapped[int] = mapped_column(ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    expected_status_id: Mapped[int] = mapped_column(ForeignKey("statuses.id"), nullable=False)

    rule: Mapped["AggregationRule"] = relationship(back_populates="conditions")
    component: Mapped["Component"] = relationship(back_populates="conditions")
    expected_status: Mapped["Status"] = relationship()


class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    changed_by: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[str] = mapped_column(Text, nullable=False)
    new_value: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    task: Mapped["Task"] = relationship(back_populates="audit_trails")
