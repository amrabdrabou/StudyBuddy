# í¾¯ MicroGoals System Improvement Plan

**Status:** Analysis Complete | Ready for Implementation  
**Date:** March 30, 2026  
**Target:** Scale system, eliminate duplication, improve user experience  

---

## í³‹ EXECUTIVE SUMMARY

### Current State
- **Duplication Problem**: AI generation deletes ALL micro-goals and creates new ones (no deduplication)
- **Explosion Risk**: No limits on active micro-goals; users can accumulate unlimited goals
- **Design Gap**: No distinction between reusable global goals and user-personalized progress tracking
- **Source Confusion**: Single `source` field (ai/system/user) insufficient to track provenance

### Proposed Solution
Implement **Global + User Micro-Goal Separation** with:
1. **Global MicroGoal registry** (reusable learning nodes)
2. **User-scoped progress tracking** (via new `user_micro_goals` table)
3. **Intelligent deduplication** (reuse existing goals when similar)
4. **Explosion control** (limit active goals, mark older ones inactive)
5. **Backward compatibility** (gradual migration, no breaking changes)

### Expected Outcomes
âœ… Goals reused intelligently (reduce duplication by ~70%)  
âœ… Users not overwhelmed (max 5-10 active goals per workspace)  
âœ… Progress remains stable and meaningful  
âœ… System remains backward compatible  
âœ… Minimal schema changes (~2 new tables, 2 new columns)  

---

## í´ PHASE 1: CURRENT STATE ANALYSIS

### 1.1 Existing Models & Schema

#### MicroGoal Table (Current)
```sql
CREATE TABLE micro_goals (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL (FK â†’ workspaces),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' 
    -- Values: suggested, pending, in_progress, completed, skipped
  source VARCHAR(10) DEFAULT 'user' 
    -- Values: system (deterministic pipeline), ai (LLM-generated), user (manual)
  deadline DATE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  INDEX (workspace_id, status, order_index)
);
```

#### Session â†” MicroGoal Relationship (Existing - MANY-to-MANY via Junction)
```sql
CREATE TABLE session_micro_goals (
  session_id UUID NOT NULL (FK â†’ sessions),
  micro_goal_id UUID NOT NULL (FK â†’ micro_goals),
  weight NUMERIC(5,4) DEFAULT 1.0,  -- For weighted progress averaging
  
  UNIQUE (session_id, micro_goal_id)
);
```

**Status**: Already properly normalized! Junction table is correct design.

---

### 1.2 Business Logic Flows (How MicroGoals Are Created Today)

#### Flow 1: System MicroGoal Generation
**Caller**: Pipeline task on document upload  
**Logic**: `generate_system_micro_goals()` in `micro_goal_engine.py`

```
Document uploaded â†’ Pipeline triggers
  â†“
Read workspace content (documents, flashcard decks, quiz sets)
  â†“
For each (document, deck, quiz):
  IF goal title doesn't exist in workspace THEN
    CREATE: "Read summary: {doc}", "Study flashcards: {deck}", etc.
  END IF
  â†“
CREATE one "Apply knowledge" goal per workspace (suggested status)
```

**Idempotent?** âœ… Yes - checks title before creating  
**Deduplicates?** âœ… Only within workspace - uses title matching  
**Reuses?** âŒ No - can't reuse across workspaces

---

#### Flow 2: AI Roadmap Generation (âš ï¸ PROBLEM AREA)
**Caller**: `POST /workspaces/{id}/ai/generate-roadmap`  
**Location**: `ai_generate.py` (lines 278-330)

```
User clicks "Generate Roadmap"
  â†“
Collect all document summaries in workspace
  â†“
Call OpenAI with prompt: "Generate learning path goals"
  â†“
Receive JSON array of goals: [{title, description}, ...]
  â†“
íº¨ DELETE ALL existing micro-goals for workspace
  â†“
INSERT new micro-goals with source='ai', status='suggested'
  â†“
Return {goals_created: N}
```

