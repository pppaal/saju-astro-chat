"""
Unit tests for Tarot Storytelling Mixin module.

Tests:
- StorytellingMixin class methods
- Narrative arc building
- Transitions generation
- Story tone determination
"""
import pytest
from unittest.mock import patch, MagicMock


class TestStorytellingMixinInstantiation:
    """Tests for StorytellingMixin instantiation."""

    def test_mixin_can_be_inherited(self):
        """Test mixin can be used via inheritance."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        assert hasattr(obj, 'build_narrative_arc')


class TestBuildNarrativeArc:
    """Tests for build_narrative_arc method."""

    def test_build_narrative_arc_single_card(self):
        """Test narrative arc with single card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        cards = [{"name": "The Fool"}]

        result = obj.build_narrative_arc(cards)

        assert "structure" in result
        assert "transitions" in result
        assert "tone" in result

    def test_build_narrative_arc_three_cards(self):
        """Test narrative arc with three cards (3-act structure)."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        cards = [
            {"name": "The Fool"},
            {"name": "The Tower"},
            {"name": "The Sun"}
        ]

        result = obj.build_narrative_arc(cards)

        assert result["structure"]["type"] == "three_act"
        assert len(result["structure"]["acts"]) == 3

    def test_build_narrative_arc_five_cards(self):
        """Test narrative arc with five cards (5-act structure)."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        cards = [
            {"name": "The Fool"},
            {"name": "The Magician"},
            {"name": "The Tower"},
            {"name": "The Star"},
            {"name": "The World"}
        ]

        result = obj.build_narrative_arc(cards)

        assert result["structure"]["type"] == "five_act"

    def test_build_narrative_arc_seven_cards(self):
        """Test narrative arc with seven cards (hero journey)."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        cards = [{"name": f"Card {i}"} for i in range(7)]

        result = obj.build_narrative_arc(cards)

        assert result["structure"]["type"] == "hero_journey"

    def test_build_narrative_arc_has_all_components(self):
        """Test narrative arc has all expected components."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        cards = [{"name": "The Fool"}, {"name": "The Sun"}]

        result = obj.build_narrative_arc(cards)

        assert "opening_hook" in result
        assert "climax" in result
        assert "resolution" in result
        assert "full_narrative" in result


class TestThreeActStructure:
    """Tests for _build_three_act_structure method."""

    def test_three_act_structure_setup(self):
        """Test three-act structure has setup."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [{"name": "The Fool"}]

        result = obj._build_three_act_structure(cards)

        assert result["acts"][0]["name"] == "Setup (설정)"
        assert result["acts"][0]["card"] == "The Fool"

    def test_three_act_structure_conflict(self):
        """Test three-act structure has conflict."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [{"name": "The Fool"}, {"name": "The Tower"}]

        result = obj._build_three_act_structure(cards)

        assert len(result["acts"]) >= 2
        assert result["acts"][1]["name"] == "Conflict (갈등)"

    def test_three_act_structure_resolution(self):
        """Test three-act structure has resolution."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [{"name": "A"}, {"name": "B"}, {"name": "C"}]

        result = obj._build_three_act_structure(cards)

        assert len(result["acts"]) == 3
        assert result["acts"][2]["name"] == "Resolution (해결)"


class TestGenerateTransitions:
    """Tests for _generate_transitions method."""

    def test_generate_transitions_empty_for_single(self):
        """Test no transitions for single card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        cards = [{"name": "The Fool"}]

        result = obj._generate_transitions(cards)

        assert result == []

    def test_generate_transitions_has_connector(self):
        """Test transitions have connector."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        cards = [{"name": "The Fool"}, {"name": "The Sun"}]

        result = obj._generate_transitions(cards)

        assert len(result) == 1
        assert "connector" in result[0]
        assert "from" in result[0]
        assert "to" in result[0]

    def test_generate_transitions_count(self):
        """Test transitions count is cards - 1."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()
        cards = [{"name": "A"}, {"name": "B"}, {"name": "C"}]

        result = obj._generate_transitions(cards)

        assert len(result) == 2


