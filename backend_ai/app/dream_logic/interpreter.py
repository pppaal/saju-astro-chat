# backend_ai/app/dream_logic/interpreter.py
"""
Main dream interpretation function with parallel processing.
Contains the core interpret_dream() function.
"""

import os
import traceback
import time
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any

try:
    from backend_ai.app.redis_cache import get_cache
    from backend_ai.app.dream import get_dream_rule_engine
    from backend_ai.app.sanitizer import sanitize_dream_text, is_suspicious_input
except ImportError:
    from backend_ai.app.redis_cache import get_cache
    from backend_ai.app.dream import get_dream_rule_engine
    from backend_ai.app.sanitizer import sanitize_dream_text, is_suspicious_input

from .prompt_builder import build_dream_prompt
from .utils import (
    merge_unique,
    get_fallback_interpretations,
    create_cache_key,
    build_system_instruction,
    parse_json_response,
)

# Lazy imports to avoid loading SentenceTransformer on module load
_dream_embed_rag = None
_fusion_generate_module = None


def _get_dream_embed_rag():
    """Lazy wrapper for dream_embeddings.get_dream_embed_rag."""
    global _dream_embed_rag
    if _dream_embed_rag is None:
        try:
            from backend_ai.app.dream_embeddings import get_dream_embed_rag as _get_rag
        except ImportError:
            from backend_ai.app.dream_embeddings import get_dream_embed_rag as _get_rag
        _dream_embed_rag = _get_rag()
    return _dream_embed_rag


def _get_fusion_generate():
    """Lazy load fusion_generate module."""
    global _fusion_generate_module
    if _fusion_generate_module is None:
        try:
            from backend_ai.model import fusion_generate as _fg
        except ImportError:
            from model import fusion_generate as _fg
        _fusion_generate_module = _fg
    return _fusion_generate_module


def _generate_with_gpt4(*args, **kwargs):
    """Lazy wrapper for _generate_with_gpt4."""
    return _get_fusion_generate()._generate_with_gpt4(*args, **kwargs)


def _refine_with_gpt5mini(*args, **kwargs):
    """Lazy wrapper for refine_with_gpt5mini."""
    return _get_fusion_generate().refine_with_gpt5mini(*args, **kwargs)


def _run_parallel_tasks(facts: dict, dream_text: str, locale: str) -> Dict[str, Any]:
    """Run heavy operations concurrently using ThreadPoolExecutor."""
    rule_engine = get_dream_rule_engine()

    def task_keyword_matches():
        return rule_engine.evaluate(facts)

    def task_celestial_context():
        return rule_engine.get_celestial_context(locale)

    def task_embed_search():
        try:
            embed_rag = _get_dream_embed_rag()
            return embed_rag.get_interpretation_context(dream_text, top_k=8)
        except Exception as e:
            print(f"[interpret_dream] Embedding search failed: {e}")
            return {'texts': [], 'korean_notes': [], 'categories': [], 'specifics': [], 'advice': []}

    def task_premium_features():
        symbols = facts.get("symbols", [])
        themes = facts.get("themes", [])
        return {
            'combinations': rule_engine.detect_combinations(dream_text, symbols),
            'taemong': rule_engine.detect_taemong(dream_text, symbols, themes),
            'lucky_numbers': rule_engine.generate_lucky_numbers(dream_text, symbols)
        }

    # Initialize results
    keyword_matches = {}
    celestial_context = None
    embed_matches = {'texts': [], 'korean_notes': [], 'categories': [], 'specifics': [], 'advice': []}
    premium_results = {}

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(task_keyword_matches): 'keyword',
            executor.submit(task_celestial_context): 'celestial',
            executor.submit(task_embed_search): 'embed',
            executor.submit(task_premium_features): 'premium'
        }

        for future in as_completed(futures):
            task_name = futures[future]
            try:
                result = future.result(timeout=10)
                if task_name == 'keyword':
                    keyword_matches = result
                elif task_name == 'celestial':
                    celestial_context = result
                elif task_name == 'embed':
                    embed_matches = result
                elif task_name == 'premium':
                    premium_results = result
            except Exception as e:
                print(f"[interpret_dream] Task {task_name} failed: {e}")

    return {
        'keyword_matches': keyword_matches,
        'celestial_context': celestial_context,
        'embed_matches': embed_matches,
        'premium_results': premium_results,
    }


