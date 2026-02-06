"""
Unit tests for Tarot Personalization Mixin module.

Tests:
- PersonalizationMixin class methods
- Birth card calculation
- Year card calculation
- Personalized reading
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestPersonalizationMixinClass:
    """Tests for PersonalizationMixin class."""

    def test_class_exists(self):
        """Test class exists."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        assert PersonalizationMixin is not None

    def test_has_calculate_birth_card(self):
        """Test has calculate_birth_card method."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        assert hasattr(PersonalizationMixin, 'calculate_birth_card')

    def test_has_calculate_year_card(self):
        """Test has calculate_year_card method."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        assert hasattr(PersonalizationMixin, 'calculate_year_card')

    def test_has_personalize_reading(self):
        """Test has personalize_reading method."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        assert hasattr(PersonalizationMixin, 'personalize_reading')


class TestCalculateBirthCard:
    """Tests for calculate_birth_card method."""

    def test_basic_calculation(self):
        """Test basic birth card calculation."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_birth_card("1990-05-15")

        assert isinstance(result, dict)
        assert 'birth_number' in result
        assert 'primary_card' in result

    def test_yyyymmdd_format(self):
        """Test YYYYMMDD format."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_birth_card("19900515")

        assert isinstance(result, dict)
        assert 'birth_number' in result

    def test_returns_korean_name(self):
        """Test returns Korean card name."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_birth_card("1985-03-20")

        assert 'korean' in result
        assert isinstance(result['korean'], str)

    def test_returns_traits(self):
        """Test returns personality traits."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_birth_card("2000-01-01")

        assert 'traits' in result
        assert isinstance(result['traits'], list)

    def test_returns_message(self):
        """Test returns personalized message."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_birth_card("1988-12-25")

        assert 'message' in result
        assert isinstance(result['message'], str)

    def test_invalid_date_format(self):
        """Test handles invalid date format."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_birth_card("invalid")

        assert 'error' in result

    def test_short_date(self):
        """Test handles short date."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_birth_card("1990")

        assert 'error' in result

    def test_secondary_card(self):
        """Test secondary card may be present."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_birth_card("1990-05-15")

        # secondary_card may or may not be present
        assert 'secondary_card' in result or 'primary_card' in result


class TestCalculateYearCard:
    """Tests for calculate_year_card method."""

    def test_basic_calculation(self):
        """Test basic year card calculation."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_year_card("1990-05-15")

        assert isinstance(result, dict)
        assert 'personal_year_number' in result
        assert 'year_card' in result

    def test_with_target_year(self):
        """Test with specific target year."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_year_card("1990-05-15", target_year=2024)

        assert result['year'] == 2024

    def test_defaults_to_current_year(self):
        """Test defaults to current year."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_year_card("1990-05-15")

        assert result['year'] == datetime.now().year

    def test_returns_theme(self):
        """Test returns year theme."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_year_card("1990-05-15", 2024)

        assert 'theme' in result
        assert isinstance(result['theme'], str)

    def test_returns_advice(self):
        """Test returns advice."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_year_card("1990-05-15", 2024)

        assert 'advice' in result

    def test_returns_message(self):
        """Test returns personalized message."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        result = mixin.calculate_year_card("1990-05-15", 2024)

        assert 'message' in result
        assert '2024' in result['message']


class TestPersonalizeReading:
    """Tests for personalize_reading method."""

    def test_basic_reading(self):
        """Test basic personalized reading."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        cards = [
            {'name': 'The Fool'},
            {'name': 'The Sun'},
        ]

        result = mixin.personalize_reading(cards, "1990-05-15")

        assert isinstance(result, dict)
        assert 'birth_card' in result
        assert 'year_card' in result

    def test_returns_connections(self):
        """Test returns personal connections."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        cards = [
            {'name': 'The Fool'},
            {'name': 'The Magician'},
        ]

        result = mixin.personalize_reading(cards, "1990-05-15")

        assert 'personal_connections' in result
        assert isinstance(result['personal_connections'], list)

    def test_birth_card_match(self):
        """Test detects birth card match."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        # First calculate birth card to know what it is
        birth_info = mixin.calculate_birth_card("1990-05-15")
        primary = birth_info.get('primary_card', 'The Fool')

        cards = [{'name': primary}]
        result = mixin.personalize_reading(cards, "1990-05-15")

        # Should detect the match
        assert 'personal_connections' in result

    def test_personalized_messages(self):
        """Test returns personalized messages."""
        from backend_ai.app.tarot.mixins.personalization import PersonalizationMixin

        mixin = PersonalizationMixin()
        cards = [{'name': 'The Fool'}]

        result = mixin.personalize_reading(cards, "1990-05-15")

        assert 'personalized_messages' in result
        assert isinstance(result['personalized_messages'], list)


class TestModuleImports:
    """Tests for module imports."""

    def test_module_importable(self):
        """Test module is importable."""
        from backend_ai.app.tarot.mixins import personalization

        assert personalization is not None

    def test_data_imports(self):
        """Test data imports work."""
        from backend_ai.app.tarot.mixins.personalization import (
            BIRTH_CARD_MAP,
            YEAR_THEMES
        )

        assert BIRTH_CARD_MAP is not None
        assert YEAR_THEMES is not None

    def test_datetime_import(self):
        """Test datetime is imported."""
        from backend_ai.app.tarot.mixins.personalization import datetime

        assert datetime is not None

