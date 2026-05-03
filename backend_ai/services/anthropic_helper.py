"""
Anthropic Claude helper with prompt caching.

Used by counselor services (saju, astrology) to reduce token cost on
repeated invocations sharing the same system prompt.

Cache mechanics:
- system block is wrapped with cache_control: ephemeral
- 5-minute TTL; subsequent calls within window read at 90% discount
- usage.cache_read_input_tokens reports hit volume for monitoring
"""
from __future__ import annotations

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def get_anthropic_model() -> str:
    """Resolve Claude model from env, defaulting to Haiku 4.5."""
    return (
        os.getenv("ANTHROPIC_CHAT_MODEL")
        or os.getenv("CLAUDE_CHAT_MODEL")
        or "claude-haiku-4-5-20251001"
    )


def is_anthropic_available() -> bool:
    """True when ANTHROPIC_API_KEY is set."""
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def call_claude_completion(
    system_prompt: str,
    user_prompt: str,
    *,
    max_tokens: int = 1500,
    temperature: float = 0.7,
    model: Optional[str] = None,
    label: str = "claude",
) -> str:
    """
    Single-shot Claude completion with system-prompt caching.

    Returns the assistant text. Raises on API failure — callers decide
    whether to fall back to OpenAI.
    """
    if not is_anthropic_available():
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    import anthropic

    client = anthropic.Anthropic()
    resolved_model = model or get_anthropic_model()

    response = client.messages.create(
        model=resolved_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_prompt}],
    )

    # Extract text from content blocks
    text_parts = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            text_parts.append(getattr(block, "text", "") or "")
    full_text = "\n".join(text_parts).strip()

    # Log usage including cache stats
    usage = getattr(response, "usage", None)
    if usage is not None:
        logger.info(
            "[%s] Claude usage input=%s output=%s cache_read=%s cache_create=%s model=%s",
            label,
            getattr(usage, "input_tokens", None),
            getattr(usage, "output_tokens", None),
            getattr(usage, "cache_read_input_tokens", None),
            getattr(usage, "cache_creation_input_tokens", None),
            resolved_model,
        )

    return full_text
