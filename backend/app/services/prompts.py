"""LLM prompt templates for all AI-powered features.

Each function returns a (system_message, user_message) pair.
Centralizing prompts here makes them easy to iterate independently
of the service logic that calls them.
"""
from __future__ import annotations


def summarize_prompts(text: str, filename: str) -> tuple[str, str]:
    system = (
        "You are an expert academic study assistant who helps students understand "
        "complex material quickly and retain it effectively. "
        "Output plain text only — no markdown, no HTML."
    )
    user = (
        f"Summarize the following document so a student can understand it quickly.\n\n"
        f"Document name: {filename}\n\n"
        f"Format your response EXACTLY like this (plain text, no markdown):\n\n"
        f"OVERVIEW\n"
        f"<3–5 sentence paragraph giving a concise overview>\n\n"
        f"KEY POINTS\n"
        f"• <point 1>\n"
        f"• <point 2>\n"
        f"(5–8 bullet points covering the most important concepts)\n\n"
        f"WHY IT MATTERS\n"
        f"<1–2 sentences on why this material is important>\n\n"
        f"Document content:\n{text[:12000]}"
    )
    return system, user


def flashcards_prompts(summary: str, difficulty: str, count: int, difficulty_ctx: str) -> tuple[str, str]:
    system = (
        "You are an expert educational content creator specializing in spaced-repetition "
        "flashcards that build deep understanding. "
        "Output only valid JSON with no markdown fences or commentary."
    )
    user = (
        f"Create exactly {count} study flashcards from the material below.\n"
        f"Difficulty: {difficulty.upper()} — {difficulty_ctx}\n\n"
        f"Return a JSON array. Each element must have:\n"
        f'  "front": the question, term, or concept to test (string)\n'
        f'  "back": the complete answer or explanation (string)\n'
        f'  "hint": a short memory aid without giving away the answer, or null\n\n'
        f"Vary question styles: definitions, applications, comparisons, examples.\n\n"
        f"Study material:\n{summary[:8000]}"
    )
    return system, user


def quiz_prompts(summary: str, difficulty: str, count: int, difficulty_ctx: str) -> tuple[str, str]:
    system = (
        "You are an expert educator creating multiple-choice assessments with exactly "
        "3 answer choices per question. "
        "Output only valid JSON with no markdown fences or commentary."
    )
    user = (
        f"Create exactly {count} multiple-choice questions from the material below.\n"
        f"Difficulty: {difficulty.upper()} — {difficulty_ctx}\n\n"
        f"Return a JSON array. Each element must have:\n"
        f'  "question_text": a clear, specific question (string)\n'
        f'  "correct_answer": exact text of the correct option (string)\n'
        f'  "explanation": brief explanation of why the answer is correct (string)\n'
        f'  "options": array of EXACTLY 3 objects, each with:\n'
        f'      "text": option text (string)\n'
        f'      "is_correct": true for exactly ONE correct option, false for others (boolean)\n\n'
        f"Exactly one option per question must be correct. Distractors must be plausible.\n\n"
        f"Study material:\n{summary[:8000]}"
    )
    return system, user


def roadmap_prompts(summary: str, workspace_title: str, count: int) -> tuple[str, str]:
    system = (
        "You are an expert learning designer who creates structured study roadmaps. "
        "You break complex subjects into clear, sequential, achievable objectives. "
        "Output only valid JSON with no markdown fences or commentary."
    )
    user = (
        f"Create a study roadmap with exactly {count} micro-goals for the workspace: \"{workspace_title}\".\n\n"
        f"Return a JSON array ordered from foundational to advanced. Each element must have:\n"
        f'  "title": short actionable goal starting with a verb (e.g. "Understand X", "Apply Y") (string, max 200 chars)\n'
        f'  "description": 1–2 sentences on what to study and why (string or null)\n'
        f'  "order_index": sequential integer starting at 0\n\n'
        f"Rules: cover all major topics, make each goal completable in 1–3 sessions.\n\n"
        f"Study material:\n{summary[:10000]}"
    )
    return system, user


def chat_system_prompt(workspace_title: str, context: str) -> str:
    """Build a system prompt for the workspace AI chat assistant."""
    return (
        f"You are an AI study assistant for the workspace: \"{workspace_title}\".\n"
        f"Help the student understand material, explain concepts, answer questions, "
        f"and generate practice exercises.\n\n"
        f"Workspace context (document summaries):\n{context or 'No summaries available yet.'}\n\n"
        f"Be concise, educational, and encouraging. Use examples when helpful. "
        f"If asked to generate practice questions, format them clearly numbered."
    )


def session_suggest_prompts(goals_text: str, workspace_title: str, available_minutes: int) -> tuple[str, str]:
    system = (
        "You are an expert study coach who creates optimized, personalized study session plans. "
        "Output only valid JSON with no markdown fences or commentary."
    )
    user = (
        f"Plan an optimized study session for \"{workspace_title}\".\n"
        f"Available time: {available_minutes} minutes\n\n"
        f"Micro-goals (id | title | status):\n{goals_text}\n\n"
        f"Return a JSON object with:\n"
        f'  "title": descriptive session title (string)\n'
        f'  "focus_summary": 2–3 sentences on what to focus on and why (string)\n'
        f'  "suggested_goal_ids": list of micro-goal ID strings to focus on (array)\n'
        f'  "tips": 2–3 specific study tips for this session (array of strings)\n\n'
        f"Prioritize in-progress then pending goals. Suggest at most 2–3 goals."
    )
    return system, user


def study_session_plan_prompts(summary: str, workspace_title: str) -> tuple[str, str]:
    system = (
        "You are an expert study coach and learning designer. "
        "Analyze the provided material and design optimal study parameters. "
        "Output only valid JSON with no markdown fences or commentary."
    )
    user = (
        f"Analyze this study material for workspace \"{workspace_title}\" and recommend optimal study parameters.\n\n"
        f"Return a JSON object with exactly these fields:\n"
        f'  "session_title": descriptive title for this study session (string)\n'
        f'  "duration_minutes": recommended session duration in minutes, integer between 20 and 120\n'
        f'  "flashcard_count": optimal number of flashcards to create, integer between 5 and 20\n'
        f'  "flashcard_difficulty": one of "easy", "normal", "hard" based on material complexity\n'
        f'  "quiz_count": optimal number of quiz questions, integer between 3 and 15\n'
        f'  "quiz_difficulty": one of "easy", "normal", "hard" based on material complexity\n'
        f'  "focus_summary": 2–3 sentences on what to focus on in this session (string)\n'
        f'  "tips": array of 2–3 specific study tips for this material (array of strings)\n\n'
        f"Difficulty guide: easy = introductory/factual, normal = conceptual/applied, hard = advanced/analytical.\n\n"
        f"Study material:\n{summary[:8000]}"
    )
    return system, user
