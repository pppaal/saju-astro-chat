"""
Lightweight manual smoke test for the fusion generator.
Requires OPENAI_API_KEY to be set; uses the real LLM and graph search.
"""

import os
import sys

from backend_ai.model.fusion_generate import generate_fusion_report, get_llm


def main() -> int:
    if not os.getenv("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY before running this sample.")
        return 1

    client = get_llm()

    saju_text = "Day Master: strong Wood; favorable Water; balanced Fire."
    astro_text = "Sun in Leo, Moon in Scorpio, Asc Virgo; Mars trine Jupiter."

    result = generate_fusion_report(
        client,
        saju_text=saju_text,
        astro_text=astro_text,
        theme="life_path",
        locale="en",
        user_prompt="Keep it concise and encouraging.",
        fast_mode=True,
    )

    print("\n--- Fusion Result (truncated) ---")
    fusion_text = result.get("fusion_layer") if isinstance(result, dict) else str(result)
    print((fusion_text or "")[:1200])

    graph_ctx = result.get("graph_context") if isinstance(result, dict) else None
    if graph_ctx:
        print("\n--- Graph Context (first 5) ---")
        for node in graph_ctx[:5]:
            print(
                f"{node.get('source','?')} | {node.get('label','?')} "
                f"({node.get('type','?')}): {node.get('description','')}"
            )

    return 0


if __name__ == "__main__":
    sys.exit(main())
