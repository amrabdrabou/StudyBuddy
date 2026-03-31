# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Unix

# Install dependencies
pip install -r requirments.txt

# Run dev server
uvicorn app.main:app --reload

# Generate a secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Run RQ background worker (requires Redis)
python worker.py

# Run tests
pytest                              # all tests
pytest tests/test_progress_service.py   # single file

# Alembic migrations
alembic revision --autogenerate -m "description"   # generate migration
alembic upgrade head                                # apply
alembic downgrade -1                                # roll back one step
```

**Full `.env.dev`** (create at `backend/.env.dev`):
```
DATABASE_URL=postgresql+asyncpg://postgres:<password>@localhost:5432/studybuddy
SECRET_KEY=<generated-secret>
ENVIRONMENT=dev
OPENAI_API_KEY=<key>
LLM_MODEL=gpt-4o-mini          # optional override
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=<id>           # optional — OAuth only
GOOGLE_CLIENT_SECRET=<secret>   # optional — OAuth only
DEVELOPER_EMAILS=you@example.com  # comma-separated; these get the "developer" role
```

### Frontend (React + Vite)

```bash
cd frontend
npm install

npm run dev          # Dev server at http://localhost:5173
npm run build        # Type-check + Vite build
npm run lint         # ESLint

# E2E tests (requires both servers running)
npm run test:e2e              # All tests
npm run test:e2e:smoke        # Smoke tests only
npm run test:e2e:headed       # With browser UI
npm run test:e2e:debug        # Debug mode
npm run test:e2e:report       # View HTML report
```

**Env override:** Set `VITE_API_URL` to point the frontend at a different backend (default: `http://localhost:8000/api/v1`).

---

## Architecture

### Backend

`backend/app/` is a FastAPI app with async SQLAlchemy (PostgreSQL via `asyncpg`).

**Core files:**
- `main.py` — lifespan: (1) `create_all`, (2) Alembic `upgrade head` in a thread, (3) idempotent RBAC + prompt seeds; CORS, security headers, rate limiter, router mounts
- `core/config.py` — `Settings` via pydantic-settings; loaded from `.env.{ENVIRONMENT}`; `get_settings()` is LRU-cached; startup validator rejects insecure keys in production
- `core/db_setup.py` — async engine + `AsyncSessionLocal`; `Base` provides UUID PKs to all models; `get_db()` is the FastAPI dependency
- `core/migrations.py` — pre/post migration hooks run around `Base.metadata.create_all`
- `core/rbac.py` — `require_permission(resource, action)` returns a FastAPI dependency for DB-backed permission enforcement; no permissions are hardcoded
- `models/` — one SQLAlchemy ORM model per table; all imported in `app/models/__init__.py` to register with `Base` before `create_all`
- `api/v1/routers/` — one file per feature domain; all mounted at `/api/v1`
- `api/v1/deps.py` — convenience ownership-checking deps (`get_workspace`, `get_subject`, etc.) that also enforce row-level ownership
- `api/v1/dependencies.py` — shared auth deps (`get_current_active_user`)
- `services/` — business logic (AI processing, document extraction, storage)

**Auth:** JWT (access + refresh tokens) stored hashed in DB (`Token` model) for revocation. Passlib/bcrypt for passwords. Google OAuth optional.

**RBAC:** Two built-in roles (`user`, `developer`). Roles and permissions live entirely in the DB (`roles`, `permissions`, `role_permissions`, `user_roles`). Seeded idempotently at startup via `seeds/rbac_seed.py`. New permissions require only a DB insert.

**Rate limiting:** slowapi decorators — login: 5/min, register: 3/min, AI events: 20/hr.

**Schema migrations:** Dual approach — `create_all` handles fresh installs; Alembic (`alembic/`) handles incremental `ALTER TABLE` / index changes on existing databases. Both run at startup.

---

### AI Pipeline

The pipeline is background-driven via **RQ** (Redis Queue). The `worker.py` process must be running for AI features to work.

**Document pipeline** (`services/pipeline/tasks.py::run_document_pipeline`):
1. `summarize` — AI: summarize document text → stored in `DocumentContent`
2. `flashcards` — AI: generate deck from summary → persisted via `study_assets.create_flashcard_deck()`
3. `quiz` — AI: generate quiz set from summary → persisted via `study_assets.create_quiz_set()`
4. `micro_goals` — System: derive goals from workspace content
5. `progress` — System: cascade progress snapshots upward

