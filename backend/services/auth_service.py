"""
backend/services/auth_service.py
Logique métier : authentification, sessions, CRUD utilisateurs.

MODIFICATIONS PAR RAPPORT À L'ORIGINAL :
  - Suppression de toute la persistance JSON (_load_users, _save_users, USERS_FILE)
  - Suppression du dict _users en mémoire (remplacé par requêtes PostgreSQL)
  - Toutes les fonctions reçoivent maintenant `db: Session` en paramètre
  - Les sessions (_sessions dict) restent en mémoire — acceptable pour un seul serveur.
    Si vous déployez plusieurs instances, migrez les sessions vers Redis.
  - La fonction _bootstrap_admin() crée l'admin au 1er démarrage si absent
"""

import hashlib
import secrets
import json
import os
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from models.user import UserInDB, UserPublic
from models.db_models import UserDB

# ── Configuration ──────────────────────────────────────────────────────────────
SALT          = os.getenv("PASSWORD_SALT", "flashprod_salt")
ADMIN_PASS    = os.getenv("ADMIN_DEFAULT_PASS", "Admin@1234!")
SESSION_HOURS = 8

# ── Sessions en mémoire ────────────────────────────────────────────────────────
# token → { user_id, expires_at }
# ⚠ Perdu au redémarrage du serveur (les utilisateurs devront se reconnecter)
_sessions: dict[str, dict] = {}


# ── Helpers ────────────────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return hashlib.sha256(f"{plain}{SALT}".encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_hex(32)

def to_public(user: UserDB) -> UserPublic:
    return UserPublic(
        id=user.id,
        username=user.username,
        role=user.role,
        services=json.loads(user.services or "[]"),
        active=user.active,
    )


# ── Bootstrap admin ───────────────────────────────────────────────────────────
def bootstrap_admin(db: Session) -> None:
    """
    Appelé au démarrage depuis main.py.
    Crée le compte admin par défaut s'il n'existe pas encore en base.
    Migre aussi les utilisateurs depuis users.json si le fichier existe encore.
    """
    # Migration one-shot depuis users.json (si le fichier existe encore)
    import os
    from pathlib import Path
    users_json = Path(__file__).parent.parent / "data" / "users.json"
    if users_json.exists():
        try:
            with open(users_json, "r", encoding="utf-8") as f:
                old_users = json.load(f)
            for u in old_users:
                exists = db.query(UserDB).filter_by(username=u["username"]).first()
                if not exists:
                    db.add(UserDB(
                        id=u["id"],
                        username=u["username"],
                        password_hash=u["password_hash"],
                        role=u["role"],
                        services=json.dumps(u.get("services", [])),
                        active=u.get("active", True),
                    ))
            db.commit()
            # Renommer le fichier pour ne pas re-migrer
            users_json.rename(users_json.with_suffix(".json.migrated"))
            print("✓ Migration users.json → PostgreSQL effectuée")
        except Exception as e:
            print(f"⚠ Migration users.json échouée : {e}")
            db.rollback()

    # Créer admin par défaut si aucun utilisateur en base
    count = db.query(UserDB).count()
    if count == 0:
        admin = UserDB(
            id="1",
            username="admin",
            password_hash=hash_password(ADMIN_PASS),
            role="admin",
            services="[]",
            active=True,
        )
        db.add(admin)
        db.commit()
        print("✓ Compte admin créé avec le mot de passe par défaut")


# ── Authentification ───────────────────────────────────────────────────────────
def authenticate(db: Session, username: str, password: str) -> Optional[str]:
    """Vérifie les identifiants. Retourne un token ou None."""
    user = db.query(UserDB).filter_by(
        username=username.strip().lower(),
        active=True
    ).first()
    if not user or hash_password(password) != user.password_hash:
        return None
    token = generate_token()
    _sessions[token] = {
        "user_id": user.id,
        "expires_at": datetime.utcnow() + timedelta(hours=SESSION_HOURS),
    }
    return token


def get_user_from_token(db: Session, token: str) -> Optional[UserDB]:
    """Retourne l'utilisateur associé au token, ou None si invalide/expiré."""
    session = _sessions.get(token)
    if not session:
        return None
    if datetime.utcnow() > session["expires_at"]:
        del _sessions[token]
        return None
    return db.query(UserDB).filter_by(id=session["user_id"]).first()


def invalidate_token(token: str) -> None:
    _sessions.pop(token, None)


# ── CRUD utilisateurs ──────────────────────────────────────────────────────────
def list_users(db: Session) -> list[UserPublic]:
    users = db.query(UserDB).all()
    return [to_public(u) for u in users]


def create_user(
    db: Session,
    username: str,
    password: str,
    role: str,
    services: list[str],
) -> UserPublic:
    key = username.strip().lower()
    if db.query(UserDB).filter_by(username=key).first():
        raise ValueError("Nom d'utilisateur déjà pris")
    if role not in ("admin", "user"):
        role = "user"
    user = UserDB(
        id=str(int(datetime.utcnow().timestamp() * 1000)),
        username=key,
        password_hash=hash_password(password),
        role=role,
        services=json.dumps(services),
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return to_public(user)


def update_user(
    db: Session,
    username: str,
    password: Optional[str],
    role: Optional[str],
    services: Optional[list],
    active: Optional[bool],
) -> UserPublic:
    key = username.strip().lower()
    user = db.query(UserDB).filter_by(username=key).first()
    if not user:
        raise KeyError("Utilisateur introuvable")
    if password:
        user.password_hash = hash_password(password)
    if role and role in ("admin", "user"):
        user.role = role
    if services is not None:
        user.services = json.dumps(services)
    if active is not None:
        user.active = active
    db.commit()
    db.refresh(user)
    return to_public(user)


def delete_user(db: Session, username: str) -> None:
    key = username.strip().lower()
    if key == "admin":
        raise ValueError("Impossible de supprimer le compte admin")
    user = db.query(UserDB).filter_by(username=key).first()
    if not user:
        raise KeyError("Utilisateur introuvable")
    db.delete(user)
    db.commit()
