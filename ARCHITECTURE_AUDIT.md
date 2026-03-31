# StudyBuddy Codebase Architecture Audit

**Date:** March 30, 2026  
**Scope:** Full codebase analysis (backend, frontend, database, AI pipeline)  
**Status:** PRE-REFACTOR ANALYSIS — NO CODE CHANGES MADE

---

## ��� Executive Summary

StudyBuddy is an **AI-powered study application** with a solid foundational architecture but several areas for improvement:

- ✅ **Strengths:** Clean layered backend, async-first design, JWT security, database migrations, Redis queuing
- ⚠️ **Concerns:** Large monolithic frontend component, tight coupling in business logic, AI pipeline lacks guardrails, RAG is placeholder-only
- ��� **Critical Issues:** Prompt versioning incomplete, no input validation on prompts, error handling gaps, N+1 query risks

---

## ���️ PHASE 1: FULL CODEBASE ANALYSIS

### 1. ARCHITECTURE OVERVIEW

#### 1.1 Backend Architecture

**Framework:** FastAPI (Python async)  
**ORM:** SQLAlchemy async with Alembic migrations  
**Auth:** JWT tokens (hashed in database), OAuth2PasswordBearer, RBAC  
**Queue:** RQ (Redis Queue) for async tasks  
**Caching:** Redis  

**Layers:**
1. **API Layer** (`/api/v1/routers/`) — FastAPI routes, input validation, HTTP responses
2. **Service Layer** (`/services/`) — Business logic, AI calls, document processing, RAG
3. **Model Layer** (`/models/`) — SQLAlchemy ORM entities, relationships
4. **Schema Layer** (`/schemas/`) — Pydantic validators, API request/response types
5. **Core Layer** (`/core/`) — Config, security, database, rate limiting, RBAC

**Key Services:**
- `ai_service.py` — LLM integration, content generation (summarization, flashcards, quizzes, roadmaps)
- `prompt_service.py` — Database-driven prompt management with Jinja2 templating
- `rag_service.py` — RAG context retrieval (currently flat document concat, no vector DB)
- `document_extraction.py` — PDF/Word/text extraction
- `pipeline/tasks.py` — RQ task queue for async generation pipelines
- `system/micro_goal_engine.py` — Deterministic goal generation from workspace content

**Middleware & Features:**
- Rate limiting (slowapi) — login 5/min, register 3/min, AI events 20/hr
- CORS — allows `localhost:5173`
- Security headers — X-Content-Type, X-Frame-Options, etc.
- RBAC — dev/user roles with permission matrix
- Seed system — idempotent RBAC + prompt data initialization

#### 1.2 Frontend Architecture

**Framework:** React 18 + TypeScript + Vite  
**State Management:** Zustand (two stores: authStore, navStore)  
**Routing:** Manual History API (no React Router)  
**Styling:** Tailwind CSS v4  
**UI Library:** Framer Motion (animations), Tiptap (rich text editor), Spline (3D)

**Structure:**
- `pages/` — Section-level components (WorkspacesSection, SessionsSection, etc.)
- `components/` — Reusable UI building blocks
- `api/` — Fetch wrappers organized by domain (workspaces.ts, documents.ts, etc.)
- `store/` — Zustand stores for auth + navigation state

**Routing Strategy:**
- Manual pushState navigation (not React Router)
- NavState discriminated union (home | goals | goal | subject | workspace | groups | settings)
- Breadcrumb history tracking

**API Client Pattern:**
- `authFetch()` wrapper — injects Bearer token, handles 401 auto-logout via DOM event
- Normalized error handling — Pydantic ValidationError arrays flattened to readable messages

#### 1.3 Database Architecture

**DBMS:** PostgreSQL 16  
**Schema:** Fully normalized, 40+ ORM models  
**Indexing:** Composite indexes on frequently joined columns  
**Constraints:** CHECK constraints in Alembic migrations  

**Layers (Import Order):**
1. RBAC (Permission, Role, RolePermission, UserRole)
2. Auth & Users (User, Token)
3. Core Structure (Subject, BigGoal, BigGoalSubject)
4. Workspaces (Workspace)
5. Documents (Document, DocumentContent, DocumentChunk)
6. Sessions (Session, SessionMicroGoal)
7. AI (AIJob, AIChatMessage, Prompt, LLMLog, PipelineRun)
8. Study Assets (FlashcardDeck, Flashcard, QuizSet, etc.)
9. Notes & Dashboard (Note, Dashboard)

