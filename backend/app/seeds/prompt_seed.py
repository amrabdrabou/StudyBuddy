"""Idempotent seed: inserts the initial set of LLM prompt templates.

Run at every startup. Only inserts rows that don't already exist.
Never overwrites existing active prompts — admins can update via API.

Prompt naming convention:
  name          — feature slug (summarize | flashcards | quiz | roadmap | chat | session_suggest | study_session_plan)
  role          — "system" or "user"
  version       — starts at 1, increment when the template changes

Jinja2 variables used per prompt:
  summarize          → {{ filename }}, {{ document_text }}
  flashcards         → {{ count }}, {{ difficulty }}, {{ difficulty_ctx }}, {{ summary }}
  quiz               → {{ count }}, {{ difficulty }}, {{ difficulty_ctx }}, {{ summary }}
  roadmap            → {{ count }}, {{ workspace_title }}, {{ summary }}
  chat (system)      → {{ workspace_title }}, {{ context }}
  session_suggest    → {{ workspace_title }}, {{ available_minutes }}, {{ goals_text }}
  study_session_plan → {{ workspace_title }}, {{ summary }}
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prompt import Prompt

logger = logging.getLogger(__name__)

# ── Seed data ──────────────────────────────────────────────────────────────────
# Each entry: (name, version, role, description, template)

_PROMPTS: list[tuple[str, int, str, str, str]] = [
    # ── summarize ──────────────────────────────────────────────────────────────
    (
        "summarize", 1, "system",
        "Expert academic study assistant. Outputs structured plain-text summaries.",
        (
            "You are an expert academic study assistant who helps students understand "
            "complex material quickly and retain it effectively. "
            "Output plain text only — no markdown, no HTML."
        ),
    ),
    (
        "summarize", 1, "user",
        "User prompt: requests a structured plain-text summary of a document.",
        """\
Summarize the following document so a student can understand it quickly.

Document name: {{ filename }}

Format your response EXACTLY like this (plain text, no markdown):

OVERVIEW
<3–5 sentence paragraph giving a concise overview>

KEY POINTS
• <point 1>
• <point 2>
(5–8 bullet points covering the most important concepts)

WHY IT MATTERS
<1–2 sentences on why this material is important>

Constraints:
- Use only information from the document. Do NOT add external knowledge.
- Use simple, student-friendly language.
- Maximum 400 words total.

Document content:
{{ document_text }}""",
    ),

    # ── flashcards ─────────────────────────────────────────────────────────────
    (
        "flashcards", 1, "system",
        "Expert flashcard creator. Outputs JSON array of spaced-repetition cards.",
        (
            "You are an expert educational content creator specializing in spaced-repetition "
            "flashcards that build deep understanding. "
            "Output ONLY valid JSON — no markdown fences, no commentary, no extra text."
        ),
    ),
    (
        "flashcards", 1, "user",
        "User prompt: requests a JSON array of flashcards from study material.",
        """\
Create exactly {{ count }} study flashcards from the material below.
Difficulty: {{ difficulty }} — {{ difficulty_ctx }}

Return a JSON array. Each element MUST have:
  "front": the question, term, or concept to test (string)
  "back":  the complete answer or explanation (string)
  "hint":  a short memory aid that does NOT give away the answer, or null

Rules:
- Vary question styles: definitions, applications, comparisons, examples.
- Do NOT add information not present in the study material.
- Keep "back" answers concise but complete (1–3 sentences).
- Output only the JSON array — nothing else.

Study material:
{{ summary }}""",
    ),

    # ── quiz ───────────────────────────────────────────────────────────────────
    (
        "quiz", 1, "system",
        "Expert quiz creator. Outputs JSON array of MCQ questions with exactly 3 options each.",
        (
            "You are an expert educator creating multiple-choice assessments. "
            "Each question must have EXACTLY 3 answer choices — no more, no fewer. "
            "Output ONLY valid JSON — no markdown fences, no commentary, no extra text."
        ),
    ),
    (
        "quiz", 1, "user",
        "User prompt: requests a JSON array of MCQ questions from study material.",
        """\
Create exactly {{ count }} multiple-choice questions from the material below.
Difficulty: {{ difficulty }} — {{ difficulty_ctx }}

Return a JSON array. Each element MUST have:
  "question_text":  a clear, specific question (string)
  "correct_answer": exact text of the correct option (string)
  "explanation":    brief explanation of why the answer is correct (1–2 sentences, string)
  "options":        array of EXACTLY 3 objects, each with:
      "text":       option text (string)
      "is_correct": true for EXACTLY ONE correct option, false for the other two (boolean)

Rules:
- Exactly one option per question must be marked is_correct: true.
- Distractors must be plausible — avoid obviously wrong answers.
- Base all questions only on the provided study material.
- Output only the JSON array — nothing else.

Study material:
{{ summary }}""",
    ),

    # ── roadmap ────────────────────────────────────────────────────────────────
    (
        "roadmap", 1, "system",
        "Expert learning designer. Outputs JSON array of sequential study micro-goals.",
        (
            "You are an expert learning designer who creates structured study roadmaps. "
            "You break complex subjects into clear, sequential, achievable objectives. "
            "Output ONLY valid JSON — no markdown fences, no commentary, no extra text."
        ),
    ),
    (
        "roadmap", 1, "user",
        "User prompt: requests a JSON study roadmap from summary text.",
        """\
Create a study roadmap with exactly {{ count }} micro-goals for the workspace: "{{ workspace_title }}".

