"""
backend/migrate_to_postgres.py
Script de migration one-shot vers PostgreSQL.

À exécuter UNE SEULE FOIS après avoir configuré DATABASE_URL dans .env :
    python migrate_to_postgres.py

Ce script :
  1. Crée toutes les tables PostgreSQL
  2. Migre les utilisateurs depuis data/users.json
  3. Importe data/production.csv comme CSV actif
  4. Renomme les fichiers sources pour éviter une double migration

Les données localStorage (commentaires, saisies manuelles) ne peuvent pas
être migrées automatiquement — elles sont propres à chaque navigateur.
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from database import Base, engine, SessionLocal
import models.db_models  # noqa — enregistre les tables auprès de SQLAlchemy
from models.db_models import UserDB, CsvFileDB


def migrate():
    print("=" * 60)
    print("Migration vers PostgreSQL — Flash Production")
    print("=" * 60)

    # ── 1. Créer les tables ────────────────────────────────────────
    print("\n[1/3] Création des tables PostgreSQL…")
    Base.metadata.create_all(bind=engine)
    print("      ✓ Tables créées (ou déjà existantes)")

    db = SessionLocal()

    try:
        # ── 2. Migrer users.json ───────────────────────────────────
        users_file = Path(__file__).parent / "data" / "users.json"
        print(f"\n[2/3] Migration des utilisateurs depuis {users_file}…")

        if not users_file.exists():
            print("      ⚠ Fichier users.json introuvable — ignoré")
        else:
            with open(users_file, "r", encoding="utf-8") as f:
                old_users = json.load(f)

            migrated = 0
            skipped  = 0
            for u in old_users:
                exists = db.query(UserDB).filter_by(username=u["username"]).first()
                if exists:
                    print(f"      → {u['username']} déjà en base — ignoré")
                    skipped += 1
                    continue
                db.add(UserDB(
                    id=u["id"],
                    username=u["username"],
                    password_hash=u["password_hash"],
                    role=u["role"],
                    services=json.dumps(u.get("services", [])),
                    active=u.get("active", True),
                ))
                migrated += 1
                print(f"      + {u['username']} ({u['role']}) importé")

            db.commit()
            print(f"      ✓ {migrated} utilisateur(s) migré(s), {skipped} ignoré(s)")

            # Renommer pour éviter la double migration
            backup = users_file.with_suffix(".json.migrated")
            users_file.rename(backup)
            print(f"      → users.json renommé en {backup.name}")

        # ── 3. Importer production.csv ─────────────────────────────
        csv_file = Path(__file__).parent / "data" / "production.csv"
        print(f"\n[3/3] Import du CSV depuis {csv_file}…")

        if not csv_file.exists():
            print("      ⚠ Fichier production.csv introuvable — ignoré")
            print("        Vous pourrez importer un CSV via l'interface admin.")
        else:
            # Désactiver les éventuels CSV déjà en base
            db.query(CsvFileDB).filter_by(is_active=True).update({"is_active": False})

            content = csv_file.read_text(encoding="utf-8-sig")
            size    = csv_file.stat().st_size

            db.add(CsvFileDB(
                filename="production.csv",
                content=content,
                uploaded_by="migration",
                is_active=True,
                file_size=size,
            ))
            db.commit()
            print(f"      ✓ {csv_file.name} importé ({size:,} octets)")

            # Renommer pour garder une trace
            backup = csv_file.with_suffix(".csv.migrated")
            csv_file.rename(backup)
            print(f"      → production.csv renommé en {backup.name}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erreur lors de la migration : {e}")
        raise
    finally:
        db.close()

    print("\n" + "=" * 60)
    print("✅ Migration terminée avec succès !")
    print("   Vous pouvez maintenant démarrer le backend :")
    print("   uvicorn main:app --reload --port 8000")
    print("=" * 60)


if __name__ == "__main__":
    migrate()
