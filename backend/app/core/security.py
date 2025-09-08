from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import pyotp
import secrets
import re

from app.core.config import settings


# Password hashing with Argon2 (recommended) and fallback to bcrypt
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
argon2_hasher = PasswordHasher()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        # Try Argon2 first
        argon2_hasher.verify(hashed_password, plain_password)
        return True
    except VerifyMismatchError:
        # Fallback to bcrypt/other schemes
        return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using Argon2"""
    return argon2_hasher.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_reset_token() -> str:
    """Generate a secure reset token"""
    return secrets.token_urlsafe(32)


def generate_mfa_secret() -> str:
    """Generate a TOTP secret for MFA"""
    return pyotp.random_base32()


def generate_mfa_qr_url(secret: str, user_email: str) -> str:
    """Generate QR code URL for MFA setup"""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(
        name=user_email,
        issuer_name="DSBA Exam Portal"
    )


def verify_mfa_token(secret: str, token: str) -> bool:
    """Verify a TOTP token"""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)


def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """
    Validate password strength
    Returns: (is_valid, list_of_errors)
    """
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one number")
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        errors.append("Password must contain at least one special character")
    
    # Check for common patterns
    if password.lower() in ["password", "123456", "qwerty", "admin"]:
        errors.append("Password is too common")
    
    return len(errors) == 0, errors


def generate_default_password(user_id: str, date_of_birth: str = None) -> str:
    """Generate default password: ID + DOB"""
    if date_of_birth:
        # Clean DOB and format as DDMMYYYY
        dob_clean = date_of_birth.replace("-", "").replace("/", "")
        return f"{user_id}{dob_clean}"
    return f"{user_id}123456"  # Fallback


def is_password_expired(last_changed: datetime, max_age_days: int = 90) -> bool:
    """Check if password has expired"""
    if not last_changed:
        return True
    
    expiry_date = last_changed + timedelta(days=max_age_days)
    return datetime.now(timezone.utc) > expiry_date


class SecurityHeaders:
    """Security headers for responses"""
    
    @staticmethod
    def get_security_headers() -> dict:
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }


def sanitize_user_input(input_string: str) -> str:
    """Basic input sanitization"""
    if not input_string:
        return ""
    
    # Remove null bytes and control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', input_string)
    
    # Trim whitespace
    sanitized = sanitized.strip()
    
    return sanitized