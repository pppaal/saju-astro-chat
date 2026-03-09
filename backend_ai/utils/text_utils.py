"""
Text utilities for formatting, SSE streaming, and timing markers.

Extracted from app.py during Phase 4.4 refactoring.
"""

import re
import calendar
import os
from datetime import date
from typing import Optional, Any, Dict, List

from flask import Response, stream_with_context

import logging

logger = logging.getLogger(__name__)


_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?。！？])\s+|\n+")
_SPACE_RE = re.compile(r"\s+")
_NON_WORD_RE = re.compile(r"[^0-9a-zA-Z가-힣甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]")
_FORBIDDEN_SYSTEM_TERMS: Dict[str, List[str]] = {
    "saju": [
        "western astrology",
        "astrology",
        "birth chart",
        "transit",
        "planet",
        "house",
        "aspect",
        "zodiac",
        "점성술",
        "트랜짓",
        "행성",
        "하우스",
        "애스펙트",
        "별자리",
        "타로",
        "tarot",
        "iching",
        "i ching",
        "주역",
        "numerology",
        "수비학",
        "mbti",
        "enneagram",
    ],
    "astrology": [
        "four pillars",
        "saju",
        "day master",
        "five elements",
        "daeun",
        "seun",
        "yongsin",
        "sibsin",
        "사주",
        "일간",
        "오행",
        "대운",
        "세운",
        "용신",
        "십신",
        "타로",
        "tarot",
        "iching",
        "i ching",
        "주역",
        "numerology",
        "수비학",
        "mbti",
        "enneagram",
    ],
    "fusion": [
        "tarot",
        "타로",
        "iching",
        "i ching",
        "주역",
        "numerology",
        "수비학",
        "mbti",
        "enneagram",
        "human design",
        "휴먼디자인",
    ],
}


def _normalize_match_token(value: str) -> str:
    if not value:
        return ""
    return _NON_WORD_RE.sub("", _SPACE_RE.sub("", str(value).strip().lower()))


def _safe_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _collect_unique_terms(values: List[str]) -> List[str]:
    seen = set()
    result: List[str] = []
    for value in values:
        normalized = _normalize_match_token(value)
        if len(normalized) < 2 or normalized in seen:
            continue
        seen.add(normalized)
        result.append(str(value).strip())
    return result


def _extract_saju_anchor_terms(saju_data: dict) -> List[str]:
    if not isinstance(saju_data, dict) or not saju_data:
        return []

    facts = _safe_dict(saju_data.get("facts"))
    terms: List[str] = []
    terms.extend(["일간", "대운", "세운"])

    day_master = _safe_dict(saju_data.get("dayMaster")) or _safe_dict(facts.get("dayMaster"))
    heavenly = day_master.get("heavenlyStem")
    heavenly_dict = _safe_dict(heavenly)
    terms.extend(
        [
            str(heavenly_dict.get("name") or "").strip(),
            str(heavenly if isinstance(heavenly, str) else "").strip(),
            str(day_master.get("name") or "").strip(),
            str(heavenly_dict.get("element") or "").strip(),
            str(day_master.get("element") or "").strip(),
            str(saju_data.get("dominantElement") or "").strip(),
            str(facts.get("dominantElement") or "").strip(),
            str(saju_data.get("currentDaeun") or "").strip(),
            str(saju_data.get("currentSaeun") or "").strip(),
        ]
    )

    pillars = _safe_dict(saju_data.get("pillars")) or _safe_dict(facts.get("pillars"))
    for pillar_key in ("year", "month", "day", "time"):
        pillar = _safe_dict(pillars.get(pillar_key))
        heavenly_stem = pillar.get("heavenlyStem")
        earthly_branch = pillar.get("earthlyBranch")
        hs = _safe_dict(heavenly_stem)
        eb = _safe_dict(earthly_branch)
        combined = f"{hs.get('name', '')}{eb.get('name', '')}".strip()
        terms.extend(
            [
                combined,
                str(pillar.get("name") or "").strip(),
                str(hs.get("name") or "").strip(),
                str(eb.get("name") or "").strip(),
            ]
        )

    unse = _safe_dict(saju_data.get("unse")) or _safe_dict(facts.get("unse"))
    for key in ("daeun", "seun", "currentDaeun", "currentSaeun"):
        value = unse.get(key)
        if isinstance(value, dict):
            terms.extend(
                [
                    str(value.get("ganji") or "").strip(),
                    str(value.get("heavenlyStem") or "").strip(),
                    str(value.get("earthlyBranch") or "").strip(),
                ]
            )
        elif isinstance(value, str):
            terms.append(value.strip())

    five_elements = saju_data.get("fiveElements") or facts.get("fiveElements")
    if isinstance(five_elements, dict) and five_elements:
        terms.extend(["오행", "five elements"])
        for key, value in five_elements.items():
            if isinstance(value, (int, float)):
                terms.append(str(key))

    return _collect_unique_terms(terms)