**Workspace pipeline** (no document): steps 4–5 only.

Each pipeline run is recorded in the `pipeline_runs` table; the frontend polls `GET /workspaces/{id}/pipeline/status`.

**Prompt resolution** (`services/ai_service.py`): every LLM call first checks the DB (`prompts` table via `PromptService`) for an editable template, then falls back to `services/prompts.py` hardcoded templates. All LLM calls are logged to `llm_logs`.

**RAG** (`services/rag_service.py`): currently retrieves context by concatenating document summaries. The `retrieve_context()` interface is designed for future upgrade to vector search (pgvector/Pinecone); the `{{ context }}` Jinja2 variable in prompt templates is already the injection point.

---

### Progress System

Progress is **never stored on core entity tables**. It lives in two tables:
- `progress_snapshots` — latest value per entity, indexed for fast reads
- `progress_events` — immutable log of every change

Entry point: `services/progress_service.py::update_session_progress()`. Cascade flows upward automatically:
- **Session**: weighted average of flashcard review % and quiz score %
- **MicroGoal**: weighted average of its linked session snapshots
- **Workspace**: average of micro-goal snapshots (skips `completed` goals)
- **Subject**: average of workspace snapshots (skips `canceled` workspaces)
- **Mission (BigGoal)**: average of subject snapshots

Always call progress updates in a `try/except` — failures must not abort the primary operation.

---

### Frontend

`frontend/src/` is a React 18 + TypeScript + Tailwind CSS v4 SPA built with Vite.

**Routing — manual History API (no React Router):**
- `App.tsx` — top-level: `home | login | register | dashboard` via `window.location.pathname`
- `DashboardPage.tsx` — sub-routing via `NavState` discriminated union:
  - `overview` → `/dashboard`
  - `goals` → `/goals`
  - `goal` → `/goals/:id`
  - `subject` → `/goals/:goalId/subjects/:subjectId`
  - `workspace` → `/goals/:goalId/subjects/:subjectId/workspaces/:workspaceId`
  - `groups` → `/groups`, `settings` → `/settings`
- **Adding a new section:** add a `view` type to `NavState` in `Sidebar.tsx`, add mappings in `navStateToPath` / `pathToNavState` in `DashboardPage.tsx`, and render the component in the `DashboardPage` JSX.

**API client pattern:**
- `api/client.ts` — `authFetch` wrapper: injects Bearer token, handles 401 by dispatching `auth:expired` DOM event (caught in `App.tsx` to auto-logout), normalizes FastAPI error shapes
- `api/*.ts` — one file per backend domain exporting typed async functions

**State management:** Zustand stores in `src/store/`:
- `authStore.ts` — `isLoggedIn`, `page`, `showSplash`; actions: `loginSuccess`, `signOut`, `handleAuthExpired`, `navigatePage`
- `navStore.ts` — `navState`, breadcrumb `history`, `sidebarOpen`; navigation helpers (`toGoals`, `toGoal`, `toSubject`, `toWorkspace`, `toGroups`, `toSettings`, `goBack`); also exports `NavState` and `NavView` types
- Sidebar uses `navDirect()` for top-level links (clears history); pages use navigate-based helpers (push to history)

**Workspace detail context:** `features/workspaces/context/WorkspaceDetailContext.tsx` provides `{ workspaceId, workspaceTitle, subjectId }` to all workspace tab components via `WorkspaceDetailProvider`. Workspace tabs live in `features/workspaces/` and `components/workspaces/`.

**UI conventions:**
- Status colours are centralised in `components/ui/themeTokens.ts` — use the exported token maps and helper functions (`getMissionStatusTone`, `getSessionStatusTone`, etc.) rather than inline colour strings
- `components/ui/MainCollectionPage.tsx` and `MainDetailPage.tsx` are the standard shells for list and detail views
- `components/ui/CompactCard.tsx` wraps `card.tsx` with `p-4` padding; use it for list-item cards

**Path alias:** `@` resolves to `frontend/src/` (configured in `vite.config.ts`).

**Key UI libraries:**
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js`)
- Framer Motion for animations
- Tiptap for rich-text notes editor
- Spline for 3D hero elements

**E2E tests:** Playwright, tests in `frontend/tests/e2e/`. Assumes frontend on `:5173` and backend on `:8000`.
