# Guide de migration PostgreSQL — Flash Production

## Vue d'ensemble des modifications

### Backend — fichiers modifiés ou créés

| Fichier | Statut | Rôle |
|---|---|---|
| `requirements.txt` | **Modifié** | Ajout de `sqlalchemy`, `psycopg2-binary`, `alembic` |
| `.env.example` | **Modifié** | Ajout de `DATABASE_URL` |
| `database.py` | **Nouveau** | Connexion PostgreSQL, `get_db()` injectable |
| `models/db_models.py` | **Nouveau** | 4 tables : `users`, `csv_files`, `comments`, `manual_values` |
| `services/auth_service.py` | **Modifié** | Remplace JSON par requêtes SQLAlchemy |
| `services/csv_service.py` | **Modifié** | Lit/écrit le CSV depuis PostgreSQL |
| `services/comment_service.py` | **Nouveau** | CRUD commentaires en base |
| `services/manual_service.py` | **Nouveau** | CRUD saisies manuelles avec UPSERT |
| `routers/auth.py` | **Modifié** | Injecte `db: Session` via `Depends(get_db)` |
| `routers/csv.py` | **Modifié** | Upload → PostgreSQL + endpoint historique |
| `routers/comments.py` | **Nouveau** | `GET/POST/DELETE /api/comments` |
| `routers/manual.py` | **Nouveau** | `GET/POST /api/manual` |
| `main.py` | **Modifié** | Création tables au démarrage + nouveaux routers |
| `migrate_to_postgres.py` | **Nouveau** | Script de migration one-shot |

### Frontend — fichiers modifiés

| Fichier | Statut | Modification |
|---|---|---|
| `src/main.jsx` | **Modifié** | `CommentProvider` dans `AuthProvider` + prop `currentActivity` |
| `src/App.jsx` | **Modifié** | `useManualValues` via API, `manualValues` passé à `DataTable` |
| `src/context/CommentContext.jsx` | **Modifié** | `localStorage` → API `/api/comments` |
| `src/components/WeeklyCompletionModal.jsx` | **Modifié** | `localStorage` → API `/api/manual` |
| `src/components/DataTable.jsx` | **Modifié** | `manualValues` reçu en prop (plus de `loadManualValues`) |

---

## Étape 1 — Installer PostgreSQL en local (développement)

### Sur Windows
Télécharger et installer depuis : https://www.postgresql.org/download/windows/
Cocher "pgAdmin 4" pendant l'installation.

### Sur macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

### Sur Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

## Étape 2 — Créer la base de données et l'utilisateur

Ouvrir le terminal PostgreSQL (`psql`) :

```bash
# Windows : ouvrir "SQL Shell (psql)" depuis le menu démarrer
# macOS/Linux :
sudo -u postgres psql
```

Dans le shell psql, exécuter :

```sql
-- Créer un utilisateur dédié
CREATE USER flashprod_user WITH PASSWORD 'monMotDePasse';

-- Créer la base de données
CREATE DATABASE flashprod_db OWNER flashprod_user;

-- Vérifier
\l

-- Quitter
\q
```

---

## Étape 3 — Configurer le backend

```bash
# Copier le fichier d'environnement
cp .env.example .env
```

Ouvrir `.env` et renseigner :

```env
# Adapter avec vos valeurs
DATABASE_URL=postgresql://flashprod_user:monMotDePasse@localhost:5432/flashprod_db

PASSWORD_SALT=une_chaine_aleatoire_longue_et_unique
ADMIN_DEFAULT_PASS=VotreMotDePasseAdmin
```

---

## Étape 4 — Installer les dépendances Python

```bash
cd backend
pip install -r requirements.txt
```

Vérifier que psycopg2 est bien installé :

```bash
python -c "import psycopg2; print('psycopg2 OK')"
```

---

## Étape 5 — Migrer les données existantes

```bash
# Depuis le dossier backend/
python migrate_to_postgres.py
```

Ce script va :
- Créer toutes les tables PostgreSQL
- Importer les utilisateurs depuis `data/users.json`
- Importer `data/production.csv` comme CSV actif
- Renommer les fichiers source en `.migrated` pour éviter une double migration

> ⚠️ **Les commentaires et saisies manuelles stockés dans le navigateur
> (localStorage) ne peuvent pas être migrés automatiquement.**
> Ils seront perdus. Prévenez vos utilisateurs avant la mise en production.

---

## Étape 6 — Démarrer et tester le backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Vérifier que tout fonctionne :

```bash
# Santé de l'API et connexion PostgreSQL
curl http://localhost:8000/api/health
# Réponse attendue : {"status":"ok","db":"connected"}

# Documentation interactive
# Ouvrir dans le navigateur : http://localhost:8000/docs
```

---

## Étape 7 — Démarrer le frontend

Aucune modification des commandes de démarrage :

```bash
cd frontend
npm install
npm run dev
```

---

## Nouveaux endpoints disponibles

### Commentaires
```
GET    /api/comments/{activity}   — Tous les commentaires d'une activité
POST   /api/comments              — Ajouter un commentaire
DELETE /api/comments/{id}         — Supprimer un commentaire
```

### Saisies manuelles
```
GET  /api/manual/{activity}       — Saisies manuelles d'une activité
POST /api/manual                  — Sauvegarder des valeurs
```

### CSV
```
GET  /api/csv/data                — CSV filtré (inchangé)
POST /api/csv/upload              — Upload CSV (maintenant stocké en BDD)
GET  /api/csv/history             — Historique des imports (nouveau, admin)
```

---

## Déploiement en production

### Options d'hébergement PostgreSQL recommandées

| Service | Offre gratuite | Notes |
|---|---|---|
| **Supabase** | 500 MB | Très simple à configurer |
| **Render.com** | 1 GB / 90 jours | Intégré avec le déploiement backend |
| **Railway** | 1 GB | Bon DX, prix abordable |
| **Neon** | 3 GB | PostgreSQL serverless |

### Exemple avec Supabase

1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Aller dans **Settings → Database → Connection string**
4. Copier l'URL et la coller dans votre `.env` de production :

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```

### Variables d'environnement en production

Ne jamais commiter `.env`. Sur votre hébergeur (Render, Railway, etc.),
définir les variables d'environnement directement dans leur interface :

```
DATABASE_URL    = postgresql://...
PASSWORD_SALT   = une_valeur_unique_et_secrete
ADMIN_DEFAULT_PASS = (peut être vide si admin déjà créé)
```

### CORS en production

Dans `backend/main.py`, remplacer :
```python
allow_origins=["http://localhost:5173"]
```
par :
```python
allow_origins=["https://votre-domaine.com"]
```

---

## Dépannage

### Erreur : `could not connect to server`
- Vérifier que PostgreSQL est démarré : `sudo systemctl status postgresql`
- Vérifier les identifiants dans `.env`

### Erreur : `psycopg2.OperationalError: FATAL: role "..." does not exist`
- Recréer l'utilisateur dans psql (voir Étape 2)

### Erreur : `relation "users" does not exist`
- Lancer le script de migration : `python migrate_to_postgres.py`
- Ou démarrer le backend une fois (il crée les tables au démarrage)

### Les commentaires n'apparaissent plus
- Normal après migration : ils étaient dans le localStorage du navigateur
- Les nouveaux commentaires seront bien persistés en PostgreSQL

### `DATABASE_URL manquante` au démarrage
- Vérifier que `.env` existe et contient `DATABASE_URL`
- Vérifier que `python-dotenv` est installé
