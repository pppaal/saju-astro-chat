# backend_ai/app/dream_logic/prompt_builder.py
"""
Dream interpretation prompt builder.
Contains the prompt construction logic for GPT-4 dream analysis.
"""


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
    prompt += _build_cultural_section(cultural)

    # Add saju influence if available
    saju_influence = matched_rules.get('saju_influence')
    if saju_influence:
        prompt += _build_saju_section(saju_influence)

    # Add celestial context if available
    if celestial_context:
        prompt += _build_celestial_section(celestial_context)

    # Add matched rules context
    if matched_rules:
        prompt += _build_rules_section(matched_rules)

    # Add response format
    prompt += _build_response_format()

    return prompt


def _build_cultural_section(cultural: dict) -> str:
    """Build cultural symbols section of prompt."""
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

    return '\n'.join(cultural_parts) if cultural_parts else 'None specified'


def _build_saju_section(saju_influence: dict) -> str:
    """Build saju influence section of prompt."""
    section = f"""

## Current Saju Fortune Influence (사주 운세 영향)
IMPORTANT: Use this to explain WHY the dreamer is having this type of dream at this time.
"""
    day_master = saju_influence.get('dayMaster', {})
    if day_master:
        section += f"""
[Day Master - 일간]
{day_master.get('stem', '')} ({day_master.get('element', '')} {day_master.get('yin_yang', '')})
- The dreamer's core energy/personality type
"""

    current_daeun = saju_influence.get('currentDaeun')
    if current_daeun:
        section += f"""
[Current Daeun - 현재 대운] (10-year cycle)
{current_daeun.get('stem', '')} {current_daeun.get('branch', '')} ({current_daeun.get('element', '')})
Starting Year: {current_daeun.get('startYear', '')}
- This major life phase influences subconscious themes
"""

    current_saeun = saju_influence.get('currentSaeun')
    if current_saeun:
        section += f"""
[Current Saeun - 올해 세운] (Annual fortune)
{current_saeun.get('stem', '')} {current_saeun.get('branch', '')} (Year {current_saeun.get('year', '')})
- This year's energy affects dream themes and symbols
"""

    current_wolun = saju_influence.get('currentWolun')
    if current_wolun:
        section += f"""
[Current Wolun - 이번달 월운] (Monthly fortune)
{current_wolun.get('stem', '')} {current_wolun.get('branch', '')} (Month {current_wolun.get('month', '')})
- This month's energy creates immediate dream influences
"""

    today_iljin = saju_influence.get('todayIljin')
    if today_iljin:
        sibsin = today_iljin.get('sibsin', {})
        is_gwiin = today_iljin.get('isCheoneulGwiin', False)
        section += f"""
[Today's Iljin - 오늘의 일진] (Daily fortune)
{today_iljin.get('stem', '')} {today_iljin.get('branch', '')}
천간십신: {sibsin.get('cheon', '')} / 지지십신: {sibsin.get('ji', '')}
천을귀인일: {'예 (특별한 길일)' if is_gwiin else '아니오'}
- Today's energy directly influences last night's dream content
- The relationship between today's pillars and the dreamer's day master reveals dream meaning
"""

    section += """
ANALYZE: Based on the current saju fortune (대운, 세운, 월운, 일진), explain:
1. Why the dreamer might be experiencing these specific dream themes NOW
2. How the current energy cycle relates to the dream symbols
3. What the dream might be revealing about this life phase
"""
    return section


