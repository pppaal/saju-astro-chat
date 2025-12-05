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
MAX_OUTPUT_TOKENS = 3500


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
def refine_with_gpt5mini(raw_text: str, theme: str, locale: str = "en") -> str:
    """Polish the Llama draft with GPT-4o-mini."""
    try:
        gpt = get_openai_llm()

        if locale == "ko":
            system_prompt = (
                "당신은 전문 운세 에디터입니다. 스타일을 다듬되 구조는 유지하고, 공감하되 장황하지 않게 작성합니다. "
                "의료/법률/재정 관련 주장은 피하세요. 이것은 오락/자기계발 콘텐츠입니다. "
                "한국어로 자연스럽고 설득력 있게 다듬어주세요. 구체적이고 개인화된 느낌을 유지하세요."
            )
            user_prompt = f"테마: {theme}\n\n다음 초안을 한국어로 다듬어주세요. 구조와 길이를 유지하되 더 자연스럽고 설득력 있게 만들어주세요:\n\n{raw_text}"
        else:
            system_prompt = (
                "You are a professional fortune editor. Polish style, keep structure, be empathetic but not wordy. "
                "Avoid medical/legal/financial claims; this is entertainment/self-help. "
                "Make it natural, engaging, and convincing while maintaining the detailed analysis."
            )
            user_prompt = f"Theme: {theme}\n\nPolish this draft, keep the structure and length but make it more engaging and convincing:\n\n{raw_text}"

        resp = _chat_with_retry(
            gpt,
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=MAX_OUTPUT_TOKENS,
            temperature=0.2,
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
    tarot_text: str = "",
):
    """Blend saju + astro + graph + rules with Llama draft then GPT mini polish."""
    try:
        print("[FusionGenerate] Step1: Together LLM request start")

        query_parts = [saju_text, astro_text]
        if tarot_text:
            query_parts.append(tarot_text)
        query_parts.append(theme)
        query = "\n".join(query_parts)
        graph_context = search_graphs(query, top_k=12)

        preset_text = PRESETS.get(theme, PRESETS["life_path"])
        safe_user_prompt = (user_prompt or "").strip()
        if len(safe_user_prompt) > 1200:
            safe_user_prompt = safe_user_prompt[:1200] + "\n...[truncated]"
        dataset_summary = f"\n\n[Dataset context]\n{dataset_text.strip()}\n" if dataset_text else ""
        extra_user = (
            f"\n\n[User instructions - may be in {locale}]\n{safe_user_prompt}\n" if safe_user_prompt else ""
        )
        tarot_block = f"\n\n[TAROT summary]\n{tarot_text}" if tarot_text else ""

        # Single comprehensive prompt instead of 7 separate sections
        comprehensive_prompt = f"""
{preset_text}

Create a comprehensive fortune analysis with these sections:
1. Current Period & Element Balance
2. Life Path Summary
3. Guidance & Opportunities
4. Challenges & Cautions

Requirements:
- Total 800-1200 words across all sections
- Use saju + astro + graph context for specific, personalized insights
- Include dates, elements, or planetary positions when relevant
- Engaging, confident, personalized language
- Avoid medical/legal/financial claims (entertainment/self-help only)
- If locale is '{locale}', respond ENTIRELY in that language with natural expressions

[Graph context]
{graph_context}

[SAJU summary]
{saju_text}

[ASTRO summary]
{astro_text}

{tarot_block}

{dataset_summary}
{extra_user}
"""

        print("[Together] Generating comprehensive analysis...")
        resp = _chat_with_retry(
            model,
            model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
            messages=[{"role": "user", "content": comprehensive_prompt.strip()}],
            temperature=0.15,
            top_p=0.9,
            max_tokens=MAX_OUTPUT_TOKENS,
        )

        llama_report = resp.choices[0].message.content.strip()
        llama_report = re.sub(r"\n{3,}", "\n\n", llama_report)

        print("[FusionGenerate] Step2: GPT-mini polishing")
        refined_report = refine_with_gpt5mini(llama_report, theme, locale)

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
