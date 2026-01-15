"""
Utility modules extracted from app.py during Phase 4.4 refactoring.

Modules:
- context_builders: Functions for building saju/astro context strings
- text_utils: Text formatting, SSE utilities, timing markers
- evidence_builders: Functions for building evidence sentences
"""

from backend_ai.utils.context_builders import (
    _build_saju_summary,
    _pick_astro_planet,
    _pick_ascendant,
    _pick_astro_aspect,
    _build_astro_summary,
    _build_detailed_saju,
    _build_detailed_astro,
    _build_advanced_astro_context,
)

from backend_ai.utils.text_utils import (
    _add_months,
    _format_month_name,
    _format_date_ymd,
    _count_timing_markers,
    _has_week_timing,
    _has_caution,
    _count_timing_markers_en,
    _has_week_timing_en,
    _has_caution_en,
    _ensure_ko_prefix,
    _format_korean_spacing,
    _insert_addendum,
    _chunk_text,
    _get_stream_chunk_size,
    _to_sse_event,
    _sse_error_response,
    _has_saju_payload,
    _has_astro_payload,
    _build_birth_format_message,
    _build_missing_payload_message,
)

from backend_ai.utils.evidence_builders import (
    _summarize_five_elements,
    _summarize_five_elements_en,
    _pick_sibsin,
    _planet_ko_name,
    _planet_en_name,
    _pick_any_planet,
    _build_saju_evidence_sentence,
    _build_saju_evidence_sentence_en,
    _build_astro_evidence_sentence,
    _build_astro_evidence_sentence_en,
    _build_missing_requirements_addendum,
    _build_rag_debug_addendum,
)

from backend_ai.utils.env_utils import (
    _is_truthy,
    _bool_env,
    _coerce_float,
    _coerce_int,
    _get_int_env,
    _clamp_temperature,
    _select_model_and_temperature,
)

__all__ = [
    # Context builders
    "_build_saju_summary",
    "_pick_astro_planet",
    "_pick_ascendant",
    "_pick_astro_aspect",
    "_build_astro_summary",
    "_build_detailed_saju",
    "_build_detailed_astro",
    "_build_advanced_astro_context",
    # Text utils
    "_add_months",
    "_format_month_name",
    "_format_date_ymd",
    "_count_timing_markers",
    "_has_week_timing",
    "_has_caution",
    "_count_timing_markers_en",
    "_has_week_timing_en",
    "_has_caution_en",
    "_ensure_ko_prefix",
    "_format_korean_spacing",
    "_insert_addendum",
    "_chunk_text",
    "_get_stream_chunk_size",
    "_to_sse_event",
    "_sse_error_response",
    "_has_saju_payload",
    "_has_astro_payload",
    "_build_birth_format_message",
    "_build_missing_payload_message",
    # Evidence builders
    "_summarize_five_elements",
    "_summarize_five_elements_en",
    "_pick_sibsin",
    "_planet_ko_name",
    "_planet_en_name",
    "_pick_any_planet",
    "_build_saju_evidence_sentence",
    "_build_saju_evidence_sentence_en",
    "_build_astro_evidence_sentence",
    "_build_astro_evidence_sentence_en",
    "_build_missing_requirements_addendum",
    "_build_rag_debug_addendum",
    # Env utils
    "_is_truthy",
    "_bool_env",
    "_coerce_float",
    "_coerce_int",
    "_get_int_env",
    "_clamp_temperature",
    "_select_model_and_temperature",
]