def _extract_astro_anchor_terms(astro_data: dict) -> List[str]:
    if not isinstance(astro_data, dict) or not astro_data:
        return []

    from backend_ai.utils.context_builders import (
        _pick_astro_planet,
        _pick_ascendant,
        _pick_astro_aspect,
    )

    terms: List[str] = []
    terms.extend(["태양", "달", "상승궁", "하우스", "트랜짓", "애스펙트", "Sun", "Moon"])
    for name in ("sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"):
        planet = _safe_dict(_pick_astro_planet(astro_data, name))
        if not planet:
            continue
        house = planet.get("house")
        terms.extend(
            [
                str(planet.get("sign") or "").strip(),
                f"{house} house" if isinstance(house, int) else "",
                f"{house}하우스" if isinstance(house, int) else "",
            ]
        )

    asc = _safe_dict(_pick_ascendant(astro_data))
    if asc:
        house = asc.get("house")
        terms.extend(
            [
                str(asc.get("sign") or "").strip(),
                f"{house} house" if isinstance(house, int) else "",
                f"{house}하우스" if isinstance(house, int) else "",
            ]
        )

    aspect = _safe_dict(_pick_astro_aspect(astro_data))
    if aspect:
        from_name = _safe_dict(aspect.get("from")).get("name")
        to_name = _safe_dict(aspect.get("to")).get("name")
        aspect_type = aspect.get("type")
        terms.extend(
            [
                str(from_name or "").strip(),
                str(to_name or "").strip(),
                str(aspect_type or "").strip(),
            ]
        )

    return _collect_unique_terms(terms)


def _count_anchor_hits(text: str, anchors: List[str]) -> List[str]:
    haystack = _normalize_match_token(text)
    hits: List[str] = []
    for anchor in anchors:
        normalized = _normalize_match_token(anchor)
        if normalized and normalized in haystack:
            hits.append(anchor)
    return hits


def _split_sentences(text: str) -> List[str]:
    if not text:
        return []
    return [part.strip() for part in _SENTENCE_SPLIT_RE.split(text) if part and part.strip()]


def _strip_forbidden_system_sentences(text: str, counselor_type: str) -> Dict[str, Any]:
    normalized_type = counselor_type if counselor_type in _FORBIDDEN_SYSTEM_TERMS else "fusion"
    blocked = _FORBIDDEN_SYSTEM_TERMS[normalized_type]
    sentences = _split_sentences(text)
    kept: List[str] = []
    removed_terms: List[str] = []

    for sentence in sentences:
        normalized_sentence = _normalize_match_token(sentence)
        matched_term = next(
            (term for term in blocked if _normalize_match_token(term) in normalized_sentence),
            None,
        )
        if matched_term:
            removed_terms.append(matched_term)
            continue
        kept.append(sentence)

    cleaned = "\n\n".join(kept).strip() if kept else text.strip()
    return {
        "text": cleaned,
        "removed_terms": _collect_unique_terms(removed_terms),
    }


