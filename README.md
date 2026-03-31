# StudyBuddy Backend

FastAPI backend for StudyBuddy. Handles auth, AI generation, document processing, quizzes, flashcards, and study sessions.

The database is on AWS RDS (PostgreSQL) — you do not run a database container locally or in production. Redis runs in Docker for the background job worker.

---

## Stack

- Python 3.13, FastAPI, SQLAlchemy 2 (async), asyncpg
- PostgreSQL on AWS RDS
- Redis + RQ for background jobs
- Alembic for migrations
- nginx + Certbot (Let's Encrypt) in production
- Docker for both dev and production

---

## Dev setup

Copy the env file and fill in your values:

```bash
cp backend/.env.example backend/.env.dev
```

Minimum required fields in `backend/.env.dev`:

```
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@your-rds-endpoint:5432/studybuddy
SECRET_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
OPENAI_API_KEY=<your key>
```

Start everything from the project root:

```bash
docker compose up
```

This starts the API on `http://localhost:8000`, the frontend on `http://localhost:5173`, the RQ worker, and Redis. Migrations and seed data run automatically on startup.

API docs: `http://localhost:8000/docs` (dev only, disabled in production).

---

## Production setup

### 1. Prepare the server

You need a VPS or EC2 instance with Docker and Docker Compose installed, and a domain pointed at its IP.

### 2. Configure environment

```bash
cp backend/.env.example backend/.env.production
```

Fill in all `REPLACE_WITH_*` values. Key ones:

```
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@your-rds-endpoint:5432/studybuddy
SECRET_KEY=<strong random value>
OPENAI_API_KEY=<your key>
ALLOWED_ORIGINS=["https://yourdomain.com"]
UPLOAD_DIR=/var/app/uploads
```

### 3. Set your domain in the nginx config

Edit `docker/nginx/prod.conf` and replace all three instances of `YOUR_DOMAIN` with your actual domain.

### 4. Issue the SSL certificate (first time only)

Run from the project root. nginx needs to be up before certbot can verify your domain:

```bash
docker compose -f docker-compose.prod.yml up -d nginx
```

Then issue the certificate:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d yourdomain.com \
  --email your@email.com \
  --agree-tos --no-eff-email
```

### 5. Start everything

```bash
docker compose -f docker-compose.prod.yml up -d
```

Certbot will automatically renew the certificate every 12 hours if it is close to expiry.

---

## Database

The database is on AWS RDS. Point `DATABASE_URL` at the RDS endpoint in your env file. No database container is needed.

Migrations run automatically on startup. To run manually:

```bash
alembic upgrade head
```

To generate a new migration after changing a model:

```bash
alembic revision --autogenerate -m "describe what changed"
```

---

## Background worker

The AI document pipeline runs in a separate RQ worker. In both dev and production Docker Compose setups, the worker starts automatically as its own container alongside the API.

To run manually outside Docker:

```bash
python worker.py
```

---

## Environment variables

The app loads `.env.{ENVIRONMENT}` based on the `ENVIRONMENT` shell variable. See `.env.example` for all available variables.

Required everywhere:
- `DATABASE_URL`
- `SECRET_KEY` (min 32 chars)

Required in production:
- `OPENAI_API_KEY`
- `ALLOWED_ORIGINS` — your actual frontend domain
- `UPLOAD_DIR` — absolute path

---

## Project structure

```
docker/
  Dockerfile.backend
  Dockerfile.frontend
  nginx/
    prod.conf           reverse proxy config (replace YOUR_DOMAIN before deploying)
backend/
  app/
    api/v1/routers/     one file per feature (auth, quizzes, flashcards, etc.)
    core/               config, DB setup, migrations
    models/             SQLAlchemy ORM models
    schemas/            Pydantic request/response schemas
    services/           business logic, AI service, document processing
    seeds/              startup data (roles, prompts)
frontend/
  src/                  React + TypeScript SPA
  nginx.conf            nginx config used inside the frontend container
docker-compose.yml           dev
docker-compose.prod.yml      production
```
