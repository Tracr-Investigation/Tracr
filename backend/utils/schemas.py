from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from utils.validators import validate_password_strength


class PermissionLevelEnum(str, Enum):
    manager = "manager"
    editeur = "editeur"
    lecteur = "lecteur"


class LoginRequest(BaseModel):
    pseudo: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class RegisterRequest(BaseModel):
    pseudo: str = Field(min_length=3, max_length=50)
    password: str = Field(max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class InvestigationCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class StatusCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7)


class StatusUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7)
    icon: str | None = Field(default=None, max_length=50)


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7)
    icon: str | None = Field(default=None, max_length=50)


class CollaboratorInviteRequest(BaseModel):
    pseudo: str = Field(min_length=1, max_length=50)
    permission_level: PermissionLevelEnum = PermissionLevelEnum.lecteur


class CollaboratorUpdateRequest(BaseModel):
    permission_level: PermissionLevelEnum


class InvestigationUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class InvestigationTransferRequest(BaseModel):
    new_owner_pseudo: str = Field(min_length=1, max_length=50)


class TaskCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    status: str = Field(default="todo", pattern="^(todo|en_cours|termine)$")
    priority: str = Field(default="normale", pattern="^(basse|normale|haute|urgente)$")
    is_private: bool = Field(default=False)
    assigned_to: Optional[int] = Field(default=None)
    due_date: Optional[datetime] = Field(default=None)


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    status: Optional[str] = Field(default=None, pattern="^(todo|en_cours|termine)$")
    priority: Optional[str] = Field(default=None, pattern="^(basse|normale|haute|urgente)$")
    is_private: Optional[bool] = Field(default=None)
    assigned_to: Optional[int] = Field(default=None)
    clear_assigned: bool = Field(default=False)
    due_date: Optional[datetime] = Field(default=None)
    clear_due_date: bool = Field(default=False)


class TaskResponseCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class ForceChangePasswordRequest(BaseModel):
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class AdminCreateUserRequest(BaseModel):
    pseudo: str = Field(min_length=3, max_length=50)
    password: str = Field(max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class UpdateLanguageRequest(BaseModel):
    language: str = Field(pattern="^(en|fr)$")


class DocumentCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content_html: str | None = Field(default="")
    id_template: int | None = Field(default=None)

class DocumentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content_html: str | None = Field(default=None)

class DocumentCommentCreateRequest(BaseModel):
    comment_id: str = Field(min_length=1, max_length=64)
    quote: str = Field(default="", max_length=500)
    content: str = Field(min_length=1, max_length=2000)
class TemplateCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default="", max_length=2000)
    content_html: str | None = Field(default="", max_length=1_000_000)
    is_public: bool = Field(default=False)

class TemplateUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    content_html: str | None = Field(default=None, max_length=1_000_000)
    is_public: bool | None = Field(default=None)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be blank")
        return v

