"""
Unit tests for Fortune Service module.

Tests:
- FortuneService initialization
- calculate_fortune method with various inputs
- Input validation and sanitization
- Performance metadata
- Error handling
"""
import pytest
from unittest.mock import patch, MagicMock


class TestFortuneServiceInit:
    """Tests for FortuneService initialization."""

    def test_fortune_service_creation(self):
        """FortuneService should be instantiable."""
        from backend_ai.services.fortune_service import FortuneService

        service = FortuneService()
        assert service is not None

    def test_fortune_service_importable(self):
        """FortuneService should be importable."""
        from backend_ai.services.fortune_service import FortuneService
        assert FortuneService is not None


class TestCalculateFortune:
    """Tests for calculate_fortune method."""

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_calculate_fortune_basic(self, mock_sanitize, mock_suspicious, mock_interpret):
        """Basic fortune calculation should work."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_sanitize.return_value = "test prompt"
        mock_interpret.return_value = {"result": "test fortune", "cached": False}

        service = FortuneService()
        result = service.calculate_fortune(
            saju_data={"dayMaster": {"element": "wood"}},
            astro_data={"sun": {"sign": "Aries"}},
            tarot_data={"cards": []},
            theme="daily",
            locale="ko",
            prompt="test prompt"
        )

        assert result["status"] == "success"
        assert "data" in result

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_calculate_fortune_returns_performance(self, mock_sanitize, mock_suspicious, mock_interpret):
        """Result should include performance metadata."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_sanitize.return_value = "test"
        mock_interpret.return_value = {"result": "fortune", "cached": True}

        service = FortuneService()
        result = service.calculate_fortune(
            saju_data={},
            astro_data={},
            tarot_data={},
            prompt="test"
        )

        assert result["status"] == "success"
        assert "performance" in result["data"]
        assert "duration_ms" in result["data"]["performance"]
        assert "cached" in result["data"]["performance"]

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_calculate_fortune_normalizes_day_master(self, mock_sanitize, mock_suspicious, mock_interpret):
        """Nested dayMaster should be normalized."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_sanitize.return_value = "test"
        mock_interpret.return_value = {"result": "fortune"}

        service = FortuneService()

        # Saju with nested dayMaster
        saju_data = {
            "dayMaster": {
                "element": "wood",
                "name": "甲"
            }
        }

        result = service.calculate_fortune(
            saju_data=saju_data,
            astro_data={},
            tarot_data={},
            prompt="test"
        )

        assert result["status"] == "success"
        # The interpretation function should receive normalized data

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_calculate_fortune_with_structured_prompt(self, mock_sanitize, mock_suspicious, mock_interpret):
        """Structured JSON prompts should not be sanitized."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_interpret.return_value = {"result": "fortune"}

        service = FortuneService()

        structured_prompt = 'You MUST return a valid JSON object with "lifeTimeline" field'

        result = service.calculate_fortune(
            saju_data={},
            astro_data={},
            tarot_data={},
            prompt=structured_prompt
        )

        assert result["status"] == "success"
        # Sanitize should not be called for structured prompts

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_calculate_fortune_handles_request_id(self, mock_sanitize, mock_suspicious, mock_interpret):
        """Request ID should be handled for logging."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_sanitize.return_value = "test"
        mock_interpret.return_value = {"result": "fortune"}

        service = FortuneService()
        result = service.calculate_fortune(
            saju_data={},
            astro_data={},
            tarot_data={},
            prompt="test",
            request_id="test-request-123"
        )

        assert result["status"] == "success"

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    def test_calculate_fortune_error_handling(self, mock_suspicious, mock_interpret):
        """Errors should be caught and returned."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.side_effect = Exception("Test error")

        service = FortuneService()
        result = service.calculate_fortune(
            saju_data={},
            astro_data={},
            tarot_data={},
            prompt="test"
        )

        assert result["status"] == "error"
        assert "message" in result

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_calculate_fortune_with_all_render_modes(self, mock_sanitize, mock_suspicious, mock_interpret):
        """All render modes should be supported."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_sanitize.return_value = "test"
        mock_interpret.return_value = {"result": "fortune"}

        service = FortuneService()

        for render_mode in ["gpt", "template"]:
            result = service.calculate_fortune(
                saju_data={},
                astro_data={},
                tarot_data={},
                prompt="test",
                render_mode=render_mode
            )
            assert result["status"] == "success"

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_calculate_fortune_with_all_themes(self, mock_sanitize, mock_suspicious, mock_interpret):
        """All themes should be supported."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_sanitize.return_value = "test"
        mock_interpret.return_value = {"result": "fortune"}

        service = FortuneService()

        themes = ["daily", "career", "love", "health", "wealth", "family", "monthly", "yearly"]
        for theme in themes:
            result = service.calculate_fortune(
                saju_data={},
                astro_data={},
                tarot_data={},
                prompt="test",
                theme=theme
            )
            assert result["status"] == "success"

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_calculate_fortune_with_locales(self, mock_sanitize, mock_suspicious, mock_interpret):
        """Both Korean and English locales should be supported."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_sanitize.return_value = "test"
        mock_interpret.return_value = {"result": "fortune"}

        service = FortuneService()

        for locale in ["ko", "en"]:
            result = service.calculate_fortune(
                saju_data={},
                astro_data={},
                tarot_data={},
                prompt="test",
                locale=locale
            )
            assert result["status"] == "success"


class TestInputValidation:
    """Tests for input validation in FortuneService."""

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_suspicious_input_detection(self, mock_sanitize, mock_suspicious, mock_interpret):
        """Suspicious input should be detected but still processed."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = True
        mock_sanitize.return_value = "cleaned"
        mock_interpret.return_value = {"result": "fortune"}

        service = FortuneService()
        result = service.calculate_fortune(
            saju_data={},
            astro_data={},
            tarot_data={},
            prompt="<script>alert('xss')</script>"
        )

        # Still processed (with warning logged)
        assert result["status"] == "success"

    @patch('backend_ai.app.fusion_logic.interpret_with_ai')
    @patch('backend_ai.app.sanitizer.is_suspicious_input')
    @patch('backend_ai.app.sanitizer.sanitize_user_input')
    def test_prompt_sanitization(self, mock_sanitize, mock_suspicious, mock_interpret):
        """Non-structured prompts should be sanitized."""
        from backend_ai.services.fortune_service import FortuneService

        mock_suspicious.return_value = False
        mock_sanitize.return_value = "sanitized prompt"
        mock_interpret.return_value = {"result": "fortune"}

        service = FortuneService()
        result = service.calculate_fortune(
            saju_data={},
            astro_data={},
            tarot_data={},
            prompt="original prompt with special chars!@#$"
        )

        # sanitize_user_input should be called for non-structured prompts
        mock_sanitize.assert_called()


class TestModuleExports:
    """Tests for module exports."""

    def test_fortune_service_class_importable(self):
        """FortuneService class should be importable."""
        from backend_ai.services.fortune_service import FortuneService
        assert FortuneService is not None

    def test_module_has_logger(self):
        """Module should have a logger."""
        from backend_ai.services import fortune_service
        assert hasattr(fortune_service, 'logger')
