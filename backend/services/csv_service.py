"""
backend/services/csv_service.py
Lecture, filtrage et stockage du fichier CSV de production.

MODIFICATIONS PAR RAPPORT À L'ORIGINAL :
  - Le CSV actif est maintenant lu depuis la table csv_files (PostgreSQL)
    au lieu du fichier data/production.csv
  - L'upload enregistre en base (avec historique) et désactive l'ancien actif
  - La fonction get_csv_text() accepte une Session SQLAlchemy
  - Le fallback BLOB_URL distant est conservé
  - La normalisation et le filtrage par service sont inchangés
"""

import csv
import io
import os
import re
from typing import Optional
from sqlalchemy.orm import Session

import httpx

from models.db_models import CsvFileDB

BLOB_READ_WRITE_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN", "")
BLOB_URL              = os.getenv("BLOB_URL", "")


# ── Lecture du CSV ─────────────────────────────────────────────────────────────

async def _fetch_remote_csv() -> str:
    """Télécharge le CSV depuis le stockage distant (Blob/S3/autre)."""
    async with httpx.AsyncClient() as client:
        headers = {}
        if BLOB_READ_WRITE_TOKEN:
            headers["Authorization"] = f"Bearer {BLOB_READ_WRITE_TOKEN}"
        r = await client.get(BLOB_URL, headers=headers, timeout=15)
        r.raise_for_status()
        return r.text


def get_csv_text(db: Session) -> str:
    """
    MODIFIÉ : lit le CSV actif depuis PostgreSQL.
    Priorité : base de données → URL distante.
    """
    # 1. CSV actif en base
    active = db.query(CsvFileDB).filter_by(is_active=True).order_by(
        CsvFileDB.uploaded_at.desc()
    ).first()
    if active:
        return active.content

    # 2. Fallback URL distante (conservé depuis l'original)
    if BLOB_URL:
        import asyncio
        return asyncio.run(_fetch_remote_csv())

    raise FileNotFoundError(
        "Aucun fichier CSV disponible. "
        "Importez un fichier via l'interface ou configurez BLOB_URL dans .env"
    )


def save_csv(db: Session, content: bytes, filename: str, uploaded_by: str) -> CsvFileDB:
    """
    MODIFIÉ : sauvegarde le CSV en base PostgreSQL.
    Désactive tous les anciens CSV actifs avant d'enregistrer le nouveau.
    """
    # Désactiver l'ancien CSV actif
    db.query(CsvFileDB).filter_by(is_active=True).update({"is_active": False})

    # Décoder le contenu (UTF-8 avec BOM si présent)
    text = content.decode("utf-8-sig")

    new_csv = CsvFileDB(
        filename=filename,
        content=text,
        uploaded_by=uploaded_by,
        is_active=True,
        file_size=len(content),
    )
    db.add(new_csv)
    db.commit()
    db.refresh(new_csv)
    return new_csv


def list_csv_history(db: Session) -> list[dict]:
    """Retourne l'historique des CSV importés (sans le contenu)."""
    files = db.query(CsvFileDB).order_by(CsvFileDB.uploaded_at.desc()).all()
    return [
        {
            "id": f.id,
            "filename": f.filename,
            "uploaded_by": f.uploaded_by,
            "uploaded_at": f.uploaded_at.isoformat(),
            "is_active": f.is_active,
            "file_size": f.file_size,
        }
        for f in files
    ]


# ── Normalisation (inchangée) ──────────────────────────────────────────────────

def _normalize_date(date_str: str) -> str:
    """Convertit YYYY-MM-DD en DD/MM/YYYY si nécessaire."""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        y, m, d = date_str.split("-")
        return f"{d}/{m}/{y}"
    return date_str


def _normalize_csv(text: str) -> str:
    """Normalise les dates dans la première colonne."""
    lines = text.splitlines()
    if not lines:
        return text
    result = [lines[0]]
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split(",")
        if parts:
            parts[0] = _normalize_date(parts[0])
        result.append(",".join(parts))
    return "\n".join(result)


# ── Filtrage par service (inchangé) ───────────────────────────────────────────

def filter_by_services(csv_text: str, services: Optional[list[str]]) -> str:
    """Filtre les lignes par groupe_suivi si l'utilisateur n'est pas admin."""
    if not services:
        return csv_text

    lines = csv_text.splitlines()
    if not lines:
        return csv_text

    header = lines[0]
    columns = [c.strip().strip('"') for c in header.split(",")]

    try:
        idx = columns.index("groupe_suivi")
    except ValueError:
        return csv_text

    filtered = [header]
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split(",")
        val = parts[idx].strip().strip('"') if idx < len(parts) else ""
        if val in services:
            filtered.append(line)

    return "\n".join(filtered)


# ── Point d'entrée principal ───────────────────────────────────────────────────

def get_filtered_csv(db: Session, services: Optional[list[str]]) -> str:
    """
    Charge le CSV actif depuis PostgreSQL, normalise les dates, filtre par services.
    """
    raw        = get_csv_text(db)
    normalized = _normalize_csv(raw)
    filtered   = filter_by_services(normalized, services)
    return filtered
