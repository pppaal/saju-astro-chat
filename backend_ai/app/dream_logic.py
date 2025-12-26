# backend_ai/app/dream_logic.py

import os
import json
import traceback
import hashlib
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

from backend_ai.app.rule_engine import RuleEngine
from backend_ai.app.redis_cache import get_cache

# Lazy import dream_embeddings to avoid loading SentenceTransformer on module load
# This prevents OOM on Railway free tier (512MB limit)
_dream_embed_rag = None

def get_dream_embed_rag():
    """Lazy wrapper for dream_embeddings.get_dream_embed_rag."""
    global _dream_embed_rag
    if _dream_embed_rag is None:
        from backend_ai.app.dream_embeddings import get_dream_embed_rag as _get_rag
        _dream_embed_rag = _get_rag()
    return _dream_embed_rag

# Lazy import to avoid loading SentenceTransformer on module load
# This prevents OOM on Railway free tier (512MB limit)
_fusion_generate_module = None

def _get_fusion_generate():
    """Lazy load fusion_generate module."""
    global _fusion_generate_module
    if _fusion_generate_module is None:
        from backend_ai.model import fusion_generate as _fg
        _fusion_generate_module = _fg
    return _fusion_generate_module

def _generate_with_gpt4(*args, **kwargs):
    """Lazy wrapper for _generate_with_gpt4."""
    return _get_fusion_generate()._generate_with_gpt4(*args, **kwargs)

def refine_with_gpt5mini(*args, **kwargs):
    """Lazy wrapper for refine_with_gpt5mini."""
    return _get_fusion_generate().refine_with_gpt5mini(*args, **kwargs)