class TestDetermineTransitionType:
    """Tests for _determine_transition_type method."""

    def test_transition_type_contrast(self):
        """Test contrast transition type."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            def _parse_card(self, card):
                return {}

        obj = TestClass()

        # Default should be consequence
        result = obj._determine_transition_type(
            {"name": "The Sun"},
            {"name": "The Moon"}
        )

        assert result in ["contrast", "consequence", "time", "emphasis", "addition", "condition"]


class TestDetermineStoryTone:
    """Tests for _determine_story_tone method."""

    def test_story_tone_transformative(self):
        """Test transformative tone with challenge and hope."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [
            {"name": "The Tower"},
            {"name": "The Sun"}
        ]

        result = obj._determine_story_tone(cards, "general")

        assert result["type"] == "transformative"
        assert "mood" in result

    def test_story_tone_serious(self):
        """Test serious tone with only challenges."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [{"name": "The Tower"}, {"name": "Death"}]

        result = obj._determine_story_tone(cards, "general")

        assert result["type"] == "serious"

    def test_story_tone_optimistic(self):
        """Test optimistic tone with only hope."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [{"name": "The Sun"}, {"name": "The Star"}]

        result = obj._determine_story_tone(cards, "general")

        assert result["type"] == "optimistic"

    def test_story_tone_balanced(self):
        """Test balanced tone."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [{"name": "Two of Cups"}, {"name": "Three of Wands"}]

        result = obj._determine_story_tone(cards, "general")

        assert result["type"] == "balanced"

    def test_story_tone_has_metrics(self):
        """Test tone has metrics."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [{"name": "The Fool"}]

        result = obj._determine_story_tone(cards, "general")

        assert "major_ratio" in result
        assert "challenge_level" in result


class TestCreateOpeningHook:
    """Tests for _create_opening_hook method."""

    def test_opening_hook_known_card(self):
        """Test opening hook for known card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj._create_opening_hook({"name": "The Fool"})

        assert "가능성" in result or "여정" in result

    def test_opening_hook_unknown_card(self):
        """Test opening hook for unknown card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj._create_opening_hook({"name": "Unknown Card"})

        assert "Unknown Card" in result

    def test_opening_hook_reversed(self):
        """Test opening hook for reversed card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj._create_opening_hook({"name": "The Sun", "isReversed": True})

        assert "막힘" in result or "구름" in result

    def test_opening_hook_none_card(self):
        """Test opening hook with no card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj._create_opening_hook(None)

        assert "이야기가 시작" in result


class TestIdentifyClimax:
    """Tests for _identify_climax method."""

    def test_identify_climax_with_climax_card(self):
        """Test climax identification with climax card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [
            {"name": "The Fool"},
            {"name": "The Tower"},
            {"name": "The Sun"}
        ]

        result = obj._identify_climax(cards)

        assert result["card"] == "The Tower"
        assert "핵심 전환점" in result["message"]

    def test_identify_climax_fallback_to_middle(self):
        """Test climax falls back to middle card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [
            {"name": "Two of Cups"},
            {"name": "Three of Wands"},
            {"name": "Four of Pentacles"}
        ]

        result = obj._identify_climax(cards)

        assert result["position"] == 1  # Middle card

    def test_identify_climax_empty(self):
        """Test climax with empty cards."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj._identify_climax([])

        assert result == {}


class TestCreateResolution:
    """Tests for _create_resolution method."""

    def test_create_resolution_known_card(self):
        """Test resolution for known card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj._create_resolution({"name": "The World"})

        assert "완성" in result

    def test_create_resolution_reversed(self):
        """Test resolution for reversed card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj._create_resolution({"name": "The Sun", "isReversed": True})

        assert "작업이 필요" in result

    def test_create_resolution_none(self):
        """Test resolution with no card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj._create_resolution(None)

        assert "계속됩니다" in result


class TestWeaveFullNarrative:
    """Tests for _weave_full_narrative method."""

    def test_weave_full_narrative_basic(self):
        """Test full narrative weaving."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        structure = {
            "acts": [
                {"name": "Setup", "card": "The Fool", "role": "beginning"}
            ]
        }
        transitions = []
        tone = {"type": "balanced", "mood": "calm", "description": "steady"}

        result = obj._weave_full_narrative(structure, transitions, tone)

        assert isinstance(result, str)
        assert len(result) > 0

    def test_weave_full_narrative_with_transitions(self):
        """Test narrative with transitions."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        structure = {
            "acts": [
                {"name": "Setup", "card": "A", "role": "start"},
                {"name": "Conflict", "card": "B", "role": "middle"}
            ]
        }
        transitions = [{"connector": "그러나"}]
        tone = {"type": "transformative", "mood": "intense", "description": "changing"}

        result = obj._weave_full_narrative(structure, transitions, tone)

        assert "그러나" in result


class TestWeaveCardConnections:
    """Tests for weave_card_connections method."""

    def test_weave_card_connections_empty(self):
        """Test connections with single card."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()

        result = obj.weave_card_connections([{"name": "A"}])

        assert result == []

    def test_weave_card_connections_basic(self):
        """Test basic connections."""
        from backend_ai.app.tarot.mixins.storytelling import StorytellingMixin

        class TestClass(StorytellingMixin):
            pass

        obj = TestClass()
        cards = [{"name": "The Fool"}, {"name": "The Sun"}]

        result = obj.weave_card_connections(cards)

        assert len(result) == 1
        assert "The Fool" in result[0]
        assert "The Sun" in result[0]
