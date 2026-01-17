# backend_ai/app/dream_logic.py

import os
import json
import traceback
import hashlib
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

try:
    from backend_ai.app.rule_engine import RuleEngine
    from backend_ai.app.redis_cache import get_cache
    from backend_ai.app.dream import DreamRuleEngine, get_dream_rule_engine
except ImportError:
    from app.rule_engine import RuleEngine
    from app.redis_cache import get_cache
    from app.dream import DreamRuleEngine, get_dream_rule_engine

# Lazy import dream_embeddings to avoid loading SentenceTransformer on module load
# This prevents OOM on Railway free tier (512MB limit)
_dream_embed_rag = None

def get_dream_embed_rag():
    """Lazy wrapper for dream_embeddings.get_dream_embed_rag."""
    global _dream_embed_rag
    if _dream_embed_rag is None:
        try:
            from backend_ai.app.dream_embeddings import get_dream_embed_rag as _get_rag
        except ImportError:
            from app.dream_embeddings import get_dream_embed_rag as _get_rag
        _dream_embed_rag = _get_rag()
    return _dream_embed_rag

# Lazy import to avoid loading SentenceTransformer on module load
# This prevents OOM on Railway free tier (512MB limit)
_fusion_generate_module = None

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

def refine_with_gpt5mini(*args, **kwargs):
    """Lazy wrapper for refine_with_gpt5mini."""
    return _get_fusion_generate().refine_with_gpt5mini(*args, **kwargs)

try:
    from backend_ai.app.realtime_astro import get_current_transits
    from backend_ai.app.sanitizer import sanitize_dream_text, is_suspicious_input
except ImportError:
    from app.realtime_astro import get_current_transits
    from app.sanitizer import sanitize_dream_text, is_suspicious_input