def _assess_counselor_response_quality(
    text: str,
    counselor_type: str,
    saju_data: dict,
    astro_data: dict,
) -> Dict[str, Any]:
    cleaned = _strip_forbidden_system_sentences(text, counselor_type)
    cleaned_text = cleaned["text"]
    removed_terms = cleaned["removed_terms"]

    has_saju = _has_saju_payload(saju_data)
    has_astro = _has_astro_payload(astro_data)
    saju_hits = _count_anchor_hits(cleaned_text, _extract_saju_anchor_terms(saju_data)) if has_saju else []
    astro_hits = _count_anchor_hits(cleaned_text, _extract_astro_anchor_terms(astro_data)) if has_astro else []

    min_chars = 120 if counselor_type in ("saju", "astrology") else 220
    issues: List[str] = []

    if removed_terms:
        issues.append("forbidden_system_mention")

    if counselor_type == "saju":
        if len(saju_hits) < 2:
            issues.append("missing_saju_evidence")
    elif counselor_type == "astrology":
        if len(astro_hits) < 2:
            issues.append("missing_astrology_evidence")
    else:
        if has_saju and len(saju_hits) < 1:
            issues.append("missing_saju_evidence")
        if has_astro and len(astro_hits) < 1:
            issues.append("missing_astrology_evidence")
        if has_saju and has_astro and (len(saju_hits) + len(astro_hits) < 3):
            issues.append("missing_cross_evidence")

    if len(cleaned_text.strip()) < min_chars:
        issues.append("response_too_short")

    return {
        "text": cleaned_text,
        "issues": issues,
        "removed_terms": removed_terms,
        "saju_hits": saju_hits,
        "astro_hits": astro_hits,
        "needs_repair": bool(issues),
    }


def _build_quality_repair_prompt(
    locale: str,
    counselor_type: str,
    original_text: str,
    assessment: Dict[str, Any],
    saju_data: dict,
    astro_data: dict,
) -> str:
    normalized_type = counselor_type if counselor_type in _FORBIDDEN_SYSTEM_TERMS else "fusion"
    blocked_terms = ", ".join(_FORBIDDEN_SYSTEM_TERMS[normalized_type][:10])
    saju_terms = ", ".join(_extract_saju_anchor_terms(saju_data)[:6])
    astro_terms = ", ".join(_extract_astro_anchor_terms(astro_data)[:6])
    issues = ", ".join(assessment.get("issues") or [])

    if locale == "ko":
        return (
            "방금 답변을 전면 수정해.\n"
            "규칙:\n"
            "- 인사 없이 바로 분석 시작\n"
            "- 사주 상담이면 사주만, 점성 상담이면 점성만, 통합 상담이면 사주+점성만 사용\n"
            "- 아래 근거 앵커를 최소 2개 이상 직접 언급\n"
            "- 금지 체계 언급 금지: "
            f"{blocked_terms}\n"
            f"- 현재 위반 이슈: {issues}\n"
            f"- 사용 가능한 사주 앵커: {saju_terms or '없음'}\n"
            f"- 사용 가능한 점성 앵커: {astro_terms or '없음'}\n"
            "원문을 복사하지 말고 더 일관된 새 답변으로 다시 써. 수정본만 출력.\n\n"
            f"[원문 답변]\n{original_text}"
        )

    return (
        "Rewrite the previous answer from scratch.\n"
        "Rules:\n"
        "- Start directly with analysis, no greeting\n"
        "- Use only the allowed systems for this counselor\n"
        "- Mention at least two concrete evidence anchors from the allowed chart data\n"
        f"- Forbidden systems/terms: {blocked_terms}\n"
        f"- Current issues: {issues}\n"
        f"- Available saju anchors: {saju_terms or 'none'}\n"
        f"- Available astrology anchors: {astro_terms or 'none'}\n"
        "Do not copy the original answer verbatim. Output the repaired answer only.\n\n"
        f"[Original answer]\n{original_text}"
    )


