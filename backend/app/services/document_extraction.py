"""
Document text extraction service.

Follows the same pattern as app/services/validators.py — pure functions,
no FastAPI or SQLAlchemy dependencies.

Supported MIME types:
    application/pdf                                                        → pypdf
    application/vnd.openxmlformats-officedocument.wordprocessingml.document → python-docx
    application/msword                                                     → python-docx
    text/plain                                                             → built-in

Required packages (add to requirements.txt before running):
    pip install pypdf python-docx
"""
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class ExtractionError(Exception):
    """
    Raised when text extraction fails for any reason.

    The router catches this and marks the document with extraction_status='failed'
    and stores the message in error_message.
    """


def extract_text(file_path: Path, mime_type: str) -> str:
    """
    Extract and return the full plain text from a document file.

    Dispatches to the correct handler based on mime_type.
    Raises ExtractionError on any failure so the caller can handle it
    without needing to catch broad Exception types.
    """
    handlers = {
        "application/pdf": _extract_pdf,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": _extract_docx,
        "application/msword": _extract_docx,
        "text/plain": _extract_txt,
    }

    handler = handlers.get(mime_type)
    if handler is None:
        raise ExtractionError(f"No extractor registered for MIME type: {mime_type!r}")

    if not file_path.exists():
        raise ExtractionError(f"File not found on disk: {file_path}")

    try:
        text = handler(file_path)
        logger.info("Extracted %d chars from %s", len(text), file_path.name)
        return text
    except ExtractionError:
        raise
    except Exception as exc:
        raise ExtractionError(str(exc)) from exc


# ── Handlers ─────────────────────────────────────────────────────────────────

def _extract_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        raise ExtractionError()

    reader = PdfReader(str(path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(p for p in pages if p.strip())


def _extract_docx(path: Path) -> str:
    try:
        from docx import Document as DocxDocument
    except ImportError:
        raise ExtractionError()

    doc = DocxDocument(str(path))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _extract_txt(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="latin-1", errors="replace")