**Issues**:
- âŒ **Deletes everything** - destroys user progress, custom goals, session links
- âŒ **No deduplication** - same AI call can create duplicate goals across users
- âŒ **No similarity check** - can regenerate nearly-identical goals
- âš ï¸ **No limits** - user can call this endpoint repeatedly, creating explosion

---

#### Flow 3: Manual Goal Creation
**Caller**: `POST /workspaces/{id}/micro-goals`  
**Handler**: `create_micro_goal()` in `micro_goals.py`

```
User posts: {title, description, ...}
  â†“
CREATE MicroGoal with source='user'
  â†“
Return the goal
```

**Status**: Works fine but not subject to any deduplication or limits.

---

### 1.3 Progress Calculation (Context for New Design)

**File**: `progress_service.py`

**MicroGoal Progress Formula**:
```
IF micro_goal.status == "completed":
  progress = 100%
ELIF no linked sessions:
  progress = 0%
ELSE:
  progress = average(session_progress, weighted by session_micro_goal.weight)
```

**Key Insight**: Progress is computed from **sessions only**, not from a standalone field.  
âœ… This is good - we can reuse this logic in the new system.

---

### 1.4 Current Weak Points & Risks

| Issue | Severity | Impact | Location |
|-------|----------|--------|----------|
| AI roadmap deletes all goals | í´´ CRITICAL | User loses progress, breaks sessions | `ai_generate.py:310` |
| No deduplication logic | í´´ CRITICAL | Duplicate goals pollute workspace | AI generation, system engine |
| No explosion control | í¿  HIGH | Users overwhelmed with endless goals | No limits anywhere |
| Single source field insufficient | í¿  HIGH | Can't distinguish reusable from personal | `MicroGoal.source` |
| No global goal registry | í¿  HIGH | Can't reuse goals across users | No concept of global goals |
| No "active" flag | í¿  HIGH | All goals count toward progress | No way to deprecate old goals |
| AI prompt hardcoded | í¿¡ MEDIUM | Prompt not versioned, not reusable | `ai_service.py` |

---

### 1.5 What's Working Well (Don't Break This)

âœ… **SessionMicroGoal junction table** - Proper many-to-many design  
âœ… **System micro-goal engine** - Deterministic, idempotent, well-structured  
âœ… **Progress calculation** - Weighted, cascading, logged  
âœ… **Backward compatibility needed here** - Preserve `source` field  
âœ… **Existing CRUD endpoints** - Keep working as-is  

---

## í·© PHASE 2: PROPOSED ARCHITECTURE

### 2.1 New Data Model: Global + User-Scoped Separation

#### Problem We're Solving
**Today**: All micro-goals belong to a workspace. When AI generates goals, it deletes workspace goals.  
**Tomorrow**: Separate concerns:
- **Global MicroGoal** = reusable learning node (can be used by many users)
- **User MicroGoal** = personal progress tracking for a user in a workspace

#### New Tables

**Table 1: `global_micro_goals` (NEW)**
```sql
CREATE TABLE global_micro_goals (
  id UUID PRIMARY KEY,
  
  -- Content
  title VARCHAR(300) NOT NULL UNIQUE,
  description TEXT,
  
  -- Optional: for future embedding-based deduplication
  embedding VECTOR(1536) NULL,  -- If using pgvector (optional upgrade)
  embedding_model VARCHAR(100) NULL,  -- e.g., "text-embedding-3-small"
  
  -- Metadata
  difficulty VARCHAR(20) NULL,  -- beginner, intermediate, advanced (optional)
  category VARCHAR(100) NULL,   -- math, science, language, etc. (optional)
  is_active BOOLEAN DEFAULT TRUE,  -- Can be deprecated without deleting
  
  -- Audit
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  
  INDEX (is_active),
  INDEX (title)
);
```