def _run_counselor_quality_gate(
    openai_client: Any,
    model_name: str,
    temperature: float,
    max_tokens: int,
    locale: str,
    counselor_type: str,
    system_prompt: str,
    user_prompt: str,
    response_text: str,
    saju_data: dict,
    astro_data: dict,
) -> tuple[str, Dict[str, Any]]:
    assessment = _assess_counselor_response_quality(
        response_text,
        counselor_type,
        saju_data,
        astro_data,
    )
    if not assessment["needs_repair"]:
        return assessment["text"], assessment

    repair_passes = max(0, min(2, int(os.getenv("COUNSELOR_REPAIR_PASSES", "1") or "1")))
    candidate_text = assessment["text"]
    candidate_assessment = assessment

    for _ in range(repair_passes):
        try:
            repair_prompt = _build_quality_repair_prompt(
                locale,
                counselor_type,
                candidate_text or response_text,
                candidate_assessment,
                saju_data,
                astro_data,
            )
            repair_response = openai_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": candidate_text or response_text},
                    {"role": "user", "content": repair_prompt},
                ],
                temperature=max(0.2, min(temperature, 0.6)),
                max_tokens=max(400, min(max_tokens, 1200)),
            )
            repaired_text = (
                repair_response.choices[0].message.content
                if repair_response and getattr(repair_response, "choices", None)
                else ""
            ) or ""
            candidate_assessment = _assess_counselor_response_quality(
                repaired_text,
                counselor_type,
                saju_data,
                astro_data,
            )
            candidate_text = candidate_assessment["text"]
            if not candidate_assessment["needs_repair"]:
                candidate_assessment["repaired"] = True
                return candidate_text, candidate_assessment
        except Exception as exc:
            logger.warning("[QUALITY-GATE] Repair pass failed: %s", exc)
            break

    candidate_assessment["repaired"] = False
    return candidate_text, candidate_assessment


def _add_months(src_date: date, months: int) -> date:
    """Add months to a date while keeping day within target month range."""
    year = src_date.year + (src_date.month - 1 + months) // 12
    month = (src_date.month - 1 + months) % 12 + 1
    day = min(src_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _format_month_name(src_date: date) -> str:
    month_names = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ]
    return month_names[src_date.month - 1]


def _format_date_ymd(src_date: date) -> str:
    return f"{src_date.year:04d}-{src_date.month:02d}-{src_date.day:02d}"


def _count_timing_markers(text: str) -> int:
    if not text:
        return 0
    pattern = re.compile(
        r"(?:\d{1,2}\s*~\s*\d{1,2}\s*월|\d{1,2}\s*월|\d{1,2}\s*주|\d{1,2}/\d{1,2}|"
        r"이번\s*달|다음\s*달|다다음\s*달|이번\s*주|다음\s*주|상반기|하반기)"
    )
    return len({m.group(0) for m in pattern.finditer(text)})


def _has_week_timing(text: str) -> bool:
    if not text:
        return False
    pattern = re.compile(
        r"(?:\d{1,2}\s*월\s*(?:\d{1,2}\s*주|1~2주차|2~3주차|3~4주차|"
        r"첫째주|둘째주|셋째주|넷째주|다섯째주))"
    )
    return bool(pattern.search(text))


def _has_caution(text: str) -> bool:
    if not text:
        return False
    caution_terms = [
        "주의",
        "경고",
        "유의",
        "조심",
        "피하",
        "위험",
        "경계",
    ]
    return any(term in text for term in caution_terms)


def _count_timing_markers_en(text: str) -> int:
    if not text:
        return 0
    pattern = re.compile(
        r"(?:\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\w*|\bq[1-4]\b|"
        r"\b(?:this|next)\s+(?:week|month|quarter)\b|\bweek\s*\d{1,2}\b|"
        r"\b\d{1,2}(?:st|nd|rd|th)?\s+week\b|\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b)",
        re.IGNORECASE,
    )
    return len({m.group(0).lower() for m in pattern.finditer(text)})