**Key Design:**
- **UUID primary keys** — all models use UUID(as_uuid=True) with server-side generation
- **Soft cascades** — FK constraints use ondelete="CASCADE" for data isolation
- **Indexed columns** — workspace_id, user_id, status columns indexed for query performance
- **Composite indexes** — e.g., ix_sessions_ws_user_started(workspace_id, user_id, started_at)

**Business Model:**
- User → BigGoal (learning mission) → Subject → Workspace
- Document → DocumentContent (extracted text) + DocumentChunk (future embedding storage)
- Session → Micro-goals (study plans derived from workspace content)
- FlashcardDeck, QuizSet (generated from document summaries)

#### 1.4 External Services & Infrastructure

**LLM Integration:**
- Provider: Configurable (OpenAI default, environment-driven)
- Client: `llm_client.py` — single `chat()` function wrapping API calls

**Document Processing:**
- pypdf (PDF extraction)
- python-docx (Word extraction)
- Plain text (built-in)
- Extraction runs async in background via RQ tasks

**Storage:**
- Local filesystem (`/app/uploads/`) for documents
- Safe filename generation + storage path validation

**Queue System:**
- RQ (Redis Queue)
- Worker process (`worker.py`)
- Pipeline stages orchestrated via sequential RQ enqueue

**Infrastructure:**
- Docker Compose (dev: postgres + redis + backend + frontend + worker)
- PostgreSQL 16 Alpine  
- Redis 7 Alpine
- Uvicorn with hot-reload in dev (`--reload` flag)

---

### 2. BUSINESS LOGIC MAPPING

#### 2.1 Core Workflows

**Workflow 1: Document Upload → Generation Pipeline**
```
1. User uploads file (PDF/Word/TXT)
   ↓
2. Document created with status="uploaded"
   ↓
3. Background extraction task (RQ):
   - Extract text via pypdf/docx
   - Store in DocumentContent
   - Set Document.status="ready"
   ↓
4. Document pipeline triggered:
   4a. Summarize (AI) → create Prompt log
   4b. Generate flashcards (AI) → FlashcardDeck
   4c. Generate quiz (AI) → QuizSet
   4d. Derive micro-goals (system logic, no AI)
   4e. Update workspace progress
```

**Workflow 2: Create Workspace → Study Session**
```
1. User creates workspace (subject + topic)
   ↓
2. System generates micro-goals:
   - One goal per document (Read → Study → Pass → Apply)
   - Idempotent (skips if goal title exists)
   - Skipped if custom goals already exist (user took ownership)
   ↓
3. User starts session:
   - Select micro-goals
   - Choose difficulty
   - Timer auto-pauses after elapsed time
   ↓
4. Session records:
   - Flashcard reviews
   - Quiz attempts
   - Personal notes
   ↓
5. System calculates progress:
   - BigGoal completed if all subjects complete
```

**Workflow 3: AI Prompt Generation & Versioning**
```
1. App calls ai_service.py function (e.g., summarize_document)
   ↓
2. PromptService loads active prompt:
   - Queries DB for Prompt row with name + is_active=true
   - Falls back to hardcoded prompts.py if not found
   ↓
3. Template rendering (Jinja2):
   - Variables injected into template
   - Raises if missing variable
   ↓
4. LLM call:
   - chat() sent to LLM API
   - Response logged to LLMLog
   ↓
5. Response post-processing:
   - JSON repair attempt if parse fails
   - Result stored (flashcards, quiz, etc.)
```

#### 2.2 API Endpoints — High-Level Coverage

**Auth:** POST /auth/login, POST /auth/register, POST /auth/refresh  
**Users:** GET/PUT /users  
**Workspaces:** CRUD /workspaces/{id}  
**Documents:** CRUD + upload /documents/{id}  
**Sessions:** CRUD /sessions/{id}  
**Micro-goals:** CRUD /micro-goals/{id}  
**Flashcards:** CRUD /flashcards/{id}, reviews  
**Quizzes:** CRUD /quizzes/{id}, attempt tracking  
**AI Generate:** POST /ai/summarize, /ai/generate-flashcards, /ai/generate-quiz, /ai/generate-roadmap  
**AI Chat:** GET/POST /ai-chat/{id}  
**Notes:** CRUD /notes/{id}  
**Admin:** GET /admin/prompts (debug)  