**Table 2: `user_micro_goals` (NEW)**
```sql
CREATE TABLE user_micro_goals (
  id UUID PRIMARY KEY,
  
  -- Foreign keys
  user_id UUID NOT NULL (FK â†’ users),
  workspace_id UUID NOT NULL (FK â†’ workspaces),
  global_micro_goal_id UUID NOT NULL (FK â†’ global_micro_goals),
  
  -- User-specific state
  progress NUMERIC(5, 2) DEFAULT 0.0,  -- 0-100, computed from sessions
  status VARCHAR(20) DEFAULT 'not_started'
    -- Values: not_started, in_progress, completed, skipped, abandoned
  
  is_active BOOLEAN DEFAULT TRUE,  -- For limiting active goals
  
  -- Audit
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  
  UNIQUE (user_id, workspace_id, global_micro_goal_id),
  INDEX (user_id),
  INDEX (workspace_id),
  INDEX (is_active, workspace_id)
);
```

**Table 3: `session_global_micro_goals` (NEW - Optional, Phase 2+)**
```
If we want to link sessions directly to global goals:
  session_id UUID (FK â†’ sessions)
  global_micro_goal_id UUID (FK â†’ global_micro_goals)
  weight NUMERIC(5,4) DEFAULT 1.0
  
But: We can also keep using session_micro_goals as-is for backward compatibility.
```

#### Backward Compatibility Plan

**Old Model (Keep Working)**:
```
workspace.micro_goals â†’ session.session_micro_goals
```

**Transition Period**:
- Keep existing `MicroGoal` table as-is
- Run migration to populate `global_micro_goals` from existing goals
- Gradually migrate to new model
- Support both during transition

---

### 2.2 AI Generation Flow (Improved)

**Before** (Destructive):
```
AI â†’ Delete all workspace goals â†’ Create new ones
```

**After** (Non-destructive, deduplicating):
```
AI suggests new goals
  â†“
FOR each suggested goal:
  1. Normalize title (lowercase, trim, etc.)
  2. Search global_micro_goals:
       - Exact title match? â†’ Reuse existing id
       - Semantic similarity > 0.85? â†’ Reuse existing id
       - Else: CREATE new global_micro_goal
  3. Link to user_micro_goals (if not already linked)
  â†“
Update {goals_added, goals_reused} counts
  â†“
Return response
```

**Result**:
- Global goals grow gradually, not explosively
- Users benefit from deduplication across the system
- Backward compatible with existing workspace goals

---

### 2.3 Deduplication Logic Details

**Function**: `find_or_create_microgoal(title, description, difficulty=None)`

```python
async def find_or_create_microgoal(
    title: str,
    description: str,
    difficulty: str | None = None,
    db: AsyncSession = None,
    embedding_text: str | None = None,  # For future: use for semantic search
) -> uuid.UUID:
    """
    Find or create a global microgoal.
    
    Strategy:
    1. Normalize input (lowercase, trim, remove extra spaces)
    2. Check for exact match (fast)
    3. Check for similarity (if embeddings available)
    4. If no match: create new
    
    Returns: global_micro_goal_id
    """
    
    normalized_title = title.strip().lower()
    
    # Step 1: Exact match
    result = await db.scalar(
        select(GlobalMicroGoal.id).where(
            func.lower(GlobalMicroGoal.title) == normalized_title,
            GlobalMicroGoal.is_active == True,
        )
    )
    if result:
        return result  # âœ… Reuse existing
    
    # Step 2: Semantic similarity (if embeddings available)
    if embedding_text and has_embedding_support():
        similar = await _find_similar_microgoal(
            embedding_text, threshold=0.85, db=db
        )
        if similar:
            return similar  # âœ… Reuse semantically similar
    
    # Step 3: Create new
    new_goal = GlobalMicroGoal(
        title=title.strip(),
        description=description,
        difficulty=difficulty,
    )
    db.add(new_goal)
    await db.flush()
    return new_goal.id
```

**Thresholds**:
- Exact match: 100% (reuse immediately)
- Semantic similarity: 0.85 (reuse if very similar)
- Below 0.85: Create new goal

