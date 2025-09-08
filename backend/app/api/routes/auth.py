from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
import pyotp

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, verify_token, generate_reset_token,
    generate_mfa_secret, generate_mfa_qr_url, verify_mfa_token,
    validate_password_strength, is_password_expired
)
from app.core.dependencies import get_current_user, get_optional_current_user
from app.models.user import User, UserRole
from app.schemas.auth import (
    Token, UserLogin, UserResponse, PasswordChange, 
    ForgotPassword, ResetPassword, MFASetup, MFAVerify
)
from app.services.email import send_reset_email, send_welcome_email
from app.services.audit import log_activity


router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    user_login: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user and return access token"""
    
    # Find user by username, email, or ID
    user = db.query(User).filter(
        (User.username == user_login.username) |
        (User.email == user_login.username) |
        (User.id == user_login.username)
    ).first()
    
    if not user:
        await log_activity(
            db, None, "login_failed", "authentication",
            metadata={"username": user_login.username, "reason": "user_not_found"},
            ip_address=request.client.host,
            success="false"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        await log_activity(
            db, user.id, "login_failed", "authentication",
            metadata={"reason": "account_locked"},
            ip_address=request.client.host,
            success="false"
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is temporarily locked due to failed login attempts"
        )
    
    # Verify password
    if not verify_password(user_login.password, user.hashed_password):
        # Increment failed attempts
        user.failed_login_attempts += 1
        
        # Lock account after 5 failed attempts
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.now(timezone.utc) + timedelta(hours=1)
        
        db.commit()
        
        await log_activity(
            db, user.id, "login_failed", "authentication",
            metadata={"reason": "invalid_password", "attempts": user.failed_login_attempts},
            ip_address=request.client.host,
            success="false"
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Check if account is active
    if not user.is_active:
        await log_activity(
            db, user.id, "login_failed", "authentication",
            metadata={"reason": "account_inactive"},
            ip_address=request.client.host,
            success="false"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled"
        )
    
    # Check if password needs to be changed (first login or expired)
    password_expired = is_password_expired(user.updated_at) if user.updated_at else True
    force_password_change = not user.password_changed or password_expired
    
    # MFA verification if enabled
    if user.mfa_enabled and not force_password_change:
        if not user_login.mfa_token:
            raise HTTPException(
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                detail="MFA token required"
            )
        
        if not verify_mfa_token(user.mfa_secret, user_login.mfa_token):
            await log_activity(
                db, user.id, "login_failed", "authentication",
                metadata={"reason": "invalid_mfa"},
                ip_address=request.client.host,
                success="false"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA token"
            )
    
    # Reset failed attempts on successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value}
    )
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    await log_activity(
        db, user.id, "login_success", "authentication",
        ip_address=request.client.host,
        success="true"
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": 30 * 60,  # 30 minutes
        "force_password_change": force_password_change,
        "user": UserResponse.from_orm(user)
    }


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout user (invalidate token - implement token blacklisting if needed)"""
    await log_activity(
        db, current_user.id, "logout", "authentication",
        ip_address=request.client.host,
        success="true"
    )
    
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    payload = verify_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new access token
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 30 * 60
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse.from_orm(current_user)


@router.post("/change-password")
async def change_password(
    request: Request,
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    
    # Verify current password
    if not verify_password(password_change.current_password, current_user.hashed_password):
        await log_activity(
            db, current_user.id, "password_change_failed", "authentication",
            metadata={"reason": "invalid_current_password"},
            ip_address=request.client.host,
            success="false"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Validate new password strength
    is_valid, errors = validate_password_strength(password_change.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password validation failed: {', '.join(errors)}"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_change.new_password)
    current_user.password_changed = True
    current_user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    await log_activity(
        db, current_user.id, "password_changed", "authentication",
        ip_address=request.client.host,
        success="true"
    )
    
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
async def forgot_password(
    forgot_password: ForgotPassword,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Send password reset email"""
    
    # Find user by email
    user = db.query(User).filter(User.email == forgot_password.email).first()
    
    if user:
        # Generate reset token
        reset_token = generate_reset_token()
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        
        db.commit()
        
        # Send reset email
        background_tasks.add_task(
            send_reset_email,
            user.email,
            user.full_name,
            reset_token
        )
        
        await log_activity(
            db, user.id, "password_reset_requested", "authentication",
            success="true"
        )
    
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    reset_password: ResetPassword,
    db: Session = Depends(get_db)
):
    """Reset password using reset token"""
    
    user = db.query(User).filter(
        User.reset_token == reset_password.token,
        User.reset_token_expires > datetime.now(timezone.utc)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Validate password strength
    is_valid, errors = validate_password_strength(reset_password.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password validation failed: {', '.join(errors)}"
        )
    
    # Update password
    user.hashed_password = get_password_hash(reset_password.new_password)
    user.password_changed = True
    user.reset_token = None
    user.reset_token_expires = None
    user.updated_at = datetime.now(timezone.utc)
    
    # Reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    
    db.commit()
    
    await log_activity(
        db, user.id, "password_reset_completed", "authentication",
        success="true"
    )
    
    return {"message": "Password reset successfully"}


@router.post("/setup-mfa")
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Setup MFA for user account"""
    
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    
    # Generate MFA secret
    secret = generate_mfa_secret()
    qr_url = generate_mfa_qr_url(secret, current_user.email or current_user.username)
    
    # Store secret temporarily (not enabled until verified)
    current_user.mfa_secret = secret
    db.commit()
    
    return {
        "secret": secret,
        "qr_url": qr_url,
        "message": "Scan the QR code with your authenticator app and verify with a token"
    }


@router.post("/verify-mfa")
async def verify_mfa(
    mfa_verify: MFAVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify and enable MFA"""
    
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup not initiated"
        )
    
    if not verify_mfa_token(current_user.mfa_secret, mfa_verify.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA token"
        )
    
    # Enable MFA
    current_user.mfa_enabled = True
    db.commit()
    
    await log_activity(
        db, current_user.id, "mfa_enabled", "authentication",
        success="true"
    )
    
    return {"message": "MFA enabled successfully"}


@router.post("/disable-mfa")
async def disable_mfa(
    mfa_verify: MFAVerify,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable MFA for user account"""
    
    if not current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled"
        )
    
    if not verify_mfa_token(current_user.mfa_secret, mfa_verify.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA token"
        )
    
    # Disable MFA
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    db.commit()
    
    await log_activity(
        db, current_user.id, "mfa_disabled", "authentication",
        success="true"
    )
    
    return {"message": "MFA disabled successfully"}