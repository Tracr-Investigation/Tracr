from pydantic import BaseModel, Field, field_validator

from utils.validators import validate_password_strength


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


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)
