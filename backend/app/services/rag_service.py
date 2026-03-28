"""RAG (Retrieval-Augmented Generation) service — placeholder implementation.

Current state: returns document summaries as flat text context.
Future state:
  1. Chunk documents → store embeddings in pgvector / Pinecone / Qdrant
  2. Embed the query
  3. Vector similarity search → retrieve top-k relevant chunks
  4. Inject chunks into prompt via {{ context }} variable

To upgrade this to real RAG:
  - Replace retrieve_context() body with a vector DB query
  - Add embed_and_store(document_id, chunks, db) for the ingestion pipeline
  - The {{ context }} Jinja2 variable in prompt templates is already the injection point
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_content import DocumentContent

logger = logging.getLogger(__name__)


async def retrieve_context(
    query: str,  # noqa: ARG001 — unused until real retrieval is implemented
    workspace_id: str,
    db: AsyncSession,
    max_chars: int = 8000,
) -> str:
    """Retrieve relevant context for a query within a workspace.

    Current implementation: concatenates all available document summaries.
    Future implementation: semantic vector search over document chunks.

    Args:
        query:        The user query or topic to retrieve context for.
        workspace_id: Scope retrieval to this workspace.
        db:           Async database session.
        max_chars:    Soft cap on total returned characters.

    Returns:
        A plain-text context string ready to be injected into {{ context }}.
    """
    from uuid import UUID  # local import avoids potential circular issues

    try:
        ws_uuid = UUID(str(workspace_id))
    except (ValueError, AttributeError):
        return ""

    docs_result = await db.execute(
        select(Document).where(
            Document.workspace_id == ws_uuid,
            Document.status == "ready",
        )
    )
    docs = docs_result.scalars().all()
    if not docs:
        return ""

    parts: list[str] = []
    total = 0

    for doc in docs:
        content_result = await db.execute(
            select(DocumentContent).where(DocumentContent.document_id == doc.id)
        )
        content = content_result.scalar_one_or_none()

        text = (content.summary or content.raw_text or "") if content else ""
        if not text:
            continue

        chunk = f"[{doc.original_filename}]\n{text}"
        remaining = max_chars - total
        if remaining <= 0:
            break
        if len(chunk) > remaining:
            chunk = chunk[:remaining]

        parts.append(chunk)
        total += len(chunk)

    return "\n\n".join(parts)


# ── Future: embedding ingestion pipeline (stub) ────────────────────────────────

async def embed_and_store(
    document_id: str,  # noqa: ARG001
    chunks: list[str],  # noqa: ARG001
    db: AsyncSession,  # noqa: ARG001
) -> None:
    """Embed document chunks and store vectors in the vector store.

    Not yet implemented. Will be called from document_extraction pipeline
    after text extraction completes.
    """
    logger.debug("embed_and_store: not yet implemented — skipping vector ingestion")
