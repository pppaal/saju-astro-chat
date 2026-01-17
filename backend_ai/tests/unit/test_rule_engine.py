"""
Unit tests for Rule Engine module.

Tests:
- RuleEngine class
- Rule loading from JSON files
- Token flattening
- Rule evaluation and matching
- RLHF weight support
"""
import pytest
import json
import os
from unittest.mock import patch, MagicMock


class TestRuleEngineInit:
    """Tests for RuleEngine initialization."""

    def test_init_with_valid_dir(self, tmp_path):
        """Test initialization with valid rules directory."""
        from backend_ai.app.rule_engine import RuleEngine

        # Create a rules directory with a test file
        rules_dir = tmp_path / "rules"
        rules_dir.mkdir()
        (rules_dir / "test.json").write_text('{"rule1": "text1"}')

        engine = RuleEngine(str(rules_dir))

        assert engine.rules_dir == str(rules_dir)
        assert "test" in engine.rules

    def test_init_with_missing_dir(self, tmp_path):
        """Test initialization with missing directory raises error."""
        from backend_ai.app.rule_engine import RuleEngine

        with pytest.raises(FileNotFoundError):
            RuleEngine(str(tmp_path / "nonexistent"))

    def test_init_with_file_not_dir(self, tmp_path):
        """Test initialization with file path raises error."""
        from backend_ai.app.rule_engine import RuleEngine

        file_path = tmp_path / "not_a_dir.txt"
        file_path.write_text("not a directory")

        with pytest.raises(FileNotFoundError):
            RuleEngine(str(file_path))

    def test_loads_only_json_files(self, tmp_path):
        """Test only JSON files are loaded."""
        from backend_ai.app.rule_engine import RuleEngine

        rules_dir = tmp_path / "rules"
        rules_dir.mkdir()
        (rules_dir / "valid.json").write_text('{"rule1": "text1"}')
        (rules_dir / "ignored.txt").write_text("not json")
        (rules_dir / "also_ignored.py").write_text("# python")

        engine = RuleEngine(str(rules_dir))

        assert "valid" in engine.rules
        assert "ignored" not in engine.rules
        assert "also_ignored" not in engine.rules


class TestFlattenTokens:
    """Tests for _flatten_tokens method."""

    @pytest.fixture
    def engine(self, tmp_path):
        """Create engine with empty rules."""
        rules_dir = tmp_path / "rules"
        rules_dir.mkdir()
        (rules_dir / "empty.json").write_text("{}")

        from backend_ai.app.rule_engine import RuleEngine
        return RuleEngine(str(rules_dir))

    def test_flatten_string(self, engine):
        """Test flattening a simple string."""
        tokens = engine._flatten_tokens("hello world")
        assert "hello" in tokens
        assert "world" in tokens

    def test_flatten_string_with_separators(self, engine):
        """Test string with various separators."""
        tokens = engine._flatten_tokens("a,b|c/d")
        assert "a" in tokens
        assert "b" in tokens
        assert "c" in tokens
        assert "d" in tokens

    def test_flatten_dict(self, engine):
        """Test flattening a dict."""
        tokens = engine._flatten_tokens({"key1": "value1", "key2": "value2"})
        assert "key1" in tokens
        assert "value1" in tokens
        assert "key2" in tokens
        assert "value2" in tokens

    def test_flatten_list(self, engine):
        """Test flattening a list."""
        tokens = engine._flatten_tokens(["item1", "item2", "item3"])
        assert "item1" in tokens
        assert "item2" in tokens
        assert "item3" in tokens

    def test_flatten_nested(self, engine):
        """Test flattening nested structure."""
        tokens = engine._flatten_tokens({
            "outer": {
                "inner": ["a", "b"]
            }
        })
        assert "outer" in tokens
        assert "inner" in tokens
        assert "a" in tokens
        assert "b" in tokens

    def test_flatten_numbers(self, engine):
        """Test flattening numbers."""
        tokens = engine._flatten_tokens({"num": 42, "float": 3.14, "bool": True})
        assert "42" in tokens
        assert "3.14" in tokens
        assert "true" in tokens

    def test_flatten_none(self, engine):
        """Test flattening None."""
        tokens = engine._flatten_tokens(None)
        assert tokens == []

    def test_flatten_removes_duplicates(self, engine):
        """Test duplicate tokens are removed."""
        tokens = engine._flatten_tokens(["same", "same", "same"])
        assert tokens.count("same") == 1

    def test_flatten_lowercases(self, engine):
        """Test all tokens are lowercased."""
        tokens = engine._flatten_tokens("Hello WORLD")
        assert "hello" in tokens
        assert "world" in tokens
        assert "Hello" not in tokens


