"""
backend/main.py
Point d'entrée FastAPI.
Lance avec : uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, csv

app = FastAPI(
    title="Flash Production API",
    description="Backend de l'application Flash Production",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# En dev, on autorise le frontend Vite (port 5173).
# En production, remplacer par le vrai domaine.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Authentification"])
app.include_router(csv.router,  prefix="/api/csv",  tags=["CSV"])


@app.get("/api/health", tags=["Système"])
def health():
    """Vérifie que l'API tourne."""
    return {"status": "ok"}
