"""
backend/routers/comments.py
Routes commentaires : /api/comments/*

NOUVEAU FICHIER : remplace le localStorage 'fp_comments' du navigateur.
Les commentaires sont maintenant persistés en PostgreSQL et partagés
entre tous les utilisateurs connectés.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, require_admin
import services.comment_service as comment_svc

router = APIRouter()


# ── Schémas de requête ────────────────────────────────────────────────────────

class AddCommentRequest(BaseModel):
    cell_key: str    # ex: "ARO::ca::Sem-36::2025-09-02"
    activity: str    # ex: "ARO"
    text: str


class DeleteCommentRequest(BaseModel):
    comment_id: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/{activity}")
def get_comments(
    activity: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retourne tous les commentaires d'une activité.
    Le frontend les regroupe par cell_key pour les afficher dans les cellules.
    """
    return comment_svc.get_comments_for_activity(db, activity)


@router.post("", status_code=201)
def add_comment(
    body: AddCommentRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ajoute un commentaire sur une cellule. Auteur = utilisateur connecté."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Le commentaire ne peut pas être vide")
    return comment_svc.add_comment(
        db,
        cell_key=body.cell_key,
        activity=body.activity,
        author=user.username,
        text=body.text,
    )


@router.delete("/{comment_id}")
def delete_comment(
    comment_id: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Supprime un commentaire.
    - Admin : peut supprimer n'importe quel commentaire
    - User  : peut supprimer uniquement ses propres commentaires
    """
    try:
        comment_svc.delete_comment(
            db,
            comment_id=comment_id,
            requester_username=user.username,
            is_admin=(user.role == "admin"),
        )
        return {"ok": True}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