class TestEvaluate:
    """Tests for evaluate method."""

    @pytest.fixture
    def engine_with_rules(self, tmp_path):
        """Create engine with test rules."""
        rules_dir = tmp_path / "rules"
        rules_dir.mkdir()

        # Create test rules
        daily_rules = {
            "rule1": {
                "when": ["keyword1"],
                "text": "Result for keyword1",
                "weight": 2
            },
            "rule2": {
                "when": ["keyword2", "keyword3"],
                "text": "Result for keyword2+3",
                "weight": 3
            },
            "simple_rule": "Simple text result"
        }
        (rules_dir / "daily.json").write_text(json.dumps(daily_rules))

        from backend_ai.app.rule_engine import RuleEngine
        return RuleEngine(str(rules_dir))

    def test_evaluate_single_keyword(self, engine_with_rules):
        """Test evaluation with single keyword match."""
        result = engine_with_rules.evaluate({"theme": "daily", "data": "keyword1"})

        assert "matched_rules" in result
        assert "Result for keyword1" in result["matched_rules"]

    def test_evaluate_multiple_keywords(self, engine_with_rules):
        """Test evaluation with multiple keyword match."""
        result = engine_with_rules.evaluate({
            "theme": "daily",
            "data": ["keyword2", "keyword3"]
        })

        assert "Result for keyword2+3" in result["matched_rules"]

    def test_evaluate_returns_theme(self, engine_with_rules):
        """Test evaluation returns theme."""
        result = engine_with_rules.evaluate({"theme": "daily"})

        assert result["theme"] == "daily"

    def test_evaluate_returns_matched_count(self, engine_with_rules):
        """Test evaluation returns match count."""
        result = engine_with_rules.evaluate({"theme": "daily", "data": "keyword1"})

        assert "matched_count" in result
        assert result["matched_count"] >= 1

    def test_evaluate_default_theme(self, engine_with_rules):
        """Test default theme is 'daily'."""
        result = engine_with_rules.evaluate({"data": "keyword1"})

        assert result["theme"] == "daily"

    def test_evaluate_no_matches(self, engine_with_rules):
        """Test evaluation with no matches."""
        result = engine_with_rules.evaluate({"theme": "daily", "data": "nonexistent"})

        assert result["matched_count"] == 0
        assert result["matched_rules"] == []

    def test_evaluate_search_all(self, engine_with_rules):
        """Test search_all parameter."""
        result = engine_with_rules.evaluate(
            {"data": "keyword1"},
            search_all=True
        )

        # Should search across all rule sets
        assert isinstance(result, dict)


class TestRLHFWeights:
    """Tests for RLHF weight support."""

    @pytest.fixture
    def engine(self, tmp_path):
        """Create engine with test rules."""
        rules_dir = tmp_path / "rules"
        rules_dir.mkdir()

        rules = {
            "rule1": {
                "when": ["test"],
                "text": "Test result",
                "weight": 1
            }
        }
        (rules_dir / "daily.json").write_text(json.dumps(rules))

        from backend_ai.app.rule_engine import RuleEngine
        return RuleEngine(str(rules_dir))

    def test_set_rlhf_weights(self, engine):
        """Test setting RLHF weights."""
        weights = {"rule1": 1.5, "rule2": 0.8}
        engine.set_rlhf_weights(weights)

        assert engine._rlhf_weights == weights

    def test_set_rlhf_weights_empty(self, engine):
        """Test setting empty RLHF weights."""
        engine.set_rlhf_weights({})
        assert engine._rlhf_weights == {}

    def test_set_rlhf_weights_none(self, engine):
        """Test setting None RLHF weights."""
        engine.set_rlhf_weights(None)
        assert engine._rlhf_weights == {}

    def test_rlhf_weights_applied_flag(self, engine):
        """Test rlhf_weights_applied flag in result."""
        result = engine.evaluate({"theme": "daily"})
        assert result["rlhf_weights_applied"] is False

        engine.set_rlhf_weights({"rule1": 1.5})
        result = engine.evaluate({"theme": "daily"})
        assert result["rlhf_weights_applied"] is True


class TestRuleEngineOutput:
    """Tests for evaluate output structure."""

    @pytest.fixture
    def engine(self, tmp_path):
        """Create engine with test rules."""
        rules_dir = tmp_path / "rules"
        rules_dir.mkdir()
        (rules_dir / "daily.json").write_text('{"rule1": {"when": ["x"], "text": "y", "weight": 1}}')

        from backend_ai.app.rule_engine import RuleEngine
        return RuleEngine(str(rules_dir))

    def test_output_has_required_fields(self, engine):
        """Test output has all required fields."""
        result = engine.evaluate({"theme": "daily"})

        assert "theme" in result
        assert "rules_loaded" in result
        assert "matched_rules" in result
        assert "matched_rule_ids" in result
        assert "matched_count" in result
        assert "rlhf_weights_applied" in result

    def test_rules_loaded_list(self, engine):
        """Test rules_loaded is a list."""
        result = engine.evaluate({"theme": "daily"})

        assert isinstance(result["rules_loaded"], list)

    def test_matched_rules_list(self, engine):
        """Test matched_rules is a list."""
        result = engine.evaluate({"theme": "daily"})

        assert isinstance(result["matched_rules"], list)

    def test_matched_rule_ids_list(self, engine):
        """Test matched_rule_ids is a list."""
        result = engine.evaluate({"theme": "daily"})

        assert isinstance(result["matched_rule_ids"], list)


class TestRuleEngineImports:
    """Tests for module imports."""

    def test_rule_engine_importable(self):
        """RuleEngine should be importable."""
        from backend_ai.app.rule_engine import RuleEngine
        assert RuleEngine is not None

    def test_rule_engine_is_class(self):
        """RuleEngine should be a class."""
        from backend_ai.app.rule_engine import RuleEngine
        assert isinstance(RuleEngine, type)