# ===============================================================
# DREAM INTERPRETATION PROMPT BUILDER
# ===============================================================
def build_dream_prompt(
    dream_text: str,
    symbols: list,
    emotions: list,
    themes: list,
    context: list,
    cultural: dict,
    matched_rules: dict,
    locale: str = "en",
    celestial_context: dict = None
) -> str:
    """Build comprehensive dream interpretation prompt."""

    lang_instruction = {
        "ko": "Please respond entirely in Korean (한국어로 답변해주세요).",
        "en": "Please respond in English.",
        "ja": "日本語で回答してください。",
        "zh": "请用中文回答。",
        "es": "Por favor responde en español.",
        "fr": "Veuillez répondre en français.",
        "ru": "Пожалуйста, отвечайте на русском языке.",
        "ar": "يرجى الرد باللغة العربية."
    }.get(locale, "Please respond in English.")

    prompt = f"""You are an expert dream interpreter with deep knowledge of multiple cultural traditions including:
- Korean dream interpretation (한국 해몽) including 길몽/흉몽, 태몽, and lottery dreams
- Chinese dream symbolism (周公解梦)
- Islamic dream interpretation (تفسير الأحلام)
- Jungian/Western psychology and archetypes
- Hindu dream traditions
- Japanese dream interpretation (夢占い)
- Native American dream wisdom

{lang_instruction}

## Dream Description
{dream_text}

## Selected Symbols
{', '.join(symbols) if symbols else 'None specified'}

## Emotions Felt
{', '.join(emotions) if emotions else 'None specified'}

## Dream Type/Themes
{', '.join(themes) if themes else 'None specified'}

## Dream Context
{', '.join(context) if context else 'None specified'}

## Cultural Symbols Selected
"""

    # Add cultural symbols
    cultural_parts = []
    if cultural.get('koreanTypes'):
        cultural_parts.append(f"Korean Types: {', '.join(cultural['koreanTypes'])}")
    if cultural.get('koreanLucky'):
        cultural_parts.append(f"Korean Lucky: {', '.join(cultural['koreanLucky'])}")
    if cultural.get('chinese'):
        cultural_parts.append(f"Chinese: {', '.join(cultural['chinese'])}")
    if cultural.get('islamicTypes'):
        cultural_parts.append(f"Islamic Types: {', '.join(cultural['islamicTypes'])}")
    if cultural.get('islamicBlessed'):
        cultural_parts.append(f"Islamic Blessed: {', '.join(cultural['islamicBlessed'])}")
    if cultural.get('western'):
        cultural_parts.append(f"Western/Jungian: {', '.join(cultural['western'])}")
    if cultural.get('hindu'):
        cultural_parts.append(f"Hindu: {', '.join(cultural['hindu'])}")
    if cultural.get('nativeAmerican'):
        cultural_parts.append(f"Native American: {', '.join(cultural['nativeAmerican'])}")
    if cultural.get('japanese'):
        cultural_parts.append(f"Japanese: {', '.join(cultural['japanese'])}")

    prompt += '\n'.join(cultural_parts) if cultural_parts else 'None specified'

    # Add saju influence if available
    saju_influence = matched_rules.get('saju_influence')
    if saju_influence:
        prompt += f"""

## Current Saju Fortune Influence (사주 운세 영향)
IMPORTANT: Use this to explain WHY the dreamer is having this type of dream at this time.
"""
        day_master = saju_influence.get('dayMaster', {})
        if day_master:
            prompt += f"""
[Day Master - 일간]
{day_master.get('stem', '')} ({day_master.get('element', '')} {day_master.get('yin_yang', '')})
- The dreamer's core energy/personality type
"""

        current_daeun = saju_influence.get('currentDaeun')
        if current_daeun:
            prompt += f"""
[Current Daeun - 현재 대운] (10-year cycle)
{current_daeun.get('stem', '')} {current_daeun.get('branch', '')} ({current_daeun.get('element', '')})
Starting Year: {current_daeun.get('startYear', '')}
- This major life phase influences subconscious themes
"""

        current_saeun = saju_influence.get('currentSaeun')
        if current_saeun:
            prompt += f"""
[Current Saeun - 올해 세운] (Annual fortune)
{current_saeun.get('stem', '')} {current_saeun.get('branch', '')} (Year {current_saeun.get('year', '')})
- This year's energy affects dream themes and symbols
"""

        current_wolun = saju_influence.get('currentWolun')
        if current_wolun:
            prompt += f"""
[Current Wolun - 이번달 월운] (Monthly fortune)
{current_wolun.get('stem', '')} {current_wolun.get('branch', '')} (Month {current_wolun.get('month', '')})
- This month's energy creates immediate dream influences
"""

        today_iljin = saju_influence.get('todayIljin')
        if today_iljin:
            sibsin = today_iljin.get('sibsin', {})
            is_gwiin = today_iljin.get('isCheoneulGwiin', False)
            prompt += f"""
[Today's Iljin - 오늘의 일진] (Daily fortune)
{today_iljin.get('stem', '')} {today_iljin.get('branch', '')}
천간십신: {sibsin.get('cheon', '')} / 지지십신: {sibsin.get('ji', '')}
천을귀인일: {'예 (특별한 길일)' if is_gwiin else '아니오'}
- Today's energy directly influences last night's dream content
- The relationship between today's pillars and the dreamer's day master reveals dream meaning
"""

        prompt += """
ANALYZE: Based on the current saju fortune (대운, 세운, 월운, 일진), explain:
1. Why the dreamer might be experiencing these specific dream themes NOW
2. How the current energy cycle relates to the dream symbols
3. What the dream might be revealing about this life phase
"""

    # Add celestial context if available
    if celestial_context:
        moon = celestial_context.get('moon_phase', {})
        moon_sign_info = celestial_context.get('moon_sign', {})
        retrogrades = celestial_context.get('retrogrades', [])
        aspects = celestial_context.get('significant_aspects', [])

        prompt += f"""

## Current Celestial Configuration (현재 천체 배치)
"""
        if moon:
            prompt += f"""
[Moon Phase - 달의 위상]
{moon.get('emoji', '')} {moon.get('korean', moon.get('name', ''))} (밝기 {moon.get('illumination', 0)}%)
Dream Quality: {moon.get('dream_quality', '')}
"""
            if moon.get('dream_meaning'):
                prompt += f"Meaning: {moon.get('dream_meaning')}\n"
            if moon.get('favorable_symbols'):
                prompt += f"Favorable Symbols: {', '.join(moon.get('favorable_symbols', []))}\n"
            if moon.get('enhanced_themes'):
                prompt += f"Enhanced Themes: {', '.join(moon.get('enhanced_themes', []))}\n"
            if moon.get('advice'):
                prompt += f"Moon Phase Advice: {moon.get('advice')}\n"

        if moon_sign_info and moon_sign_info.get('sign'):
            prompt += f"""
[Moon Sign - 달의 별자리]
{moon_sign_info.get('korean', '')} ({moon_sign_info.get('sign', '')})
Dream Flavor: {moon_sign_info.get('dream_flavor', '')}
"""
            if moon_sign_info.get('enhanced_symbols'):
                prompt += f"Enhanced Symbols: {', '.join(moon_sign_info.get('enhanced_symbols', []))}\n"

        if retrogrades:
            prompt += "\n[Retrograde Planets - 역행 행성]\n"
            for retro in retrogrades:
                prompt += f"- {retro.get('korean', retro.get('planet', ''))} {retro.get('emoji', '')}\n"
                if retro.get('themes'):
                    prompt += f"  Themes: {', '.join(retro.get('themes', []))}\n"
                if retro.get('interpretation'):
                    prompt += f"  Effect: {retro.get('interpretation')}\n"

        if aspects:
            prompt += "\n[Significant Planetary Aspects - 주요 행성 배치]\n"
            for asp in aspects:
                prompt += f"- {asp.get('aspect', '')}\n"
                if asp.get('themes'):
                    prompt += f"  Themes: {', '.join(asp.get('themes', []))}\n"
                if asp.get('special_note'):
                    prompt += f"  Note: {asp.get('special_note')}\n"

        prompt += """
IMPORTANT: Factor the current celestial configuration into your dream interpretation.
Moon phase affects dream intensity and themes. Retrograde periods influence dream content.
"""

    # Add matched rules context
    if matched_rules:
        prompt += f"""

## Relevant Interpretations from Knowledge Base
{chr(10).join(['- ' + rule for rule in matched_rules.get('texts', [])[:10]])}
"""

    # Add Korean-specific notes if available
    korean_notes = matched_rules.get('korean_notes', [])
    if korean_notes:
        prompt += f"""
## Korean Traditional Interpretation (한국 해몽)
{chr(10).join(['- ' + note for note in korean_notes[:5]])}
"""

    # Add specific context matches
    specifics = matched_rules.get('specifics', [])
    if specifics:
        prompt += f"""
## Specific Dream Contexts Found
{chr(10).join(['- ' + s for s in specifics[:8]])}
"""

    # Add categories detected
    categories = matched_rules.get('categories', [])
    if categories:
        prompt += f"""
## Dream Categories Detected: {', '.join(categories)}
"""

    # Add advice from matched rules
    advice = matched_rules.get('advice', [])
    if advice:
        prompt += f"""
## Recommended Advice from Knowledge Base
{chr(10).join(['- ' + a for a in advice[:3]])}
"""

    # Add premium feature context
    combo_insights = matched_rules.get('combination_insights', [])
    if combo_insights:
        prompt += f"""
## Symbol Combination Analysis (심볼 조합 분석)
{chr(10).join(['- ' + c for c in combo_insights])}
Important: These symbol combinations have special significance in dream interpretation.
"""

    taemong_insight = matched_rules.get('taemong_insight')
    if taemong_insight:
        prompt += f"""
## Conception Dream Analysis (태몽 분석)
{taemong_insight}
Note: This dream may be a 태몽 (conception dream). Consider discussing:
- Predicted traits for the child
- Gender hints from traditional interpretation
- Auspiciousness of this taemong symbol
"""

    lucky_context = matched_rules.get('lucky_numbers_context')
    if lucky_context:
        prompt += f"""
## Lucky Numbers Context
{lucky_context}
Note: Include specific lucky numbers in your luckyElements response based on the symbols.
"""

    prompt += """

## Response Format
Provide your interpretation as a JSON object with this exact structure:
```json
{
  "summary": "⚠️ CRITICAL: This must be 7-10 FULL sentences (minimum 400 characters in Korean, 300 in English). Write a comprehensive, detailed interpretation that deeply analyzes the dream's meaning. Start with the overall message, then explore the emotional undercurrents, connect it to the dreamer's life situation, explain how the symbols work together, discuss what the subconscious is trying to communicate, and provide psychological insights. Be warm, insightful, and specific - not generic. Make it feel like a conversation with a wise counselor who truly understands the dreamer. SHORT RESPONSES ARE NOT ACCEPTABLE.",
  "dreamSymbols": [
    {
      "label": "symbol name",
      "meaning": "A detailed 2-3 sentence interpretation combining multiple traditions. Explain not just what the symbol means, but WHY it appeared and what message it carries for the dreamer.",
      "interpretations": {
        "jung": "Jungian psychological interpretation (1-2 sentences): archetype, shadow, anima/animus, or collective unconscious perspective",
        "stoic": "Stoic philosophical interpretation (1-2 sentences): virtue, wisdom, acceptance, or living in harmony with nature",
        "tarot": "Tarot symbolism interpretation (1-2 sentences): related card meanings, spiritual journey, or life lessons"
      }
    }
  ],
  "themes": [
    {"label": "theme name", "weight": 0.0-1.0}
  ],
  "astrology": {
    "highlights": ["relevant astrological/energetic insights"],
    "sun": "if birth data provided",
    "moon": "emotional/lunar influences",
    "asc": "outer expression"
  },
  "sajuAnalysis": {
    "whyNow": "Explain why the dreamer is having this dream at this specific time based on their current saju fortune (대운/세운/월운/일진)",
    "fortuneConnection": "How the current fortune cycle relates to the dream themes",
    "lifePhaseInsight": "What this dream reveals about their current life phase",
    "dailyInfluence": "How today's Iljin (일진) specifically influenced this dream - include the sibsin relationship"
  },
  "cosmicInfluence": {
    "moonPhaseEffect": "How the current moon phase affected this dream",
    "planetaryInfluence": "Any retrograde or aspect effects on dream content",
    "overallEnergy": "Summary of celestial energies at play"
  },
  "crossInsights": [
    "unique insights from combining Eastern and Western perspectives"
  ],
  "recommendations": [
    {
      "title": "Short action title (2-4 words)",
      "detail": "A warm, encouraging 2-3 sentence explanation of this advice. Explain WHY this action will help and HOW to practically implement it in daily life. Be specific and actionable."
    }
  ],
  "culturalNotes": {
    "korean": "specific Korean interpretation if applicable",
    "chinese": "specific Chinese interpretation if applicable",
    "islamic": "specific Islamic interpretation if applicable",
    "western": "Jungian/Western interpretation if applicable"
  },
  "luckyElements": {
    "isLucky": true/false,
    "luckyNumbers": [numbers if lottery dream],
    "luckyColors": ["colors"],
    "advice": "specific luck-related advice"
  }
}
```

IMPORTANT GUIDELINES:
1. Write with warmth and empathy - like a trusted counselor having a heartfelt conversation
2. Be SPECIFIC to this dream - avoid generic or templated responses
3. ⚠️ CRITICAL - SUMMARY LENGTH: The summary MUST be 7-10 full sentences (minimum 400 characters for Korean, 300 for English). Do NOT write a brief 1-2 sentence summary. Users are paying for detailed analysis.
4. Each symbol meaning should be 2-3 sentences explaining the deeper significance
5. Recommendations should have both a title AND detailed explanation (2-3 sentences each)
6. Provide at least 3-4 meaningful recommendations
7. If saju fortune data is provided, make sure to explain WHY this dream occurred NOW based on the current fortune cycle
8. Connect the dream to the dreamer's potential life situations and emotional state
9. crossInsights should have at least 3-4 unique insights combining Eastern and Western perspectives
10. ⚠️ VALIDATION: Before finalizing, check that your summary is at least 400 characters. If shorter, expand it with more insights.
"""
    return prompt


