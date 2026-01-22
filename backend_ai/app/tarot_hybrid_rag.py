# backend_ai/app/tarot_hybrid_rag.py
"""
Tarot Hybrid RAG System (Premium YouTube-Level)
================================================
This module has been refactored. All classes are now in backend_ai/app/tarot/

Backwards Compatibility:
- TarotPromptBuilder: from backend_ai.app.tarot.prompts import TarotPromptBuilder
- TarotHybridRAG: from backend_ai.app.tarot.hybrid_rag import TarotHybridRAG
- get_tarot_hybrid_rag: from backend_ai.app.tarot import get_tarot_hybrid_rag

New Module Structure:
- tarot/prompts/: Prompt templates and builder
- tarot/llm/: LLM client and streaming
- tarot/context/: Context builders for readings
- tarot/hybrid_rag.py: Main TarotHybridRAG class
"""

# Re-export everything for backwards compatibility
try:
    from backend_ai.app.tarot import (
        # Prompts
        TarotPromptBuilder,
        SYSTEM_PROMPT,
        # LLM
        TarotLLMClient,
        get_tarot_llm_client,
        stream_tarot_response,
        # Context
        ReadingContextBuilder,
        PremiumContextBuilder,
        # Main class
        TarotHybridRAG,
        get_tarot_hybrid_rag,
        # Loaders (also needed by this module historically)
        AdvancedRulesLoader,
        get_rules_loader,
        SpreadLoader,
        get_spread_loader,
    )
except ImportError:
    from backend_ai.app.tarot import (
        # Prompts
        TarotPromptBuilder,
        SYSTEM_PROMPT,
        # LLM
        TarotLLMClient,
        get_tarot_llm_client,
        stream_tarot_response,
        # Context
        ReadingContextBuilder,
        PremiumContextBuilder,
        # Main class
        TarotHybridRAG,
        get_tarot_hybrid_rag,
        # Loaders (also needed by this module historically)
        AdvancedRulesLoader,
        get_rules_loader,
        SpreadLoader,
        get_spread_loader,
    )

__all__ = [
    "TarotPromptBuilder",
    "SYSTEM_PROMPT",
    "TarotLLMClient",
    "get_tarot_llm_client",
    "stream_tarot_response",
    "ReadingContextBuilder",
    "PremiumContextBuilder",
    "TarotHybridRAG",
    "get_tarot_hybrid_rag",
    "AdvancedRulesLoader",
    "get_rules_loader",
    "SpreadLoader",
    "get_spread_loader",
]


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("[TAROT HYBRID RAG TEST]")
    print("=" * 70)

    hybrid_rag = get_tarot_hybrid_rag()

    # Test available themes
    print("\n[Available Themes]")
    themes = hybrid_rag.get_available_themes()
    for t in themes:
        print(f"  - {t}")

    # Test sub-topics
    if 'love' in themes:
        print("\n[Love Sub-Topics]")
        sub_topics = hybrid_rag.get_sub_topics('love')
        for st in sub_topics[:5]:
            print(f"  - {st['id']}: {st['korean']} ({st['card_count']} cards)")

    # Test spread info
    print("\n[Spread Info: love/secret_admirer]")
    spread = hybrid_rag.get_spread_info('love', 'secret_admirer')
    if spread:
        print(f"  Name: {spread.get('spread_name')}")
        print(f"  Cards: {spread.get('card_count')}")
        print(f"  Positions: {len(spread.get('positions', []))}")

    # Test context generation
    print("\n[Reading Context]")
    test_cards = [
        {"name": "The Fool", "isReversed": False},
        {"name": "The Lovers", "isReversed": True},
        {"name": "The Star", "isReversed": False}
    ]
    context = hybrid_rag.get_reading_context('love', 'crush', test_cards)
    if context:
        print(f"  Theme: {context.get('theme')}")
        print(f"  Topic: {context.get('topic_title')}")
        print(f"  Cards: {len(context.get('card_interpretations', []))}")

    # Test reading generation (if API key available)
    if hybrid_rag.client:
        print("\n[Generating Reading...]")
        reading = hybrid_rag.generate_reading(
            theme='love',
            sub_topic='crush',
            drawn_cards=test_cards[:3],
            question="그 사람이 나를 좋아할까요?"
        )
        print(reading[:500] + "..." if len(reading) > 500 else reading)
    else:
        print("\n[Skipping generation - No API key]")

    print("\n" + "=" * 70)
    print("[TEST COMPLETE]")
    print("=" * 70)
