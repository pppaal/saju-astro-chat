"""
Builds a synthetic fusion prompt and reports length/token estimate per locale/theme.

Usage:
  python backend_ai/tools/prompt_length.py --locale en --theme life_path
"""

import argparse
import ast
from pathlib import Path


def build_prompt(locale: str, theme: str) -> str:
    presets_path = Path(__file__).resolve().parents[1] / "model" / "fusion_generate.py"
    text = presets_path.read_text(encoding="utf-8")
    tree = ast.parse(text)
    presets = {}
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "PRESETS":
                    presets = ast.literal_eval(node.value)
                    break
        if presets:
            break
    PRESETS = presets

    # Minimal reimplementation of the prompt assembly (no LLM call).
    preset_text = PRESETS.get(theme, PRESETS["life_path"])

    LANGUAGE_INSTRUCTIONS = {
        "ko": "한국어 전체 응답",
        "ja": "日本語で全て回答",
        "zh": "中文回答",
        "es": "Responde completamente en español",
        "fr": "Réponds en français",
        "de": "Antwort auf Deutsch",
        "pt": "Responda totalmente em português",
        "ru": "Отвечай полностью на русском",
        "ar": "أجب بالكامل بالعربية",
        "en": "Respond fully in English",
    }
    locale_instruction = LANGUAGE_INSTRUCTIONS.get(locale, LANGUAGE_INSTRUCTIONS["en"])

    saju_text = "[SAJU sample] ..."
    astro_text = "[ASTRO sample] ..."
    tarot_text = "[TAROT sample] ..."
    graph_context = "[GRAPH CONTEXT] ..."
    realtime_transit_text = ""
    hybrid_context = ""
    dataset_summary = ""
    extra_user = ""
    tarot_block = f"\n\n[TAROT summary]\n{tarot_text}"
    current_date_str = "2025-01-01"

    realtime_block = f"[REALTIME TRANSITS]\n{realtime_transit_text}" if realtime_transit_text else ""
    hybrid_block = f"[HYBRID RAG CONTEXT]\n{hybrid_context}" if hybrid_context else ""

    comprehensive_prompt = "\n".join(
        [
            preset_text,
            "",
            locale_instruction,
            "",
            "ANALYSIS FRAMEWORK",
            "",
            "CONTENT REQUIREMENTS:",
            "1. PERSONALIZATION...",
            "2. SPECIFICITY...",
            "3. DEPTH...",
            "4. STRUCTURE...",
            "5. LENGTH: 800-1200 words",
            "",
            "CURRENT DATE & TIME CONTEXT",
            current_date_str,
            "",
            "SOURCE MATERIALS",
            "[SAJU]",
            saju_text,
            "",
            "[ASTRO]",
            astro_text,
            "",
            realtime_block,
            "[KNOWLEDGE GRAPH]",
            graph_context,
            "",
            hybrid_block,
            tarot_block,
            dataset_summary,
            extra_user,
        ]
    )
    return comprehensive_prompt.strip()


def main():
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", default="en")
    parser.add_argument("--theme", default="life_path")
    args = parser.parse_args()

    prompt = build_prompt(args.locale, args.theme)
    chars = len(prompt)
    tokens_est = int(chars / 4)  # rough heuristic
    print(f"Locale={args.locale} theme={args.theme}")
    print(f"Chars: {chars}, Tokens~: {tokens_est}")
    print("---- Preview ----")
    print(prompt[:1200] + ("..." if len(prompt) > 1200 else ""))


if __name__ == "__main__":
    main()
