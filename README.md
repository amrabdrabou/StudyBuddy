# StudyBuddy

StudyBuddy is a full-stack study platform with AI-assisted workflows for documents, summaries, flashcards, quizzes, notes, chat, and study sessions.

This repository contains:

- `backend/` - FastAPI API, database models, business logic, document processing, background jobs
- `frontend/` - React + TypeScript single-page app
- `docker/` - Dockerfiles and nginx production config
- `docker-compose.dev.yml` - local development stack
- `docker-compose.prod.yml` - production stack

## Stack

- Backend: Python 3.13, FastAPI, SQLAlchemy, Alembic
- Frontend: React, TypeScript, Vite
- Jobs: Redis + RQ worker
- Database: PostgreSQL
- Production proxy: nginx + Certbot
- Runtime: Docker Compose

## Architecture

Development stack:

- `frontend` runs Vite on `http://localhost:5173`
- `backend` runs FastAPI on `http://localhost:8000`
- `worker` processes background jobs
- `postgres` and `redis` run as local containers

Production stack:

- `nginx` terminates TLS and routes traffic
- `frontend` serves the built SPA from its container
- `backend` serves the API privately on port `8000`
- `worker` processes background jobs
- `redis` supports the queue
- uploaded files are stored in the shared Docker volume mounted at `/var/app/uploads`

## Repository Layout

```text
backend/
  app/
    api/
    core/
    models/
    schemas/
    services/
    seeds/
  alembic/
  worker.py
frontend/
  src/
docker/
  Dockerfile.backend
  Dockerfile.frontend
  nginx/
    prod.conf
docker-compose.dev.yml
docker-compose.prod.yml
README.md
```

## Development

### 1. Prerequisites

- Docker Desktop or Docker Engine with Compose

### 2. Create the dev env file

```bash
cp backend/.env.example backend/.env.dev
```

Review at least these values in `backend/.env.dev`:

```env
ENVIRONMENT=dev
SECRET_KEY=<at least 32 chars>
OPENAI_API_KEY=<your key if you want AI features>
```

Notes:

- In Docker dev mode, `DATABASE_URL`, `REDIS_URL`, `ALLOWED_ORIGINS`, and `UPLOAD_DIR` are overridden by `docker-compose.dev.yml`
- The dev stack uses the local `postgres` and `redis` containers automatically

### 3. Start the dev stack

```bash
docker compose -f docker-compose.dev.yml up --build
```

Available services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 4. Stop the dev stack

```bash
docker compose -f docker-compose.dev.yml down
```

Remove volumes too:

```bash
docker compose -f docker-compose.dev.yml down -v
```

### Dev behavior

- backend code is bind-mounted into the container
- frontend code is bind-mounted into the container
- FastAPI runs in reload mode
- Vite runs in dev mode with hot reload
- uploads are stored in the `backend_dev_uploads` volume
- database data is stored in `postgres_dev_data`

## Production

### 1. Prerequisites

- A Linux server with Docker and Docker Compose
- A domain pointed to the server IP
- Ports `80` and `443` open

### 2. Create the production env file

```bash
cp backend/.env.example backend/.env.production
```

Set production values in `backend/.env.production`.

Important variables:

```env
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DBNAME
SECRET_KEY=<strong random value>
OPENAI_API_KEY=<required in production>
ALLOWED_ORIGINS=["https://your-domain.com"]
GOOGLE_REDIRECT_URI=https://your-domain.com/api/v1/auth/google/callback
UPLOAD_DIR=/var/app/uploads
```

Notes:

- keep `UPLOAD_DIR=/var/app/uploads` in production because both `backend` and `worker` use that shared mounted path
- `REDIS_URL` is overridden by `docker-compose.prod.yml` to `redis://redis:6379/0`

### 3. Configure nginx

Update your real domain in [docker/nginx/prod.conf](/d:/StudyBuddy/docker/nginx/prod.conf).

Make sure:

- `server_name` matches your domain
- certificate paths match your domain
- HTTP redirects point to the correct host

### 4. Build and start production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This starts:

- `nginx`
- `frontend`
- `backend`
- `worker`
- `redis`

### 5. Issue the TLS certificate

For a first-time deploy, you may start nginx first:

```bash
docker compose -f docker-compose.prod.yml up -d nginx
```

Then request the certificate:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot -d your-domain.com -d www.your-domain.com --email you@example.com --agree-tos --no-eff-email
```

Restart nginx after the certificate is created:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

### 6. Update production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 7. Stop production

```bash
docker compose -f docker-compose.prod.yml down
```

## Environment Files

- `backend/.env.example` - template
- `backend/.env.dev` - local development values
- `backend/.env.production` - production values

The backend loads `.env.{ENVIRONMENT}` through Pydantic settings.

Common variables:

- `ENVIRONMENT`
- `DATABASE_URL`
- `SECRET_KEY`
- `OPENAI_API_KEY`
- `ALLOWED_ORIGINS`
- `REDIS_URL`
- `UPLOAD_DIR`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## Uploads

Supported document types:

- `.pdf`
- `.doc`
- `.docx`
- `.txt`

Limits:

- max upload size is controlled by `UPLOAD_MAX_FILE_SIZE_MB`
- nginx production proxy currently allows `20M` request bodies

Storage locations:

- development uploads: `/app/uploads` inside backend and worker containers
- production uploads: `/var/app/uploads` inside backend and worker containers

## Database and Migrations

Backend startup applies schema setup automatically:

- `Base.metadata.create_all(...)`
- `alembic upgrade head`
- seed data for RBAC and prompts

Run migrations manually inside the backend container if needed:

```bash
alembic upgrade head
```

Generate a migration:

```bash
alembic revision --autogenerate -m "describe change"
```

## Background Jobs

The worker entry point is [backend/worker.py](/d:/StudyBuddy/backend/worker.py).

It consumes Redis-backed RQ jobs used by the document and AI pipeline.

In both dev and production, the worker is started as its own service by Docker Compose.

## Common Commands

Start dev:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Stop dev:

```bash
docker compose -f docker-compose.dev.yml down
```

Start prod:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Show production logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Backend logs only:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

Worker logs only:

```bash
docker compose -f docker-compose.prod.yml logs -f worker
```

## Troubleshooting

### File uploads fail in production

Check:

- `UPLOAD_DIR=/var/app/uploads` in production
- both `backend` and `worker` mount the `uploads` volume
- nginx `client_max_body_size` is large enough

### CORS errors

Check:

- `ALLOWED_ORIGINS` contains the exact frontend origin
- frontend API URL is correct for the environment

### Backend starts but jobs do not run

Check:

- `worker` container is up
- `redis` container is healthy
- `REDIS_URL` points to `redis://redis:6379/0` in Docker

### Docs unavailable in production

This is expected. FastAPI docs are disabled outside `ENVIRONMENT=dev`.
