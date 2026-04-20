"""
backend/models/db_models.py
Modèles SQLAlchemy — tables PostgreSQL.

NOUVEAU FICHIER (remplace la persistance JSON + localStorage) :
  - Table users        : remplace data/users.json
  - Table csv_files    : remplace data/production.csv (avec historique)
  - Table comments     : remplace localStorage 'fp_comments'
  - Table manual_values: remplace localStorage 'fp_manual_values'
"""

from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Text,
    DateTime, Float, Integer, Index, UniqueConstraint
)
from database import Base


# ══════════════════════════════════════════════════════════════════════════════
# 1. UTILISATEURS
#    Remplace : backend/data/users.json
# ══════════════════════════════════════════════════════════════════════════════
class UserDB(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True)
    username      = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role          = Column(String(20), default="user", nullable=False)
    # Services stockés en JSON texte : '["Yas","ARO"]'
    # PostgreSQL supporte ARRAY ou JSONB, mais Text reste portable et simple
    services      = Column(Text, default="[]", nullable=False)
    active        = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


# ══════════════════════════════════════════════════════════════════════════════
# 2. FICHIERS CSV IMPORTÉS
#    Remplace : backend/data/production.csv (fichier unique)
#    Avantage : historique complet des imports, rollback possible
# ══════════════════════════════════════════════════════════════════════════════
class CsvFileDB(Base):
    __tablename__ = "csv_files"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    filename    = Column(String(255), nullable=False)
    # Contenu CSV brut — PostgreSQL gère bien les grands TEXT
    content     = Column(Text, nullable=False)
    uploaded_by = Column(String(100), nullable=False)   # username de l'admin
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    # Un seul CSV est actif à la fois — is_active=True = celui servi au frontend
    is_active   = Column(Boolean, default=True, nullable=False)
    file_size   = Column(Integer)                        # taille en octets

    def __repr__(self):
        return f"<CsvFile {self.filename} (actif={self.is_active})>"


# ══════════════════════════════════════════════════════════════════════════════
# 3. COMMENTAIRES SUR CELLULES
#    Remplace : localStorage 'fp_comments' dans le navigateur
#    Avantage : partagés entre tous les utilisateurs connectés, persistants
# ══════════════════════════════════════════════════════════════════════════════
class CommentDB(Base):
    __tablename__ = "comments"

    id         = Column(String, primary_key=True)         # UUID généré côté Python
    # cell_key : clé unique de cellule, ex: "ARO::ca::Sem-36::2025-09-02"
    cell_key   = Column(String(500), nullable=False)
    # activity : groupe_suivi, ex: "ARO", "Yas", "Prodigy"
    activity   = Column(String(100), nullable=False)
    author     = Column(String(100), nullable=False)       # username
    text       = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Index composite pour accélérer la récupération par activité
    __table_args__ = (
        Index("ix_comments_activity_cell", "activity", "cell_key"),
    )

    def __repr__(self):
        return f"<Comment {self.cell_key} by {self.author}>"


# ══════════════════════════════════════════════════════════════════════════════
# 4. SAISIES MANUELLES (absences réelles, non logués)
#    Remplace : localStorage 'fp_manual_values' dans le navigateur
#    Avantage : données partagées entre users, persistantes côté serveur
# ══════════════════════════════════════════════════════════════════════════════
class ManualValueDB(Base):
    __tablename__ = "manual_values"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    # activity  : groupe_suivi, ex: "ARO"
    activity   = Column(String(100), nullable=False)
    # week      : ex: "Sem-36"
    week       = Column(String(20), nullable=False)
    # field     : "abs_reel" ou "non_logue"
    field      = Column(String(20), nullable=False)
    # day_index : 0=lun, 1=mar, ..., 6=dim
    day_index  = Column(Integer, nullable=False)
    value      = Column(Float, nullable=True)
    updated_by = Column(String(100))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Contrainte d'unicité : une seule valeur par (activité, semaine, champ, jour)
    __table_args__ = (
        UniqueConstraint("activity", "week", "field", "day_index",
                         name="uq_manual_value"),
        Index("ix_manual_activity_week", "activity", "week"),
    )

    def __repr__(self):
        return f"<ManualValue {self.activity}/{self.week}/{self.field}[{self.day_index}]={self.value}>"
