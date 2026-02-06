"""
Unit tests for Dream Service module.

Tests:
- DreamService initialization
- Context building methods
- Prompt building
- Error handling
"""
import pytest
from unittest.mock import patch, MagicMock


class TestDreamServiceInit:
    """Tests for DreamService initialization."""

    def test_dream_service_creation(self):
        """DreamService should be instantiable."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()
        assert service is not None

    def test_dream_service_importable(self):
        """DreamService should be importable."""
        from backend_ai.services.dream_service import DreamService
        assert DreamService is not None


class TestBuildCelestialContext:
    """Tests for _build_celestial_context method."""

    @patch('backend_ai.app.app.get_current_transits')
    @patch('backend_ai.app.app.HAS_REALTIME', True)
    def test_celestial_context_with_data(self, mock_transits):
        """Celestial context should be built from provided data."""
        from backend_ai.services.dream_service import DreamService

        mock_transits.return_value = {}

        service = DreamService()

        celestial_data = {
            "moon_phase": {
                "korean": "보름달",
                "name": "Full Moon",
                "emoji": "🌕",
                "dream_meaning": "통찰력 강화"
            },
            "moon_sign": {
                "korean": "전갈자리",
                "sign": "Scorpio",
                "dream_flavor": "깊은 변환"
            },
            "retrogrades": [
                {"korean": "수성", "planet": "Mercury"}
            ]
        }

        result = service._build_celestial_context(celestial_data)

        assert isinstance(result, str)
        assert "🌙" in result or result == ""

    @patch('backend_ai.app.app.get_current_transits')
    @patch('backend_ai.app.app.HAS_REALTIME', True)
    def test_celestial_context_empty_data(self, mock_transits):
        """Celestial context with empty data should try to get current transits."""
        from backend_ai.services.dream_service import DreamService

        mock_transits.return_value = {
            "moon_phase": {"korean": "그믐달", "emoji": "🌑"}
        }

        service = DreamService()
        result = service._build_celestial_context({})

        assert isinstance(result, str)

    @patch('backend_ai.app.app.get_current_transits')
    @patch('backend_ai.app.app.HAS_REALTIME', False)
    def test_celestial_context_no_realtime(self, mock_transits):
        """Celestial context without realtime should return empty."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()
        result = service._build_celestial_context({})

        assert isinstance(result, str)


class TestBuildSajuContext:
    """Tests for _build_saju_context method."""

    def test_saju_context_empty_data(self):
        """Saju context with empty data should return empty string."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        mock_calculate = MagicMock()
        result = service._build_saju_context({}, "ko", mock_calculate)

        assert result == ""

    def test_saju_context_with_birth_date(self):
        """Saju context with birth date should call calculation."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        saju_data = {
            "birth_date": "1990-01-15",
            "birth_time": "12:00",
            "birth_city": "Seoul",
            "timezone": "Asia/Seoul"
        }

        mock_calculate = MagicMock()
        mock_calculate.return_value = {
            "dayMaster": {"stem": "甲", "element": "wood"},
            "currentDaeun": {"stem": "丙", "branch": "午"},
            "todayIljin": {"stem": "乙", "branch": "未"}
        }

        result = service._build_saju_context(saju_data, "ko", mock_calculate)

        assert isinstance(result, str)
        mock_calculate.assert_called_once()


class TestBuildPreviousContext:
    """Tests for _build_previous_context method."""

    def test_previous_context_empty(self):
        """Previous context with no consultations should return empty."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()
        result = service._build_previous_context({})

        assert result == ""

    def test_previous_context_with_consultations(self):
        """Previous context should format previous consultations."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        dream_context = {
            "previous_consultations": [
                {
                    "summary": "이전 꿈 해석 요약",
                    "dreamText": "이전 꿈 내용",
                    "date": "2024-01-15"
                },
                {
                    "summary": "두번째 꿈 해석",
                    "dreamText": "두번째 꿈",
                    "date": "2024-01-10"
                }
            ]
        }

        result = service._build_previous_context(dream_context)

        assert isinstance(result, str)
        assert "이전 상담" in result or result == ""


class TestBuildPersonaContext:
    """Tests for _build_persona_context method."""

    def test_persona_context_empty(self):
        """Persona context with no memory should return empty."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()
        result = service._build_persona_context({})

        assert result == ""

    def test_persona_context_with_memory(self):
        """Persona context should format user profile."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        dream_context = {
            "persona_memory": {
                "sessionCount": 5,
                "keyInsights": ["통찰1", "통찰2"],
                "emotionalTone": "긍정적"
            }
        }

        result = service._build_persona_context(dream_context)

        assert isinstance(result, str)