#### 2.3 Difficulty System

**Current Integration:**
- `ai_service.py` has `_DIFFICULTY_CTX` dict mapping easy/normal/hard to prompt instructions
- Request bodies accept `difficulty` field
- Prompts include difficulty context in template variables

**Problem:** Not fully wired — some endpoints don't expose difficulty parameter; session-level difficulty not enforced

#### 2.4 Session Management

**Features:**
- Timer-based (elapsed_seconds, total_seconds_allocated)
- Auto-pause after elapsed time
- Status tracking (active, paused, completed, abandoned)
- Micro-goal linking (many-to-many)
- Associated flashcard deck and quiz set

**Missing:**
- Resume-after-pause state restoration
- Completion criteria not defined

---

### 3. CODE QUALITY AUDIT

#### 3.1 Critical Issues (Must Fix)

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| **No input validation on prompt templates** | CRITICAL | `ai_service.py`, `prompt_service.py` | Prompt injection risk if prompts editable via API |
| **Hardcoded LLM client in tests** | CRITICAL | Services lack test fixtures | Cannot run tests without LLM account |
| **N+1 query pattern in loops** | CRITICAL | `sessions.py`, `flashcards.py` routes | Performance degrades with data scale |
| **Unhandled async exceptions in RQ tasks** | CRITICAL | `pipeline/tasks.py` | Failed tasks silently fail, no retry logic |
| **Prompt versions not enforced** | CRITICAL | `ai_service.py`, `llm_log.py` | Cannot trace which prompt version generated content |
| **Missing rate limits on AI endpoints** | CRITICAL | `ai_generate.py` | Cost explosion risk if misused |
| **Session completion logic undefined** | HIGH | `sessions.py` | User confusion on goal completion semantics |

#### 3.2 Important Issues (Should Fix)

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| **Large monolithic frontend component** | HIGH | `WorkspacesSection.tsx` (3000+ LOC) | Hard to test, maintain, reason about |
| **No error boundary for async operations** | HIGH | `pages/*.tsx` | App crashes on unhandled fetch errors |
| **Tight coupling in service layer** | HIGH | `ai_service.py` imports `rag_service`, `prompt_service`, etc. | Hard to test, circular dependencies |
| **RAG is placeholder only** | HIGH | `rag_service.py` | Context retrieval just concatenates summaries |
| **No request/response envelope pattern** | HIGH | All API responses | Inconsistent error handling on client |
| **Duplicate business logic** | MEDIUM | `micro_goal_engine.py`, `ai_service.py` | Goal generation logic duplicated |
| **Missing database transaction boundaries** | MEDIUM | Multiple routers | Partial failures can leave inconsistent state |
| **No middleware for request logging** | MEDIUM | `main.py` | Hard to debug in production |

#### 3.3 Code Patterns & Observations

**Good Patterns:**
- ✅ Async/await consistently used — no blocking calls in API handlers
- ✅ Dependency injection via FastAPI Depends() — clean router structure
- ✅ Repository pattern not enforced but implied through model methods
- ✅ Pydantic for request validation
- ✅ Composition over inheritance — services are stateless
- ✅ Config management via pydantic-settings

**Anti-Patterns:**
- ❌ Services not extracted to interfaces — tight coupling on concrete types
- ❌ Error handling inconsistent — some routes raise exceptions, others return 422
- ❌ Magic strings for status constants (see DOCUMENT_STATUSES, SESSION_STATUSES)
- ❌ No semantic versioning on prompts — only version number, not schema version
- ❌ Frontend has prop drilling through 4+ component levels
- ❌ No custom error types — relies on built-in HTTPException

#### 3.4 Security Review

**Strengths:**
- ✅ Passwords hashed with Argon2/bcrypt (PasswordHash.recommended())
- ✅ JWT tokens hashed in database (SHA-256) — DB breach doesn't expose tokens
- ✅ CORS restrictive (localhost:5173 only in dev)
- ✅ Security headers added (X-Content-Type-Options, etc.)
- ✅ Rate limiting on auth endpoints (5/min login, 3/min register)

