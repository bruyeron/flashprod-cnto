"""
backend/services/auth_service.py
Logique métier : hashage, sessions, CRUD utilisateurs, persistance JSON.
"""

import hashlib
import secrets
import json
import os
from datetime import datetime, timedelta
from typing import Optional, Dict
from pathlib import Path

from models.user import UserInDB, UserPublic

# ── Configuration ─────────────────────────────────────────────────────────────
SALT          = os.getenv("PASSWORD_SALT", "flashprod_salt")
ADMIN_PASS    = os.getenv("ADMIN_DEFAULT_PASS", "Admin@1234!")
SESSION_HOURS = 8
USERS_FILE    = Path(__file__).parent.parent / "data" / "users.json"

# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return hashlib.sha256(f"{plain}{SALT}".encode()).hexdigest()


def generate_token() -> str:
    return secrets.token_hex(32)


def to_public(user: UserInDB) -> UserPublic:
    return UserPublic(
        id=user.id,
        username=user.username,
        role=user.role,
        services=user.services,
        active=user.active,
    )


# ── Persistance JSON ──────────────────────────────────────────────────────────

def _load_users() -> Dict[str, UserInDB]:
    """Charge users.json. Crée le fichier avec admin par défaut si inexistant."""
    USERS_FILE.parent.mkdir(exist_ok=True)
    if not USERS_FILE.exists():
        admin = UserInDB(
            id="1",
            username="admin",
            password_hash=hash_password(ADMIN_PASS),
            role="admin",
            services=[],
            active=True,
        )
        _save_users({"admin": admin})
        return {"admin": admin}

    with open(USERS_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return {u["username"]: UserInDB(**u) for u in raw}


def _save_users(users: Dict[str, UserInDB]) -> None:
    """Sauvegarde le dictionnaire d'utilisateurs dans users.json."""
    USERS_FILE.parent.mkdir(exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump([u.model_dump() for u in users.values()], f, indent=2, ensure_ascii=False)


# ── Store en mémoire (chargé au démarrage) ────────────────────────────────────
_users: Dict[str, UserInDB] = _load_users()
_sessions: Dict[str, dict] = {}   # token → { user_id, expires_at }


# ── Fonctions publiques ───────────────────────────────────────────────────────

def authenticate(username: str, password: str) -> Optional[str]:
    """
    Vérifie les identifiants. Retourne un token de session ou None.
    """
    user = _users.get(username.strip().lower())
    if not user or not user.active:
        return None
    if hash_password(password) != user.password_hash:
        return None
    token = generate_token()
    _sessions[token] = {
        "user_id": user.id,
        "expires_at": datetime.utcnow() + timedelta(hours=SESSION_HOURS),
    }
    return token


def get_user_from_token(token: str) -> Optional[UserInDB]:
    """Retourne l'utilisateur associé au token, ou None si invalide/expiré."""
    session = _sessions.get(token)
    if not session:
        return None
    if datetime.utcnow() > session["expires_at"]:
        del _sessions[token]
        return None
    return next((u for u in _users.values() if u.id == session["user_id"]), None)


def invalidate_token(token: str) -> None:
    _sessions.pop(token, None)


def list_users() -> list[UserPublic]:
    return [to_public(u) for u in _users.values()]


def create_user(username: str, password: str, role: str, services: list[str]) -> UserPublic:
    key = username.strip().lower()
    if key in _users:
        raise ValueError("Nom d'utilisateur déjà pris")
    if role not in ("admin", "user"):
        role = "user"
    new_user = UserInDB(
        id=str(int(datetime.utcnow().timestamp() * 1000)),
        username=key,
        password_hash=hash_password(password),
        role=role,
        services=services,
        active=True,
    )
    _users[key] = new_user
    _save_users(_users)
    return to_public(new_user)


def update_user(
    username: str,
    password: Optional[str],
    role: Optional[str],
    services: Optional[list],
    active: Optional[bool],
) -> UserPublic:
    key = username.strip().lower()
    user = _users.get(key)
    if not user:
        raise KeyError("Utilisateur introuvable")
    if password:
        user.password_hash = hash_password(password)
    if role and role in ("admin", "user"):
        user.role = role
    if services is not None:
        user.services = services
    if active is not None:
        user.active = active
    _users[key] = user
    _save_users(_users)
    return to_public(user)


def delete_user(username: str) -> None:
    key = username.strip().lower()
    if key == "admin":
        raise ValueError("Impossible de supprimer le compte admin")
    if key not in _users:
        raise KeyError("Utilisateur introuvable")
    del _users[key]
    _save_users(_users)
