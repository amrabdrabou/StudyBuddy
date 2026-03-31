# Document Summaries Improvement Plan

## Executive Summary

The document summary system has **identical problems to microgoals**: duplicate processing, no reusability, and explosive data duplication.

### Current Issues ���

1. **Massive Duplication**: Same document uploaded by 100 users → summarized 100 times (100x API cost)
2. **No Reusability**: Each workspace has its own summary copy → no shared repository
3. **Inconsistent Materials**: Same content generates different flashcards/quizzes across users → confusing
4. **Re-summarization Risk**: Endpoint allows regenerating same summary → wasteful API calls
5. **No Version Control**: Can't track summary versions or rollback to previous summaries

### Success Metrics

- **70% reduction** in duplicate summary generation (via content-hash deduplication)
- **Reusability score**: 85%+ of documents already summarized globally
- **Consistency**: Same document → same core summary for all users (optional personalization later)
- **Cost savings**: 60%+ reduction in LLM API calls for summarization
- **Performance**: Summary retrieval <100ms (from cache, not regeneration)

---

## Proposed Architecture

### Two-Tier Summary System

```
┌─────────────────────────────────────────────────────────────┐
│ GLOBAL SUMMARIES (Reusable Knowledge Base)                  │
│ ─────────────────────────────────────────────────────────   │
│ • Keyed by content_hash (MD5/SHA256 of raw_text)            │
│ • Generated once per unique content                         │
│ • Shared across ALL workspaces                              │
│ • Immutable (never updated, only versioned)                 │
│ • Includes: summary text, generation_timestamp, model_id    │
└─────────────────────────────────────────────────────────────┘
                          ↓ (links via content_hash)
                          
┌─────────────────────────────────────────────────────────────┐
│ WORKSPACE SUMMARIES (Personalized & Tracked)                │
│ ─────────────────────────────────────────────────────────   │
│ • Per-workspace per-document metadata                       │
│ • Links to global_summary via content_hash                  │
│ • Stores: workspace_id, document_id, notes, is_archived     │
│ • Can override/annotate global summary if needed            │
│ • Tracks personalization metadata                           │
└─────────────────────────────────────────────────────────────┘
```

### Schema Design

#### New Table: `global_summaries` (Immutable, Shared)

```sql
CREATE TABLE global_summaries (
    id UUID PRIMARY KEY,
    content_hash VARCHAR(64) NOT NULL UNIQUE,      -- SHA256 of raw_text
    raw_text_sample VARCHAR(500),                   -- First 500 chars for debugging
    summary TEXT NOT NULL,                           -- The actual summary
    word_count_source INT,                           -- Word count of summarized text
    summary_length INT,                              -- Word count of summary
    compression_ratio DECIMAL(5,2),                  -- summary_len / source_len
    model_id VARCHAR(50) NOT NULL,                   -- "gpt-4", "claude-3", etc.
    generation_duration_ms INT,                      -- How long summarization took
    is_archived BOOLEAN DEFAULT FALSE,               -- Soft delete
    usage_count INT DEFAULT 1,                       -- How many workspace_summaries reference this
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    
    INDEX idx_content_hash (content_hash),
    INDEX idx_created_at (created_at),
    INDEX idx_usage_count DESC
);
```

#### New Table: `workspace_summaries` (Personalized, Mutable)

```sql
CREATE TABLE workspace_summaries (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    global_summary_id UUID NOT NULL REFERENCES global_summaries(id) ON DELETE RESTRICT,
    
    -- Personalization layer (optional)
    workspace_notes TEXT,                           -- User/workspace-specific annotations
    is_active BOOLEAN DEFAULT TRUE,                 -- Can disable without deleting
    confidence_score DECIMAL(3,2),                  -- 0.0-1.0 relevance to workspace goals
    
    last_accessed_at TIMESTAMP,                     -- For usage analytics
    access_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    
    UNIQUE(workspace_id, document_id),              -- Only one link per workspace+doc
    INDEX idx_workspace_id (workspace_id),
    INDEX idx_document_id (document_id),
    INDEX idx_global_summary_id (global_summary_id),
    INDEX idx_is_active (is_active)
);
```

#### Update to `document_content`: Add content_hash field

```sql
ALTER TABLE document_contents 
ADD COLUMN content_hash VARCHAR(64) AFTER raw_text;

CREATE INDEX idx_document_contents_content_hash ON document_contents(content_hash);
```