from backend_ai.app.realtime_astro import get_current_transits
from backend_ai.app.sanitizer import sanitize_dream_text, is_suspicious_input


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
  "summary": "2-3 sentence overview of the dream's core message",
  "dreamSymbols": [
    {"label": "symbol name", "meaning": "interpretation combining multiple traditions"}
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
    "practical action or reflection based on the dream"
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

Be insightful, culturally sensitive, and specific to the dream content. Avoid generic interpretations.
If saju fortune data is provided, make sure to explain WHY this dream occurred NOW based on the current fortune cycle.
"""
    return prompt


# ===============================================================
# DREAM INTERPRETATION ENGINE (Singleton for performance)
# ===============================================================
_dream_rule_engine_instance = None


def get_dream_rule_engine():
    """Get singleton DreamRuleEngine instance for performance."""
    global _dream_rule_engine_instance
    if _dream_rule_engine_instance is None:
        _dream_rule_engine_instance = DreamRuleEngine()
    return _dream_rule_engine_instance


class DreamRuleEngine:
    """Rule engine specifically for dream interpretation."""

    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(__file__))
        rules_dir = os.path.join(base_dir, "data", "graph", "rules", "dream")
        self.rules_dir = rules_dir
        self.rules = {}
        self.advanced_data = {}  # For combinations, taemong, lucky_numbers
        self._load_rules()
        self._load_advanced_data()

    def _load_rules(self):
        if not os.path.exists(self.rules_dir):
            print(f"[DreamRuleEngine] Creating rules directory: {self.rules_dir}")
            os.makedirs(self.rules_dir, exist_ok=True)
            return

        for filename in os.listdir(self.rules_dir):
            if not filename.endswith('.json'):
                continue
            path = os.path.join(self.rules_dir, filename)
            try:
                with open(path, encoding='utf-8') as f:
                    key = os.path.splitext(filename)[0]
                    self.rules[key] = json.load(f)
            except Exception as e:
                print(f"[DreamRuleEngine] Failed to load {filename}: {e}")

        print(f"[DreamRuleEngine] Loaded {len(self.rules)} rule files: {list(self.rules.keys())}")

    def _load_advanced_data(self):
        """Load premium features: combinations, taemong, lucky_numbers."""
        advanced_path = os.path.join(self.rules_dir, "dream_symbols_advanced.json")
        if os.path.exists(advanced_path):
            try:
                with open(advanced_path, encoding='utf-8') as f:
                    data = json.load(f)
                    self.advanced_data = {
                        'combinations': data.get('symbol_combinations', {}).get('combinations', {}),
                        'taemong': data.get('taemong', {}).get('symbols', {}),
                        'lucky_numbers': data.get('lucky_numbers', {}),
                        'categories': data.get('categories', {})
                    }
                    print(f"[DreamRuleEngine] Loaded advanced data: {len(self.advanced_data['combinations'])} combinations, "
                          f"{len(self.advanced_data['taemong'])} taemong symbols, "
                          f"{len(self.advanced_data['lucky_numbers'].get('symbol_mappings', {}))} lucky mappings")
            except Exception as e:
                print(f"[DreamRuleEngine] Failed to load advanced data: {e}")

        # Load astro rules for dream interpretation
        self._load_astro_rules()

    def _load_astro_rules(self):
        """Load celestial/astro rules for dream interpretation."""
        astro_path = os.path.join(self.rules_dir, "dream_astro_rules.json")
        self.astro_rules = {}
        if os.path.exists(astro_path):
            try:
                with open(astro_path, encoding='utf-8') as f:
                    self.astro_rules = json.load(f)
                    print(f"[DreamRuleEngine] Loaded astro rules: "
                          f"{len(self.astro_rules.get('moon_phase_dream_effects', {}))} moon phases, "
                          f"{len(self.astro_rules.get('planet_transit_dream_effects', {}))} transit effects")
            except Exception as e:
                print(f"[DreamRuleEngine] Failed to load astro rules: {e}")

    def get_celestial_context(self, locale: str = "ko") -> dict:
        """Get current celestial context for dream interpretation."""
        try:
            # Get current transits from realtime_astro
            transits = get_current_transits()
            moon_phase = transits.get('moon', {})

            # Get moon phase dream effects
            phase_name = moon_phase.get('phase_name', '')
            moon_effects = self.astro_rules.get('moon_phase_dream_effects', {}).get(phase_name, {})

            # Get current moon sign (if available in transits)
            moon_planet = next((p for p in transits.get('planets', []) if p.get('name') == 'Moon'), None)
            moon_sign = moon_planet.get('sign', '') if moon_planet else ''
            moon_sign_effects = self.astro_rules.get('planet_transit_dream_effects', {}).get('moon_sign_effect', {}).get('signs', {}).get(moon_sign, {})

            # Check for retrograde planets
            retrogrades = transits.get('retrogrades', [])
            retrograde_effects = []
            transit_effects = self.astro_rules.get('planet_transit_dream_effects', {})

            for planet in retrogrades:
                planet_lower = planet.lower()
                if planet_lower == 'mercury':
                    effect = transit_effects.get('mercury_retrograde', {})
                    if effect:
                        retrograde_effects.append({
                            'planet': planet,
                            'korean': effect.get('korean', ''),
                            'emoji': effect.get('emoji', ''),
                            'themes': effect.get('dream_effects', {}).get('themes', []),
                            'common_symbols': effect.get('dream_effects', {}).get('common_symbols', []),
                            'interpretation': effect.get('dream_effects', {}).get('interpretation_guide', {}).get(locale, '')
                        })
                elif planet_lower == 'venus':
                    effect = transit_effects.get('venus_retrograde', {})
                    if effect:
                        retrograde_effects.append({
                            'planet': planet,
                            'korean': effect.get('korean', ''),
                            'themes': effect.get('dream_effects', {}).get('themes', [])
                        })
                elif planet_lower == 'mars':
                    effect = transit_effects.get('mars_retrograde', {})
                    if effect:
                        retrograde_effects.append({
                            'planet': planet,
                            'korean': effect.get('korean', ''),
                            'themes': effect.get('dream_effects', {}).get('themes', [])
                        })

            # Check for significant planetary aspects
            aspects = transits.get('aspects', [])
            significant_aspects = []
            for aspect in aspects[:5]:  # Top 5 aspects
                p1 = aspect.get('planet1', '').lower()
                p2 = aspect.get('planet2', '').lower()
                aspect_type = aspect.get('aspect', '')

                # Check for Jupiter/Neptune transits (important for dreams)
                if 'jupiter' in [p1, p2]:
                    effect = transit_effects.get('jupiter_transit', {})
                    if effect:
                        significant_aspects.append({
                            'aspect': f"{aspect['planet1']} {aspect_type} {aspect['planet2']}",
                            'themes': effect.get('dream_effects', {}).get('themes', []),
                            'interpretation': effect.get('dream_effects', {}).get('interpretation_guide', {}).get(locale, '')
                        })
                if 'neptune' in [p1, p2]:
                    effect = transit_effects.get('neptune_transit', {})
                    if effect:
                        significant_aspects.append({
                            'aspect': f"{aspect['planet1']} {aspect_type} {aspect['planet2']}",
                            'themes': effect.get('dream_effects', {}).get('themes', []),
                            'special_note': effect.get('dream_effects', {}).get('special_note', {}).get(locale, ''),
                            'interpretation': effect.get('dream_effects', {}).get('interpretation_guide', {}).get(locale, '')
                        })

            # Build celestial context
            return {
                'timestamp': transits.get('timestamp'),
                'moon_phase': {
                    'name': phase_name,
                    'korean': moon_effects.get('korean', moon_phase.get('phase_ko', '')),
                    'emoji': moon_effects.get('emoji', moon_phase.get('emoji', '')),
                    'illumination': moon_phase.get('illumination', 0),
                    'age_days': moon_phase.get('age_days', 0),
                    'dream_quality': moon_effects.get('dream_quality', ''),
                    'dream_meaning': moon_effects.get('dream_meaning', {}).get(locale, ''),
                    'favorable_symbols': moon_effects.get('favorable_symbols', []),
                    'intensified_symbols': moon_effects.get('intensified_symbols', []),
                    'advice': moon_effects.get('advice', {}).get(locale, ''),
                    'weight_modifier': moon_effects.get('interpretation_boost', {}).get('weight_modifier', 1.0),
                    'enhanced_themes': moon_effects.get('interpretation_boost', {}).get('themes', [])
                },
                'moon_sign': {
                    'sign': moon_sign,
                    'korean': moon_sign_effects.get('ko', ''),
                    'dream_flavor': moon_sign_effects.get('dream_flavor', ''),
                    'enhanced_symbols': moon_sign_effects.get('enhanced_symbols', [])
                },
                'retrogrades': retrograde_effects,
                'significant_aspects': significant_aspects[:3],
                'planets': [
                    {
                        'name': p.get('name'),
                        'name_ko': p.get('name_ko'),
                        'sign': p.get('sign'),
                        'sign_ko': p.get('sign_ko'),
                        'retrograde': p.get('retrograde', False)
                    }
                    for p in transits.get('planets', [])[:7]  # Sun through Saturn
                ],
                'source': transits.get('source', 'unknown')
            }

        except Exception as e:
            print(f"[DreamRuleEngine] Failed to get celestial context: {e}")
            traceback.print_exc()
            return None

    def detect_combinations(self, dream_text: str, symbols: list) -> list:
        """Detect symbol combinations in dream for enhanced interpretation."""
        combinations = self.advanced_data.get('combinations', {})
        if not combinations:
            return []

        detected = []
        dream_lower = dream_text.lower()
        symbol_set = set(s.lower() for s in symbols)

        for combo_key, combo_data in combinations.items():
            # Parse combination key (e.g., "뱀+물", "돼지+금색")
            parts = [p.strip() for p in combo_key.split('+')]

            # Check if all parts are present in symbols or dream text
            all_present = all(
                part in symbol_set or part in dream_lower
                for part in parts
            )

            if all_present:
                detected.append({
                    'combination': combo_key,
                    'meaning': combo_data.get('meaning', ''),
                    'interpretation': combo_data.get('interpretation', ''),
                    'fortune_type': combo_data.get('fortune_type', ''),
                    'is_lucky': combo_data.get('is_lucky', False),
                    'lucky_score': combo_data.get('lucky_score', 50)
                })

        # Sort by lucky_score descending
        detected.sort(key=lambda x: x['lucky_score'], reverse=True)
        return detected[:5]  # Return top 5 combinations

    def detect_taemong(self, dream_text: str, symbols: list, themes: list) -> dict:
        """Detect if this is a 태몽 (conception dream) and provide interpretation."""
        taemong_data = self.advanced_data.get('taemong', {})
        if not taemong_data:
            return None

        # Check if 태몽-related themes are selected
        taemong_keywords = ['태몽', '임신', 'taemong', 'conception', 'pregnancy', '아기', '출산']
        is_taemong_context = any(
            kw in theme.lower() for theme in themes for kw in taemong_keywords
        ) or any(
            kw in dream_text.lower() for kw in taemong_keywords
        )

        # Find matching taemong symbols
        detected_symbols = []
        dream_lower = dream_text.lower()
        all_inputs = set(s.lower() for s in symbols) | set(dream_lower.split())

        for symbol, data in taemong_data.items():
            if symbol.lower() in all_inputs or symbol.lower() in dream_lower:
                detected_symbols.append({
                    'symbol': symbol,
                    'child_trait': data.get('child_trait', ''),
                    'gender_hint': data.get('gender_hint', ''),
                    'interpretation': data.get('interpretation', ''),
                    'celebrity_examples': data.get('celebrity_examples', []),
                    'lucky_score': data.get('lucky_score', 0)
                })

        if detected_symbols:
            # Sort by lucky_score
            detected_symbols.sort(key=lambda x: x['lucky_score'], reverse=True)
            return {
                'is_taemong': is_taemong_context or len(detected_symbols) > 0,
                'symbols': detected_symbols[:3],
                'primary_symbol': detected_symbols[0] if detected_symbols else None
            }

        return None

    def generate_lucky_numbers(self, dream_text: str, symbols: list) -> dict:
        """Generate lucky numbers based on dream symbols."""
        lucky_data = self.advanced_data.get('lucky_numbers', {})
        symbol_mappings = lucky_data.get('symbol_mappings', {})

        if not symbol_mappings:
            return None

        dream_lower = dream_text.lower()
        all_inputs = set(s.lower() for s in symbols)

        # Collect numbers from matched symbols
        primary_numbers = []
        secondary_numbers = []
        elements = []
        matched_symbols = []

        for symbol, mapping in symbol_mappings.items():
            if symbol.lower() in all_inputs or symbol.lower() in dream_lower:
                matched_symbols.append(symbol)
                primary_numbers.extend(mapping.get('primary', []))
                secondary_numbers.extend(mapping.get('secondary', []))
                elements.append(mapping.get('element', ''))

        if not matched_symbols:
            return None

        # Extract numbers mentioned in dream text
        import re
        dream_numbers = [int(n) for n in re.findall(r'\d+', dream_text) if 1 <= int(n) <= 45]

        # Build final number set
        # Priority: dream_numbers > primary > secondary
        final_numbers = set()

        # Add numbers from dream first
        for n in dream_numbers[:2]:
            if 1 <= n <= 45:
                final_numbers.add(n)

        # Add primary numbers
        import random
        random.shuffle(primary_numbers)
        for n in primary_numbers:
            if len(final_numbers) >= 6:
                break
            if n not in final_numbers and 1 <= n <= 45:
                final_numbers.add(n)

        # Add secondary numbers if needed
        random.shuffle(secondary_numbers)
        for n in secondary_numbers:
            if len(final_numbers) >= 6:
                break
            if n not in final_numbers and 1 <= n <= 45:
                final_numbers.add(n)

        # If still not enough, generate based on element compatibility
        element_compat = lucky_data.get('number_generation_rules', {}).get('element_compatibility', {})
        dominant_element = max(set(elements), key=elements.count) if elements else None

        while len(final_numbers) < 6:
            # Add a random number if we don't have enough
            new_num = random.randint(1, 45)
            if new_num not in final_numbers:
                final_numbers.add(new_num)

        return {
            'numbers': sorted(list(final_numbers))[:6],
            'matched_symbols': matched_symbols[:5],
            'dominant_element': dominant_element,
            'element_analysis': f"오행 {dominant_element} 기운이 강한 꿈입니다." if dominant_element else None,
            'confidence': min(len(matched_symbols) / 3, 1.0)  # Higher confidence with more matches
        }

    def evaluate(self, facts: dict) -> dict:
        """
        Evaluate dream facts against rules and return matched interpretations.
        Returns dict with: texts, korean_notes, specifics, categories
        """
        # Flatten all facts into tokens
        tokens = set()
        dream_text = facts.get('dream', '').lower()

        def add_tokens(obj):
            if isinstance(obj, str):
                for word in obj.lower().replace(',', ' ').split():
                    tokens.add(word.strip())
                # Also add the full string for phrase matching
                tokens.add(obj.lower())
            elif isinstance(obj, list):
                for item in obj:
                    add_tokens(item)
            elif isinstance(obj, dict):
                for v in obj.values():
                    add_tokens(v)

        add_tokens(facts.get('dream', ''))
        add_tokens(facts.get('symbols', []))
        add_tokens(facts.get('emotions', []))
        add_tokens(facts.get('themes', []))
        add_tokens(facts.get('context', []))
        add_tokens(facts.get('cultural', {}))

        # Match against rules with enhanced scoring
        matches = []
        korean_notes = []
        specific_matches = []
        categories = set()

        for rule_file, rules in self.rules.items():
            for rule_id, rule in rules.items():
                if not isinstance(rule, dict):
                    continue
                if rule_id.startswith('_'):  # Skip metadata
                    continue

                conditions = rule.get('when', [])
                if isinstance(conditions, str):
                    conditions = [conditions]

                # Calculate match score
                match_score = 0
                matched_conditions = []

                for c in conditions:
                    c_lower = c.lower()
                    # Direct token match
                    if c_lower in tokens:
                        match_score += 2
                        matched_conditions.append(c)
                    # Substring match in dream text
                    elif c_lower in dream_text:
                        match_score += 1
                        matched_conditions.append(c)

                if match_score > 0:
                    weight = rule.get('weight', 1)
                    final_score = weight * match_score
                    text = rule.get('text', '')

                    if text:
                        matches.append((final_score, text, rule_file))

                    # Collect Korean interpretation
                    korean = rule.get('korean', '')
                    if korean:
                        korean_notes.append((final_score, korean))

                    # Collect category
                    category = rule.get('category', '')
                    if category:
                        categories.add(category)

                    # Check specifics for detailed matching
                    specifics = rule.get('specifics', {})
                    if specifics:
                        for specific_key, specific_value in specifics.items():
                            if any(word in dream_text for word in specific_key.lower().split()):
                                specific_matches.append((final_score + 5, f"{specific_key}: {specific_value}"))

        # Sort and deduplicate
        matches.sort(key=lambda x: x[0], reverse=True)
        korean_notes.sort(key=lambda x: x[0], reverse=True)
        specific_matches.sort(key=lambda x: x[0], reverse=True)

        return {
            'texts': [m[1] for m in matches[:15]],
            'korean_notes': [k[1] for k in korean_notes[:5]],
            'specifics': [s[1] for s in specific_matches[:10]],
            'categories': list(categories),
            'sources': list(set(m[2] for m in matches[:15]))
        }


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
        system_instruction = "You are a warm and empathetic dream counselor. Always respond with valid JSON only."
        full_prompt = f"[SYSTEM]\n{system_instruction}\n\n[USER]\n{prompt}"

        response_text = _generate_with_gpt4(full_prompt, max_tokens=1500, temperature=0.4, use_mini=True)

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
