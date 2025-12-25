"""
I-Ching (주역) Reading API Routes
Hexagram casting, interpretation, and streaming responses.
Extracted from app.py for better maintainability.
"""
import json
import logging
import time
from datetime import datetime

from flask import Blueprint, request, jsonify, Response, g

logger = logging.getLogger(__name__)

# Blueprint definition
iching_bp = Blueprint('iching', __name__, url_prefix='/iching')

# ===============================================================
# Lazy-loaded dependencies
# ===============================================================
_iching_rag_module = None
_openai_client = None
HAS_ICHING = True
HAS_USER_MEMORY = True


def _get_iching_rag():
    """Lazy load iching_rag module."""
    global _iching_rag_module, HAS_ICHING
    if _iching_rag_module is None:
        try:
            from backend_ai.app import iching_rag as _ir
            _iching_rag_module = _ir
        except ImportError as e:
            logger.warning(f"[ICHING] Could not import iching_rag: {e}")
            HAS_ICHING = False
            return None
    return _iching_rag_module


def cast_hexagram():
    """Cast a hexagram."""
    mod = _get_iching_rag()
    if mod is None:
        raise RuntimeError("I-Ching module not available")
    return mod.cast_hexagram()


def get_hexagram_interpretation(*args, **kwargs):
    """Get hexagram interpretation."""
    mod = _get_iching_rag()
    if mod is None:
        raise RuntimeError("I-Ching module not available")
    return mod.get_hexagram_interpretation(*args, **kwargs)


def perform_iching_reading(*args, **kwargs):
    """Perform complete I-Ching reading."""
    mod = _get_iching_rag()
    if mod is None:
        raise RuntimeError("I-Ching module not available")
    return mod.perform_iching_reading(*args, **kwargs)


def search_iching_wisdom(*args, **kwargs):
    """Search I-Ching wisdom."""
    mod = _get_iching_rag()
    if mod is None:
        raise RuntimeError("I-Ching module not available")
    return mod.search_iching_wisdom(*args, **kwargs)


def get_all_hexagrams_summary(*args, **kwargs):
    """Get all hexagrams summary."""
    mod = _get_iching_rag()
    if mod is None:
        raise RuntimeError("I-Ching module not available")
    return mod.get_all_hexagrams_summary(*args, **kwargs)


def _get_openai_client():
    """Get OpenAI client for streaming."""
    global _openai_client
    if _openai_client is None:
        try:
            from openai import OpenAI
            _openai_client = OpenAI()
        except Exception:
            return None
    return _openai_client


def _is_openai_available():
    """Check if OpenAI is available."""
    return _get_openai_client() is not None


# User memory helpers
def _get_user_memory_helpers():
    """Get user memory helpers."""
    global HAS_USER_MEMORY
    try:
        from backend_ai.app.user_memory import get_user_memory, generate_user_id
        return get_user_memory, generate_user_id
    except ImportError:
        HAS_USER_MEMORY = False
        return None, None


# ===============================================================
# ROUTE HANDLERS
# ===============================================================