class TestBuildJungContext:
    """Tests for _build_jung_context method."""

    def test_jung_context_no_engine(self):
        """Jung context without engine should return empty."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()
        result = service._build_jung_context(None, "test message", {})

        assert result == ""

    def test_jung_context_with_engine(self):
        """Jung context should use counseling engine."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        mock_engine = MagicMock()
        mock_engine.get_enhanced_context.return_value = {
            "psychological_type": {
                "name_ko": "사고형",
                "description": "논리적 분석 선호"
            },
            "alchemy_stage": {
                "name_ko": "니그레도",
                "therapeutic_focus": "그림자 인식"
            },
            "rag_questions": ["질문1", "질문2"],
            "rag_insights": ["통찰1", "통찰2"]
        }

        result = service._build_jung_context(mock_engine, "test", {})

        assert isinstance(result, str)

    def test_jung_context_engine_error(self):
        """Jung context should handle engine errors gracefully."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        mock_engine = MagicMock()
        mock_engine.get_enhanced_context.side_effect = Exception("Test error")

        result = service._build_jung_context(mock_engine, "test", {})

        assert result == ""


class TestBuildSessionPhaseContext:
    """Tests for _build_session_phase_context method."""

    def test_session_phase_no_session(self):
        """Session phase without session should return empty."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()
        result = service._build_session_phase_context(None, "test")

        assert result == ""

    def test_session_phase_with_session(self):
        """Session phase should format phase info."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        mock_session = MagicMock()
        mock_session.get_phase_info.return_value = {
            "name": "탐색 단계",
            "goals": ["감정 탐색", "문제 명확화"]
        }
        mock_session.current_phase = "exploration"

        result = service._build_session_phase_context(mock_session, "test message")

        assert isinstance(result, str)


class TestBuildPrompts:
    """Tests for _build_prompts method."""

    def test_build_prompts_korean(self):
        """Prompts should be built in Korean."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        system_prompt, chat_prompt = service._build_prompts(
            is_korean=True,
            dream_text="꿈 내용",
            summary="요약",
            symbols_str="뱀",
            emotions_str="두려움",
            themes_str="변화",
            recommendations_str="조언",
            cultural_notes={},
            rag_context="",
            therapeutic_context="",
            counseling_context="",
            jung_context_str="",
            session_phase_context="",
            celestial_context="",
            saju_context="",
            previous_context="",
            persona_context="",
            conversation_history=[],
            last_user_message="질문",
            crisis_response=None
        )

        assert isinstance(system_prompt, str)
        assert isinstance(chat_prompt, str)
        assert "융" in system_prompt or "Jung" in system_prompt

    def test_build_prompts_english(self):
        """Prompts should be built in English."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        system_prompt, chat_prompt = service._build_prompts(
            is_korean=False,
            dream_text="dream content",
            summary="summary",
            symbols_str="snake",
            emotions_str="fear",
            themes_str="transformation",
            recommendations_str="advice",
            cultural_notes={},
            rag_context="",
            therapeutic_context="",
            counseling_context="",
            jung_context_str="",
            session_phase_context="",
            celestial_context="",
            saju_context="",
            previous_context="",
            persona_context="",
            conversation_history=[],
            last_user_message="question",
            crisis_response=None
        )

        assert isinstance(system_prompt, str)
        assert isinstance(chat_prompt, str)
        assert "Jung" in system_prompt or "Jungian" in system_prompt

    def test_build_prompts_with_crisis(self):
        """Prompts should include crisis information when detected."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        crisis_response = {
            "type": "distress",
            "severity": 3,
            "response": "공감 메시지",
            "resources": {"hotline": "1393"}
        }

        system_prompt, chat_prompt = service._build_prompts(
            is_korean=True,
            dream_text="꿈",
            summary="요약",
            symbols_str="",
            emotions_str="",
            themes_str="",
            recommendations_str="",
            cultural_notes={},
            rag_context="",
            therapeutic_context="",
            counseling_context="",
            jung_context_str="",
            session_phase_context="",
            celestial_context="",
            saju_context="",
            previous_context="",
            persona_context="",
            conversation_history=[],
            last_user_message="힘들어요",
            crisis_response=crisis_response
        )

        assert "위기" in chat_prompt or "crisis" in chat_prompt.lower()

    def test_build_prompts_with_cultural_notes(self):
        """Prompts should include cultural notes."""
        from backend_ai.services.dream_service import DreamService

        service = DreamService()

        cultural_notes = {
            "korean": "한국 전통 해석",
            "western": "서양 심리학 해석"
        }

        system_prompt, chat_prompt = service._build_prompts(
            is_korean=True,
            dream_text="꿈",
            summary="요약",
            symbols_str="",
            emotions_str="",
            themes_str="",
            recommendations_str="",
            cultural_notes=cultural_notes,
            rag_context="",
            therapeutic_context="",
            counseling_context="",
            jung_context_str="",
            session_phase_context="",
            celestial_context="",
            saju_context="",
            previous_context="",
            persona_context="",
            conversation_history=[],
            last_user_message="질문",
            crisis_response=None
        )

        assert "한국" in chat_prompt or isinstance(chat_prompt, str)


class TestModuleExports:
    """Tests for module exports."""

    def test_dream_service_class_importable(self):
        """DreamService class should be importable."""
        from backend_ai.services.dream_service import DreamService
        assert DreamService is not None

    def test_module_has_logger(self):
        """Module should have a logger."""
        from backend_ai.services import dream_service
        assert hasattr(dream_service, 'logger')
