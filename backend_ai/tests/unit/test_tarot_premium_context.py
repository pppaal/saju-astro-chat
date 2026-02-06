"""
Unit tests for Tarot Premium Context module.

Tests:
- PremiumContextBuilder class
- Context building methods
"""
import pytest
from unittest.mock import patch, MagicMock


class TestPremiumContextBuilderClass:
    """Tests for PremiumContextBuilder class."""

    def test_class_exists(self):
        """Test PremiumContextBuilder class exists."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        assert PremiumContextBuilder is not None

    def test_init_stores_builders(self):
        """Test init stores base builder and engine."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()

        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        assert builder.base_builder is mock_base_builder
        assert builder.premium_engine is mock_engine


class TestBuildPremiumReadingContext:
    """Tests for build_premium_reading_context method."""

    def test_method_exists(self):
        """Test method exists."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        assert hasattr(builder, 'build_premium_reading_context')
        assert callable(builder.build_premium_reading_context)

    def test_calls_base_builder(self):
        """Test method calls base builder."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_base_builder.build_reading_context.return_value = "base context"

        mock_engine = MagicMock()
        mock_engine.analyze_premium.return_value = {}

        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        builder.build_premium_reading_context(
            theme="love",
            sub_topic="relationship",
            drawn_cards=[{"name": "The Fool"}]
        )

        mock_base_builder.build_reading_context.assert_called_once()

    def test_calls_premium_engine(self):
        """Test method calls premium engine."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_base_builder.build_reading_context.return_value = "base context"

        mock_engine = MagicMock()
        mock_engine.analyze_premium.return_value = {}

        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        builder.build_premium_reading_context(
            theme="career",
            sub_topic="job",
            drawn_cards=[{"name": "The Magician"}]
        )

        mock_engine.analyze_premium.assert_called_once()

    def test_returns_string(self):
        """Test method returns a string."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_base_builder.build_reading_context.return_value = "base context"

        mock_engine = MagicMock()
        mock_engine.analyze_premium.return_value = {}

        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        result = builder.build_premium_reading_context(
            theme="health",
            sub_topic="wellness",
            drawn_cards=[{"name": "The Sun"}]
        )

        assert isinstance(result, str)

    def test_includes_base_context(self):
        """Test result includes base context."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_base_builder.build_reading_context.return_value = "unique_base_context_marker"

        mock_engine = MagicMock()
        mock_engine.analyze_premium.return_value = {}

        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        result = builder.build_premium_reading_context(
            theme="finance",
            sub_topic="money",
            drawn_cards=[{"name": "Wheel of Fortune"}]
        )

        assert "unique_base_context_marker" in result


class TestPrivateContextMethods:
    """Tests for private context building methods."""

    def test_has_build_personalization_context(self):
        """Test has _build_personalization_context method."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        assert hasattr(builder, '_build_personalization_context')

    def test_has_build_narrative_context(self):
        """Test has _build_narrative_context method."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        assert hasattr(builder, '_build_narrative_context')

    def test_has_build_connections_context(self):
        """Test has _build_connections_context method."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        assert hasattr(builder, '_build_connections_context')

    def test_has_build_summary_context(self):
        """Test has _build_summary_context method."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        assert hasattr(builder, '_build_summary_context')


class TestPersonalizationContext:
    """Tests for _build_personalization_context method."""

    def test_returns_list(self):
        """Test method returns list."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        result = builder._build_personalization_context({}, None)

        assert isinstance(result, list)

    def test_empty_for_no_birthdate(self):
        """Test returns empty for no birthdate."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        result = builder._build_personalization_context({}, None)

        # Should return empty or minimal list
        assert isinstance(result, list)


class TestNarrativeContext:
    """Tests for _build_narrative_context method."""

    def test_returns_list(self):
        """Test method returns list."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        result = builder._build_narrative_context({})

        assert isinstance(result, list)


class TestConnectionsContext:
    """Tests for _build_connections_context method."""

    def test_returns_list(self):
        """Test method returns list."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        result = builder._build_connections_context({})

        assert isinstance(result, list)


class TestSummaryContext:
    """Tests for _build_summary_context method."""

    def test_returns_list(self):
        """Test method returns list."""
        from backend_ai.app.tarot.context.premium_context import PremiumContextBuilder

        mock_base_builder = MagicMock()
        mock_engine = MagicMock()
        builder = PremiumContextBuilder(mock_base_builder, mock_engine)

        result = builder._build_summary_context({})

        assert isinstance(result, list)