def _build_celestial_section(celestial_context: dict) -> str:
    """Build celestial context section of prompt."""
    moon = celestial_context.get('moon_phase', {})
    moon_sign_info = celestial_context.get('moon_sign', {})
    retrogrades = celestial_context.get('retrogrades', [])
    aspects = celestial_context.get('significant_aspects', [])

    section = f"""

## Current Celestial Configuration (현재 천체 배치)
"""
    if moon:
        section += f"""
[Moon Phase - 달의 위상]
{moon.get('emoji', '')} {moon.get('korean', moon.get('name', ''))} (밝기 {moon.get('illumination', 0)}%)
Dream Quality: {moon.get('dream_quality', '')}
"""
        if moon.get('dream_meaning'):
            section += f"Meaning: {moon.get('dream_meaning')}\n"
        if moon.get('favorable_symbols'):
            section += f"Favorable Symbols: {', '.join(moon.get('favorable_symbols', []))}\n"
        if moon.get('enhanced_themes'):
            section += f"Enhanced Themes: {', '.join(moon.get('enhanced_themes', []))}\n"
        if moon.get('advice'):
            section += f"Moon Phase Advice: {moon.get('advice')}\n"

    if moon_sign_info and moon_sign_info.get('sign'):
        section += f"""
[Moon Sign - 달의 별자리]
{moon_sign_info.get('korean', '')} ({moon_sign_info.get('sign', '')})
Dream Flavor: {moon_sign_info.get('dream_flavor', '')}
"""
        if moon_sign_info.get('enhanced_symbols'):
            section += f"Enhanced Symbols: {', '.join(moon_sign_info.get('enhanced_symbols', []))}\n"

    if retrogrades:
        section += "\n[Retrograde Planets - 역행 행성]\n"
        for retro in retrogrades:
            section += f"- {retro.get('korean', retro.get('planet', ''))} {retro.get('emoji', '')}\n"
            if retro.get('themes'):
                section += f"  Themes: {', '.join(retro.get('themes', []))}\n"
            if retro.get('interpretation'):
                section += f"  Effect: {retro.get('interpretation')}\n"

    if aspects:
        section += "\n[Significant Planetary Aspects - 주요 행성 배치]\n"
        for asp in aspects:
            section += f"- {asp.get('aspect', '')}\n"
            if asp.get('themes'):
                section += f"  Themes: {', '.join(asp.get('themes', []))}\n"
            if asp.get('special_note'):
                section += f"  Note: {asp.get('special_note')}\n"

    section += """
IMPORTANT: Factor the current celestial configuration into your dream interpretation.
Moon phase affects dream intensity and themes. Retrograde periods influence dream content.
"""
    return section


def _build_rules_section(matched_rules: dict) -> str:
    """Build matched rules section of prompt."""
    section = ""

    if matched_rules.get('texts'):
        section += f"""

## Relevant Interpretations from Knowledge Base
{chr(10).join(['- ' + rule for rule in matched_rules.get('texts', [])[:10]])}
"""

    # Add Korean-specific notes if available
    korean_notes = matched_rules.get('korean_notes', [])
    if korean_notes:
        section += f"""
## Korean Traditional Interpretation (한국 해몽)
{chr(10).join(['- ' + note for note in korean_notes[:5]])}
"""

    # Add specific context matches
    specifics = matched_rules.get('specifics', [])
    if specifics:
        section += f"""
## Specific Dream Contexts Found
{chr(10).join(['- ' + s for s in specifics[:8]])}
"""

    # Add categories detected
    categories = matched_rules.get('categories', [])
    if categories:
        section += f"""
## Dream Categories Detected: {', '.join(categories)}
"""

    # Add advice from matched rules
    advice = matched_rules.get('advice', [])
    if advice:
        section += f"""
## Recommended Advice from Knowledge Base
{chr(10).join(['- ' + a for a in advice[:3]])}
"""

    # Add premium feature context
    combo_insights = matched_rules.get('combination_insights', [])
    if combo_insights:
        section += f"""
## Symbol Combination Analysis (심볼 조합 분석)
{chr(10).join(['- ' + c for c in combo_insights])}
Important: These symbol combinations have special significance in dream interpretation.
"""

    taemong_insight = matched_rules.get('taemong_insight')
    if taemong_insight:
        section += f"""
## Conception Dream Analysis (태몽 분석)
{taemong_insight}
Note: This dream may be a 태몽 (conception dream). Consider discussing:
- Predicted traits for the child
- Gender hints from traditional interpretation
- Auspiciousness of this taemong symbol
"""

    lucky_context = matched_rules.get('lucky_numbers_context')
    if lucky_context:
        section += f"""
## Lucky Numbers Context
{lucky_context}
Note: Include specific lucky numbers in your luckyElements response based on the symbols.
"""

    return section


def _build_response_format() -> str:
    """Build response format section of prompt."""
    return """

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
