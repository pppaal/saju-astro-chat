"""
Unit tests for backend_ai/utils/text_utils.py

Tests:
- Date formatting functions
- Timing marker detection
- Korean text formatting
- SSE streaming utilities
- Payload validation
"""
import pytest
from datetime import date


class TestAddMonths:
    """Tests for _add_months function."""

    def test_add_positive_months(self):
        """Adding positive months should work."""
        from backend_ai.utils.text_utils import _add_months

        base = date(2024, 1, 15)
        result = _add_months(base, 3)
        assert result.month == 4
        assert result.year == 2024

    def test_add_months_year_rollover(self):
        """Adding months that cross year boundary."""
        from backend_ai.utils.text_utils import _add_months

        base = date(2024, 11, 15)
        result = _add_months(base, 3)
        assert result.month == 2
        assert result.year == 2025

    def test_add_zero_months(self):
        """Adding zero months should return same month."""
        from backend_ai.utils.text_utils import _add_months

        base = date(2024, 6, 15)
        result = _add_months(base, 0)
        assert result.month == 6

    def test_add_negative_months(self):
        """Adding negative months should subtract."""
        from backend_ai.utils.text_utils import _add_months

        base = date(2024, 6, 15)
        result = _add_months(base, -2)
        assert result.month == 4


class TestFormatMonthName:
    """Tests for _format_month_name function."""

    def test_month_names(self):
        """Month names should be formatted correctly."""
        from backend_ai.utils.text_utils import _format_month_name

        assert _format_month_name(date(2024, 1, 1)) == "January"
        assert _format_month_name(date(2024, 12, 1)) == "December"
        assert _format_month_name(date(2024, 6, 15)) == "June"


class TestFormatDateYmd:
    """Tests for _format_date_ymd function."""

    def test_date_format(self):
        """Date should be formatted as YYYY-MM-DD."""
        from backend_ai.utils.text_utils import _format_date_ymd

        d = date(2024, 3, 15)
        result = _format_date_ymd(d)
        assert result == "2024-03-15"

    def test_date_format_padding(self):
        """Single digit month/day should be zero-padded."""
        from backend_ai.utils.text_utils import _format_date_ymd

        d = date(2024, 1, 5)
        result = _format_date_ymd(d)
        assert result == "2024-01-05"


class TestCountTimingMarkers:
    """Tests for _count_timing_markers function."""

    def test_korean_timing_markers(self):
        """Korean timing markers should be counted."""
        from backend_ai.utils.text_utils import _count_timing_markers

        text = "3월에 좋은 일이 있을 것입니다. 다음 달에도 좋습니다."
        count = _count_timing_markers(text)
        assert count >= 1

    def test_no_timing_markers(self):
        """Text without timing markers should return 0."""
        from backend_ai.utils.text_utils import _count_timing_markers

        text = "안녕하세요."
        count = _count_timing_markers(text)
        assert count == 0

    def test_empty_text(self):
        """Empty text should return 0."""
        from backend_ai.utils.text_utils import _count_timing_markers

        assert _count_timing_markers("") == 0
        assert _count_timing_markers(None) == 0


class TestHasWeekTiming:
    """Tests for _has_week_timing function."""

    def test_has_week_timing(self):
        """Text with week timing should return True."""
        from backend_ai.utils.text_utils import _has_week_timing

        text = "3월 1~2주차에 좋은 소식이 있습니다."
        assert _has_week_timing(text) is True

        text = "5월 첫째주에 만나요."
        assert _has_week_timing(text) is True

    def test_no_week_timing(self):
        """Text without week timing should return False."""
        from backend_ai.utils.text_utils import _has_week_timing

        text = "내년에 여행을 계획하고 있습니다."
        assert _has_week_timing(text) is False

    def test_empty_text(self):
        """Empty text should return False."""
        from backend_ai.utils.text_utils import _has_week_timing

        assert _has_week_timing("") is False
        assert _has_week_timing(None) is False


class TestHasCaution:
    """Tests for _has_caution function."""

    def test_has_caution_words(self):
        """Text with caution words should return True."""
        from backend_ai.utils.text_utils import _has_caution

        text = "건강에 주의하세요."
        assert _has_caution(text) is True

        text = "조심해서 운전하세요."
        assert _has_caution(text) is True

    def test_no_caution_words(self):
        """Text without caution words should return False."""
        from backend_ai.utils.text_utils import _has_caution

        text = "오늘 하루도 좋은 하루 되세요."
        assert _has_caution(text) is False

    def test_empty_text(self):
        """Empty text should return False."""
        from backend_ai.utils.text_utils import _has_caution

        assert _has_caution("") is False
        assert _has_caution(None) is False


