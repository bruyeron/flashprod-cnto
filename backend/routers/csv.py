"""
backend/routers/csv.py
Routes CSV : /api/csv/*

MODIFICATIONS PAR RAPPORT À L'ORIGINAL :
  - GET  /api/csv/data    → lit depuis PostgreSQL (plus de fichier disque)
  - POST /api/csv/upload  → stocke en PostgreSQL avec historique
  - GET  /api/csv/history → NOUVEAU : liste les imports passés (admin)
  - Injection Session db via Depends(get_db)
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from database import get_db
from routers.auth import get_current_user, require_admin
import services.csv_service as csv_svc

router = APIRouter()

MAX_CSV_SIZE = 20 * 1024 * 1024  # 20 Mo max


@router.get("/data", response_class=PlainTextResponse)
def get_data(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retourne le CSV filtré selon le rôle de l'utilisateur.
    MODIFIÉ : lecture depuis PostgreSQL, plus de fichier local.
    """
    services = None if user.role == "admin" else user.services
    try:
        # MODIFIÉ : db passé en paramètre
        csv_text = csv_svc.get_filtered_csv(db, services)
        return PlainTextResponse(content=csv_text, media_type="text/csv; charset=utf-8")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Upload d'un nouveau CSV — remplace l'actif et conserve l'historique.
    MODIFIÉ : stockage en PostgreSQL au lieu de data/production.csv.
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Le fichier doit être un .csv ou .txt")

    content = await file.read()

    if len(content) > MAX_CSV_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 20 Mo)")

    try:
        # MODIFIÉ : sauvegarde en base avec nom de l'uploader
        saved = csv_svc.save_csv(db, content, file.filename, admin.username)
        return {
            "ok": True,
            "filename": saved.filename,
            "size": saved.file_size,
            "uploaded_at": saved.uploaded_at.isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_history(
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    NOUVEAU : retourne la liste des CSV importés avec métadonnées.
    Réservé aux administrateurs.
    """
    return csv_svc.list_csv_history(db)
