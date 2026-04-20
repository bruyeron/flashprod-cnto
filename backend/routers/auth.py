"""
backend/routers/auth.py
Routes d'authentification : /api/auth/*

MODIFICATIONS PAR RAPPORT À L'ORIGINAL :
  - Injection de Session db via Depends(get_db) dans toutes les routes
  - Transmission de db aux fonctions du service auth
  - Comportement et signatures HTTP identiques (aucune rupture de contrat)
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models.user import (
    LoginRequest, CreateUserRequest, UpdateUserRequest,
    DeleteUserRequest, UserPublic,
)
import services.auth_service as auth_svc

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


# ── Dépendances ────────────────────────────────────────────────────────────────

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    if not creds:
        raise HTTPException(status_code=401, detail="Non authentifié")
    # MODIFIÉ : db passé en paramètre
    user = auth_svc.get_user_from_token(db, creds.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Session invalide ou expirée")
    return user


def require_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Connexion — retourne un token de session."""
    token = auth_svc.authenticate(db, body.username, body.password)
    if not token:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    user = auth_svc.get_user_from_token(db, token)
    return {"token": token, "user": auth_svc.to_public(user)}


@router.post("/logout")
def logout(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    """Déconnexion — invalide le token."""
    if creds:
        auth_svc.invalidate_token(creds.credentials)
    return {"ok": True}


@router.get("/me", response_model=UserPublic)
def me(user=Depends(get_current_user)):
    """Profil de l'utilisateur connecté."""
    return auth_svc.to_public(user)


@router.get("/users", response_model=list[UserPublic])
def list_users(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Liste tous les comptes (admin)."""
    return auth_svc.list_users(db)


@router.post("/users", response_model=UserPublic, status_code=201)
def create_user(
    body: CreateUserRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Crée un compte utilisateur (admin)."""
    try:
        return auth_svc.create_user(db, body.username, body.password, body.role, body.services)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.put("/users", response_model=UserPublic)
def update_user(
    body: UpdateUserRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Modifie un compte (admin)."""
    try:
        return auth_svc.update_user(
            db, body.username, body.password, body.role, body.services, body.active
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/users")
def delete_user(
    body: DeleteUserRequest,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Supprime un compte (admin)."""
    try:
        auth_svc.delete_user(db, body.username)
        return {"ok": True}
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))