---

## Implementation Plan

### Phase 1: Database Setup (Week 1) — ��� LOW RISK

**Objective**: Add new tables without breaking existing code.  
**Duration**: 1-2 hours  
**Backward Compatibility**: ✅ 100% (fully additive)

#### Tasks

1. **Create Alembic migration**: `0003_create_global_summaries.py`
   - Creates `global_summaries` table with all indexes
   - Creates `workspace_summaries` table with all indexes
   - Adds `content_hash` column to `document_contents`

2. **Create ORM models**:
   - `backend/app/models/global_summary.py` (immutable metadata)
   - `backend/app/models/workspace_summary.py` (personalization layer)
   - Update imports in `backend/app/models/__init__.py`

3. **Apply migrations**:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. **Verify schema**:
   ```bash
   docker compose exec -it backend bash
   psql -U postgres -d studybuddy -c "\dt global_summaries; \dt workspace_summaries;"
   ```

#### Success Criteria
- ✅ Tables exist in PostgreSQL
- ✅ Indexes created
- ✅ ORM models registered
- ✅ No errors in backend startup

#### Rollback Plan
```bash
docker compose exec backend alembic downgrade -1  # Undo migration
```

---

### Phase 2: Service Layer (Week 1-2) — ��� MEDIUM RISK

**Objective**: Implement deduplication logic without changing endpoints yet.  
**Duration**: 2-3 hours  
**Backward Compatibility**: ✅ 100% (new service, doesn't break existing)

#### New Service File: `backend/app/services/summary_service.py`

```python
import hashlib
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.global_summary import GlobalSummary
from app.models.workspace_summary import WorkspaceSummary
from app.models.document_content import DocumentContent

async def compute_content_hash(raw_text: str) -> str:
    """Compute SHA256 hash of raw document text."""
    return hashlib.sha256(raw_text.encode()).hexdigest()

async def find_or_create_global_summary(
    raw_text: str,
    summary_text: str,
    model_id: str,
    generation_duration_ms: int,
    db: AsyncSession
) -> GlobalSummary:
    """
    Deduplication logic:
    1. Compute content hash
    2. Check if GlobalSummary exists
    3. If exists: increment usage_count and return
    4. If not: create new GlobalSummary
    """
    content_hash = await compute_content_hash(raw_text)
    
    # Try to find existing
    result = await db.execute(
        select(GlobalSummary).where(
            GlobalSummary.content_hash == content_hash,
            GlobalSummary.is_archived == False
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Increment usage counter
        existing.usage_count = (existing.usage_count or 0) + 1
        await db.commit()
        return existing
    
    # Create new global summary
    raw_sample = raw_text[:500] if len(raw_text) > 500 else raw_text
    word_count_source = len(raw_text.split())
    summary_length = len(summary_text.split())
    compression = round(summary_length / max(word_count_source, 1), 2)
    
    global_summary = GlobalSummary(
        content_hash=content_hash,
        raw_text_sample=raw_sample,
        summary=summary_text,
        word_count_source=word_count_source,
        summary_length=summary_length,
        compression_ratio=compression,
        model_id=model_id,
        generation_duration_ms=generation_duration_ms,
        usage_count=1
    )
    db.add(global_summary)
    await db.commit()
    return global_summary

async def register_workspace_summary(
    workspace_id: UUID,
    document_id: UUID,
    global_summary: GlobalSummary,
    db: AsyncSession
) -> WorkspaceSummary:
    """Link workspace to global summary."""
    # Check if already linked
    result = await db.execute(
        select(WorkspaceSummary).where(
            WorkspaceSummary.workspace_id == workspace_id,
            WorkspaceSummary.document_id == document_id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update reference if different
        if existing.global_summary_id != global_summary.id:
            existing.global_summary_id = global_summary.id
        await db.commit()
        return existing
    
    # Create new workspace summary
    workspace_summary = WorkspaceSummary(
        workspace_id=workspace_id,
        document_id=document_id,
        global_summary_id=global_summary.id,
        is_active=True
    )
    db.add(workspace_summary)
    await db.commit()
    return workspace_summary

async def get_workspace_summary(
    workspace_id: UUID,
    document_id: UUID,
    db: AsyncSession
) -> Optional[str]:
    """Retrieve summary with global lookup."""
    result = await db.execute(
        select(GlobalSummary.summary).join(
            WorkspaceSummary,
            WorkspaceSummary.global_summary_id == GlobalSummary.id
        ).where(
            WorkspaceSummary.workspace_id == workspace_id,
            WorkspaceSummary.document_id == document_id,
            WorkspaceSummary.is_active == True
        )
    )
    return result.scalar_one_or_none()

async def archive_summary(global_summary_id: UUID, db: AsyncSession) -> None:
    """Soft-delete a global summary (don't lose history)."""
    result = await db.execute(
        select(GlobalSummary).where(GlobalSummary.id == global_summary_id)
    )
    summary = result.scalar_one_or_none()
    if summary:
        summary.is_archived = True
        await db.commit()
```

#### Tasks

1. **Implement `summary_service.py`** with deduplication functions
2. **Create tests** for deduplication logic (80%+ coverage):
   - Test: Same content → reuses global summary
   - Test: Different content → creates new global summary
   - Test: Usage counter increments
   - Test: Workspace linking works correctly

3. **Add to service imports** in relevant router files

#### Success Criteria
- ✅ Deduplication logic works correctly
- ✅ Tests pass with 80%+ coverage
- ✅ No existing code broken

---

### Phase 3: Update Existing Endpoints (Week 2) — ��� MEDIUM RISK

**Objective**: Wire deduplication into existing summarization endpoints.  
**Duration**: 2-3 hours  
**Backward Compatibility**: ✅ Partial (API responses unchanged, but now deduplicates)

#### Modified Endpoints

**1. AI Summarize Endpoint** (`POST /workspaces/{workspace_id}/ai/summarize`)

```python
# OLD CODE (before)
summary = await summarize_document(content.raw_text, doc.original_filename, db=db)
content.summary = summary
await db.commit()

# NEW CODE (after)
from app.services.summary_service import (
    find_or_create_global_summary,
    register_workspace_summary,
    compute_content_hash
)

summary = await summarize_document(content.raw_text, doc.original_filename, db=db)
generation_duration = measure_generation_time()

# Create/reuse global summary
global_summary = await find_or_create_global_summary(
    raw_text=content.raw_text,
    summary_text=summary,
    model_id="gpt-4-turbo",  # Track which model generated it
    generation_duration_ms=generation_duration,
    db=db
)

# Link workspace
await register_workspace_summary(
    workspace_id=workspace_id,
    document_id=doc.id,
    global_summary=global_summary,
    db=db
)

# Update document_content with hash for future lookups
content_hash = await compute_content_hash(content.raw_text)
content.content_hash = content_hash
content.summary = summary
await db.commit()
```

**2. Background Summarization Task** (`backend/app/services/pipeline/tasks.py`)

Same pattern as endpoint above — use `find_or_create_global_summary()` instead of direct LLM call when content hash matches.

**3. Flashcard Generation** — Automatically use summaries from global store when generating flashcards from multiple documents.

#### Tasks

1. **Update `ai_generate.py` summarize endpoint** to use `find_or_create_global_summary()`
2. **Update `pipeline/tasks.py` summarization task** to use deduplication
3. **Update flashcard/quiz generation** to use WorkspaceSummary lookups
4. **Add telemetry**: Log deduplication hits vs. misses

#### Success Criteria
- ✅ Existing endpoints work identically (from API perspective)
- ✅ Backend logs show deduplication working
- ✅ Global summaries table growing slower than workspace_summaries
- ✅ No breaking changes to response schemas

---

### Phase 4: Add Summary Reuse Endpoints (Week 2-3) — ��� LOW RISK

**Objective**: Allow users to reuse summaries from other documents (optional personalization).  
**Duration**: 1-2 hours

#### New Endpoints

```
POST /workspaces/{workspace_id}/summaries/suggest
  - Body: { "document_id": "uuid" }
  - Response: List of other documents with identical or similar raw_text
  - Use: "This document appears identical to document X. Reuse summary?"

GET /summaries/usage-stats
  - Return: { total_global: 10, total_workspace: 200, dedup_rate: 0.95, cost_saved: "~$500" }
  - Use: Dashboard analytics showing deduplication impact

PUT /workspaces/{workspace_id}/summaries/{workspace_summary_id}/archive
  - Mark workspace_summary as inactive
  - Use: "Hide this summary from searches without deleting"
```

---

### Phase 5: Analytics & Monitoring (Week 3) — ��� LOW RISK

**Objective**: Track deduplication impact and cost savings.

#### Metrics to Track

```python
class SummaryMetrics:
    total_documents_uploaded: int
    total_unique_contents: int                # Based on content_hash
    deduplication_ratio: float                # 1.0 = perfect (all duplicates), 0.0 = no duplicates
    api_calls_saved: int                      # Calls * usage_count > 1
    estimated_cost_saved: float               # $0.03 per summarization
    avg_global_summary_usage: float           # Average lookups per global_summary
    cache_hit_rate: float                     # (Calls avoided) / (Total possible calls)
```

#### Implementation

1. Create `SummaryMetrics` view/query
2. Expose at: `GET /dashboards/analytics/summaries`
3. Log to telemetry system

---

## Risk Mitigation

| Risk | Mitigation | Effort |
|------|-----------|--------|
| **Phase 1 breaks existing queries** | Test queries before/after migration | 30 min |
| **Different summaries for same content** | Use content_hash matching (deterministic) | Built-in |
| **Global summary overshadows personalization** | Keep workspace_notes field for customization | Phase 4 |
| **Rollback complexity** | All phases use additive schema → reversible | 1 command |

---

## Rollback Plans

### If Phase 1 fails
```bash
docker compose exec backend alembic downgrade -1
# removes global_summaries, workspace_summaries, content_hash
# Existing code continues unaffected
```

### If Phase 2 breaks summarization
- Keep old `content.summary` field populated
- Fall back to reading from DocumentContent.summary if WorkspaceSummary lookup fails
- No data loss

### If Phase 3 breaks endpoints
- Remove calls to `find_or_create_global_summary()`
- Return to direct LLM calls (no dedup, but working)
- No breaking changes to API contracts

---

## Success Criteria

By end of Phase 3:

- ✅ **70% deduplication ratio**: 100 document uploads → ~30 unique summaries
- ✅ **60% cost savings**: 100 API calls → ~40 API calls
- ✅ **<100ms lookup latency**: Retrieve summary from cache
- ✅ **100% backward compatible**: Existing API clients unaffected
- ✅ **80%+ test coverage**: All new code tested

---

## Timeline

| Phase | Duration | Week | Risk | Notes |
|-------|----------|------|------|-------|
| 1: Database | 1-2 hrs | W1 | ��� | Additive, fully reversible |
| 2: Service | 2-3 hrs | W1-2 | ��� | New logic, isolated |
| 3: Endpoints | 2-3 hrs | W2 | ��� | Wiring existing code |
| 4: Reuse API | 1-2 hrs | W2-3 | ��� | New endpoints, optional |
| 5: Analytics | 1 hr | W3 | ��� | Metrics only |
| **Total** | **9-11 hrs** | **3 weeks** | | |

---

## Comparison: Current vs. Improved

### Current System (Document-Scoped Summaries)
```
Workspace 1:  Document "ML.pdf" → LLM Call #1 → Summary stored in document_content.summary
Workspace 2:  Document "ML.pdf" → LLM Call #2 → Summary stored in document_content.summary
Workspace 3:  Document "ML.pdf" → LLM Call #3 → Summary stored in document_content.summary
─────────────────────────────────────────────────────────────
Result: 3 identical summaries, 3 LLM calls, $0.90 cost
```

### Improved System (Global + Workspace Summaries)
```
Workspace 1:  Document "ML.pdf" → Hash match → Use Global Summary (LLM Call #1)
Workspace 2:  Document "ML.pdf" → Hash match → Reuse Global Summary (no call)
Workspace 3:  Document "ML.pdf" → Hash match → Reuse Global Summary (no call)
─────────────────────────────────────────────────────────────
Result: 1 unique summary, 1 LLM call, $0.30 cost (67% savings)
```

---

## Notes

### Why Content Hash (Not ML Similarity)?
- ✅ Deterministic: Same input → same output
- ✅ Fast: O(1) lookup vs. O(n) cosine similarity
- ✅ Exact: Catches exact duplicates (most common case)
- ✅ Simple: No ML dependencies

### Why Not Update Global Summary?
- Immutability ensures consistency across workspaces
- If summary needs updating: create new global summary with new version tag
- This prevents cache invalidation issues

### Future Enhancements (Not in Scope)
- Summary versioning (track multiple versions)
- ML-based similarity matching for ~duplicates (80% similar docs)
- Summary generation delegation (use faster/cheaper local LLM for drafts)
- A/B testing different summarization models per global_summary