def _has_week_timing_en(text: str) -> bool:
    if not text:
        return False
    pattern = re.compile(
        r"(?:week\s*\d{1,2}|\d{1,2}(?:st|nd|rd|th)?\s+week)",
        re.IGNORECASE,
    )
    return bool(pattern.search(text))


def _has_caution_en(text: str) -> bool:
    if not text:
        return False
    caution_terms = [
        "caution", "avoid", "watch out", "be careful", "risk", "risky",
        "hold off", "delay", "slow down", "conflict", "friction",
    ]
    lower = text.lower()
    return any(term in lower for term in caution_terms)


def _ensure_ko_prefix(text: str, locale: str) -> str:
    if locale != "ko" or not text:
        return text
    trimmed = text.lstrip(" \t\r\n\"'""''")
    if trimmed.startswith("이야"):
        return trimmed
    return f"이야, {trimmed}"


def _format_korean_spacing(text: str) -> str:
    if not text:
        return text
    text = re.sub(r"([.!?])(?=[가-힣A-Za-z0-9])", r"\1 ", text)
    text = re.sub(r"([,])(?=[가-힣A-Za-z0-9])", r"\1 ", text)
    text = re.sub(r"([가-힣])(\d)", r"\1 \2", text)
    text = re.sub(r"((?:ASC|MC|IC|DC))(\d)", r"\1 \2", text)

    unit_tokens = ("년", "월", "일", "주", "차", "시", "분", "초", "하우스", "대", "세", "살", "개월")

    def _digit_hangul(match: re.Match) -> str:
        digit = match.group(1)
        tail = match.group(2)
        for unit in unit_tokens:
            if tail.startswith(unit):
                return f"{digit}{tail}"
        return f"{digit} {tail}"

    text = re.sub(r"(\d)([가-힣])", _digit_hangul, text)
    text = re.sub(r"(\d)\s*\.\s*(\d)", r"\1.\2", text)
    text = re.sub(r"(\d)\s*,\s*(\d)", r"\1,\2", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"(\d)\s+(년|월|일|주|차|시|분|초|하우스|대|세|살|개월)", r"\1\2", text)
    return text.strip()


def _insert_addendum(text: str, addendum: str) -> str:
    if not addendum:
        return text
    if "\n\n" in text:
        parts = text.split("\n\n")
        insert_idx = max(1, len(parts) - 1)
        parts.insert(insert_idx, addendum)
        return "\n\n".join(parts)
    sentence_ends = [m.end() for m in re.finditer(r"[.!?]", text)]
    if sentence_ends:
        insert_pos = sentence_ends[0] if len(sentence_ends) == 1 else sentence_ends[1]
        prefix = text[:insert_pos]
        suffix = text[insert_pos:].lstrip()
        sep = "" if prefix.endswith((" ", "\n", "\t")) else " "
        return f"{prefix}{sep}{addendum} {suffix}"
    if text:
        # Fallback: insert near the middle so evidence lands in-body.
        mid = max(0, len(text) // 2)
        right = text.find(" ", mid)
        left = text.rfind(" ", 0, mid)
        insert_pos = right if right != -1 else left
        if insert_pos > 0:
            prefix = text[:insert_pos]
            suffix = text[insert_pos:].lstrip()
            sep = "" if prefix.endswith((" ", "\n", "\t")) else " "
            return f"{prefix}{sep}{addendum} {suffix}"
    last_question = text.rfind("?")
    if last_question != -1:
        prefix = text[:last_question]
        suffix = text[last_question:]
        sep = "" if prefix.endswith((" ", "\n", "\t")) else " "
        return f"{prefix}{sep}{addendum} {suffix}"
    last_period = max(text.rfind("."), text.rfind("!"))
    if last_period != -1:
        prefix = text[:last_period + 1]
        suffix = text[last_period + 1:].lstrip()
        sep = "" if prefix.endswith((" ", "\n", "\t")) else " "
        return f"{prefix}{sep}{addendum} {suffix}"
    return f"{text} {addendum}"


def _chunk_text(text: str, chunk_size: int = 200):
    if not text:
        return []
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]


