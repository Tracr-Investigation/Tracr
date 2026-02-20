from enum import Enum

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