@iching_bp.route('/cast', methods=['POST'])
def iching_cast():
    """Cast I Ching hexagram (premium)."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        result = cast_hexagram()
        return jsonify({
            "status": "success",
            "cast": result,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/cast failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@iching_bp.route('/interpret', methods=['POST'])
def iching_interpret():
    """Get hexagram interpretation (premium)."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        data = request.get_json(force=True)
        hexagram_num = data.get("hexagram", 1)
        theme = data.get("theme", "general")
        locale = data.get("locale", "ko")
        changing_lines = data.get("changingLines", [])
        saju_element = data.get("sajuElement")

        interp = get_hexagram_interpretation(
            hexagram_num=hexagram_num,
            theme=theme,
            locale=locale,
            changing_lines=changing_lines,
            saju_element=saju_element,
        )

        return jsonify({
            "status": "success",
            "interpretation": interp,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/interpret failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@iching_bp.route('/reading', methods=['POST'])
def iching_reading():
    """Perform complete I Ching reading (premium)."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        data = request.get_json(force=True)
        question = data.get("question", "")
        theme = data.get("theme", "general")
        locale = data.get("locale", "ko")
        saju_element = data.get("sajuElement")
        birth_data = data.get("birth") or {}

        reading = perform_iching_reading(
            question=question,
            theme=theme,
            locale=locale,
            saju_element=saju_element,
        )

        # Save to user memory
        get_user_memory, generate_user_id = _get_user_memory_helpers()
        if HAS_USER_MEMORY and birth_data and get_user_memory and generate_user_id:
            try:
                user_id = generate_user_id(birth_data)
                memory = get_user_memory(user_id)
                interpretation = reading.get("combined_interpretation", "") if isinstance(reading, dict) else str(reading)
                hexagram_name = reading.get("hexagram", {}).get("korean_name", "") if isinstance(reading, dict) else ""
                record_id = memory.save_consultation(
                    theme=f"iching:{theme}",
                    locale=locale,
                    birth_data=birth_data,
                    fusion_result=f"[{hexagram_name}] {interpretation}",
                    key_insights=[question] if question else [],
                    service_type="iching",
                )
                reading["user_id"] = user_id
                reading["record_id"] = record_id
                logger.info(f"[ICHING] Saved to memory: {record_id}")
            except Exception as mem_e:
                logger.warning(f"[ICHING] Memory save failed: {mem_e}")

        return jsonify({
            "status": "success",
            "reading": reading,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/reading failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@iching_bp.route('/reading-stream', methods=['POST'])
def iching_reading_stream():
    """
    Enhanced Streaming I Ching interpretation with:
    - Five Element (五行) analysis
    - Seasonal harmony
    - Trigram imagery
    - Nuclear/Opposite/Reverse hexagram insights
    - Saju cross-analysis
    - Advanced changing line rules
    """
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        data = request.get_json(force=True)
        logger.info(f"[ICHING_STREAM] id={getattr(g, 'request_id', 'N/A')} Starting enhanced streaming interpretation")

        # Get hexagram data from request
        hexagram_number = data.get("hexagramNumber")
        hexagram_name = data.get("hexagramName", "")
        hexagram_symbol = data.get("hexagramSymbol", "")
        judgment = data.get("judgment", "")
        image = data.get("image", "")
        core_meaning = data.get("coreMeaning", "")
        changing_lines = data.get("changingLines", [])
        resulting_hexagram = data.get("resultingHexagram")
        question = data.get("question", "")
        locale = data.get("locale", "ko")
        themes = data.get("themes", {})

        # Enhanced data
        trigram_upper = data.get("trigramUpper", "")
        trigram_lower = data.get("trigramLower", "")
        hexagram_element = data.get("element", "")
        saju_element = data.get("sajuElement", "")

        # Related hexagrams
        nuclear_hexagram = data.get("nuclearHexagram", {})
        opposite_hexagram = data.get("oppositeHexagram", {})
        reverse_hexagram = data.get("reverseHexagram", {})

        is_korean = locale == "ko"
        lang_instruction = "Please respond entirely in Korean (한국어로 답변해주세요)." if is_korean else "Please respond in English."

        # Date and seasonal analysis
        now = datetime.now()
        weekdays_ko = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"]
        weekdays_en = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        month = now.month
        if month in [3, 4, 5]:
            season_ko, season_element = "봄", "목(木)"
        elif month in [6, 7, 8]:
            season_ko, season_element = "여름", "화(火)"
        elif month in [9, 10, 11]:
            season_ko, season_element = "가을", "금(金)"
        else:
            season_ko, season_element = "겨울", "수(水)"

        if is_korean:
            current_date_str = f"오늘: {now.year}년 {now.month}월 {now.day}일 ({weekdays_ko[now.weekday()]}) - {season_ko}"
        else:
            current_date_str = f"Today: {now.strftime('%B %d, %Y')} ({weekdays_en[now.weekday()]})"

        # Five Element analysis
        wuxing_korean = {"wood": "목(木)", "fire": "화(火)", "earth": "토(土)", "metal": "금(金)", "water": "수(水)"}
        hex_element_ko = wuxing_korean.get(hexagram_element, hexagram_element) if hexagram_element else ""

        # Trigram imagery
        trigram_names = {
            "heaven": "건(乾/하늘)", "earth": "곤(坤/땅)", "thunder": "진(震/우레)",
            "water": "감(坎/물)", "mountain": "간(艮/산)", "wind": "손(巽/바람)",
            "fire": "리(離/불)", "lake": "태(兌/연못)"
        }
        upper_name = trigram_names.get(trigram_upper, trigram_upper)
        lower_name = trigram_names.get(trigram_lower, trigram_lower)

        openai_client = _get_openai_client()

        def generate_stream():
            """Generator for SSE streaming I Ching interpretation"""
            try:
                if not _is_openai_available() or not openai_client:
                    yield f"data: {json.dumps({'error': 'OpenAI not available'})}\n\n"
                    return

                # === SECTION 1: Overview ===
                yield f"data: {json.dumps({'section': 'overview', 'status': 'start'})}\n\n"

                trigram_context = ""
                if upper_name and lower_name:
                    trigram_context = f"""
괘상(卦象) 분석:
- 상괘: {upper_name}
- 하괘: {lower_name}
- 괘상 이미지: 위에 {upper_name.split('/')[1] if '/' in upper_name else upper_name}, 아래에 {lower_name.split('/')[1] if '/' in lower_name else lower_name}"""

                element_context = ""
                if hex_element_ko:
                    element_context = f"""
오행(五行) 분석:
- 괘의 오행: {hex_element_ko}
- 현재 계절: {season_ko} ({season_element})"""
                    if saju_element:
                        saju_element_ko = wuxing_korean.get(saju_element, saju_element)
                        element_context += f"""
- 당신의 일간(日干): {saju_element_ko}"""

                related_context = ""
                if nuclear_hexagram.get("name") or opposite_hexagram.get("name") or reverse_hexagram.get("name"):
                    related_context = """
관련 괘(卦) 참고:"""
                    if nuclear_hexagram.get("name"):
                        related_context += f"""
- 호괘(互卦): {nuclear_hexagram.get('name', '')} - 상황의 내면에 숨겨진 의미"""
                    if opposite_hexagram.get("name"):
                        related_context += f"""
- 착괘(錯卦): {opposite_hexagram.get('name', '')} - 정반대 관점에서의 통찰"""
                    if reverse_hexagram.get("name"):
                        related_context += f"""
- 종괘(綜卦): {reverse_hexagram.get('name', '')} - 상대방 입장에서의 시각"""

                overview_prompt = f"""당신은 깊은 통찰력을 가진 주역(周易) 상담사입니다.
동양 철학과 오행(五行) 사상에 정통하며, 따뜻하고 지혜로운 스승처럼 괘의 메시지를 전달합니다.

{lang_instruction}

{current_date_str}

【괘 정보】
- 괘명: {hexagram_name} {hexagram_symbol} (제{hexagram_number}괘)
- 괘사(彖辭): {judgment}
- 상사(象辭): {image}
- 핵심 의미: {core_meaning}
{trigram_context}
{element_context}
{related_context}

{f'【질문】 {question}' if question else '【일반 점괘】'}

【테마별 해석 참고】
- 직업/사업: {themes.get('career', '')}
- 연애/관계: {themes.get('love', '')}
- 건강: {themes.get('health', '')}
- 재물: {themes.get('wealth', '')}
- 시기: {themes.get('timing', '')}

【상담 지침】
1. 괘상(卦象) 이미지를 활용하여 시각적이고 직관적으로 설명
2. 오행의 상생상극 관계를 자연스럽게 녹여서 해석
3. 현재 계절({season_ko})과 괘의 기운 조화를 언급
4. 따뜻하고 공감하는 말투 ("~하시는군요", "~의 시기입니다")
5. 질문이 있다면 그에 맞춰 구체적으로 답변
6. 4-5문장으로 깊이 있으면서도 이해하기 쉽게 해석"""

                stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": overview_prompt}],
                    temperature=0.7,
                    max_tokens=500,
                    stream=True
                )

                overview_text = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        overview_text += content
                        yield f"data: {json.dumps({'section': 'overview', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'overview', 'status': 'done', 'full_text': overview_text})}\n\n"

                # === SECTION 2: Changing Lines ===
                if changing_lines:
                    yield f"data: {json.dumps({'section': 'changing', 'status': 'start'})}\n\n"

                    changing_info = "\n".join([f"- {line.get('index', i+1)}효: {line.get('text', '')}" for i, line in enumerate(changing_lines)])
                    resulting_info = ""
                    if resulting_hexagram:
                        resulting_info = f"변화 후 괘(지괘): {resulting_hexagram.get('name', '')} {resulting_hexagram.get('symbol', '')} - {resulting_hexagram.get('judgment', '')}"

                    line_count = len(changing_lines)
                    line_nums = [line.get('index', i+1) for i, line in enumerate(changing_lines)]

                    if line_count == 1:
                        interpretation_rule = f"【단변(單變)】 {line_nums[0]}효 하나만 변하니, 본괘의 {line_nums[0]}효 효사가 핵심입니다."
                    elif line_count == 2:
                        sorted_lines = sorted(line_nums)
                        upper_line = sorted_lines[-1]
                        interpretation_rule = f"【이변(二變)】 {sorted_lines[0]}, {sorted_lines[1]}효가 변합니다. 위 효인 {upper_line}효의 효사를 중심으로 해석하세요."
                    elif line_count == 3:
                        interpretation_rule = "【삼변(三變)】 본괘와 지괘의 괘사를 함께 보되, 본괘 괘사가 중심입니다."
                    elif line_count == 4:
                        all_lines = {1, 2, 3, 4, 5, 6}
                        unchanged = sorted(all_lines - set(line_nums))
                        interpretation_rule = f"【사변(四變)】 변하지 않는 {unchanged[0]}, {unchanged[1]}효 중 아래 효인 {unchanged[0]}효의 지괘 효사를 보세요."
                    elif line_count == 5:
                        all_lines = {1, 2, 3, 4, 5, 6}
                        unchanged = list(all_lines - set(line_nums))[0]
                        interpretation_rule = f"【오변(五變)】 {unchanged}효만 변하지 않습니다. 이 불변효의 지괘 효사가 핵심입니다."
                    elif line_count == 6:
                        if hexagram_number == 1 and resulting_hexagram and resulting_hexagram.get('number') == 2:
                            interpretation_rule = "【전효변 - 용구(用九)】 '見群龍無首 吉' - 여러 용이 나타나되 우두머리가 없으니 길하다."
                        elif hexagram_number == 2 and resulting_hexagram and resulting_hexagram.get('number') == 1:
                            interpretation_rule = "【전효변 - 용육(用六)】 '利永貞' - 영원히 바르게 함이 이롭다."
                        else:
                            interpretation_rule = "【전효변(全爻變)】 6효가 모두 변하니, 지괘의 괘사를 중심으로 해석하세요."
                    else:
                        interpretation_rule = ""

                    line_position_meanings = {
                        1: "초효 - 시작, 잠재력의 단계",
                        2: "이효 - 내면의 성장, 발전기",
                        3: "삼효 - 내외 경계, 전환점",
                        4: "사효 - 외부 진입, 도약기",
                        5: "오효 - 정점, 전성기",
                        6: "상효 - 극점, 마무리"
                    }
                    line_positions = "\n".join([f"- {line_position_meanings.get(line.get('index', i+1), '')}" for i, line in enumerate(changing_lines)])

                    changing_prompt = f"""당신은 주역의 변효(變爻) 해석에 정통한 상담사입니다.
전통적인 효변 해석법(朱熹 周易本義)에 따라 정확하고 깊이 있게 해석합니다.

{lang_instruction}

【본괘(本卦)】 {hexagram_name} {hexagram_symbol}

【변효(變爻) 정보】
{changing_info}

【효위(爻位) 의미】
{line_positions}

【지괘(之卦) 정보】
{resulting_info}

【전통 주역 해석 규칙】
{interpretation_rule}

【해석 지침】
1. 위 해석 규칙을 정확히 따라 해석의 중심을 잡으세요
2. 효위(爻位)가 상징하는 인생 단계와 연결하여 설명
3. 본괘에서 지괘로의 변화가 의미하는 흐름을 해석
4. 변화를 두려워하지 않도록 긍정적이면서도 현실적으로
5. 4-5문장으로 핵심을 전달"""

                    changing_stream = openai_client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[{"role": "user", "content": changing_prompt}],
                        temperature=0.7,
                        max_tokens=400,
                        stream=True
                    )

                    changing_text = ""
                    for chunk in changing_stream:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            changing_text += content
                            yield f"data: {json.dumps({'section': 'changing', 'content': content})}\n\n"

                    yield f"data: {json.dumps({'section': 'changing', 'status': 'done', 'full_text': changing_text})}\n\n"

                # === SECTION 3: Advice ===
                yield f"data: {json.dumps({'section': 'advice', 'status': 'start'})}\n\n"

                saju_advice_context = ""
                if saju_element:
                    saju_element_ko = wuxing_korean.get(saju_element, saju_element)
                    saju_advice_context = f"""
【사주 연동 조언】
- 당신의 일간(日干): {saju_element_ko}
- 괘의 오행({hex_element_ko})과의 관계를 고려한 맞춤 조언 필요"""

                advice_prompt = f"""당신은 주역의 지혜를 현대 생활에 적용하는 실용적인 상담사입니다.

{lang_instruction}

{current_date_str}

【괘 정보】
괘: {hexagram_name} {hexagram_symbol}
핵심 의미: {core_meaning}
괘의 오행: {hex_element_ko}
현재 계절: {season_ko} ({season_element})
{saju_advice_context}

{f'【질문】 {question}' if question else ''}

【앞선 해석 요약】
{overview_text[:400]}

【조언 지침】
1. 오행의 상생상극을 활용한 구체적 행동 제안
2. 현재 계절({season_ko})에 맞는 시의적절한 조언
3. 오늘/이번 주 실천할 수 있는 구체적 행동 2-3가지
4. 괘상(卦象) 이미지를 비유로 활용
5. 번호 없이 자연스러운 문장으로 연결"""

                advice_stream = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": advice_prompt}],
                    temperature=0.7,
                    max_tokens=400,
                    stream=True
                )

                advice_text = ""
                for chunk in advice_stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        advice_text += content
                        yield f"data: {json.dumps({'section': 'advice', 'content': content})}\n\n"

                yield f"data: {json.dumps({'section': 'advice', 'status': 'done', 'full_text': advice_text})}\n\n"

                # === DONE ===
                yield f"data: {json.dumps({'done': True})}\n\n"

            except Exception as stream_error:
                logger.exception(f"[ICHING_STREAM] Error: {stream_error}")
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

    except Exception as e:
        logger.exception(f"[ERROR] /iching/reading-stream failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@iching_bp.route('/search', methods=['GET'])
def iching_search():
    """Search I Ching wisdom."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        query = request.args.get("q", "")
        top_k = int(request.args.get("top_k", 5))

        results = search_iching_wisdom(query, top_k=top_k)

        return jsonify({
            "status": "success",
            "results": results,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/search failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@iching_bp.route('/hexagrams', methods=['GET'])
def iching_hexagrams():
    """Get all 64 hexagrams summary."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        locale = request.args.get("locale", "ko")
        summaries = get_all_hexagrams_summary(locale=locale)

        return jsonify({
            "status": "success",
            "hexagrams": summaries,
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/hexagrams failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@iching_bp.route('/changing-line', methods=['POST'])
def iching_changing_line():
    """Get detailed changing line interpretation."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        from backend_ai.app.iching_rag import get_changing_line_interpretation

        data = request.get_json() or {}
        hexagram_number = data.get("hexagramNumber")
        line_index = data.get("lineIndex")
        locale = data.get("locale", "ko")

        if not hexagram_number or not line_index:
            return jsonify({
                "status": "error",
                "message": "hexagramNumber and lineIndex are required"
            }), 400

        result = get_changing_line_interpretation(
            hexagram_num=int(hexagram_number),
            line_index=int(line_index),
            locale=locale
        )

        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]}), 400

        return jsonify({
            "status": "success",
            **result
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/changing-line failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@iching_bp.route('/hexagram-lines/<int:hexagram_num>', methods=['GET'])
def iching_hexagram_lines(hexagram_num: int):
    """Get all changing line interpretations for a specific hexagram."""
    if not HAS_ICHING:
        return jsonify({"status": "error", "message": "I Ching module not available"}), 501

    try:
        from backend_ai.app.iching_rag import get_all_changing_lines_for_hexagram

        locale = request.args.get("locale", "ko")

        result = get_all_changing_lines_for_hexagram(
            hexagram_num=hexagram_num,
            locale=locale
        )

        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]}), 400

        return jsonify({
            "status": "success",
            **result
        })
    except Exception as e:
        logger.exception(f"[ERROR] /iching/hexagram-lines/{hexagram_num} failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