class TestCountTimingMarkersEn:
    """Tests for _count_timing_markers_en function."""

    def test_english_timing_markers(self):
        """English timing markers should be counted."""
        from backend_ai.utils.text_utils import _count_timing_markers_en

        text = "In March, good things will happen. Next month will be great too."
        count = _count_timing_markers_en(text)
        assert count >= 1

    def test_no_timing_markers_en(self):
        """Text without timing markers should return 0."""
        from backend_ai.utils.text_utils import _count_timing_markers_en

        text = "Hello. The weather is nice."
        count = _count_timing_markers_en(text)
        assert count == 0


class TestHasWeekTimingEn:
    """Tests for _has_week_timing_en function."""

    def test_has_week_timing_en(self):
        """Text with week timing should return True."""
        from backend_ai.utils.text_utils import _has_week_timing_en

        text = "Week 3 will bring good news."
        assert _has_week_timing_en(text) is True

        text = "The 2nd week of April is important."
        assert _has_week_timing_en(text) is True

    def test_no_week_timing_en(self):
        """Text without week timing should return False."""
        from backend_ai.utils.text_utils import _has_week_timing_en

        text = "Next year I plan to travel."
        assert _has_week_timing_en(text) is False


class TestHasCautionEn:
    """Tests for _has_caution_en function."""

    def test_has_caution_words_en(self):
        """Text with caution words should return True."""
        from backend_ai.utils.text_utils import _has_caution_en

        text = "Be careful with your health."
        assert _has_caution_en(text) is True

        text = "Caution is advised during this period."
        assert _has_caution_en(text) is True

    def test_no_caution_words_en(self):
        """Text without caution words should return False."""
        from backend_ai.utils.text_utils import _has_caution_en

        text = "Have a great day!"
        assert _has_caution_en(text) is False


class TestEnsureKoPrefix:
    """Tests for _ensure_ko_prefix function."""

    def test_adds_prefix_for_korean(self):
        """Should add prefix for Korean locale."""
        from backend_ai.utils.text_utils import _ensure_ko_prefix

        text = "오늘의 운세입니다."
        result = _ensure_ko_prefix(text, "ko")
        assert result.startswith("이야,")

    def test_already_has_prefix(self):
        """Should not add duplicate prefix."""
        from backend_ai.utils.text_utils import _ensure_ko_prefix

        text = "이야, 오늘의 운세입니다."
        result = _ensure_ko_prefix(text, "ko")
        assert not result.startswith("이야, 이야,")

    def test_non_korean_locale(self):
        """Non-Korean locale should not modify text."""
        from backend_ai.utils.text_utils import _ensure_ko_prefix

        text = "Hello"
        result = _ensure_ko_prefix(text, "en")
        assert result == "Hello"


class TestFormatKoreanSpacing:
    """Tests for _format_korean_spacing function."""

    def test_basic_spacing(self):
        """Basic Korean text spacing."""
        from backend_ai.utils.text_utils import _format_korean_spacing

        text = "안녕하세요.반갑습니다."
        result = _format_korean_spacing(text)
        assert ". " in result or result == text

    def test_empty_text(self):
        """Empty text should return as-is."""
        from backend_ai.utils.text_utils import _format_korean_spacing

        assert _format_korean_spacing("") == ""
        assert _format_korean_spacing(None) is None


class TestInsertAddendum:
    """Tests for _insert_addendum function."""

    def test_insert_addendum(self):
        """Addendum should be inserted."""
        from backend_ai.utils.text_utils import _insert_addendum

        text = "오늘의 운세입니다."
        addendum = "추가 정보입니다."
        result = _insert_addendum(text, addendum)
        assert addendum in result

    def test_empty_addendum(self):
        """Empty addendum should return original text."""
        from backend_ai.utils.text_utils import _insert_addendum

        text = "오늘의 운세입니다."
        result = _insert_addendum(text, "")
        assert result == text


class TestChunkText:
    """Tests for _chunk_text function."""

    def test_chunk_short_text(self):
        """Short text should be in one chunk."""
        from backend_ai.utils.text_utils import _chunk_text

        text = "Hello"
        chunks = _chunk_text(text, chunk_size=100)
        assert len(chunks) == 1
        assert chunks[0] == "Hello"

    def test_chunk_long_text(self):
        """Long text should be split into chunks."""
        from backend_ai.utils.text_utils import _chunk_text

        text = "A" * 100
        chunks = _chunk_text(text, chunk_size=20)
        assert len(chunks) == 5
        assert all(len(chunk) == 20 for chunk in chunks)

    def test_empty_text(self):
        """Empty text should return empty list."""
        from backend_ai.utils.text_utils import _chunk_text

        assert _chunk_text("") == []
        assert _chunk_text(None) == []


