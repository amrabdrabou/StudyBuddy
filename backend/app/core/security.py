import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from passlib.context import CryptContext
from pwdlib import PasswordHash

from app.core.config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/models/auth/token")

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)

def generate_token() -> str:
    return secrets.token_urlsafe(32)