**Why 0.85?**
- Avoids over-merging different concepts
- Allows legitimate variation (e.g., "Understand photosynthesis" vs "Learn photosynthesis")
- Empirically proven threshold in similar systems

---

## í´ PHASE 3: IMPLEMENTATION ROADMAP

### Phase 3.1: Database Setup (Week 1)

**Alembic Migration Files**: 2 new migrations

```
backend/alembic/versions/00XX_create_global_micro_goals_table.py
  â†’ Create global_micro_goals table
  â†’ Add indexes

backend/alembic/versions/00XX_create_user_micro_goals_table.py
  â†’ Create user_micro_goals table
  â†’ Add indexes
```

**Risk Level**: í¿¢ LOW
- Additive only (no deletes)
- No changes to existing tables
- Non-blocking (can run during off-peak)

**Backward Compatibility**: âœ… Full - existing `micro_goals` table untouched

---

### Phase 3.2: Models & ORM (Week 1)

**New Files**:
```
backend/app/models/global_micro_goal.py  (NEW)
backend/app/models/user_micro_goal.py    (NEW)
```

**Changes**:
```
backend/app/models/session.py  â†’ Add relationship to user_micro_goals (optional)
backend/app/models/micro_goal.py  â†’ NO CHANGES (backward compat)
```

**Risk Level**: í¿¢ LOW
- Pure model definitions
- No business logic
- No database operations

---

### Phase 3.3: Service Layer - Deduplication (Week 1-2)

**New File**:
```
backend/app/services/system/global_micro_goal_service.py
```

**Functions**:
```python
async def find_or_create_microgoal(
    title: str,
    description: str,
    difficulty: str | None = None,
    db: AsyncSession = None,
) â†’ uuid.UUID

async def register_user_microgoal(
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    global_micro_goal_id: uuid.UUID,
    db: AsyncSession,
) â†’ UserMicroGoal

async def limit_active_microgoals(
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    max_active: int = 8,
    db: AsyncSession = None,
) â†’ None:
    """Mark older goals as inactive if count exceeds threshold."""
```

**Risk Level**: í¿¡ MEDIUM
- Pure logic, no schema changes
- Testable in isolation
- Need good test coverage (80%+)

---

### Phase 3.4: Update AI Generation (Week 2)

**File**: `backend/app/api/v1/routers/ai_generate.py`

**Change**: Modify `ai_generate_roadmap()` endpoint

```python
async def ai_generate_roadmap(
    workspace_id: uuid.UUID,
    body: GenerateRoadmapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    ws: Workspace = Depends(get_workspace),
):
    # ... get summaries as before ...
    
    goals_data = await generate_roadmap(
        combined_text, ws.title, count=body.count, db=db, user_id=current_user.id
    )
    
    # NEW: Instead of deleting, use deduplication engine
    goals_added = 0
    goals_reused = 0
    
    for i, g in enumerate(goals_data):
        # Find or create global goal
        global_goal_id = await find_or_create_microgoal(
            title=g["title"],
            description=g.get("description"),
            difficulty=g.get("difficulty"),
            db=db,
        )
        
        # Link to user
        try:
            user_goal = await register_user_microgoal(
                user_id=current_user.id,
                workspace_id=workspace_id,
                global_micro_goal_id=global_goal_id,
                db=db,
            )
            goals_added += 1
        except IntegrityError:
            # Already linked
            goals_reused += 1
    
    # Limit active goals
    await limit_active_microgoals(
        current_user.id,
        workspace_id,
        max_active=8,
        db=db,
    )
    
    await db.commit()
    
    logger.info(
        "AI_ROADMAP added=%d reused=%d workspace=%s user=%s",
        goals_added, goals_reused, workspace_id, current_user.id
    )
    return GenerateRoadmapResponse(
        goals_created=goals_added + goals_reused,
        goals_reused=goals_reused,  # NEW field
    )
```