def _merge_results(keyword_matches: dict, embed_matches: dict, premium_results: dict, facts: dict) -> dict:
    """Merge results from keyword and embedding searches."""
    merged_texts = merge_unique(
        keyword_matches.get('texts', []),
        embed_matches.get('texts', [])
    )[:15]
    merged_korean = merge_unique(
        keyword_matches.get('korean_notes', []),
        embed_matches.get('korean_notes', [])
    )[:5]
    merged_specifics = merge_unique(
        keyword_matches.get('specifics', []),
        embed_matches.get('specifics', [])
    )[:10]
    merged_categories = list(set(
        keyword_matches.get('categories', []) + embed_matches.get('categories', [])
    ))
    merged_advice = embed_matches.get('advice', [])[:3]

    # FALLBACK: If no matches found, add universal dream interpretation guidelines
    if not merged_texts:
        print("[interpret_dream] No rule matches found, using fallback interpretations")
        dream_text = facts.get("dream", "")
        locale = facts.get("locale", "en")
        merged_texts = get_fallback_interpretations(dream_text, locale)
        merged_korean = ["꿈은 무의식의 메시지입니다. 꿈에서 느낀 감정과 상황을 되돌아보세요."]
        merged_categories = ["general", "personal_reflection"]
        merged_advice = [
            "꿈 일기를 작성하여 패턴을 찾아보세요",
            "꿈에서 느낀 감정이 현실의 어떤 상황과 연결되는지 생각해보세요"
        ]

    matched_rules = {
        'texts': merged_texts,
        'korean_notes': merged_korean,
        'specifics': merged_specifics,
        'categories': merged_categories,
        'sources': list(set(keyword_matches.get('sources', []) + embed_matches.get('sources', []))),
        'advice': merged_advice,
        'match_quality': embed_matches.get('match_quality', 'keyword_only')
    }

    # Add premium feature context
    detected_combinations = premium_results.get('combinations', [])
    taemong_result = premium_results.get('taemong')
    lucky_numbers_result = premium_results.get('lucky_numbers')

    if detected_combinations:
        combo_texts = [f"심볼 조합 '{c['combination']}': {c['interpretation']}" for c in detected_combinations[:3]]
        matched_rules['combination_insights'] = combo_texts
    if taemong_result and taemong_result.get('primary_symbol'):
        primary = taemong_result['primary_symbol']
        matched_rules['taemong_insight'] = f"태몽 분석: {primary['symbol']} - {primary['interpretation']}"
    if lucky_numbers_result:
        matched_rules['lucky_numbers_context'] = f"행운의 숫자 분석: {lucky_numbers_result.get('element_analysis', '')}"

    # Add saju influence if provided
    saju_influence = facts.get('sajuInfluence')
    if saju_influence:
        matched_rules['saju_influence'] = saju_influence

    return matched_rules, detected_combinations, taemong_result, lucky_numbers_result


def _polish_result(result: dict, locale: str) -> dict:
    """Polish result with GPT-4o-mini."""
    try:
        if result.get('summary'):
            print(f"[interpret_dream] Step2: GPT-4o-mini polishing summary...")
            polished_summary = _refine_with_gpt5mini(result['summary'], 'dream', locale)
            result['summary'] = polished_summary

        # Polish crossInsights if present
        if result.get('crossInsights') and isinstance(result['crossInsights'], list):
            polished_insights = []
            for insight in result['crossInsights'][:3]:
                if insight and len(insight) > 20:
                    polished = _refine_with_gpt5mini(insight, 'dream', locale)
                    polished_insights.append(polished)
                else:
                    polished_insights.append(insight)
            polished_insights.extend(result['crossInsights'][3:])
            result['crossInsights'] = polished_insights

        print(f"[interpret_dream] GPT-4o-mini polishing completed")
    except Exception as polish_err:
        print(f"[interpret_dream] GPT polish failed, using original: {polish_err}")

    return result