**Weaknesses:**
- ⚠️ No SQL injection protection guaranteed (using parameterized queries but not explicitly validated)
- ⚠️ No XSS sanitization on user-generated notes (Tiptap stores raw content)
- ⚠️ Prompt injection risk — users can edit prompts via admin API without sanitization
- ⚠️ No CSRF protection (relying on SameSite cookies)
- ⚠️ No audit logging of admin actions
- ⚠️ File upload MIME type validation present but not strict (whitelist approach missing)
- ⚠️ No API key rotation mechanism
- ⚠️ Secrets potentially logged in error messages

#### 3.5 Performance Issues

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| **QueryLimit not set** | Could fetch all rows | Add LIMIT clauses |
| **No connection pooling config** | Slow under high concurrency | HikariCP equivalent for asyncpg |
| **RAG concatenates all documents** | O(documents) context size | Implement vector DB search |
| **No caching of prompt templates** | Every request hits DB | Cache with TTL |
| **Document extraction runs sync** | Blocks RQ worker | Already async ✓ |
| **No lazy-loading on relationships** | Loads all related objects | Use selectinload() strategically |

---

### 4. DATABASE REVIEW

#### 4.1 Schema Design

**Strengths:**
- Normalized 3NF design (no redundant data)
- UUID PKs allow distributed generation
- Foreign key cascading prevents orphaned records
- Composite indexes on join columns

**Tables:**
```
users (1)
  ├── tokens (n)
  ├── user_roles (n)
  ├── workspaces (n) — user-owned study spaces
  │   ├── subjects (n)
  │   ├── documents (n)
  │   │   ├── document_content (1)
  │   │   └── document_chunk (n) — future: embeddings
  │   ├── sessions (n)
  │   │   ├── session_micro_goal (n)
  │   │   ├── flashcard_reviews (n)
  │   │   └── quiz_attempts (n)
  │   ├── micro_goals (n)
  │   ├── flashcard_decks (n)
  │   │   └── flashcards (n)
  │   │       └── flashcard_reviews (n)
  │   └── quiz_sets (n)
  │       ├── quiz_questions (n)
  │       │   └── quiz_options (n)
  │       └── quiz_attempts (n)
  │           └── quiz_attempt_answers (n)
  ├── big_goals (n)
  │   └── big_goal_subjects (n)
  └── ai_chat_messages (n)

prompts (system)
llm_logs (audit)
pipeline_runs (audit)
roles (system)
permissions (system)
role_permissions (system)
```

#### 4.2 Issues & Recommendations

| Issue | Severity | Fix |
|-------|----------|-----|
| **No document_chunk embeddings** | HIGH | Add vector column (pgvector) + HNSW index |
| **No session completion timestamp** | MEDIUM | Add completed_at column |
| **No soft deletes** | MEDIUM | Add deleted_at column (audit trail) |
| **Missing indexes on query patterns** | MEDIUM | Add composite index on (workspace_id, status) for status filters |
| **llm_log.metadata is JSON** | MEDIUM | Consider JSONB for better query performance |
| **No partition keys** | LOW | Table size manageable now, but plan for partitioning on user_id later |

#### 4.3 Data Consistency Concerns

- ⚠️ **Document → FlashcardDeck → Flashcard:** If document deleted, flashcard deck orphaned (cascade works, but no audit)
- ⚠️ **Session → QuizAttempt:** If quiz deleted, attempt records remain (referential integrity but logical inconsistency)
- ⚠️ **Prompt versioning:** Versions not linked to content generated — cannot trace "which version of prompt made this flashcard?"

---

### 5. AI / LLM PIPELINE REVIEW

#### 5.1 Current Architecture

**Prompt Management:**
```
Database (Prompt table)
  ├── name: "summarize_document"
  ├── version: 1, 2, 3, ...
  ├── role: "system" or "user"
  ├── template: Jinja2 string
  ├── is_active: boolean
  └── created_at

Fallback (prompts.py — hardcoded)
  ├── Hardcoded templates
  └── Used if DB row missing
```

**Generation Pipeline:**
1. Load prompt from DB (if exists) or fallback
2. Render template with variables (Jinja2)
3. Call LLM (openai.ChatCompletion.create())
4. Post-process JSON (repair if malformed)
5. Log to LLMLog (for auditing)
6. Save result to database

