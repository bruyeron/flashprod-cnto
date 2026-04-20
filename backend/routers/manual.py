"""
backend/routers/manual.py
Routes saisies manuelles : /api/manual/*

NOUVEAU FICHIER : remplace le localStorage 'fp_manual_values' du navigateur.
Les saisies manuelles (absences, non logués) sont maintenant stockées
en PostgreSQL et partagées entre tous les utilisateurs connectés.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user
import services.manual_service as manual_svc

router = APIRouter()


# ── Schémas de requête ────────────────────────────────────────────────────────

class SaveManualRequest(BaseModel):
    activity: str            # ex: "ARO"
    week: str                # ex: "Sem-36"
    field: str               # "abs_reel" ou "non_logue"
    values: list[Optional[float]]  # 7 valeurs (float ou null)


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/{activity}")
def get_manual(
    activity: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retourne les saisies manuelles d'une activité.
    Format : { "Sem-36": { "abs_reel": [null, 2, 1, ...], "non_logue": [...] } }
    Compatible avec le format attendu par DataTable.jsx et WeeklyCompletionModal.jsx.
    """
    return manual_svc.get_manual_values(db, activity)


@router.post("")
def save_manual(
    body: SaveManualRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sauvegarde les valeurs d'une semaine/champ pour une activité.
    Utilise un UPSERT PostgreSQL : crée ou met à jour chaque jour.
    Accessible à tous les utilisateurs connectés (pas admin uniquement).
    """
    if body.field not in ("abs_reel", "non_logue"):
        raise HTTPException(status_code=400, detail="field doit être 'abs_reel' ou 'non_logue'")

    if len(body.values) != 7:
        raise HTTPException(status_code=400, detail="values doit contenir exactement 7 éléments")

    try:
        manual_svc.save_manual_values(
            db,
            activity=body.activity,
            week=body.week,
            field=body.field,
            values=body.values,
            updated_by=user.username,
        )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
