"""
backend/database.py
Connexion PostgreSQL via SQLAlchemy.

MODIFICATION PAR RAPPORT À L'ORIGINAL :
  - Remplace toute la persistance JSON (users.json) par une vraie BDD PostgreSQL
  - L'URL de connexion est lue depuis la variable d'environnement DATABASE_URL
  - La fonction get_db() est une dépendance FastAPI injectable dans tous les routers
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# ── URL de connexion ───────────────────────────────────────────────────────────
# Lue depuis .env — ex: postgresql://user:pass@localhost:5432/flashprod_db
DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise RuntimeError(
        "Variable d'environnement DATABASE_URL manquante.\n"
        "Copiez .env.example vers .env et remplissez DATABASE_URL."
    )

# ── Moteur SQLAlchemy ──────────────────────────────────────────────────────────
# pool_pre_ping=True : vérifie la connexion avant chaque requête (robustesse)
# pool_size / max_overflow : ajustez selon votre hébergeur PostgreSQL
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ── Classe de base pour tous les modèles ORM ──────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dépendance FastAPI ─────────────────────────────────────────────────────────
def get_db():
    """
    Générateur de session — à injecter via Depends(get_db) dans les routers.
    Garantit la fermeture de la session après chaque requête.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
