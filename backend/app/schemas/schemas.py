from datetime import date, datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from app.core.permissions import ALL_PERMISSION_KEYS


# ==========================================
# 0. GROUP / ACCESS SETTING SCHEMAS
# ==========================================
class UserGroupBase(BaseModel):
    name: str = Field(..., max_length=50)
    description: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)

class UserGroupCreate(UserGroupBase):
    pass

class UserGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

class UserGroupRead(UserGroupBase):
    id: int
    is_system: bool = False
    model_config = ConfigDict(from_attributes=True)

class PermissionCatalog(BaseModel):
    permissions: List[str] = Field(default_factory=lambda: ALL_PERMISSION_KEYS)

# ==========================================
# 1. USER SCHEMAS
# ==========================================
class UserBase(BaseModel):
    username: str = Field(..., max_length=50)
    email: EmailStr
    role: str = Field("Developer", max_length=50)
    group_id: Optional[int] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, max_length=50)
    group_id: Optional[int] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)

class UserUpdateInternal(UserUpdate):
    password_hash: Optional[str] = None

class UserDelete(BaseModel):
    id: int

class UserRead(UserBase):
    id: int
    group_name: str
    permissions: List[str] = []
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# ==========================================
# 2. PROJECT SCHEMAS
# ==========================================
class ProjectBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None

class ProjectDelete(BaseModel):
    id: int

class ProjectRead(ProjectBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. STATUS SCHEMAS
# ==========================================
class StatusBase(BaseModel):
    name: str = Field(..., max_length=50)
    category: Literal["Backlog", "In_Progress", "Review", "Done"]

class StatusCreate(StatusBase):
    pass

class StatusUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    category: Optional[Literal["Backlog", "In_Progress", "Review", "Done"]] = None

class StatusDelete(BaseModel):
    id: int

class StatusRead(StatusBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 4. COMPONENT SCHEMAS
# ==========================================
class ComponentBase(BaseModel):
    name: str = Field(..., max_length=50)
    project_id: int

class ComponentCreate(ComponentBase):
    pass

class ComponentUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    project_id: Optional[int] = None

class ComponentDelete(BaseModel):
    id: int

class ComponentRead(ComponentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 5. RULE CONDITION SCHEMAS
# ==========================================
class RuleConditionBase(BaseModel):
    component_id: int
    expected_status_id: int

class RuleConditionCreate(RuleConditionBase):
    pass

class RuleConditionUpdate(BaseModel):
    component_id: Optional[int] = None
    expected_status_id: Optional[int] = None

class RuleConditionRead(RuleConditionBase):
    id: int
    component: Optional[ComponentRead] = None
    expected_status: Optional[StatusRead] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 6. AGGREGATION RULE SCHEMAS
# ==========================================
class AggregationRuleBase(BaseModel):
    project_id: int
    operator: Literal["AND", "OR"] = "AND"
    target_status_id: int

class AggregationRuleCreate(AggregationRuleBase):
    conditions: List[RuleConditionCreate] = Field(..., min_items=1)

class AggregationRuleUpdate(BaseModel):
    operator: Optional[Literal["AND", "OR"]] = None
    target_status_id: Optional[int] = None
    conditions: Optional[List[RuleConditionCreate]] = None

class AggregationRuleRead(AggregationRuleBase):
    id: int
    target_status: Optional[StatusRead] = None
    conditions: List[RuleConditionRead] = []
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 7. TASK COMPONENT STATUS SCHEMAS
# ==========================================
class TaskComponentStatusBase(BaseModel):
    task_id: int
    component_id: int
    status_id: int
    assignee_id: Optional[int] = None
    estimated_hours: float = 0.0

class TaskComponentStatusCreate(TaskComponentStatusBase):
    pass

class TaskComponentStatusUpdate(BaseModel):
    status_id: Optional[int] = None
    assignee_id: Optional[int] = None
    estimated_hours: Optional[float] = None

class TaskComponentStatusRead(TaskComponentStatusBase):
    id: int
    component: Optional[ComponentRead] = None
    status: Optional[StatusRead] = None
    assignee: Optional[UserRead] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 8. AUDIT TRAIL SCHEMAS
# ==========================================
class AuditTrailBase(BaseModel):
    task_id: int
    changed_by: str
    old_value: str
    new_value: str

class AuditTrailCreate(AuditTrailBase):
    pass

class AuditTrailRead(AuditTrailBase):
    id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 9. TASK SCHEMAS
# ==========================================
class TaskBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    due_date: Optional[date] = None
    project_id: int

class TaskCreate(TaskBase):
    macro_status_id: int
    components: List[int] = Field(..., description="Daftar ID komponen yang terlibat")

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    macro_status_id: Optional[int] = None
    due_date: Optional[date] = None

class TaskRead(TaskBase):
    id: int
    macro_status_id: int
    macro_status: Optional[StatusRead] = None
    component_statuses: List[TaskComponentStatusRead] = []
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 10. CUSTOM REQUEST/RESPONSE SCHEMAS
# ==========================================
class ComponentStatusUpdatePayload(BaseModel):
    status_id: int

class MacroStatusUpdatePayload(BaseModel):
    status_id: int

class RejectBugPayload(BaseModel):
    buggy_component_ids: List[int] = Field(..., min_items=1)
    description: str = Field(..., min_length=5)
