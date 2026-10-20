from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.admin import AdminUser
from app.schemas.admin import (
    AdminLoginRequest,
    AdminChangePasswordRequest,
    AdminUserResponse,
)
from app.security.hashing import verify_password, hash_password
from app.security.auth import create_access_token, get_current_admin
from app.security.rate_limiter import rate_limit, get_client_ip
from app.api.deps import log_admin_action

router = APIRouter(prefix="/auth", tags=["Admin Auth"])


@router.post(
    "/login",
    dependencies=[Depends(rate_limit(settings.RATE_LIMIT_LOGIN_PER_MINUTE, window_seconds=60, key_prefix="login"))],
)
async def admin_login(
    login_data: AdminLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Admin authentication with Argon2id and rate limiting:
    - Sets secure HttpOnly session cookie.
    - Also returns access token for Authorization header.
    - Flags if user must change their temporary password.
    """
    stmt = select(AdminUser).where(AdminUser.username == login_data.username.strip())
    res = await db.execute(stmt)
    admin = res.scalar_one_or_none()

    if not admin or not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your administrator account is inactive. Please contact the business owner.",
        )

    # Update last login time
    now = datetime.now(timezone.utc)
    admin.last_login_at = now
    await db.commit()

    token = create_access_token({"sub": str(admin.id), "role": admin.role})

    # Set secure HttpOnly cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    await log_admin_action(
        db, admin, "LOGIN", "admin_users", str(admin.id), "Successful login", get_client_ip(request)
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": AdminUserResponse.model_validate(admin),
        "must_change_password": admin.must_change_password,
    }


@router.post("/logout")
async def admin_logout(
    response: Response,
    current_user: AdminUser = Depends(get_current_admin),
):
    """Clears admin session cookie."""
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=AdminUserResponse)
async def get_current_user_profile(
    current_user: AdminUser = Depends(get_current_admin),
):
    return AdminUserResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    pwd_req: AdminChangePasswordRequest,
    current_user: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Mandatory password change for initial temporary password setup.
    """
    if not verify_password(pwd_req.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match.",
        )

    if len(pwd_req.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long.",
        )

    current_user.password_hash = hash_password(pwd_req.new_password)
    current_user.must_change_password = False
    current_user.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Password changed successfully."}
