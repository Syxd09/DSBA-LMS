import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
from app.core.config import settings


async def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: str = None
):
    """Send email using SMTP"""
    if not settings.SMTP_HOST:
        print(f"Email would be sent to {to_email}: {subject}")
        return
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = settings.SMTP_USERNAME
    msg['To'] = to_email
    
    # Add text body
    text_part = MIMEText(body, 'plain')
    msg.attach(text_part)
    
    # Add HTML body if provided
    if html_body:
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
    
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")


async def send_reset_email(email: str, name: str, token: str):
    """Send password reset email"""
    subject = "Password Reset - DSBA Exam Portal"
    body = f"""
Dear {name},

You have requested a password reset for your DSBA Exam Portal account.

Reset Token: {token}

This token will expire in 1 hour.

If you did not request this reset, please ignore this email.

Best regards,
DSBA Exam Portal Team
    """
    
    await send_email(email, subject, body)


async def send_welcome_email(email: str, name: str, username: str, password: str):
    """Send welcome email with login credentials"""
    subject = "Welcome to DSBA Exam Portal"
    body = f"""
Dear {name},

Welcome to the DSBA Exam Portal! Your account has been created.

Login Credentials:
Username: {username}
Password: {password}

Please log in and change your password immediately.

Portal URL: {settings.FRONTEND_URL}

Best regards,
DSBA Exam Portal Team
    """
    
    await send_email(email, subject, body)