# ===============================================================
# MAIN INTERPRETER
# ===============================================================
def _merge_unique(list1: list, list2: list) -> list:
    """Merge two lists preserving order, removing duplicates"""
    seen = set()
    result = []
    for item in list1 + list2:
        # Use first 100 chars as key to avoid near-duplicates
        key = item[:100] if isinstance(item, str) else str(item)[:100]
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


def _get_fallback_interpretations(dream_text: str, locale: str = "en") -> list:
    """
    매칭되는 규칙이 없을 때 사용할 범용 해석 가이드라인
    Universal dream interpretation guidelines when no specific rules match
    """
    dream_lower = dream_text.lower()

    # 감정 키워드 감지
    emotion_hints = []
    if any(w in dream_lower for w in ['무섭', '두렵', 'scary', 'fear', 'afraid', '공포']):
        emotion_hints.append("꿈에서 느낀 두려움은 현실에서 회피하고 있는 문제나 불안을 반영할 수 있습니다.")
    if any(w in dream_lower for w in ['행복', '기쁨', 'happy', 'joy', '좋은', 'good']):
        emotion_hints.append("긍정적인 감정의 꿈은 현재 삶에서 만족감이나 희망을 나타냅니다.")
    if any(w in dream_lower for w in ['슬프', '울', 'sad', 'cry', '눈물']):
        emotion_hints.append("슬픔이나 눈물의 꿈은 해소되지 않은 감정이나 상실감을 처리하는 과정일 수 있습니다.")
    if any(w in dream_lower for w in ['화나', '분노', 'angry', 'rage', '짜증']):
        emotion_hints.append("분노의 꿈은 억눌린 좌절감이나 표현하지 못한 감정을 나타낼 수 있습니다.")

    # 상황 키워드 감지
    situation_hints = []
    if any(w in dream_lower for w in ['집', 'house', 'home', '방']):
        situation_hints.append("꿈에서 집은 자아(Self)를 상징합니다. 집의 상태가 현재 심리 상태를 반영합니다.")
    if any(w in dream_lower for w in ['사람', '친구', '가족', 'people', 'friend', 'family']):
        situation_hints.append("꿈에 등장하는 사람들은 그 관계에 대한 무의식적 생각이나 자신의 일부를 투영한 것일 수 있습니다.")
    if any(w in dream_lower for w in ['길', '도로', 'road', 'path', '여행']):
        situation_hints.append("길이나 여행의 꿈은 인생의 방향성과 선택에 대한 고민을 나타낼 수 있습니다.")

    # 기본 해석 가이드라인
    base_interpretations = [
        "꿈은 무의식이 의식에 보내는 메시지입니다. 융(Jung)에 따르면 꿈은 심리적 균형을 위한 보상 기능을 합니다.",
        "꿈의 해석에서 가장 중요한 것은 꿈꾼 사람 자신의 연상입니다. 꿈의 상징이 당신에게 어떤 의미인지 생각해보세요.",
        "반복되는 꿈은 특히 주목할 가치가 있습니다. 무의식이 계속해서 전달하려는 메시지가 있을 수 있습니다."
    ]

    # 한국 전통 해몽 기본
    korean_base = [
        "한국 해몽에서는 꿈을 길몽(좋은 꿈)과 흉몽(나쁜 꿈)으로 나누지만, 표면적 의미와 반대인 경우도 많습니다.",
        "전통 해몽에서 꿈은 미래의 징조로 해석되기도 하며, 특히 새벽꿈이 가장 영험하다고 합니다."
    ]

    return base_interpretations + emotion_hints + situation_hints + korean_base


