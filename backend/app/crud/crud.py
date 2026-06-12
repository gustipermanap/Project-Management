from typing import Any
from fastcrud import FastCRUD
from app.models.models import (
    User, UserGroup, Project, Status, Component, Task, 
    TaskComponentStatus, AggregationRule, RuleCondition, AuditTrail
)
from app.schemas.schemas import (
    UserGroupCreate, UserGroupUpdate, UserGroupRead,
    UserCreate, UserUpdate, UserUpdateInternal, UserRead,
    ProjectCreate, ProjectUpdate, ProjectRead,
    StatusCreate, StatusUpdate, StatusRead,
    ComponentCreate, ComponentUpdate, ComponentRead,
    TaskCreate, TaskUpdate, TaskRead,
    TaskComponentStatusCreate, TaskComponentStatusUpdate, TaskComponentStatusRead,
    AggregationRuleCreate, AggregationRuleUpdate, AggregationRuleRead,
    RuleConditionCreate, RuleConditionUpdate, RuleConditionRead,
    AuditTrailCreate, AuditTrailRead
)

crud_user_group = FastCRUD[UserGroup, UserGroupCreate, UserGroupUpdate, Any, Any, UserGroupRead](UserGroup)
crud_user = FastCRUD[User, UserCreate, UserUpdate, UserUpdateInternal, Any, UserRead](User)
crud_project = FastCRUD[Project, ProjectCreate, ProjectUpdate, Any, Any, ProjectRead](Project)
crud_status = FastCRUD[Status, StatusCreate, StatusUpdate, Any, Any, StatusRead](Status)
crud_component = FastCRUD[Component, ComponentCreate, ComponentUpdate, Any, Any, ComponentRead](Component)
crud_task = FastCRUD[Task, TaskCreate, TaskUpdate, Any, Any, TaskRead](Task)
crud_task_component_status = FastCRUD[TaskComponentStatus, TaskComponentStatusCreate, TaskComponentStatusUpdate, Any, Any, TaskComponentStatusRead](TaskComponentStatus)
crud_aggregation_rule = FastCRUD[AggregationRule, AggregationRuleCreate, AggregationRuleUpdate, Any, Any, AggregationRuleRead](AggregationRule)
crud_rule_condition = FastCRUD[RuleCondition, RuleConditionCreate, RuleConditionUpdate, Any, Any, RuleConditionRead](RuleCondition)
crud_audit_trail = FastCRUD[AuditTrail, AuditTrailCreate, Any, Any, Any, AuditTrailRead](AuditTrail)