def interpret_dream(facts: dict) -> dict:
    """
    Main dream interpretation function.

    facts: {
        "dream": "dream text",
        "symbols": ["snake", "water"],
        "emotions": ["fear", "curiosity"],
        "themes": ["예지몽"],
        "context": ["새벽 꿈"],
        "locale": "ko",
        "cultural": {
            "koreanTypes": [...],
            "koreanLucky": [...],
            ...
        },
        "birth": {...} optional
    }
    """
    load_dotenv()

    try:
        # Check cache first
        cache = get_cache()
        cache_key = create_cache_key(facts)
        cached_result = cache.get("dream", {"key": cache_key})

        if cached_result:
            print(f"[interpret_dream] Cache HIT for key: {cache_key}")
            cached_result["cached"] = True
            return cached_result

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is missing")

        locale = facts.get("locale", "en")
        raw_dream = facts.get("dream", "")
        dream_text = sanitize_dream_text(raw_dream, max_length=2000)

        # Log suspicious inputs for security monitoring
        if is_suspicious_input(raw_dream):
            import logging
            logging.getLogger("backend_ai.security").warning(
                "[Security] Suspicious input detected in dream request"
            )

        symbols = facts.get("symbols", [])
        emotions = facts.get("emotions", [])
        themes = facts.get("themes", [])
        context = facts.get("context", [])
        cultural = {
            "koreanTypes": facts.get("koreanTypes", []),
            "koreanLucky": facts.get("koreanLucky", []),
            "chinese": facts.get("chinese", []),
            "islamicTypes": facts.get("islamicTypes", []),
            "islamicBlessed": facts.get("islamicBlessed", []),
            "western": facts.get("western", []),
            "hindu": facts.get("hindu", []),
            "nativeAmerican": facts.get("nativeAmerican", []),
            "japanese": facts.get("japanese", []),
        }

        # Run parallel tasks
        parallel_start = time.time()
        parallel_results = _run_parallel_tasks(facts, dream_text, locale)
        parallel_elapsed = time.time() - parallel_start
        print(f"[interpret_dream] Parallel tasks completed in {parallel_elapsed:.2f}s")

        # Extract results
        keyword_matches = parallel_results['keyword_matches']
        celestial_context = parallel_results['celestial_context']
        embed_matches = parallel_results['embed_matches']
        premium_results = parallel_results['premium_results']

        # Log results
        if celestial_context:
            print(f"[interpret_dream] Celestial context: Moon={celestial_context.get('moon_phase', {}).get('name', 'N/A')}, "
                  f"Sign={celestial_context.get('moon_sign', {}).get('sign', 'N/A')}, "
                  f"Retrogrades={len(celestial_context.get('retrogrades', []))}")

        detected_combinations = premium_results.get('combinations', [])
        taemong_result = premium_results.get('taemong')
        lucky_numbers_result = premium_results.get('lucky_numbers')

        if detected_combinations:
            print(f"[interpret_dream] Detected {len(detected_combinations)} symbol combinations")
        if taemong_result:
            print("[interpret_dream] Taemong detected: primary_symbol found")
        if lucky_numbers_result:
            print(f"[interpret_dream] Generated lucky numbers: {lucky_numbers_result.get('numbers', [])}")

        print(f"[interpret_dream] Embedding search found {len(embed_matches.get('texts', []))} matches "
              f"(quality: {embed_matches.get('match_quality', 'unknown')})")

        # Merge results
        matched_rules, detected_combinations, taemong_result, lucky_numbers_result = _merge_results(
            keyword_matches, embed_matches, premium_results, facts
        )

        saju_influence = facts.get('sajuInfluence')
        if saju_influence:
            print(f"[interpret_dream] Saju influence: DayMaster={saju_influence.get('dayMaster', {}).get('stem', 'N/A')}, "
                  f"Daeun={saju_influence.get('currentDaeun', {}).get('stem', 'N/A') if saju_influence.get('currentDaeun') else 'N/A'}")

        # Build prompt
        prompt = build_dream_prompt(
            dream_text=dream_text,
            symbols=symbols,
            emotions=emotions,
            themes=themes,
            context=context,
            cultural=cultural,
            matched_rules=matched_rules,
            locale=locale,
            celestial_context=celestial_context
        )

        # Call LLM
        system_instruction = build_system_instruction()
        full_prompt = f"[SYSTEM]\n{system_instruction}\n\n[USER]\n{prompt}"
        response_text = _generate_with_gpt4(full_prompt, max_tokens=4000, temperature=0.6, use_mini=True)

        # Parse response
        result = parse_json_response(response_text)

        # Polish with GPT-4o-mini
        result = _polish_result(result, locale)

        # Enhance luckyElements with generated numbers
        if lucky_numbers_result and lucky_numbers_result.get('numbers'):
            if 'luckyElements' not in result:
                result['luckyElements'] = {}
            result['luckyElements']['luckyNumbers'] = lucky_numbers_result['numbers']
            result['luckyElements']['matchedSymbols'] = lucky_numbers_result.get('matched_symbols', [])
            result['luckyElements']['elementAnalysis'] = lucky_numbers_result.get('element_analysis')
            result['luckyElements']['confidence'] = lucky_numbers_result.get('confidence', 0)
            if result['luckyElements'].get('isLucky') is None:
                result['luckyElements']['isLucky'] = True

        final_result = {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "locale": locale,
            "matched_rules": matched_rules,
            "cached": False,
            "premium_features": {
                "combinations": detected_combinations if detected_combinations else None,
                "taemong": taemong_result if taemong_result else None,
                "lucky_numbers": lucky_numbers_result if lucky_numbers_result else None
            },
            "celestial": celestial_context,
            "saju_influence": saju_influence,
            **result
        }

        # Cache the result
        try:
            cache.set("dream", {"key": cache_key}, final_result)
            print(f"[interpret_dream] Cached result for key: {cache_key}")
        except Exception as cache_err:
            print(f"[interpret_dream] Cache SET failed: {cache_err}")

        return final_result

    except Exception as e:
        print(f"[interpret_dream] Error: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc()
        }
