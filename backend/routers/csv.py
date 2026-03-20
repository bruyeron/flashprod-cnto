"""
backend/routers/csv.py
Routes CSV : /api/csv/*
  GET  /api/csv/data    → retourne le CSV filtré selon le rôle
  POST /api/csv/upload  → upload d'un nouveau fichier CSV (admin)
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import PlainTextResponse

from routers.auth import get_current_user, require_admin
import services.csv_service as csv_svc

router = APIRouter()

MAX_CSV_SIZE = 20 * 1024 * 1024  # 20 Mo max


@router.get("/data", response_class=PlainTextResponse)
async def get_data(user=Depends(get_current_user)):
    """
    Retourne le CSV filtré selon le rôle de l'utilisateur.
    - Admin    → toutes les lignes
    - User     → seulement ses services assignés
    """
    services = None if user.role == "admin" else user.services
    try:
        csv_text = await csv_svc.get_filtered_csv(services)
        return PlainTextResponse(content=csv_text, media_type="text/csv; charset=utf-8")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    admin=Depends(require_admin),
):
    """
    Upload d'un nouveau fichier CSV — remplace le fichier actif.
    Réservé aux administrateurs.
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Le fichier doit être un .csv ou .txt")

    content = await file.read()

    if len(content) > MAX_CSV_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 20 Mo)")

    try:
        csv_svc.save_csv(content)
        return {"ok": True, "filename": file.filename, "size": len(content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