def _get_stream_chunk_size() -> int:
    from backend_ai.utils.env_utils import _get_int_env
    return _get_int_env("ASK_STREAM_CHUNK_SIZE", 200, min_value=80, max_value=800)


def _to_sse_event(text: str) -> str:
    if text is None:
        return ""
    lines = text.splitlines()
    if not lines:
        return "data: \n\n"
    payload = "".join([f"data: {line}\n" for line in lines])
    return payload + "\n"


def _sse_error_response(message: str) -> Response:
    def generate():
        chunk_size = _get_stream_chunk_size()
        for piece in _chunk_text(message or "", chunk_size):
            yield _to_sse_event(piece)
        yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _has_saju_payload(saju_data: dict) -> bool:
    if not isinstance(saju_data, dict) or not saju_data:
        return False
    if saju_data.get("dayMaster"):
        return True
    facts = saju_data.get("facts") if isinstance(saju_data.get("facts"), dict) else {}
    for key in ("pillars", "tenGods", "fiveElements", "dominantElement", "daeun", "unse"):
        if saju_data.get(key) or facts.get(key):
            return True
    return False


def _has_astro_payload(astro_data: dict) -> bool:
    if not isinstance(astro_data, dict) or not astro_data:
        return False
    if astro_data.get("sun") or astro_data.get("moon"):
        return True
    if astro_data.get("planets") or astro_data.get("houses") or astro_data.get("aspects"):
        return True
    if astro_data.get("ascendant") or astro_data.get("asc") or astro_data.get("rising"):
        return True
    facts = astro_data.get("facts") if isinstance(astro_data.get("facts"), dict) else {}
    if facts.get("planets") or facts.get("houses") or facts.get("aspects"):
        return True
    return False


def _build_birth_format_message(locale: str) -> str:
    if locale == "ko":
        return "생년월일/시간 형식이 올바르지 않습니다. 예: 1995-02-09, 06:40"
    return "Invalid birth date/time format. Example: 1995-02-09, 06:40"


def _build_missing_payload_message(locale: str, missing_saju: bool, missing_astro: bool) -> str:
    if locale == "ko":
        if missing_saju and missing_astro:
            return (
                "사주/점성학 계산 결과가 누락되었습니다. 프런트에서 computeDestinyMap 결과를 "
                "`saju`와 `astro`로 전달해 주세요. (생년월일/시간만으로는 이 API가 고급 차트를 계산하지 않습니다.)"
            )
        if missing_saju:
            return (
                "사주 계산 결과가 누락되었습니다. computeDestinyMap 결과를 `saju`로 전달해 주세요. "
                "(생년월일/시간만으로는 이 API가 고급 차트를 계산하지 않습니다.)"
            )
        return (
            "점성학 계산 결과가 누락되었습니다. computeDestinyMap 결과를 `astro`로 전달해 주세요. "
            "(생년월일/시간만으로는 이 API가 고급 차트를 계산하지 않습니다.)"
        )
    if missing_saju and missing_astro:
        return (
            "Computed saju/astrology payload is missing. Please pass computeDestinyMap results in `saju` and `astro`. "
            "(This API does not compute advanced charts from birth inputs alone.)"
        )
    if missing_saju:
        return (
            "Computed saju payload is missing. Please pass computeDestinyMap results in `saju`. "
            "(This API does not compute advanced charts from birth inputs alone.)"
        )
    return (
        "Computed astrology payload is missing. Please pass computeDestinyMap results in `astro`. "
        "(This API does not compute advanced charts from birth inputs alone.)"
    )
