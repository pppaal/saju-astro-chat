# backend_ai/model/fusion_generate.py

import os
import re
import json
import traceback
from datetime import datetime
from dotenv import load_dotenv
from together import Together
from openai import OpenAI

from backend_ai.data.graph.utils import search_graphs

"""
Fusion Generator
1) Draft with Together (Llama 3.3 70B Turbo)
2) Polish with GPT-5-mini (OpenAI)
"""

load_dotenv()
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MAX_OUTPUT_TOKENS = 1800


# ===============================================================
# LLM CLIENTS
# ===============================================================
def get_together_llm():
    if not TOGETHER_API_KEY:
        raise ValueError("TOGETHER_API_KEY is missing.")
    return Together(api_key=TOGETHER_API_KEY)


def get_openai_llm():
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is missing.")
    return OpenAI(api_key=OPENAI_API_KEY)


def get_llm():
    """Default LLM for fusion generation; fallback to OpenAI if Together key is missing."""
    try:
        return get_together_llm()
    except Exception:
        return get_openai_llm()


def _chat_with_retry(client, model: str, messages, max_tokens: int, temperature: float = 0.1, top_p: float = 0.9, retries: int = 2):
    """Simple retry/backoff for rate/5xx."""
    import time

    delay = 1.0
    last_err = None
    for attempt in range(retries + 1):
        try:
            return client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
            )
        except Exception as e:
            last_err = e
            msg = str(e)
            if "429" in msg or "rate" in msg.lower() or "503" in msg:
                time.sleep(delay)
                delay *= 2
                continue
            break
    raise last_err


# ===============================================================
# PRESETS (theme tone)
# ===============================================================
PRESETS = {
    "life_path": "Life path: balanced, encouraging, long-term arc. Highlight element balance and pacing.",
    "career": "Career: timing, collaboration, decision clarity, pragmatic steps.",
    "relationship": "Relationships: warmth, boundaries, harmony, timing.",
    "love": "Love: sincerity, boundaries, emotional clarity, timing.",
    "health": "Health: moderation, rest, professional help when needed (no medical advice).",
    "family": "Family: communication, shared goals, steady support.",
    "daily": "Daily: short, concise, actionable guidance.",
    "monthly": "Monthly: key themes/dates for the month.",
    "new_year": "New year: big-picture arc and gentle cautions.",
    "next_year": "Next year: upcoming cycles, preparation, pacing.",
}


# ===============================================================
# GPT-5-mini refinement
# ===============================================================
def refine_with_gpt5mini(raw_text: str, theme: str) -> str:
    """Polish the Llama draft with GPT-5-mini."""
    try:
        gpt = get_openai_llm()
        system_prompt = (
            "You are a concise editor. Polish style, keep structure, empathetic but not wordy. "
            "Avoid medical/legal/financial claims; this is entertainment/self-help. "
            "Keep language and tone consistent with the requested locale."
        )

        resp = _chat_with_retry(
            gpt,
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Theme: {theme}\n\nPolish this draft, keep it concise and structured (max {MAX_OUTPUT_TOKENS} tokens):\n\n{raw_text}",
                },
            ],
            max_tokens=MAX_OUTPUT_TOKENS,
            temperature=0.15,
            top_p=0.9,
        )
        return resp.choices[0].message.content.strip()

    except Exception as e:
        print(f"[refine_with_gpt5mini] Error: {e}")
        return raw_text


# ===============================================================
# Fusion Report Generator
# ===============================================================
def generate_fusion_report(
    model,
    saju_text: str,
    astro_text: str,
    theme: str,
    locale: str = "en",
    user_prompt: str = "",
    dataset_text: str = "",
):
    """Blend saju + astro + graph + rules with Llama draft then GPT mini polish."""
    try:
        print("[FusionGenerate] Step1: Together LLM request start")

        query = f"{saju_text}\n{astro_text}\n{theme}"
        graph_context = search_graphs(query, top_k=6)

        preset_text = PRESETS.get(theme, PRESETS["life_path"])
        safe_user_prompt = (user_prompt or "").strip()
        if len(safe_user_prompt) > 1200:
            safe_user_prompt = safe_user_prompt[:1200] + "\n...[truncated]"
        dataset_summary = f"\n\n[Dataset context]\n{dataset_text.strip()}\n" if dataset_text else ""
        extra_user = (
            f"\n\n[User instructions - may be in {locale}]\n{safe_user_prompt}\n" if safe_user_prompt else ""
        )

        sections = ["Summary", "Guidance", "Risks", "Action Plan"]
        section_texts = []

        for sec in sections:
            print(f"[Together] Generating section '{sec}' ...")
            sub_prompt = f"""
{preset_text}

Write a concise '{sec}' section.
Use saju + astro + graph context to keep it specific.
- Keep total response under ~2000 chars
- Use clear headings if desired (### Title)
- Avoid medical/legal/financial claims; entertainment/self-help only.
 - Respond in locale: {locale}

[Graph context]
{graph_context}

[SAJU summary]
{saju_text}

[ASTRO summary]
{astro_text}

{dataset_summary}
{extra_user}
"""
            resp = _chat_with_retry(
                model,
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                messages=[{"role": "user", "content": sub_prompt.strip()}],
                temperature=0.1,
                top_p=0.9,
                max_tokens=MAX_OUTPUT_TOKENS,
            )

            text = resp.choices[0].message.content.strip()
            text = re.sub(r"(#+\s*(Summary|Guidance|Risks|Action Plan)\s*)", "", text)
            text = re.sub(r"\n{3,}", "\n\n", text)
            section_texts.append(text)

        llama_report = "\n\n".join(section_texts).strip()
        print("[FusionGenerate] Step2: GPT-mini polishing")
        refined_report = refine_with_gpt5mini(llama_report, theme)

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "theme": theme,
            "fusion_layer": refined_report,
            "graph_context": graph_context,
        }

    except Exception as e:
        print(f"[FusionGenerate] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc(),
            "fusion_layer": "",
            "graph_context": "",
        }