**Prompts Tracked:**
- summarize_document
- generate_flashcards
- generate_quiz
- generate_roadmap
- suggest_session
- ai_chat_reply (no DB versioning, always uses fallback)

#### 5.2 Problems

| Problem | Impact | Example |
|---------|--------|---------|
| **No prompt schema versioning** | Cannot upgrade prompts without breaking old versions | If you add a new field to flashcard JSON, old prompts now return invalid structure |
| **Fallback shadows migrations** | Hard to enforce prompt requirements | AI functions work even if no prompt in DB, making it unclear if system is configured |
| **JSON repair is fragile** | Silent failures if repair fails | LLM returns invalid JSON → repair prompt fails → ValueError hidden |
| **No guardrails/output schema** | Response can be any structure | Prompt says "return JSON" but LLM returns markdown |
| **Prompts not linked to content** | Cannot trace lineage | Flashcard X was generated by prompt Y version Z — not recorded |
| **No A/B testing** | Cannot compare prompt versions | Two versions of "summarize" exist but no way to measure which is better |
| **ai_chat_reply uses fallback only** | Cannot iterate on chat quality | Must redeploy to change chat prompt |
| **Context concatenation naive** | No semantic relevance | RAG just concatenates first N documents — wastes tokens on irrelevant content |

#### 5.3 LLM Client

**Current:**
```python
async def chat(messages: list, max_tokens: int) -> tuple[str, int, int]:
    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return response.choices[0].message.content, usage.prompt, usage.completion
```

**Issues:**
- ⚠️ Temperature hardcoded at 0.7 (should vary by use case)
- ⚠️ No timeout handling
- ⚠️ No retry logic for API errors
- ⚠️ No cost tracking (usage logged but not aggregated)
- ⚠️ No streaming support (full wait for response)

#### 5.4 RAG System (Placeholder)

**Current Implementation:**
```python
async def retrieve_context(query, workspace_id, db, max_chars=8000):
    # Ignore query, just concatenate all doc summaries in workspace
    rows = await db.execute(
        select(Document, DocumentContent)
        .where(Document.workspace_id == workspace_id, Document.status == "ready")
    )
    return "\n\n".join([doc.summary for doc in rows])[:max_chars]
```