def _create_cache_key(facts: dict) -> str:
    """Create a cache key from dream facts."""
    # Include only relevant fields for caching
    cache_data = {
        "dream": facts.get("dream", ""),
        "symbols": sorted(facts.get("symbols", [])),
        "emotions": sorted(facts.get("emotions", [])),
        "themes": sorted(facts.get("themes", [])),
        "locale": facts.get("locale", "en"),
    }
    serialized = json.dumps(cache_data, sort_keys=True)
    return f"dream:{hashlib.sha256(serialized.encode()).hexdigest()[:16]}"


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
        cache_key = _create_cache_key(facts)
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

        # =============================================================
        # PARALLEL PROCESSING: Run heavy operations concurrently
        # =============================================================
        parallel_start = time.time()

        # Use singleton rule engine (avoids reloading rules every request)
        rule_engine = get_dream_rule_engine()

        # Define tasks for parallel execution
        def task_keyword_matches():
            return rule_engine.evaluate(facts)

        def task_celestial_context():
            return rule_engine.get_celestial_context(locale)

        def task_embed_search():
            try:
                embed_rag = get_dream_embed_rag()
                return embed_rag.get_interpretation_context(dream_text, top_k=8)
            except Exception as e:
                print(f"[interpret_dream] Embedding search failed: {e}")
                return {'texts': [], 'korean_notes': [], 'categories': [], 'specifics': [], 'advice': []}

        def task_premium_features():
            return {
                'combinations': rule_engine.detect_combinations(dream_text, symbols),
                'taemong': rule_engine.detect_taemong(dream_text, symbols, themes),
                'lucky_numbers': rule_engine.generate_lucky_numbers(dream_text, symbols)
            }

        # Execute all tasks in parallel
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
                    result = future.result(timeout=10)  # 10 second timeout per task
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

        parallel_elapsed = time.time() - parallel_start
        print(f"[interpret_dream] Parallel tasks completed in {parallel_elapsed:.2f}s")

        # Extract premium results
        detected_combinations = premium_results.get('combinations', [])
        taemong_result = premium_results.get('taemong')
        lucky_numbers_result = premium_results.get('lucky_numbers')

        # Log results
        if celestial_context:
            print(f"[interpret_dream] Celestial context: Moon={celestial_context.get('moon_phase', {}).get('name', 'N/A')}, "
                  f"Sign={celestial_context.get('moon_sign', {}).get('sign', 'N/A')}, "
                  f"Retrogrades={len(celestial_context.get('retrogrades', []))}")

        if detected_combinations:
            print(f"[interpret_dream] Detected {len(detected_combinations)} symbol combinations")
        if taemong_result:
            print("[interpret_dream] Taemong detected: primary_symbol found")
        if lucky_numbers_result:
            print(f"[interpret_dream] Generated lucky numbers: {lucky_numbers_result.get('numbers', [])}")

        print(f"[interpret_dream] Embedding search found {len(embed_matches.get('texts', []))} matches (quality: {embed_matches.get('match_quality', 'unknown')})")

        # Merge results (keyword + embedding)
        merged_texts = _merge_unique(keyword_matches.get('texts', []), embed_matches.get('texts', []))[:15]
        merged_korean = _merge_unique(keyword_matches.get('korean_notes', []), embed_matches.get('korean_notes', []))[:5]
        merged_specifics = _merge_unique(keyword_matches.get('specifics', []), embed_matches.get('specifics', []))[:10]
        merged_categories = list(set(keyword_matches.get('categories', []) + embed_matches.get('categories', [])))
        merged_advice = embed_matches.get('advice', [])[:3]

        # FALLBACK: If no matches found, add universal dream interpretation guidelines
        if not merged_texts:
            print("[interpret_dream] No rule matches found, using fallback interpretations")
            merged_texts = _get_fallback_interpretations(dream_text, locale)
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

        # Add premium feature context to matched_rules for LLM prompt
        if detected_combinations:
            combo_texts = [f"심볼 조합 '{c['combination']}': {c['interpretation']}" for c in detected_combinations[:3]]
            matched_rules['combination_insights'] = combo_texts
        if taemong_result and taemong_result.get('primary_symbol'):
            primary = taemong_result['primary_symbol']
            matched_rules['taemong_insight'] = f"태몽 분석: {primary['symbol']} - {primary['interpretation']}"
        if lucky_numbers_result:
            matched_rules['lucky_numbers_context'] = f"행운의 숫자 분석: {lucky_numbers_result.get('element_analysis', '')}"

        # Add saju influence if provided from frontend
        saju_influence = facts.get('sajuInfluence')
        if saju_influence:
            matched_rules['saju_influence'] = saju_influence
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

        # Call LLM using GPT-4o-mini for fast response
        system_instruction = """당신은 꿈 해석 전문가입니다. 반드시 JSON으로만 응답하세요.

🚫 절대 금지:
- "좋은 꿈이에요" "조심하세요" 같은 뜬구름 말
- 일반론적 해석 (모든 꿈에 적용되는 말)
- 데이터 없이 추측

✅ 올바른 답변:
- 위 프롬프트에서 제공된 DATA(사주 운세, 천체 배치, 문화별 상징 등)를 반드시 인용
- 구체적 시기/숫자/색상 언급 (예: "3월", "파란색", "숫자 7")
- "왜 지금 이 꿈을 꾸었는지" 사주/점성 데이터로 설명

예시:
❌ 나쁜 답: "뱀 꿈은 변화를 의미합니다."
✅ 좋은 답: "현재 을해(乙亥) 대운에서 수(水) 기운이 강해 무의식이 활성화되어 뱀 꿈을 꾸셨어요. 특히 오늘 일진이 갑자(甲子)로 목생수(木生水) 관계라 물과 관련된 상징(뱀, 용)이 나타나기 쉬운 날입니다. 달이 전갈자리에 있어 깊은 변환의 에너지가 꿈에 반영되었습니다."

summary는 반드시 7-10문장, 400자 이상으로 작성하세요."""
        full_prompt = f"[SYSTEM]\n{system_instruction}\n\n[USER]\n{prompt}"

        response_text = _generate_with_gpt4(full_prompt, max_tokens=4000, temperature=0.6, use_mini=True)

        # Parse JSON from response
        # Try to extract JSON from markdown code blocks
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()

        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            # If JSON parsing fails, return raw text
            result = {
                "summary": response_text[:500],
                "dreamSymbols": [],
                "themes": [],
                "raw_response": response_text
            }

        # GPT-4o-mini polishing (like destiny-map pattern)
        # Step 2: Polish Llama 3.3 70B draft with GPT-4o-mini
        try:
            if result.get('summary'):
                print(f"[interpret_dream] Step2: GPT-4o-mini polishing summary...")
                polished_summary = refine_with_gpt5mini(result['summary'], 'dream', locale)
                result['summary'] = polished_summary

            # Polish crossInsights if present
            if result.get('crossInsights') and isinstance(result['crossInsights'], list):
                polished_insights = []
                for insight in result['crossInsights'][:3]:  # Limit to first 3 for speed
                    if insight and len(insight) > 20:  # Only polish substantial text
                        polished = refine_with_gpt5mini(insight, 'dream', locale)
                        polished_insights.append(polished)
                    else:
                        polished_insights.append(insight)
                # Add remaining insights without polishing
                polished_insights.extend(result['crossInsights'][3:])
                result['crossInsights'] = polished_insights

            print(f"[interpret_dream] GPT-4o-mini polishing completed")
        except Exception as polish_err:
            print(f"[interpret_dream] GPT polish failed, using original: {polish_err}")
            # Continue with original Llama output if polish fails

        # Enhance luckyElements with generated numbers if available
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
            "saju_influence": saju_influence,  # Include saju influence in response
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
