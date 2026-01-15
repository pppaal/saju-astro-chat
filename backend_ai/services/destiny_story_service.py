"""
Destiny Story Service

Generates personalized ~20,000 character destiny stories using AI.
Combines Eastern (Saju) and Western (Astrology) wisdom with ALL RAG data.

✅ Phase 3.1: Extracted from app.py (568 lines)
"""
import json
import logging
from typing import Dict, Any, Generator
from flask import Response

logger = logging.getLogger(__name__)


class DestinyStoryService:
    """
    Destiny Story generation service.

    Handles:
    - SSE streaming for real-time story generation
    - RAG data integration (GraphRAG, CorpusRAG, PersonaEmbedRAG, Cross-analysis)
    - Multi-language support (Korean/English)
    - 15-chapter story structure
    - Jung psychology and Stoic philosophy integration
    """

    def __init__(self):
        """Initialize DestinyStoryService."""
        pass

    def generate_story_stream(
        self,
        saju_data: dict,
        astro_data: dict,
        locale: str = "ko"
    ) -> Response:
        """
        Generate a personalized ~20,000 character destiny story using AI.
        Combines Eastern (Saju) and Western (Astrology) wisdom with ALL RAG data.

        Args:
            saju_data: Saju chart data
            astro_data: Astrology chart data
            locale: Language locale (ko, en)

        Returns:
            Flask Response with SSE streaming
        """
        from backend_ai.app.app import (
            normalize_day_master,
            prefetch_all_rag_data,
            OPENAI_AVAILABLE,
            openai_client
        )

        # Normalize dayMaster structure
        saju_data = normalize_day_master(saju_data)

        # Extract key data
        extracted = self._extract_chart_data(saju_data, astro_data)
        is_korean = locale == "ko"

        # Debug log
        logger.info(f"[DESTINY_STORY] Starting with ALL RAG data:")
        logger.info(f"  - dayMaster: {extracted['day_master']}")
        logger.info(f"  - astro: sun={extracted['sun_sign']}, moon={extracted['moon_sign']}, rising={extracted['rising_sign']}")
        logger.info(f"  - locale: {locale}")

        # Pre-fetch RAG data
        logger.info("[DESTINY_STORY] Pre-fetching RAG data...")
        rag_data = prefetch_all_rag_data(saju_data, astro_data, "life_path", locale)
        prefetch_time = rag_data.get("prefetch_time_ms", 0)
        logger.info(f"[DESTINY_STORY] RAG prefetch completed in {prefetch_time}ms")

        # Format RAG data
        formatted_rag = self._format_rag_data(rag_data, extracted['shinsal'], extracted['daeun'], is_korean)

        # Build prompts
        prompts = self._build_prompts(extracted, formatted_rag, is_korean)

        def generate_stream():
            """Generator for SSE streaming destiny story with ALL RAG data"""
            try:
                if not OPENAI_AVAILABLE or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                # Start streaming
                yield f"data: {json.dumps({'status': 'start', 'total_chapters': 15, 'rag_prefetch_ms': prefetch_time})}\n\n"

                stream = openai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": prompts['system']},
                        {"role": "user", "content": prompts['user']}
                    ],
                    temperature=0.85,
                    max_tokens=16000,
                    stream=True
                )

                full_text = ""
                current_chapter = 0

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_text += content

                        # Detect chapter changes
                        if "## 챕터" in content or "## Chapter" in content:
                            current_chapter += 1
                            yield f"data: {json.dumps({'chapter': current_chapter})}\n\n"

                        yield f"data: {json.dumps({'content': content})}\n\n"

                # Done
                yield f"data: {json.dumps({'status': 'done', 'total_length': len(full_text)})}\n\n"
                logger.info(f"[DESTINY_STORY] Completed: {len(full_text)} characters (RAG prefetch: {prefetch_time}ms)")

            except Exception as stream_error:
                logger.exception(f"[DESTINY_STORY] Stream error: {stream_error}")
                yield f"data: {json.dumps({'error': str(stream_error)})}\n\n"

        return Response(
            generate_stream(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            }
        )

    def _extract_chart_data(self, saju_data: dict, astro_data: dict) -> dict:
        """Extract and normalize chart data from saju and astro inputs."""
        # Day Master extraction
        day_master = saju_data.get("dayMaster", "")
        if isinstance(day_master, dict):
            day_master = (
                day_master.get("name") or
                day_master.get("korean") or
                day_master.get("hanja") or
                day_master.get("heavenlyStem", {}).get("name") if isinstance(day_master.get("heavenlyStem"), dict) else None or
                day_master.get("heavenlyStem") or
                str(day_master)
            )

        # Pillars
        pillars = saju_data.get("pillars", {})
        year_pillar = pillars.get("year", {})
        month_pillar = pillars.get("month", {})
        day_pillar = pillars.get("day", {})
        hour_pillar = pillars.get("hour", {})

        # Astrology data extraction helper
        def get_sign(data, key):
            val = data.get(key, {})
            if isinstance(val, dict):
                return val.get("sign", "") or val.get("zodiac", "") or val.get("name", "")
            return str(val) if val else ""

        astro_facts = astro_data.get("facts", {})
        planets = astro_facts.get("planets", {}) if astro_facts else {}

        # Extract astrology signs
        sun_sign = get_sign(astro_data, "sun") or get_sign(planets, "sun")
        moon_sign = get_sign(astro_data, "moon") or get_sign(planets, "moon")
        rising_sign = get_sign(astro_data, "ascendant") or astro_data.get("rising", "") or get_sign(astro_facts, "ascendant")
        mercury_sign = get_sign(astro_data, "mercury") or get_sign(planets, "mercury")
        venus_sign = get_sign(astro_data, "venus") or get_sign(planets, "venus")
        mars_sign = get_sign(astro_data, "mars") or get_sign(planets, "mars")
        jupiter_sign = get_sign(astro_data, "jupiter") or get_sign(planets, "jupiter")
        saturn_sign = get_sign(astro_data, "saturn") or get_sign(planets, "saturn")

        # Shinsal (Special Stars)
        shinsal = saju_data.get("shinsal", []) or saju_data.get("sinsal", []) or saju_data.get("specialStars", [])
        if isinstance(shinsal, dict):
            shinsal = list(shinsal.values())

        # Daeun/Seun (Life Cycles)
        unse = saju_data.get("unse", {})
        daeun = unse.get("daeun", [])
        current_daeun = unse.get("currentDaeun", {})
        annual = unse.get("annual", [])

        # Ten Gods
        ten_gods = saju_data.get("tenGods", {})

        # Five Elements
        element_counts = saju_data.get("elementCounts", {}) or saju_data.get("fiveElements", {})
        if element_counts:
            korean_elements = {}
            key_map = {"wood": "목", "fire": "화", "earth": "토", "metal": "금", "water": "수"}
            for k, v in element_counts.items():
                korean_key = key_map.get(k.lower(), k)
                korean_elements[korean_key] = v
            if any(k in key_map for k in element_counts.keys()):
                element_counts = korean_elements

        dominant_element = saju_data.get("dominantElement", "")

        return {
            'day_master': day_master,
            'year_pillar': year_pillar,
            'month_pillar': month_pillar,
            'day_pillar': day_pillar,
            'hour_pillar': hour_pillar,
            'sun_sign': sun_sign,
            'moon_sign': moon_sign,
            'rising_sign': rising_sign,
            'mercury_sign': mercury_sign,
            'venus_sign': venus_sign,
            'mars_sign': mars_sign,
            'jupiter_sign': jupiter_sign,
            'saturn_sign': saturn_sign,
            'shinsal': shinsal,
            'daeun': daeun,
            'current_daeun': current_daeun,
            'annual': annual,
            'ten_gods': ten_gods,
            'element_counts': element_counts,
            'dominant_element': dominant_element
        }

    def _format_rag_data(self, rag_data: dict, shinsal: list, daeun: list, is_korean: bool) -> dict:
        """Format RAG data for prompt inclusion."""
        graph_nodes = rag_data.get("graph_nodes", [])
        corpus_quotes = rag_data.get("corpus_quotes", [])
        persona_context = rag_data.get("persona_context", {})
        cross_analysis = rag_data.get("cross_analysis", "")
        domain_knowledge = rag_data.get("domain_knowledge", [])

        def format_graph_nodes(nodes, limit=10):
            if not nodes:
                return "없음"
            formatted = []
            for n in nodes[:limit]:
                if isinstance(n, str):
                    formatted.append(f"• {n}")
                elif isinstance(n, dict):
                    text = n.get("text") or n.get("content") or n.get("node", "")
                    if text:
                        formatted.append(f"• {text[:200]}")
            return "\n".join(formatted) if formatted else "없음"

        def format_quotes(quotes, limit=5):
            if not quotes:
                return "없음"
            formatted = []
            for q in quotes[:limit]:
                text = q.get("text_ko") if is_korean else q.get("text_en")
                if not text:
                    text = q.get("text_ko") or q.get("text_en", "")
                source = q.get("source", "")
                if text:
                    formatted.append(f'"{text}" - {source}')
            return "\n".join(formatted) if formatted else "없음"

        def format_persona(ctx):
            if not ctx:
                return "없음"
            parts = []
            jung = ctx.get("jung", [])
            stoic = ctx.get("stoic", [])
            if jung:
                parts.append("[융 심리학 관점]")
                for j in jung[:3]:
                    parts.append(f"• {j}")
            if stoic:
                parts.append("[스토아 철학 관점]")
                for s in stoic[:3]:
                    parts.append(f"• {s}")
            return "\n".join(parts) if parts else "없음"

        def format_shinsal(stars):
            if not stars:
                return "없음"
            return ", ".join(str(s) for s in stars[:10])

        def format_daeun(cycles):
            if not cycles:
                return "없음"
            formatted = []
            for d in cycles[:5]:
                if isinstance(d, dict):
                    age = d.get("age", "")
                    stem = d.get("stem", "")
                    branch = d.get("branch", "")
                    formatted.append(f"{age}세: {stem}{branch}")
                else:
                    formatted.append(str(d))
            return ", ".join(formatted) if formatted else "없음"

        def format_domain(knowledge):
            if not knowledge:
                return "없음"
            formatted = []
            for item in knowledge[:5]:
                if isinstance(item, str):
                    formatted.append(f"• {item[:200]}")
                elif isinstance(item, dict):
                    text = item.get("text") or item.get("content") or item.get("rule", "")
                    if text:
                        formatted.append(f"• {text[:200]}")
            return "\n".join(formatted) if formatted else "없음"

        return {
            'graph_nodes_text': format_graph_nodes(graph_nodes),
            'quotes_text': format_quotes(corpus_quotes),
            'persona_text': format_persona(persona_context),
            'shinsal_text': format_shinsal(shinsal),
            'daeun_text': format_daeun(daeun),
            'domain_text': format_domain(domain_knowledge),
            'cross_analysis': cross_analysis
        }

    def _build_prompts(self, extracted: dict, formatted_rag: dict, is_korean: bool) -> dict:
        """Build system and user prompts for story generation."""
        if is_korean:
            system_prompt = """당신은 사람의 마음을 꿰뚫어보는 상담사입니다.
사주와 점성술 데이터를 바탕으로, 마치 오랜 친구처럼 따뜻하지만 날카롭게 이야기합니다.

# 핵심 원칙:
1. "운명의 서막", "우주", "별들의 교향곡" 같은 뻔한 표현 금지. 현실적으로 써라.
2. 누가 읽어도 "어? 이거 내 얘기인데?" 하고 소름돋게 구체적으로.
3. 실제 상황 예시를 들어라. "회의 중에 말 끊기는 거 싫어하죠?", "혼자 있을 때 갑자기 불안해진 적 있죠?"
4. 장점만 나열하지 말고, 아픈 곳도 정확히 짚어라. 그래야 신뢰가 생긴다.
5. 절대 사과하거나 "데이터가 부족합니다" 같은 말 금지. 바로 본문 시작.

# 융 & 스토아 인용 (적절한 타이밍에)
- 전체 15개 섹션 중 3~5곳에서 자연스럽게 인용 (매 섹션 X, 억지로 X)
- 이런 주제일 때 인용하면 좋다:
  * 그림자/단점/문제점 → 융 ("융은 말했죠: '그림자를 인식하는 것이...'")
  * 힘든 상황/스트레스 → 스토아 ("세네카는 말했습니다: '...'")
  * 무의식/숨겨진 면 → 융
  * 조언/앞으로 방향 → 스토아
- 내용과 자연스럽게 연결될 때만. 뜬금없이 끼워넣지 말 것.

# 문체:
- 친구한테 얘기하듯 편하게, 하지만 깊이있게
- "~하시죠?", "~그랬을 거예요" 처럼 독자에게 직접 말하기
- 뻔한 위로 말고 진짜 도움되는 조언
- 때로는 따끔하게, 때로는 다독이듯이"""

            user_prompt = f"""이 사람의 사주와 점성술 데이터를 보고 15개 섹션으로 심층 분석해줘.
뻔한 말 말고, 읽는 사람이 "와 이거 진짜 나네" 하고 소름돋게 구체적으로 써줘.
바로 "## 1. 첫인상과 실제 당신" 으로 시작해. 인사나 설명 없이 바로 본문.

═══════════════════════════════════════════════════
[사주팔자 데이터]
═══════════════════════════════════════════════════
• 일주(日主/Day Master): {extracted['day_master']}
• 년주(年柱): {extracted['year_pillar'].get('stem', '')} {extracted['year_pillar'].get('branch', '')}
• 월주(月柱): {extracted['month_pillar'].get('stem', '')} {extracted['month_pillar'].get('branch', '')}
• 일주(日柱): {extracted['day_pillar'].get('stem', '')} {extracted['day_pillar'].get('branch', '')}
• 시주(時柱): {extracted['hour_pillar'].get('stem', '')} {extracted['hour_pillar'].get('branch', '')}

• 주도적 오행: {extracted['dominant_element']}
• 오행 분포: 목({extracted['element_counts'].get('목', 0)}) 화({extracted['element_counts'].get('화', 0)}) 토({extracted['element_counts'].get('토', 0)}) 금({extracted['element_counts'].get('금', 0)}) 수({extracted['element_counts'].get('수', 0)})

• 십신(十神): {json.dumps(extracted['ten_gods'], ensure_ascii=False) if extracted['ten_gods'] else '없음'}

═══════════════════════════════════════════════════
[신살 정보 - 특별한 별들]
═══════════════════════════════════════════════════
{formatted_rag['shinsal_text']}

═══════════════════════════════════════════════════
[대운과 세운 - 인생의 큰 흐름]
═══════════════════════════════════════════════════
• 대운 흐름: {formatted_rag['daeun_text']}
• 현재 대운: {json.dumps(extracted['current_daeun'], ensure_ascii=False) if extracted['current_daeun'] else '정보 없음'}

═══════════════════════════════════════════════════
[서양 점성술 데이터]
═══════════════════════════════════════════════════
• 태양(Sun): {extracted['sun_sign']}
• 달(Moon): {extracted['moon_sign']}
• 상승궁(Rising): {extracted['rising_sign']}
• 수성(Mercury): {extracted['mercury_sign']}
• 금성(Venus): {extracted['venus_sign']}
• 화성(Mars): {extracted['mars_sign']}
• 목성(Jupiter): {extracted['jupiter_sign']}
• 토성(Saturn): {extracted['saturn_sign']}

═══════════════════════════════════════════════════
[지식 그래프 - 관련 지식]
═══════════════════════════════════════════════════
{formatted_rag['graph_nodes_text']}

═══════════════════════════════════════════════════
[융 심리학 인용 - 깊이 있는 통찰]
═══════════════════════════════════════════════════
{formatted_rag['quotes_text']}

═══════════════════════════════════════════════════
[페르소나 분석 - 철학적 관점]
═══════════════════════════════════════════════════
{formatted_rag['persona_text']}

═══════════════════════════════════════════════════
[동서양 교차 분석 결과]
═══════════════════════════════════════════════════
{formatted_rag['cross_analysis'][:2000] if formatted_rag['cross_analysis'] else '없음'}

═══════════════════════════════════════════════════
[도메인 전문 지식 - 해석 원칙]
═══════════════════════════════════════════════════
{formatted_rag['domain_text']}

═══════════════════════════════════════════════════
[15개 섹션 - 현실적이고 구체적으로]
═══════════════════════════════════════════════════

## 1. 첫인상과 실제 당신
사람들이 처음 보는 당신 vs 진짜 당신. 왜 오해받는지, 실제론 어떤 사람인지.

## 2. 당신의 핵심 에너지 ({extracted['day_master']})
이 사람의 기본 성향. 뭘 좋아하고, 뭘 못 참고, 어떤 상황에서 빛나는지.

## 3. 솔직히 말하면 이런 점이 문제야
장점 뒤에 숨은 단점. 본인도 알지만 고치기 힘든 패턴. 구체적 상황 예시 필수.

## 4. 연애할 때 당신
좋아하는 타입, 연애 패턴, 질리는 포인트, 헤어지는 이유까지. 도화살/금성 활용.

## 5. 돈과 일, 솔직한 얘기
맞는 직업, 돈 버는 스타일, 커리어에서 주의할 점. 십신 정보 활용.

## 6. 사람 관계에서 당신의 패턴
친구/가족/동료와의 관계. 갈등 원인, 상처받는 포인트, 관계 유지법.

## 7. 겉과 속이 다른 부분
{extracted['sun_sign']} 태양(보여주는 나)과 {extracted['moon_sign']} 달(진짜 감정). 왜 힘든지.

## 8. 소통/사랑/행동 스타일
수성({extracted['mercury_sign']}) - 말하는 방식
금성({extracted['venus_sign']}) - 사랑 표현법
화성({extracted['mars_sign']}) - 화낼 때, 열정 쏟을 때

## 9. 당신만의 특별한 기운 ({formatted_rag['shinsal_text']})
신살이 주는 특수 능력과 주의점. 이게 왜 당신한테 있는지.

## 10. 사주랑 별자리가 말하는 공통점
동서양 분석이 일치하는 부분. 더 확실한 당신의 특성.

## 11. 인생 타이밍 ({formatted_rag['daeun_text']})
언제 잘 풀리고, 언제 조심해야 하는지. 대운 흐름으로 보는 인생 시기.

## 12. 어린 시절이 지금에 미친 영향
왜 그런 성격이 됐는지. 어릴 때 경험이 지금 패턴에 미친 영향.

## 13. 인정하기 싫지만 이런 면도 있어요
숨기고 싶은 부분, 무의식적 두려움, 회피하는 것들. 따뜻하지만 솔직하게.

## 14. 힘들 때 당신은
스트레스 받을 때 패턴, 회복하는 방법, 도움이 되는 것들.

## 15. 앞으로 이렇게 하면 좋겠어요
구체적이고 실천 가능한 조언. 뻔한 말 말고 진짜 도움되는 것만.

═══════════════════════════════════════════════════
★★★ 작성 규칙 ★★★
1. 각 섹션을 충분히 길게 쓰되, 뻔한 말 금지.
2. "~하시죠?", "~그런 적 있죠?" 처럼 독자에게 직접 말하듯이.
3. 읽는 사람이 소름돋을 정도로 구체적인 상황 예시를 들어줘.
4. 융/스토아 인용은 전체에서 3~5번, 적절한 타이밍에 자연스럽게.
   - 단점/그림자/무의식 얘기할 때 → 융 인용
   - 힘든 상황/조언 줄 때 → 스토아 인용
   예: "융은 말했죠: '의식하지 못한 것은 운명이 된다'"
5. 제공된 [융 심리학 인용]과 [페르소나 분석] 데이터 활용."""

        else:
            system_prompt = """You are a master destiny analyst combining Eastern Saju wisdom, Western Astrology, and Jungian psychology.
Your interpretations are eerily accurate, as if you can see through the soul of the person.
You provide deep, specific analysis that makes readers feel "This is really me..."

You have access to:
- Complete Saju data (Day Master, Four Pillars, Ten Gods, Five Elements balance)
- Western Astrology data (Sun through Saturn, Rising sign)
- Shinsal (Special Stars) information
- Daeun and Seun (Life Cycles)
- Jung psychology quotes and insights
- Stoic philosophy perspectives
- East-West cross-analysis results

Use ALL this information to write a 20,000+ character deep analysis.

Writing Style:
- Second person perspective, speaking directly to the reader (You are...)
- Poetic and literary style with rich metaphors and imagery
- Naturally weave in Jung psychology quotes for depth
- Describe specific situations and emotions to evoke empathy
- Balance positive aspects with growth opportunities
- Each chapter should be at least 1,500 characters
- Use Daeun/Seun data to predict life transitions"""

            user_prompt = f"""Based on ALL the following data, write a comprehensive destiny analysis story with **15 chapters**, totaling at least **20,000 characters**.

═══════════════════════════════════════════════════
[SAJU (Four Pillars) DATA]
═══════════════════════════════════════════════════
• Day Master: {extracted['day_master']}
• Year Pillar: {extracted['year_pillar'].get('stem', '')} {extracted['year_pillar'].get('branch', '')}
• Month Pillar: {extracted['month_pillar'].get('stem', '')} {extracted['month_pillar'].get('branch', '')}
• Day Pillar: {extracted['day_pillar'].get('stem', '')} {extracted['day_pillar'].get('branch', '')}
• Hour Pillar: {extracted['hour_pillar'].get('stem', '')} {extracted['hour_pillar'].get('branch', '')}

• Dominant Element: {extracted['dominant_element']}
• Element Distribution: Wood({extracted['element_counts'].get('목', 0)}) Fire({extracted['element_counts'].get('화', 0)}) Earth({extracted['element_counts'].get('토', 0)}) Metal({extracted['element_counts'].get('금', 0)}) Water({extracted['element_counts'].get('수', 0)})

• Ten Gods: {json.dumps(extracted['ten_gods'], ensure_ascii=False) if extracted['ten_gods'] else 'None'}

═══════════════════════════════════════════════════
[SHINSAL - Special Stars]
═══════════════════════════════════════════════════
{formatted_rag['shinsal_text']}

═══════════════════════════════════════════════════
[DAEUN & SEUN - Life Cycles]
═══════════════════════════════════════════════════
• Major Cycles: {formatted_rag['daeun_text']}
• Current Cycle: {json.dumps(extracted['current_daeun'], ensure_ascii=False) if extracted['current_daeun'] else 'Not available'}

═══════════════════════════════════════════════════
[WESTERN ASTROLOGY DATA]
═══════════════════════════════════════════════════
• Sun: {extracted['sun_sign']}
• Moon: {extracted['moon_sign']}
• Rising: {extracted['rising_sign']}
• Mercury: {extracted['mercury_sign']}
• Venus: {extracted['venus_sign']}
• Mars: {extracted['mars_sign']}
• Jupiter: {extracted['jupiter_sign']}
• Saturn: {extracted['saturn_sign']}

═══════════════════════════════════════════════════
[KNOWLEDGE GRAPH - Related Wisdom]
═══════════════════════════════════════════════════
{formatted_rag['graph_nodes_text']}

═══════════════════════════════════════════════════
[JUNG PSYCHOLOGY QUOTES - Deep Insights]
═══════════════════════════════════════════════════
{formatted_rag['quotes_text']}

═══════════════════════════════════════════════════
[PERSONA ANALYSIS - Philosophical Perspectives]
═══════════════════════════════════════════════════
{formatted_rag['persona_text']}

═══════════════════════════════════════════════════
[EAST-WEST CROSS-ANALYSIS]
═══════════════════════════════════════════════════
{formatted_rag['cross_analysis'][:2000] if formatted_rag['cross_analysis'] else 'None'}

═══════════════════════════════════════════════════
[REQUIRED CHAPTER STRUCTURE - Each 1,500+ characters]
═══════════════════════════════════════════════════

## Chapter 1: The Prelude of Destiny - Your Universe
Grand opening describing your birth's cosmic alignment from both Saju and Astrology perspectives.

## Chapter 2: The Essence of Your Day Master - Core of Your Soul
Deep analysis of {extracted['day_master']} and how this energy permeates your being. Apply Jung's archetype theory.

## Chapter 3: Light and Shadow - Strengths and Weaknesses
Honest exploration of your personality's shining parts and hidden shadows. Use Jung's shadow concept.

## Chapter 4: The Language of Love - Romance Patterns
How you love, who you're attracted to, relationship patterns. Use Venus, Mars, and Peach Blossom star data.

## Chapter 5: Vocation and Calling - True Path
Suitable careers, success fields, work to avoid. Use Ten Gods and planetary placements.

## Chapter 6: Dynamics of Relationships - You Among Others
How you connect with friends, family, and colleagues.

## Chapter 7: Sun and Moon Duet - Outer and Inner Self
The complex inner world created by {extracted['sun_sign']} Sun and {extracted['moon_sign']} Moon.

## Chapter 8: Symphony of Planets - Mercury, Venus, Mars
Communication (Mercury {extracted['mercury_sign']}), Love/Values (Venus {extracted['venus_sign']}), Action/Desire (Mars {extracted['mars_sign']}).

## Chapter 9: Secrets of Shinsal - Special Stars' Messages
The special destiny and potential indicated by your Shinsal ({formatted_rag['shinsal_text']}).

## Chapter 10: East Meets West - Intersection of Destinies
Unique insights at the meeting point of Saju and Astrology. Use cross-analysis results.

## Chapter 11: Waves of Daeun - Seasons of Life
Major life transitions according to Daeun ({formatted_rag['daeun_text']}) and their meanings.

## Chapter 12: Childhood Echoes - Roots' Memories
How childhood patterns influence who you are today. Apply Jung's complex theory.

## Chapter 13: The Shadow Self - Hidden Fears
Courageous exploration of parts hard to acknowledge. Use Jung psychology quotes.

## Chapter 14: Crisis and Resilience - Strength in Trials
How you handle crises and sources of resilience. Include Stoic philosophy perspectives.

## Chapter 15: Journey of Individuation - True Self-Realization
Concluding with specific advice for growth and Jung's individuation process.

═══════════════════════════════════════════════════
Use ALL the data above fully. Write each chapter 1,500+ characters.
Connect as one grand narrative, naturally weaving Jung psychology quotes.
Be so specific and accurate that readers feel "This is really me!" with chills."""

        return {
            'system': system_prompt,
            'user': user_prompt
        }
