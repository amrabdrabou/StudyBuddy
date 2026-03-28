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

# Reset database (drops and recreates)
python reset_db.py

# Run RQ background worker (requires Redis)
python worker.py
```

**Environment config:** Create `backend/.env.dev` (loaded automatically in dev):
```
DATABASE_URL=postgresql+asyncpg://postgres:<password>@localhost:5432/studybuddy
SECRET_KEY=<generated-secret>
ENVIRONMENT=dev
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

## Architecture

### Backend

`backend/app/` is a FastAPI app with async SQLAlchemy (PostgreSQL via `asyncpg`).

- `main.py` — app entry point: lifespan (DB init + migrations), CORS, security headers, rate limiter, router mounts
- `core/config.py` — `Settings` via pydantic-settings; loaded from `.env.{ENVIRONMENT}`; `get_settings()` is LRU-cached
- `core/db_setup.py` — async engine + `AsyncSessionLocal`; `Base` provides UUID PKs to all models; `get_db()` is the FastAPI dependency
- `core/migrations.py` — pre/post migration hooks run around `Base.metadata.create_all`
- `models/` — one SQLAlchemy ORM model per table; all imported in `app/models/__init__.py` to register with `Base` before `create_all`
- `api/v1/routers/` — one file per feature domain; all mounted at `/api/v1`
- `api/v1/dependencies.py` — shared deps (`get_current_active_user`, etc.)
- `services/` — business logic (AI processing, document extraction, storage)

**Auth:** JWT tokens stored hashed in DB (`Token` model) for revocation. Passlib/bcrypt for passwords. Google OAuth supported.

**Rate limiting:** slowapi decorators on sensitive endpoints (login: 5/min, register: 3/min, AI events: 20/hr).

**Document upload flow:** `POST /sessions/{id}/documents/upload` → validate MIME → save file to `uploads/` → create `Document` DB record → extract text → trigger AI generation.

### Frontend

`frontend/src/` is a React 18 + TypeScript + Tailwind CSS v4 SPA built with Vite.

**Routing — manual History API (no React Router):**
- `App.tsx` handles top-level routing: `home | login | register | dashboard` via `window.location.pathname`
- `DashboardPage.tsx` handles sub-routing via a `NavState` discriminated union:
  - `overview` → `/dashboard`
  - `goals` → `/goals`
  - `goal` → `/goals/:id`
  - `subject` → `/goals/:goalId/subjects/:subjectId`
  - `workspace` → `/goals/:goalId/subjects/:subjectId/workspaces/:workspaceId`
  - `groups` → `/groups`
  - `settings` → `/settings`
- **Adding a new section:** add a `view` type to `NavState` in `Sidebar.tsx`, add mappings in `navStateToPath` / `pathToNavState` in `DashboardPage.tsx`, and render the component in the `DashboardPage` JSX.

**API client pattern:**
- `api/client.ts` — `authFetch` wrapper: injects Bearer token, handles 401 by dispatching `auth:expired` DOM event (caught in `App.tsx` to auto-logout), normalizes FastAPI error shapes
- `api/*.ts` — one file per backend domain exporting typed async functions

**State management:** Zustand stores in `src/store/`:
- `authStore.ts` — `isLoggedIn`, `page` (top-level routing), `showSplash`; actions: `loginSuccess`, `signOut`, `handleAuthExpired`, `navigatePage`
- `navStore.ts` — `navState`, breadcrumb `history`, `sidebarOpen`; all nav action conveniences (`toGoals`, `toGoal`, `toSubject`, `toWorkspace`, `toGroups`, `toSettings`, `goBack`); also exports the `NavState` and `NavView` types
- Sidebar uses `navDirect()` for top-level links (clears history); pages use `navigate()`-based convenience methods (pushes to history)

**Path alias:** `@` resolves to `frontend/src/` (configured in `vite.config.ts`).

**Key UI libraries:**
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no `tailwind.config.js`)
- Framer Motion for animations
- Tiptap for rich-text notes editor
- Spline for 3D hero elements

**E2E tests:** Playwright, tests in `frontend/tests/e2e/`. Assumes frontend on `:5173` and backend on `:8000`.