**Problems:**
- ❌ No semantic relevance (query ignored)
- ❌ No chunking or embedding
- ❌ Scale issues (doesn't work with 100+ documents)
- ❌ No vector database integration
- ❌ No fallback if docs too large

**To Implement Real RAG:**
1. Chunk documents (e.g., 500-token chunks)
2. Generate embeddings (OpenAI embed-small-3 or local)
3. Store embeddings + chunks in pgvector or Qdrant
4. Vector similarity search on query
5. Retrieve top-k chunks by relevance
6. Inject into prompt context

---

### 6. KEY MODULES & RESPONSIBILITIES

#### 6.1 Backend Services

**ai_service.py** (200 lines)
- Public API: `summarize_document`, `generate_flashcards`, `generate_quiz`, `generate_roadmap`, `generate_study_session_plan`, `suggest_session`, `ai_chat_reply`
- Wraps LLM calls with prompt loading (DB or fallback)
- Handles difficulty context injection
- JSON repair logic

**prompt_service.py** (150 lines)
- `get_active_prompts()` — load from DB
- `render()` — Jinja2 template rendering
- `build_messages()` — structure OpenAI format
- `generate_response()` — end-to-end pipeline

**rag_service.py** (80 lines)
- `retrieve_context()` — placeholder implementation

**pipeline/tasks.py** (400 lines)
- RQ entry points for document + workspace pipelines
- Sequential stage execution
- Error logging (but no retry or escalation)

**system/micro_goal_engine.py** (150 lines)
- `generate_system_micro_goals()` — derive goals from workspace
- Idempotent (skips existing goals)
- 4-step learning flow per document

**system/progress_calculator.py** (80 lines)
- Calculate BigGoal completion %

**document_extraction.py** (100 lines)
- Supports PDF, Word, TXT
- Validates MIME types
- Returns raw text

**document_storage.py** (80 lines)
- File path management
- Safe filename generation
- Deletion

#### 6.2 Frontend Pages & Components

**WorkspacesSection.tsx** (3000+ lines)
- Monolithic mega-component
- Handles all workspace operations
- 8 tabs (documents, summary, ai-chat, micro-goals, sessions, flashcards, quizzes, timeline)
- Renders modals for every operation
- Creates, updates, deletes workspaces, documents, sessions

**pages/GoalsPage.tsx**, etc.
- Similar large components for each section
- State management scattered across component
- No separation of concerns

**api/** folder
- Clean separation by domain (workspaces.ts, documents.ts, etc.)
- authFetch wrapper ensures auth
- Error handling normalized

---

## ⚠️ PHASE 2: IMPROVEMENT PLAN

### Priority 1: Foundation (Blocks Everything Else)

#### 1.1 Prompt Versioning & Guardrails

**Current State:** Prompts versions tracked but not linked to generated content

**Proposed:**
1. Add `schema_version` column to Prompt table
2. Extend LLMLog to track which prompt version + schema version generated the output
3. Add OpenAI function_calling to enforce JSON schema
4. Create `PromptValidator` class to validate responses match schema

**Impact:** Medium (affects all AI generation)  
**Effort:** 2-3 days  
**Risk:** Low (backwards compatible)

#### 1.2 Service Layer Refactoring

**Current State:** Services heavily coupled (ai_service imports rag_service, prompt_service, etc.)

**Proposed:**
1. Create abstract base classes (PromptProvider, RAGRetriever, LLMClient)
2. Inject dependencies into service constructors
3. Separate prompt loading logic from generation logic
4. Create unit tests with mock dependencies

**Impact:** High (enables testing, flexibility)  
**Effort:** 3-4 days  
**Risk:** Medium (refactoring touches core)

#### 1.3 Error Handling & Retry Logic

**Current State:** RQ tasks fail silently, no retries, exceptions sometimes swallowed

**Proposed:**
1. Create custom exception hierarchy (ValidationError, LLMError, StorageError, etc.)
2. Add decorated @retry handler to RQ tasks
3. Log failures to database (PipelineError table)
4. Implement exponential backoff for transient failures

**Impact:** High (reliability)  
**Effort:** 2 days  
**Risk:** Low

---

### Priority 2: Scalability

#### 2.1 RAG Implementation (Vector Database)

**Current State:** Placeholder — naive concatenation

**Proposed:**
1. Choose vector DB (pgvector best for existing postgres, or Qdrant for separation)
2. Implement document chunking (e.g., semantic-router or LlamaIndex)
3. Generate embeddings (OpenAI embed-3-small or local)
4. Implement vector similarity search
5. Cache embeddings (Redis)

**Impact:** Very High (enables semantic context)  
**Effort:** 5-7 days  
**Risk:** Medium (new dependency, embedding costs)

#### 2.2 Database Query Optimization

**Current State:** N+1 queries in some routes, missing indexes

**Proposed:**
1. Audit every route with explain() + timing
2. Add composite indexes on join patterns
3. Replace lazy loading with selectinload() where needed
4. Add query result caching (Redis) for read-heavy endpoints

**Impact:** Medium (performance)  
**Effort:** 3 days  
**Risk:** Low

---

### Priority 3: Code Quality & Testing

#### 3.1 Frontend Component Extraction

**Current State:** WorkspacesSection is 3000+ lines, tightly coupled

**Proposed:**
1. Extract each tab into separate component (DocumentsTab, SessionsTab, etc.)
2. Extract modals into separate files
3. Create custom hooks for data fetching (useDocuments, useSessions, etc.)
4. Implement React Query or SWR for caching + refetching

**Impact:** Medium (maintainability)  
**Effort:** 4-5 days  
**Risk:** Low (internal refactoring)

#### 3.2 Test Coverage

**Current State:** No tests visible in codebase

**Proposed:**
1. Backend: Unit tests for services (mocked DB + LLM)
2. Backend: Integration tests for critical routes
3. Frontend: Component tests for modals + forms
4. E2E: Smoke tests for critical workflows

**Target:** 60%+ coverage  
**Effort:** 7-10 days  
**Risk:** Low

---

### Priority 4: Security & Ops

#### 4.1 Secrets Management

**Current State:** Secrets in .env files (correct) but no rotation mechanism

**Proposed:**
1. Implement secret rotation policy (quarterly API keys)
2. Add secret audit logging
3. Integrate with HashiCorp Vault or AWS Secrets Manager (optional)

**Impact:** Low (but important for compliance)  
**Effort:** 1-2 days  
**Risk:** Low

#### 4.2 Audit Logging

**Current State:** No audit trail of admin actions

**Proposed:**
1. Create AuditLog table
2. Log all admin operations (prompt edits, user role changes, etc.)
3. Expose audit log in admin panel

**Impact:** Medium (compliance)  
**Effort:** 2 days  
**Risk:** Low

---

## ��� PHASE 3: SAFE REFACTORING STRATEGY

### Change Management Process

**For each refactoring:**

1. **Create test coverage** (before changing code)
   - Unit tests for the component/service
   - Edge case tests
   - Integration tests if API affected

2. **Refactor in isolation**
   - Branch per feature
   - Small PRs (< 500 LOC diffs)
   - Run full test suite before merge

3. **Verify after each change**
   - Run backend integration tests
   - Run frontend component tests
   - Run E2E smoke tests
   - Check performance metrics (query times, API latency)

4. **Staged rollout**
   - Dev → staging → production
   - Monitor error rates, latency
   - Rollback plan ready

---

## ��� DETAILED ISSUES TRACKER

### Critical Issues (Do First)

**ISSUE 1: No Prompt Schema Versioning**
- **File:** `models/prompt.py`, `services/ai_service.py`
- **Problem:** Version numbers don't correspond to output schema changes
- **Fix:** Add schema_version, enforce via function_calling
- **Risk:** Low

**ISSUE 2: Hardcoded Temperatures & Parameters**
- **File:** `services/llm_client.py`
- **Problem:** Temperature=0.7 for all use cases (should be 0 for deterministic, 1 for creative)
- **Fix:** Parameterize by use case
- **Risk:** Low

**ISSUE 3: N+1 Queries in Routes**
- **File:** `api/v1/routers/sessions.py:70-80`, `flashcards.py:100-120`
- **Problem:** Loop over sessions then fetch microgoals each loop
- **Fix:** Use selectinload() or join
- **Risk:** Low

**ISSUE 4: Silent RQ Task Failures**
- **File:** `pipeline/tasks.py`
- **Problem:** Tasks fail with no retry, no escalation
- **Fix:** Add @retry decorator + error callback
- **Risk:** Medium

**ISSUE 5: No Input Validation on Prompts**
- **File:** `api/v1/routers/prompts_admin.py`, `models/prompt.py`
- **Problem:** Users can inject arbitrary Jinja2 into prompts
- **Fix:** Whitelist safe functions, validate template syntax
- **Risk:** Medium

### Important Issues (Do Second)

**ISSUE 6: RAG is Placeholder**
- See section 5.4

**ISSUE 7: Monolithic Frontend Component**
- See section Priority 3.1

**ISSUE 8: No Error Boundaries**
- **File:** `App.tsx`, `pages/*.tsx`
- **Problem:** Unhandled fetch errors crash app
- **Fix:** Add error boundary + error boundary fallback
- **Risk:** Low

**ISSUE 9: Tight Service Coupling**
- See section Priority 1.2

**ISSUE 10: No Request/Response Envelope**
- **File:** All routers
- **Problem:** Error format inconsistent
- **Fix:** Create ResponseEnvelope { success, data, error, meta }
- **Risk:** High (breaking change)

### Nice-to-Have Issues

**ISSUE 11: No Semantic Versioning on Prompts**
- Only version numbers, not major.minor.patch

**ISSUE 12: No Session Completion Criteria**
- Unclear how sessions are "completed"

**ISSUE 13: No Diff History on Prompts**
- Cannot see what changed between versions

---

## ��� SUCCESS METRICS

After refactoring:
- ✅ All AI outputs are traceable to prompt version
- ✅ Test coverage ≥ 60%
- ✅ API latency < 200ms p99 (currently unknown)
- ✅ RAG supports 100+ documents without timeout
- ✅ Zero silent failures (all errors logged + monitored)
- ✅ Deployment time < 10 minutes

---

## ��� NEXT STEPS

1. **User Approval:** Present this audit, get sign-off on priorities
2. **Dependency Mapping:** Identify which changes unblock others
3. **Staged Implementation:** Start with Priority 1 (foundations)
4. **Progressive Testing:** Add tests as we refactor
5. **Monitoring Setup:** Instrument code before pushing to prod

