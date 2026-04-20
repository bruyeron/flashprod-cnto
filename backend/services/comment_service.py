"""
backend/services/comment_service.py
Logique métier pour les commentaires de cellules.

NOUVEAU FICHIER : remplace le localStorage 'fp_comments' du navigateur.
Les commentaires sont maintenant stockés en PostgreSQL et partagés
entre tous les utilisateurs connectés.
"""

import uuid
from typing import Optional
from sqlalchemy.orm import Session

from models.db_models import CommentDB


def get_comments_for_activity(db: Session, activity: str) -> list[dict]:
    """
    Retourne tous les commentaires d'une activité, triés par date.
    Le frontend les indexe ensuite par cell_key.
    """
    comments = (
        db.query(CommentDB)
        .filter_by(activity=activity)
        .order_by(CommentDB.created_at.asc())
        .all()
    )
    return [
        {
            "id": c.id,
            "cell_key": c.cell_key,
            "activity": c.activity,
            "author": c.author,
            "text": c.text,
            "date": c.created_at.isoformat(),
        }
        for c in comments
    ]


def add_comment(
    db: Session,
    cell_key: str,
    activity: str,
    author: str,
    text: str,
) -> dict:
    """Ajoute un commentaire sur une cellule."""
    comment = CommentDB(
        id=str(uuid.uuid4()),
        cell_key=cell_key,
        activity=activity,
        author=author,
        text=text.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "cell_key": comment.cell_key,
        "activity": comment.activity,
        "author": comment.author,
        "text": comment.text,
        "date": comment.created_at.isoformat(),
    }


def delete_comment(db: Session, comment_id: str, requester_username: str, is_admin: bool) -> None:
    """Supprime un commentaire (admin uniquement ou auteur)."""
    comment = db.query(CommentDB).filter_by(id=comment_id).first()
    if not comment:
        raise KeyError("Commentaire introuvable")
    if not is_admin and comment.author != requester_username:
        raise PermissionError("Vous ne pouvez supprimer que vos propres commentaires")
    db.delete(comment)
    db.commit()