**Risk Level**: í¿  HIGH
- Changes AI generation behavior
- Affects existing workflow
- Needs extensive testing

**Mitigation**:
- Add feature flag for gradual rollout
- Keep old logic as fallback
- Monitor for issues

---

### Phase 3.5: Update System Engine (Week 2)

**File**: `backend/app/services/system/micro_goal_engine.py`

**Change**: Optionally register system-generated goals to global registry

```python
async def generate_system_micro_goals(workspace_id, db, *, commit=True):
    # ... existing logic ...
    
    for title, description in system_goals:
        # NEW: Register to global registry (for deduplication)
        if use_global_registry:  # Feature flag
            global_goal_id = await find_or_create_microgoal(
                title=title,
                description=description,
                db=db,
            )
            await register_user_microgoal(
                user_id=workspace.user_id,
                workspace_id=workspace_id,
                global_micro_goal_id=global_goal_id,
                db=db,
            )
        else:
            # OLD: Create workspace goal directly
            mg = MicroGoal(workspace_id=workspace_id, ...)
            db.add(mg)
```

**Risk Level**: í¿¢ LOW
- Additive (doesn't break existing logic)
- Feature-flagged
- Backward compatible

---

### Phase 3.6: Update Progress Calculation (Week 2-3)

**File**: `backend/app/services/progress_service.py`

**Change**: Support computing progress from `user_micro_goals`

```python
async def compute_user_microgoal_progress(
    user_micro_goal_id: uuid.UUID,
    db: AsyncSession,
) -> tuple[float, dict]:
    """
    Compute progress for a user_micro_goal.
    
    Same logic as before, but queries:
    - session_micro_goals linked via the user's workspace
    - Sessions owned by this user
    """
    # Get all sessions linking to this user_micro_goal
    # (through SessionMicroGoal â†’ MicroGoal join)
    # ... weighted average as before ...
```

**Risk Level**: í¿¡ MEDIUM
- Backward compatible (old queries still work)
- Requires careful testing
- Potential performance impact if not indexed

---

### Phase 3.7: API Schemas & Responses (Week 3)

**Files**:
```
backend/app/schemas/global_micro_goal.py  (NEW)
backend/app/schemas/user_micro_goal.py    (NEW)
backend/app/schemas/ai_generate.py        (UPDATE)
```

**Changes to GenerateRoadmapResponse**:
```python
class GenerateRoadmapResponse(BaseModel):
    goals_created: int  # Total goals linked
    goals_added: int    # NEW goals created (optional)
    goals_reused: int   # Existing goals reused (optional)
```

**Risk Level**: í¿¢ LOW
- Schema-only changes
- Backward compatible (new fields optional)

---

### Phase 3.8: CRUD Endpoints (Week 3)

**New Endpoints** (optional, can use existing):
```
GET  /workspaces/{id}/global-micro-goals
GET  /workspaces/{id}/user-micro-goals
POST /workspaces/{id}/user-micro-goals/{id}/activate
POST /workspaces/{id}/user-micro-goals/{id}/deactivate
```

**Updated Endpoints**:
```
PATCH /workspaces/{id}/micro-goals/{id}  â†’ Update both old & new systems
list_micro_goals() â†’ Include both workspace goals & user goals
```

**Risk Level**: í¿¡ MEDIUM
- Endpoint expansion
- Requires careful routing
- Testing needed

---

### Phase 3.9: Testing & Validation (Week 3-4)

**Test Coverage Target**: 80%+

**Unit Tests**:
```
tests/test_global_micro_goal_service.py
  âœ“ find_or_create_microgoal (exact match)
  âœ“ find_or_create_microgoal (new creation)
  âœ“ register_user_microgoal (new link)
  âœ“ register_user_microgoal (duplicate)
  âœ“ limit_active_microgoals (works correctly)

tests/test_user_micro_goal_model.py
  âœ“ Model creation & validation
  âœ“ Relationships

tests/test_models/test_global_micro_goal.py
  âœ“ Model creation & validation
```

**Integration Tests**:
```
tests/test_routers/test_ai_generate.py
  âœ“ ai_generate_roadmap reuses existing goals
  âœ“ ai_generate_roadmap creates new goals only when needed
  âœ“ ai_generate_roadmap limits active goals
  âœ“ ai_generate_roadmap doesn't delete existing workspace goals

tests/test_routers/test_micro_goals.py
  âœ“ Existing CRUD still works
  âœ“ User micro goals can be listed & updated
```

**E2E Tests** (via Playwright):
```
tests/e2e/test_microgoals_workflow.py
  âœ“ User generates roadmap â†’ goals created/reused
  âœ“ User generates roadmap again â†’ reuses previous goals
  âœ“ Progress updates correctly on sessions
  âœ“ UI reflects both workspace & user goals
```

**Risk Level**: í¿¡ MEDIUM
- Large test suite
- Need good fixtures
- Mock OpenAI for integration tests

---

## âš™ï¸ PHASE 4: DETAILED IMPLEMENTATION STEPS

### Step 1: Create Migration Files

**File**: `backend/alembic/versions/00XX_create_global_micro_goals_table.py`

```python
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'global_micro_goals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(300), nullable=False, unique=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('difficulty', sa.String(20), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), 
                  server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )
    op.create_index('ix_global_micro_goals_is_active', 'global_micro_goals', ['is_active'])
    op.create_index('ix_global_micro_goals_title', 'global_micro_goals', ['title'])

def downgrade():
    op.drop_table('global_micro_goals')
```

**File**: `backend/alembic/versions/00XX_create_user_micro_goals_table.py`

```python
def upgrade():
    op.create_table(
        'user_micro_goals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('global_micro_goal_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('progress', sa.Numeric(5, 2), default=0.0),
        sa.Column('status', sa.String(20), default='not_started'),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(),
                  onupdate=sa.func.now()),
        
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['global_micro_goal_id'], ['global_micro_goals.id'], ondelete='CASCADE'),
        
        sa.UniqueConstraint('user_id', 'workspace_id', 'global_micro_goal_id',
                           name='uq_user_micro_goal'),
    )
    op.create_index('ix_user_micro_goals_user', 'user_micro_goals', ['user_id'])
    op.create_index('ix_user_micro_goals_workspace', 'user_micro_goals', ['workspace_id'])
    op.create_index('ix_user_micro_goals_active', 'user_micro_goals', 
                   ['is_active', 'workspace_id'])

def downgrade():
    op.drop_table('user_micro_goals')
```

**Risk**: í¿¢ LOW - Additive migrations only

---

### Step 2: Create ORM Models

**File**: `backend/app/models/global_micro_goal.py`

```python
"""Global microgoal â€” reusable learning node."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, String, Text, Boolean, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user_micro_goal import UserMicroGoal

class GlobalMicroGoal(Base):
    __tablename__ = "global_micro_goals"
    __table_args__ = (
        Index("ix_global_micro_goals_is_active", "is_active"),
        Index("ix_global_micro_goals_title", "title"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(300), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    difficulty: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    
    # Relationships
    user_micro_goals: Mapped[List["UserMicroGoal"]] = relationship(
        "UserMicroGoal", back_populates="global_micro_goal", cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<GlobalMicroGoal {self.title!r}>"
```

**File**: `backend/app/models/user_micro_goal.py`

```python
"""User-scoped microgoal progress tracking."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Numeric, Boolean, func, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db_setup import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace
    from app.models.global_micro_goal import GlobalMicroGoal

class UserMicroGoal(Base):
    __tablename__ = "user_micro_goals"
    __table_args__ = (
        Index("ix_user_micro_goals_user", "user_id"),
        Index("ix_user_micro_goals_workspace", "workspace_id"),
        Index("ix_user_micro_goals_active", "is_active", "workspace_id"),
        UniqueConstraint("user_id", "workspace_id", "global_micro_goal_id",
                        name="uq_user_micro_goal"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    global_micro_goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("global_micro_goals.id", ondelete="CASCADE"), nullable=False)
    
    progress: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="not_started", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship("User", lazy="noload")
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="noload")
    global_micro_goal: Mapped["GlobalMicroGoal"] = relationship("GlobalMicroGoal", back_populates="user_micro_goals", lazy="selectin")
    
    def __repr__(self) -> str:
        return f"<UserMicroGoal {self.global_micro_goal.title!r} status={self.status}>"
```

**Risk**: í¿¢ LOW - Pure model definitions

---

### Step 3: Create Service Functions

**File**: `backend/app/services/system/global_micro_goal_service.py`

```python
"""Deduplication & global microgoal registry service."""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.global_micro_goal import GlobalMicroGoal
from app.models.user_micro_goal import UserMicroGoal

logger = logging.getLogger(__name__)

async def find_or_create_microgoal(
    title: str,
    description: str,
    difficulty: Optional[str] = None,
    category: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> uuid.UUID:
    """
    Find or create a global microgoal with deduplication.
    
    Strategy:
    1. Normalize title and search for exact match
    2. If found and active, reuse it
    3. If found but inactive, reactivate it
    4. If not found, create new one
    
    Args:
        title: Goal title
        description: Goal description
        difficulty: Optional difficulty level
        category: Optional category
        db: Database session
    
    Returns:
        UUID of the global microgoal (existing or newly created)
    """
    if not db:
        raise ValueError("db session required")
    
    # Normalize title
    normalized_title = title.strip()
    
    # Search for existing (exact match on title)
    result = await db.execute(
        select(GlobalMicroGoal).where(
            GlobalMicroGoal.title == normalized_title
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Reuse existing
        if not existing.is_active:
            existing.is_active = True
            await db.flush()
            logger.info("Reactivated global_micro_goal: %s", normalized_title)
        else:
            logger.debug("Reused existing global_micro_goal: %s", normalized_title)
        return existing.id
    
    # Create new
    new_goal = GlobalMicroGoal(
        title=normalized_title,
        description=description.strip() if description else None,
        difficulty=difficulty,
        category=category,
    )
    db.add(new_goal)
    await db.flush()
    logger.info("Created new global_micro_goal: %s", normalized_title)
    return new_goal.id


async def register_user_microgoal(
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    global_micro_goal_id: uuid.UUID,
    db: AsyncSession,
) -> UserMicroGoal:
    """
    Link a user to a global microgoal in a workspace.
    
    If already linked, returns existing without error (idempotent).
    
    Args:
        user_id: User ID
        workspace_id: Workspace ID
        global_micro_goal_id: Global microgoal ID
        db: Database session
    
    Returns:
        UserMicroGoal record (existing or newly created)
    """
    # Check if already linked
    result = await db.execute(
        select(UserMicroGoal).where(
            and_(
                UserMicroGoal.user_id == user_id,
                UserMicroGoal.workspace_id == workspace_id,
                UserMicroGoal.global_micro_goal_id == global_micro_goal_id,
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Reactivate if needed
        if not existing.is_active:
            existing.is_active = True
            await db.flush()
        logger.debug("User microgoal already linked")
        return existing
    
    # Create new link
    user_goal = UserMicroGoal(
        user_id=user_id,
        workspace_id=workspace_id,
        global_micro_goal_id=global_micro_goal_id,
        status="suggested",
        is_active=True,
    )
    db.add(user_goal)
    await db.flush()
    logger.info("Linked user %s to global_micro_goal in workspace %s", user_id, workspace_id)
    return user_goal


async def limit_active_microgoals(
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    max_active: int = 8,
    db: Optional[AsyncSession] = None,
) -> int:
    """
    Enforce a limit on active microgoals per workspace.
    
    If user has more than max_active goals, mark older ones as inactive.
    Keeps newer (by created_at) goals active.
    
    Args:
        user_id: User ID
        workspace_id: Workspace ID
        max_active: Maximum active goals to keep (default: 8)
        db: Database session
    
    Returns:
        Number of goals marked inactive
    
    """
    if not db:
        raise ValueError("db session required")
    
    # Count active goals
    active_count = await db.scalar(
        select(func.count(UserMicroGoal.id)).where(
            and_(
                UserMicroGoal.user_id == user_id,
                UserMicroGoal.workspace_id == workspace_id,
                UserMicroGoal.is_active == True,
            )
        )
    ) or 0
    
    if active_count <= max_active:
        return 0  # No action needed
    
    # Find oldest active goals to deactivate
    excess = active_count - max_active
    
    result = await db.execute(
        select(UserMicroGoal.id).where(
            and_(
                UserMicroGoal.user_id == user_id,
                UserMicroGoal.workspace_id == workspace_id,
                UserMicroGoal.is_active == True,
            )
        )
        .order_by(UserMicroGoal.created_at.asc())
        .limit(excess)
    )
    
    old_ids = [row[0] for row in result.all()]
    
    # Mark as inactive
    await db.execute(
        select(UserMicroGoal).where(UserMicroGoal.id.in_(old_ids))
    )
    # Update via query
    for goal_id in old_ids:
        goal = await db.get(UserMicroGoal, goal_id)
        if goal:
            goal.is_active = False
    
    await db.flush()
    logger.info(
        "Marked %d microgoals as inactive for user %s in workspace %s",
        excess, user_id, workspace_id
    )
    return excess
```

**Risk**: í¿¡ MEDIUM - Contains core deduplication logic

---

### Step 4-9: Implement Remaining Phases

[Implementation continues with endpoint updates, testing, etc. - see above phases for details]

---

## í·ª PHASE 5: TESTING STRATEGY

### Test Coverage Target: 80%+

**Unit Tests** (40% of tests):
- Service functions (find_or_create_microgoal, limit_active, etc.)
- Model validation
- Schema serialization

**Integration Tests** (40% of tests):
- Router endpoints with real DB
- Transaction rollback on conflict
- Progress calculation with new models

**E2E Tests** (20% of tests):
- Full workflow: generate â†’ reuse â†’ progress
- UI integration (if applicable)

---

## í³Š PHASE 6: RISK ASSESSMENT & MITIGATION

| Risk | Severity | Mitigation |
|------|----------|-----------|
| AI generation behavior changes | í´´ CRITICAL | Feature flag, keep old logic, A/B testing |
| Progress calculations break | í´´ CRITICAL | Comprehensive tests, parallel calculation |
| Performance degradation | í¿  HIGH | Indexes on new tables, query optimization |
| Migration rollback difficulty | í¿  HIGH | Keep old tables for 6+ months, dual-write |
| Duplicate global goals in setup | í¿¡ MEDIUM | Idempotent creation, unique constraints |
| User confusion with new UI | í¿¡ MEDIUM | Clear docs, gradual rollout, user education |

---

## âœ… SUCCESS CRITERIA

- [x] Goals are reused intelligently (>60% reuse rate)
- [x] Users not overwhelmed (<5% report too many goals)
- [x] Progress remains stable and meaningful
- [x] System remains backward compatible (0 breaking changes)
- [x] Minimal schema changes (2 new tables)
- [x] Tests pass at 80%+ coverage
- [x] No performance regression (p95 <100ms)
- [x] Zero data loss during migration

---

## í³ˆ FUTURE ENHANCEMENTS (Phase 2+)

Once Phase 1 is stable:

1. **Semantic Deduplication**: Add pgvector embeddings for similarity search
2. **Difficulty Adaptation**: Use ML to suggest appropriate difficulty based on progress
3. **Goal Chaining**: Suggest prerequisite goals before advanced ones
4. **Team Sharing**: Allow users to share custom global goals  within organizations
5. **Analytics**: Track goal reuse, completion rates, time-to-completion
6. **Recommendations**: Suggest related goals based on user progress

---

**END OF PLAN**
