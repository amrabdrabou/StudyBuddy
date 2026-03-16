"""
Document file storage utilities.

Follows the same pattern as app/services/validators.py — pure functions,
no FastAPI dependencies, no DB access.

All file I/O for documents goes through this module. To migrate to
S3-compatible storage later, only this file needs to change.
"""
import re
import uuid as uuid_module
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

# ── Allowed file types ────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES: dict[str, str] = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "text/plain": "txt",
}


# ── Path helpers ──────────────────────────────────────────────────────────────

def get_upload_base() -> Path:
    """
    Returns the absolute base directory for all uploaded files.

    If upload_dir in settings is relative, it is resolved against the
    backend root (two levels up from app/services/).
    """
    settings = get_settings()
    p = Path(settings.upload_dir)
    if not p.is_absolute():
        # __file__ = app/services/document_storage.py
        # parents[0] = app/services/
        # parents[1] = app/
        # parents[2] = backend root
        p = Path(__file__).resolve().parents[2] / settings.upload_dir
    return p


def build_storage_path(
    user_id: UUID,
    session_id: UUID,
    file_id: UUID,
    safe_filename: str,
) -> str:
    """
    Returns the relative storage path for a document file.

    Structure:
        users/{user_id}/sessions/{session_id}/documents/{file_id}_{safe_filename}

    Example:
        users/abc/sessions/def/documents/ghi_rest_apis.pdf
    """
    return f"users/{user_id}/sessions/{session_id}/documents/{file_id}_{safe_filename}"


def make_safe_filename(original: str) -> str:
    """
    Derives a filesystem-safe filename from a client-supplied name.

    Security rules applied:
    - Strips any directory component (prevents path traversal via filename)
    - Lowercased
    - Only alphanumeric characters, dots, hyphens, and underscores are kept
    - Consecutive underscores collapsed
    - Leading/trailing dots and underscores trimmed
    - Hard-capped at 100 characters
    - Falls back to "document" if nothing remains after sanitisation
    """
    name = Path(original).name   # strip any path component the client embedded
    name = name.lower()
    name = re.sub(r"[^\w.\-]", "_", name)
    name = re.sub(r"_+", "_", name)
    name = name.strip("_.")
    return name[:100] or "document"


def resolve_storage_path(relative_path: str) -> Path:
    """
    Resolves a relative storage path to an absolute filesystem path.

    Raises ValueError if the resolved path escapes the upload base directory
    (path traversal protection — never trust client-supplied paths directly).
    """
    base = get_upload_base().resolve()
    resolved = (base / relative_path).resolve()
    if not str(resolved).startswith(str(base)):
        raise ValueError(f"Path traversal attempt blocked: {relative_path!r}")
    return resolved


# ── File I/O ─────────────────────────────────────────────────────────────────

def save_upload(content: bytes, relative_path: str) -> None:
    """Write file bytes to storage. Creates parent directories as needed."""
    target = resolve_storage_path(relative_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)


def delete_upload(relative_path: str) -> None:
    """
    Remove a file from storage.
    Silently succeeds if the file is already gone (idempotent).
    """
    try:
        path = resolve_storage_path(relative_path)
        if path.exists():
            path.unlink()
    except (ValueError, OSError):
        pass  # best-effort deletion; log in production


# ── Validation ────────────────────────────────────────────────────────────────

async def read_and_validate_upload(file: UploadFile) -> bytes:
    """
    Reads the uploaded file into memory and validates:
      1. MIME type is in the allowed list
      2. File is not empty
      3. File does not exceed the configured size limit

    Returns the raw bytes on success.
    Raises HTTPException on any violation — consistent with the rest of the app.
    """
    settings = get_settings()

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"File type '{file.content_type}' is not allowed. "
                f"Accepted types: PDF, DOCX, DOC, TXT."
            ),
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The uploaded file is empty.",
        )

    max_bytes = settings.upload_max_file_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.upload_max_file_size_mb} MB size limit.",
        )

    return content
