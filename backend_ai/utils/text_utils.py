"""
Text utilities for formatting, SSE streaming, and timing markers.

Extracted from app.py during Phase 4.4 refactoring.
"""

import re
import calendar
from datetime import date
from typing import Optional

from flask import Response, stream_with_context

import logging

logger = logging.getLogger(__name__)


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
