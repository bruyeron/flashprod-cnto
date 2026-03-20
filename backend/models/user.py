"""
backend/models/user.py
Modèles de données Pydantic pour les utilisateurs et sessions.
"""

from pydantic import BaseModel
from typing import List, Optional


class UserInDB(BaseModel):
    """Modèle stocké dans users.json (contient le hash)."""
    id: str
    username: str
    password_hash: str
    role: str          # "admin" | "user"
    services: List[str]
    active: bool


class UserPublic(BaseModel):
    """Modèle renvoyé au client (sans le hash)."""
    id: str
    username: str
    role: str
    services: List[str]
    active: bool


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "user"
    services: List[str] = []


class UpdateUserRequest(BaseModel):
    username: str
    password: Optional[str] = None
    role: Optional[str] = None
    services: Optional[List[str]] = None
    active: Optional[bool] = None


class DeleteUserRequest(BaseModel):
    username: str
