from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token
from app.services.auth_service import AuthService
from app.core.security import create_access_token, create_refresh_token
from app.utils.dependencies import get_current_user
from app.models.user import User
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter()

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user in the system."""
    return AuthService.create_user(db, user_in)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 compatible token login, getting an access and refresh token."""
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    
    return {
        "access_token": create_access_token(subject=user.id),
        "refresh_token": create_refresh_token(subject=user.id),
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str = Header(..., alias="Authorization"), db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Strip 'Bearer ' if present
    if refresh_token.startswith("Bearer "):
        refresh_token = refresh_token.split(" ")[1]

    try:
        payload = jwt.decode(refresh_token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise credentials_exception
            
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise credentials_exception

    return {
        "access_token": create_access_token(subject=user.id),
        "refresh_token": create_refresh_token(subject=user.id),
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
def get_current_logged_in_user(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.post("/logout")
def logout():
    """
    Logout endpoint. 
    In a stateless JWT system, true logout is handled client-side by deleting tokens,
    or server-side by implementing a token blocklist (Redis recommended for production).
    """
    return {"message": "Successfully logged out. Please remove tokens from client storage."}