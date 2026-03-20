"""
backend/services/csv_service.py
Lecture, filtrage et normalisation du fichier CSV de production.

Priorité de la source CSV :
  1. data/production.csv  (fichier local uploadé ou placé manuellement)
  2. BLOB_URL dans .env   (stockage distant, ex-Vercel Blob ou autre)

Le filtrage par service se fait ici côté serveur.
"""

import csv
import io
import os
import re
from pathlib import Path
from typing import Optional

import httpx  # pip install httpx

CSV_FILE = Path(__file__).parent.parent / "data" / "production.csv"
BLOB_READ_WRITE_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN", "")
BLOB_URL = os.getenv("BLOB_URL", "")


# ── Lecture du CSV ────────────────────────────────────────────────────────────

async def _fetch_remote_csv() -> str:
    """Télécharge le CSV depuis le stockage distant (Blob/S3/autre)."""
    async with httpx.AsyncClient() as client:
        headers = {}
        if BLOB_READ_WRITE_TOKEN:
            headers["Authorization"] = f"Bearer {BLOB_READ_WRITE_TOKEN}"
        r = await client.get(BLOB_URL, headers=headers, timeout=15)
        r.raise_for_status()
        return r.text


async def get_csv_text() -> str:
    """
    Retourne le texte brut du CSV.
    Priorité : fichier local → URL distante.
    """
    if CSV_FILE.exists():
        return CSV_FILE.read_text(encoding="utf-8-sig")

    if BLOB_URL:
        return await _fetch_remote_csv()

    raise FileNotFoundError(
        "Aucun fichier CSV disponible. "
        "Uploadez un fichier via /api/csv/upload ou configurez BLOB_URL dans .env"
    )


def save_csv(content: bytes) -> None:
    """Sauvegarde le CSV uploadé en local."""
    CSV_FILE.parent.mkdir(exist_ok=True)
    CSV_FILE.write_bytes(content)


# ── Normalisation ─────────────────────────────────────────────────────────────

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
    result = [lines[0]]  # header intact
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split(",")
        if parts:
            parts[0] = _normalize_date(parts[0])
        result.append(",".join(parts))
    return "\n".join(result)


# ── Filtrage par service ──────────────────────────────────────────────────────

def filter_by_services(csv_text: str, services: Optional[list[str]]) -> str:
    """
    Si services est None ou vide → retourne tout (admin).
    Sinon filtre les lignes dont groupe_suivi est dans la liste.
    """
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
        return csv_text  # colonne absente, on retourne tout

    filtered = [header]
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split(",")
        val = parts[idx].strip().strip('"') if idx < len(parts) else ""
        if val in services:
            filtered.append(line)

    return "\n".join(filtered)


# ── Point d'entrée principal ──────────────────────────────────────────────────

async def get_filtered_csv(services: Optional[list[str]]) -> str:
    """
    Charge le CSV, normalise les dates, filtre par services.
    Retourne le CSV final prêt à être envoyé au frontend.
    """
    raw = await get_csv_text()
    normalized = _normalize_csv(raw)
    filtered = filter_by_services(normalized, services)
    return filtered