class TestGetStreamChunkSize:
    """Tests for _get_stream_chunk_size function."""

    def test_default_chunk_size(self):
        """Default chunk size should be returned."""
        from backend_ai.utils.text_utils import _get_stream_chunk_size

        size = _get_stream_chunk_size()
        assert isinstance(size, int)
        assert size >= 80
        assert size <= 800


class TestToSseEvent:
    """Tests for _to_sse_event function."""

    def test_format_sse_event(self):
        """SSE event should be properly formatted."""
        from backend_ai.utils.text_utils import _to_sse_event

        text = "Hello"
        event = _to_sse_event(text)
        assert "data: Hello" in event
        assert event.endswith("\n\n")

    def test_multiline_text(self):
        """Multiline text should have data prefix per line."""
        from backend_ai.utils.text_utils import _to_sse_event

        text = "Line1\nLine2"
        event = _to_sse_event(text)
        assert "data: Line1" in event
        assert "data: Line2" in event

    def test_none_text(self):
        """None text should return empty string."""
        from backend_ai.utils.text_utils import _to_sse_event

        assert _to_sse_event(None) == ""


class TestHasSajuPayload:
    """Tests for _has_saju_payload function."""

    def test_valid_saju_payload(self):
        """Valid saju payload should return True."""
        from backend_ai.utils.text_utils import _has_saju_payload

        payload = {"dayMaster": {"name": "甲"}}
        assert _has_saju_payload(payload) is True

        payload = {"pillars": {"year": "甲子"}}
        assert _has_saju_payload(payload) is True

    def test_missing_saju_payload(self):
        """Missing saju data should return False."""
        from backend_ai.utils.text_utils import _has_saju_payload

        assert _has_saju_payload({}) is False
        assert _has_saju_payload(None) is False
        assert _has_saju_payload({"astro": {"sun_sign": "Aries"}}) is False


class TestHasAstroPayload:
    """Tests for _has_astro_payload function."""

    def test_valid_astro_payload(self):
        """Valid astro payload should return True."""
        from backend_ai.utils.text_utils import _has_astro_payload

        payload = {"sun": {"sign": "Aries"}}
        assert _has_astro_payload(payload) is True

        payload = {"moon": {"sign": "Taurus"}}
        assert _has_astro_payload(payload) is True

    def test_missing_astro_payload(self):
        """Missing astro data should return False."""
        from backend_ai.utils.text_utils import _has_astro_payload

        assert _has_astro_payload({}) is False
        assert _has_astro_payload(None) is False


class TestBuildBirthFormatMessage:
    """Tests for _build_birth_format_message function."""

    def test_korean_message(self):
        """Korean birth format message."""
        from backend_ai.utils.text_utils import _build_birth_format_message

        msg = _build_birth_format_message("ko")
        assert isinstance(msg, str)
        assert "생년월일" in msg

    def test_english_message(self):
        """English birth format message."""
        from backend_ai.utils.text_utils import _build_birth_format_message

        msg = _build_birth_format_message("en")
        assert isinstance(msg, str)
        assert "birth" in msg.lower()


class TestBuildMissingPayloadMessage:
    """Tests for _build_missing_payload_message function."""

    def test_missing_both_ko(self):
        """Korean message when both missing."""
        from backend_ai.utils.text_utils import _build_missing_payload_message

        msg = _build_missing_payload_message("ko", missing_saju=True, missing_astro=True)
        assert isinstance(msg, str)
        assert "사주" in msg
        assert "점성" in msg

    def test_missing_saju_only_ko(self):
        """Korean message when saju missing."""
        from backend_ai.utils.text_utils import _build_missing_payload_message

        msg = _build_missing_payload_message("ko", missing_saju=True, missing_astro=False)
        assert isinstance(msg, str)
        assert "사주" in msg

    def test_missing_astro_only_en(self):
        """English message when astro missing."""
        from backend_ai.utils.text_utils import _build_missing_payload_message

        msg = _build_missing_payload_message("en", missing_saju=False, missing_astro=True)
        assert isinstance(msg, str)
        assert "astrology" in msg.lower()


class TestModuleExports:
    """Tests for module imports."""

    def test_add_months_importable(self):
        """_add_months should be importable."""
        from backend_ai.utils.text_utils import _add_months
        assert callable(_add_months)

    def test_format_month_name_importable(self):
        """_format_month_name should be importable."""
        from backend_ai.utils.text_utils import _format_month_name
        assert callable(_format_month_name)

    def test_chunk_text_importable(self):
        """_chunk_text should be importable."""
        from backend_ai.utils.text_utils import _chunk_text
        assert callable(_chunk_text)

    def test_to_sse_event_importable(self):
        """_to_sse_event should be importable."""
        from backend_ai.utils.text_utils import _to_sse_event
        assert callable(_to_sse_event)
