"""
backend/main.py
Point d'entrée FastAPI.
Lance avec : uvicorn main:app --reload --port 8000

MODIFICATIONS PAR RAPPORT À L'ORIGINAL :
  - Import de Base, engine, get_db depuis database.py
  - Base.metadata.create_all() : crée toutes les tables PostgreSQL au démarrage
  - bootstrap_admin() : crée l'admin par défaut + migre users.json si présent
  - Ajout des routers /api/comments et /api/manual
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# MODIFIÉ : imports base de données
from database import Base, engine, SessionLocal
from models import db_models  # noqa: F401 — nécessaire pour que SQLAlchemy découvre les tables
import services.auth_service as auth_svc

from routers import auth, csv
# NOUVEAU : nouveaux routers
from routers import comments, manual


# ── Lifecycle : démarrage / arrêt ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Exécuté au démarrage :
      1. Crée les tables PostgreSQL si elles n'existent pas
      2. Lance le bootstrap admin (migration users.json + création admin par défaut)
    """
    # 1. Création des tables (idempotent : ne recrée pas si elles existent)
    Base.metadata.create_all(bind=engine)

    # 2. Bootstrap admin + migration one-shot depuis users.json
    db = SessionLocal()
    try:
        auth_svc.bootstrap_admin(db)
    finally:
        db.close()

    yield
    # (code après yield = arrêt propre, rien à faire ici)


# ── Application ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Flash Production API",
    description="Backend de l'application flashprod",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # remplacer par votre domaine en prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router,     prefix="/api/auth",     tags=["Authentification"])
app.include_router(csv.router,      prefix="/api/csv",      tags=["CSV"])
# NOUVEAU
app.include_router(comments.router, prefix="/api/comments", tags=["Commentaires"])
app.include_router(manual.router,   prefix="/api/manual",   tags=["Saisies manuelles"])


@app.get("/api/health", tags=["Système"])
def health():
    """Vérifie que l'API et la connexion PostgreSQL sont opérationnelles."""
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "error", "db": str(e)}
    finally:
        db.close()
