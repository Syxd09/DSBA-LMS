from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

from app.models.user import UserRole


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    force_password_change: Optional[bool] = False
    user: Optional["UserResponse"] = None


class UserLogin(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)
    mfa_token: Optional[str] = Field(None, min_length=6, max_length=6)
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "student1",
                "password": "password123",
                "mfa_token": "123456"
            }
        }


class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str]
    first_name: str
    last_name: str
    display_name: Optional[str]
    role: UserRole
    is_active: bool
    is_verified: bool
    department: Optional[str]
    class_section: Optional[str]
    semester: Optional[int]
    designation: Optional[str]
    mfa_enabled: bool
    password_changed: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "oldpassword123",
                "new_password": "NewSecurePassword123!"
            }
        }


class ForgotPassword(BaseModel):
    email: EmailStr
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "student@example.com"
            }
        }


class ResetPassword(BaseModel):
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "reset_token_here",
                "new_password": "NewSecurePassword123!"
            }
        }


class MFASetup(BaseModel):
    secret: str
    qr_url: str
    message: str


class MFAVerify(BaseModel):
    token: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "123456"
            }
        }


# Forward reference resolution
UserResponse.model_rebuild()