Return a JSON array ordered from foundational to advanced. Each element MUST have:
  "title":       short actionable goal starting with a verb (e.g. "Understand X", "Apply Y") (string, max 200 chars)
  "description": 1–2 sentences on what to study and why (string or null)
  "order_index": sequential integer starting at 0

Rules:
- Cover all major topics from the study material.
- Make each goal completable in 1–3 study sessions.
- Order goals from basic concepts to advanced application.
- Output only the JSON array — nothing else.

Study material:
{{ summary }}""",
    ),

    # ── chat ───────────────────────────────────────────────────────────────────
    (
        "chat", 1, "system",
        "System prompt for the workspace AI chat assistant. Context-aware tutoring.",
        """\
You are an AI study assistant for the workspace: "{{ workspace_title }}".

Your role:
- Help the student understand material and explain concepts clearly.
- Answer questions using the workspace documents as your primary source.
- Generate practice exercises and quiz questions when asked.
- Be encouraging, concise, and educational.

Workspace context (document summaries):
{{ context }}

Guidelines:
- Prefer information from the workspace context over general knowledge.
- If a concept is not in the context, say so and offer general guidance.
- Use examples and analogies to clarify complex ideas.
- Format numbered lists for practice questions.""",
    ),

    # ── study_session_plan ────────────────────────────────────────────────────
    (
        "study_session_plan", 1, "system",
        "Expert study coach. Outputs JSON optimal study parameters from material.",
        (
            "You are an expert study coach and learning designer. "
            "Analyze the provided material and design optimal study parameters. "
            "Output ONLY valid JSON — no markdown fences, no commentary, no extra text."
        ),
    ),
    (
        "study_session_plan", 1, "user",
        "User prompt: requests a JSON study session plan from workspace material.",
        """\
Analyze this study material for workspace "{{ workspace_title }}" and recommend optimal study parameters.

Return a JSON object with exactly these fields:
  "session_title":        descriptive title for this study session (string)
  "duration_minutes":     recommended session duration in minutes, integer between 20 and 120
  "flashcard_count":      optimal number of flashcards to create, integer between 5 and 20
  "flashcard_difficulty": one of "easy", "normal", "hard" based on material complexity
  "quiz_count":           optimal number of quiz questions, integer between 3 and 15
  "quiz_difficulty":      one of "easy", "normal", "hard" based on material complexity
  "focus_summary":        2–3 sentences on what to focus on in this session (string)
  "tips":                 array of 2–3 specific study tips for this material (array of strings)

Difficulty guide: easy = introductory/factual, normal = conceptual/applied, hard = advanced/analytical.

Study material:
{{ summary }}""",
    ),

    # ── session_suggest ────────────────────────────────────────────────────────
    (
        "session_suggest", 1, "system",
        "Expert study coach. Outputs JSON session plan from micro-goals.",
        (
            "You are an expert study coach who creates optimized, personalized study session plans. "
            "Output ONLY valid JSON — no markdown fences, no commentary, no extra text."
        ),
    ),
    (
        "session_suggest", 1, "user",
        "User prompt: requests a JSON session plan from micro-goals and available time.",
        """\
Plan an optimized study session for "{{ workspace_title }}".
Available time: {{ available_minutes }} minutes

Micro-goals (id | title | status):
{{ goals_text }}

Return a JSON object with:
  "title":              descriptive session title (string)
  "focus_summary":      2–3 sentences on what to focus on and why (string)
  "suggested_goal_ids": list of micro-goal ID strings to prioritize (array, max 3)
  "tips":               2–3 specific, actionable study tips for this session (array of strings)

Rules:
- Prioritize in_progress goals first, then pending, then suggested.
- Suggest at most 3 goals — quality over quantity.
- Align tips to the selected goals and available time.
- Output only the JSON object — nothing else.""",
    ),
]


async def _migrate_prompts(db: AsyncSession) -> None:
    """One-time fixes for prompt rows that were seeded with stale templates."""
    # Rename {{ summaries }} → {{ summary }} in the roadmap user prompt (v1)
    result = await db.execute(
        select(Prompt).where(
            Prompt.name == "roadmap",
            Prompt.role == "user",
            Prompt.version == 1,
        )
    )
    row = result.scalar_one_or_none()
    if row and "{{ summaries }}" in row.template:
        row.template = row.template.replace("{{ summaries }}", "{{ summary }}")
        row.template = row.template.replace("Document summaries:", "Study material:")
        await db.commit()
        logger.info("Prompt migration: patched roadmap/user v1 (summaries → summary)")


async def seed_prompts(db: AsyncSession) -> None:
    """Insert initial prompt rows if they don't exist yet.

    Idempotent: checks (name, role, version) uniqueness before inserting.
    Also runs one-time template migrations for stale rows.
    """
    await _migrate_prompts(db)

    inserted = 0
    for name, version, role, description, template in _PROMPTS:
        exists = await db.execute(
            select(Prompt).where(
                Prompt.name == name,
                Prompt.role == role,
                Prompt.version == version,
            )
        )
        if exists.scalar_one_or_none() is not None:
            continue

        db.add(Prompt(
            name=name,
            version=version,
            role=role,
            description=description,
            template=template,
            is_active=True,
        ))
        inserted += 1

    if inserted:
        await db.commit()
        logger.info("Prompt seed: inserted %d prompt row(s)", inserted)
    else:
        logger.debug("Prompt seed: all prompts already present")
