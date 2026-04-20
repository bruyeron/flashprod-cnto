"""
backend/services/manual_service.py
Logique métier pour les saisies manuelles (absences réelles, non logués).

NOUVEAU FICHIER : remplace le localStorage 'fp_manual_values' du navigateur.
Utilise une contrainte d'unicité (activity, week, field, day_index) avec
un UPSERT pour éviter les doublons.
"""

from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from models.db_models import ManualValueDB


def get_manual_values(db: Session, activity: str) -> dict:
    """
    Retourne les saisies manuelles d'une activité au format attendu par le frontend :
    {
      "Sem-36": {
        "abs_reel":  [null, 2.0, 1.0, null, 3.0, null, null],
        "non_logue": [0.0, null, 1.0, null, null, null, null]
      },
      ...
    }
    """
    rows = db.query(ManualValueDB).filter_by(activity=activity).all()

    result: dict[str, dict[str, list]] = {}
    for row in rows:
        if row.week not in result:
            result[row.week] = {
                "abs_reel":  [None] * 7,
                "non_logue": [None] * 7,
            }
        if row.field in result[row.week] and 0 <= row.day_index <= 6:
            result[row.week][row.field][row.day_index] = row.value

    return result


def save_manual_values(
    db: Session,
    activity: str,
    week: str,
    field: str,
    values: list,          # liste de 7 valeurs (float | None)
    updated_by: str,
) -> None:
    """
    Enregistre les 7 valeurs d'une semaine/champ avec UPSERT PostgreSQL.
    Si la ligne existe déjà, elle est mise à jour. Sinon, elle est insérée.
    """
    for day_index, value in enumerate(values):
        # Valeur numérique ou None
        val = float(value) if value is not None and value != "" else None

        stmt = pg_insert(ManualValueDB).values(
            activity=activity,
            week=week,
            field=field,
            day_index=day_index,
            value=val,
            updated_by=updated_by,
        )
        # ON CONFLICT (activity, week, field, day_index) → UPDATE value
        stmt = stmt.on_conflict_do_update(
            constraint="uq_manual_value",
            set_={"value": val, "updated_by": updated_by},
        )
        db.execute(stmt)

    db.commit()
