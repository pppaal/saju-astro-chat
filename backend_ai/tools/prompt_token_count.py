"""
Measure fusion prompt length with a real tokenizer (if available).

Usage:
  python backend_ai/tools/prompt_token_count.py --locale en --theme life_path
"""

import argparse
from pathlib import Path


def get_tokenizer():
    # Prefer tiktoken cl100k (OpenAI GPT-4o/mini family), fallback to GPT2
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        enc.name = "tiktoken-cl100k_base"
        return enc
    except Exception:
        try:
            from transformers import GPT2TokenizerFast
            tok = GPT2TokenizerFast.from_pretrained("gpt2")
            tok.name = "GPT2TokenizerFast"
            return tok
        except Exception:
            return None


def build_prompt(locale: str, theme: str) -> str:
    # Reuse prompt assembly from prompt_length.py
    from backend_ai.tools.prompt_length import build_prompt  # type: ignore
    return build_prompt(locale, theme)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--locale", default="en")
    parser.add_argument("--theme", default="life_path")
    args = parser.parse_args()

    prompt = build_prompt(args.locale, args.theme)
    tokenizer = get_tokenizer()
    if tokenizer:
        tokens = tokenizer.encode(prompt)
        name = getattr(tokenizer, "name", tokenizer.__class__.__name__)
        print(f"Tokenizer: {name} | Tokens: {len(tokens)} | Chars: {len(prompt)}")
    else:
        print(f"No tokenizer available. Fallback chars={len(prompt)}, est_tokens~{len(prompt)//4}")

    preview = prompt[:1200] + ("..." if len(prompt) > 1200 else "")
    print("---- Preview ----")
    try:
        print(preview)
    except UnicodeEncodeError:
        import sys
        sys.stdout.buffer.write(preview.encode("utf-8", "ignore"))


if __name__ == "__main__":
    # Ensure backend_ai is importable
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    main()
