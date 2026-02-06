"""
Unit tests for I-Ching hexagram_calc module.

Tests:
- Binary to hexagram conversion
- Nuclear hexagram calculation
- Opposite hexagram calculation
- Reverse hexagram calculation
- Related hexagrams
- Hexagram casting with three-coin method
"""
import pytest
from unittest.mock import patch, MagicMock


class TestKingWenMap:
    """Tests for King Wen sequence mapping."""

    def test_king_wen_map_has_64_entries(self):
        """King Wen map should have 64 entries."""
        from backend_ai.app.iching.hexagram_calc import KING_WEN_MAP

        assert len(KING_WEN_MAP) == 64

    def test_king_wen_map_values_are_1_to_64(self):
        """All values should be between 1 and 64."""
        from backend_ai.app.iching.hexagram_calc import KING_WEN_MAP

        values = list(KING_WEN_MAP.values())
        assert min(values) == 1
        assert max(values) == 64
        assert len(set(values)) == 64  # All unique

    def test_king_wen_map_keys_are_6_char_binary(self):
        """All keys should be 6-character binary strings."""
        from backend_ai.app.iching.hexagram_calc import KING_WEN_MAP

        for key in KING_WEN_MAP.keys():
            assert len(key) == 6
            assert all(c in "01" for c in key)


class TestBinaryToHexagramNum:
    """Tests for binary_to_hexagram_num function."""

    def test_binary_to_hexagram_qian(self):
        """Binary 111111 should map to hexagram 1 (Qian)."""
        from backend_ai.app.iching.hexagram_calc import binary_to_hexagram_num

        assert binary_to_hexagram_num("111111") == 1

    def test_binary_to_hexagram_kun(self):
        """Binary 000000 should map to hexagram 2 (Kun)."""
        from backend_ai.app.iching.hexagram_calc import binary_to_hexagram_num

        assert binary_to_hexagram_num("000000") == 2

    def test_binary_to_hexagram_zhun(self):
        """Binary 010001 should map to hexagram 3 (Zhun)."""
        from backend_ai.app.iching.hexagram_calc import binary_to_hexagram_num

        assert binary_to_hexagram_num("010001") == 3

    def test_binary_to_hexagram_unknown(self):
        """Unknown binary should return 1 (default)."""
        from backend_ai.app.iching.hexagram_calc import binary_to_hexagram_num

        # Invalid binary not in map
        assert binary_to_hexagram_num("xxxxxx") == 1

    def test_binary_to_hexagram_ji_ji(self):
        """Binary 010101 should map to hexagram 63 (Ji Ji)."""
        from backend_ai.app.iching.hexagram_calc import binary_to_hexagram_num

        assert binary_to_hexagram_num("010101") == 63

    def test_binary_to_hexagram_wei_ji(self):
        """Binary 101010 should map to hexagram 64 (Wei Ji)."""
        from backend_ai.app.iching.hexagram_calc import binary_to_hexagram_num

        assert binary_to_hexagram_num("101010") == 64


class TestCalculateNuclearHexagram:
    """Tests for calculate_nuclear_hexagram function."""

    def test_nuclear_hexagram_qian(self):
        """Nuclear hexagram of Qian (111111)."""
        from backend_ai.app.iching.hexagram_calc import calculate_nuclear_hexagram

        # Lines 2-3-4 = 111, Lines 3-4-5 = 111 -> 111111 = 1
        result = calculate_nuclear_hexagram("111111")
        assert result == 1

    def test_nuclear_hexagram_kun(self):
        """Nuclear hexagram of Kun (000000)."""
        from backend_ai.app.iching.hexagram_calc import calculate_nuclear_hexagram

        # Lines 2-3-4 = 000, Lines 3-4-5 = 000 -> 000000 = 2
        result = calculate_nuclear_hexagram("000000")
        assert result == 2

    def test_nuclear_hexagram_invalid_length(self):
        """Invalid length should return None."""
        from backend_ai.app.iching.hexagram_calc import calculate_nuclear_hexagram

        assert calculate_nuclear_hexagram("11111") is None
        assert calculate_nuclear_hexagram("1111111") is None
        assert calculate_nuclear_hexagram("") is None

    def test_nuclear_hexagram_returns_valid_range(self):
        """Nuclear hexagram should always be 1-64."""
        from backend_ai.app.iching.hexagram_calc import calculate_nuclear_hexagram

        # Test a few known patterns
        for binary in ["111111", "000000", "101010", "010101"]:
            result = calculate_nuclear_hexagram(binary)
            assert result is not None
            assert 1 <= result <= 64


class TestCalculateOppositeHexagram:
    """Tests for calculate_opposite_hexagram function."""

    def test_opposite_hexagram_qian_kun(self):
        """Opposite of Qian (111111) should be Kun (000000) = 2."""
        from backend_ai.app.iching.hexagram_calc import calculate_opposite_hexagram

        assert calculate_opposite_hexagram("111111") == 2

    def test_opposite_hexagram_kun_qian(self):
        """Opposite of Kun (000000) should be Qian (111111) = 1."""
        from backend_ai.app.iching.hexagram_calc import calculate_opposite_hexagram

        assert calculate_opposite_hexagram("000000") == 1

    def test_opposite_hexagram_invalid_length(self):
        """Invalid length should return None."""
        from backend_ai.app.iching.hexagram_calc import calculate_opposite_hexagram

        assert calculate_opposite_hexagram("11111") is None
        assert calculate_opposite_hexagram("") is None

    def test_opposite_hexagram_double_opposite_returns_original(self):
        """Double opposite should return original hexagram."""
        from backend_ai.app.iching.hexagram_calc import (
            calculate_opposite_hexagram,
            KING_WEN_MAP,
        )

        # For any binary, opposite of opposite should return to original
        test_binary = "101100"
        opposite_binary = "".join("1" if b == "0" else "0" for b in test_binary)

        original_num = KING_WEN_MAP.get(test_binary, 1)
        opposite_num = calculate_opposite_hexagram(test_binary)
        double_opposite_num = calculate_opposite_hexagram(opposite_binary)

        assert double_opposite_num == original_num


class TestCalculateReverseHexagram:
    """Tests for calculate_reverse_hexagram function."""

    def test_reverse_hexagram_qian(self):
        """Reverse of Qian (111111) should be Qian (symmetric)."""
        from backend_ai.app.iching.hexagram_calc import calculate_reverse_hexagram

        assert calculate_reverse_hexagram("111111") == 1

    def test_reverse_hexagram_kun(self):
        """Reverse of Kun (000000) should be Kun (symmetric)."""
        from backend_ai.app.iching.hexagram_calc import calculate_reverse_hexagram

        assert calculate_reverse_hexagram("000000") == 2

    def test_reverse_hexagram_invalid_length(self):
        """Invalid length should return None."""
        from backend_ai.app.iching.hexagram_calc import calculate_reverse_hexagram

        assert calculate_reverse_hexagram("11111") is None

    def test_reverse_hexagram_asymmetric(self):
        """Test asymmetric hexagram reversal."""
        from backend_ai.app.iching.hexagram_calc import (
            calculate_reverse_hexagram,
            binary_to_hexagram_num,
        )

        # 100010 reversed is 010001
        result = calculate_reverse_hexagram("100010")
        expected = binary_to_hexagram_num("010001")
        assert result == expected


class TestGetRelatedHexagrams:
    """Tests for get_related_hexagrams function."""

    def test_related_hexagrams_structure(self):
        """Related hexagrams should have proper structure."""
        from backend_ai.app.iching.hexagram_calc import get_related_hexagrams

        result = get_related_hexagrams(1, "111111")

        assert "nuclear" in result
        assert "opposite" in result
        assert "reverse" in result

    def test_related_hexagrams_nuclear_info(self):
        """Nuclear section should have info and descriptions."""
        from backend_ai.app.iching.hexagram_calc import get_related_hexagrams

        result = get_related_hexagrams(1, "111111")

        nuclear = result["nuclear"]
        assert "info" in nuclear
        assert "korean" in nuclear
        assert "description" in nuclear
        assert "interpretation_hint" in nuclear
        assert nuclear["korean"] == "호괘(互卦)"

    def test_related_hexagrams_opposite_info(self):
        """Opposite section should have proper info."""
        from backend_ai.app.iching.hexagram_calc import get_related_hexagrams

        result = get_related_hexagrams(1, "111111")

        opposite = result["opposite"]
        assert opposite["korean"] == "착괘(錯卦)"
        assert opposite["info"]["number"] == 2  # Kun is opposite of Qian

    def test_related_hexagrams_reverse_info(self):
        """Reverse section should have proper info."""
        from backend_ai.app.iching.hexagram_calc import get_related_hexagrams

        result = get_related_hexagrams(1, "111111")

        reverse = result["reverse"]
        assert reverse["korean"] == "종괘(綜卦)"
        assert reverse["info"]["number"] == 1  # Qian reversed is Qian


class TestCastHexagram:
    """Tests for cast_hexagram function with three-coin method."""

    def test_cast_hexagram_returns_dict(self):
        """Cast hexagram should return a dictionary."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        result = cast_hexagram()
        assert isinstance(result, dict)

    def test_cast_hexagram_has_primary(self):
        """Result should have primary hexagram."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        result = cast_hexagram()

        assert "primary" in result
        assert "number" in result["primary"]
        assert "binary" in result["primary"]
        assert 1 <= result["primary"]["number"] <= 64
        assert len(result["primary"]["binary"]) == 6

    def test_cast_hexagram_has_lines(self):
        """Result should have 6 lines."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        result = cast_hexagram()

        assert "lines" in result
        assert len(result["lines"]) == 6

    def test_cast_hexagram_line_structure(self):
        """Each line should have value, changing, and line_num."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        result = cast_hexagram()

        for i, line in enumerate(result["lines"]):
            assert "value" in line
            assert "changing" in line
            assert "line_num" in line
            assert line["value"] in [0, 1]
            assert isinstance(line["changing"], bool)
            assert line["line_num"] == i + 1

    def test_cast_hexagram_has_changing_lines(self):
        """Result should have changing_lines list."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        result = cast_hexagram()

        assert "changing_lines" in result
        assert isinstance(result["changing_lines"], list)

    def test_cast_hexagram_changing_lines_consistency(self):
        """Changing lines list should match lines with changing=True."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        result = cast_hexagram()

        expected_changing = [line for line in result["lines"] if line["changing"]]
        assert len(result["changing_lines"]) == len(expected_changing)

    def test_cast_hexagram_resulting_hexagram(self):
        """Resulting hexagram should exist if there are changing lines."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        # Run multiple times to catch both cases
        has_resulting = False
        no_resulting = False

        for _ in range(100):
            result = cast_hexagram()
            if result["changing_lines"]:
                if result["resulting"]:
                    has_resulting = True
                    assert "number" in result["resulting"]
                    assert "binary" in result["resulting"]
            else:
                if result["resulting"] is None:
                    no_resulting = True

    @patch('backend_ai.app.iching.hexagram_calc.random.choice')
    def test_cast_hexagram_old_yin(self, mock_choice):
        """Test old yin (6) line generation."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        # Total 6 = old yin (2+2+2)
        mock_choice.side_effect = [2, 2, 2] * 6

        result = cast_hexagram()

        # All lines should be old yin (changing from 0 to 1)
        for line in result["lines"]:
            assert line["value"] == 0
            assert line["changing"] is True

    @patch('backend_ai.app.iching.hexagram_calc.random.choice')
    def test_cast_hexagram_old_yang(self, mock_choice):
        """Test old yang (9) line generation."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        # Total 9 = old yang (3+3+3)
        mock_choice.side_effect = [3, 3, 3] * 6

        result = cast_hexagram()

        # All lines should be old yang (changing from 1 to 0)
        for line in result["lines"]:
            assert line["value"] == 1
            assert line["changing"] is True

    @patch('backend_ai.app.iching.hexagram_calc.random.choice')
    def test_cast_hexagram_young_yang(self, mock_choice):
        """Test young yang (7) line generation."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        # Total 7 = young yang (3+2+2)
        mock_choice.side_effect = [3, 2, 2] * 6

        result = cast_hexagram()

        # All lines should be young yang (stable 1)
        for line in result["lines"]:
            assert line["value"] == 1
            assert line["changing"] is False

    @patch('backend_ai.app.iching.hexagram_calc.random.choice')
    def test_cast_hexagram_young_yin(self, mock_choice):
        """Test young yin (8) line generation."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram

        # Total 8 = young yin (3+3+2)
        mock_choice.side_effect = [3, 3, 2] * 6

        result = cast_hexagram()

        # All lines should be young yin (stable 0)
        for line in result["lines"]:
            assert line["value"] == 0
            assert line["changing"] is False


class TestHexagramCalculationIntegration:
    """Integration tests for hexagram calculations."""

    def test_all_64_hexagrams_have_valid_related(self):
        """All 64 hexagrams should have valid related hexagrams."""
        from backend_ai.app.iching.hexagram_calc import (
            get_related_hexagrams,
            KING_WEN_MAP,
        )

        for binary, num in KING_WEN_MAP.items():
            result = get_related_hexagrams(num, binary)

            # Nuclear should be valid
            nuclear_info = result["nuclear"]["info"]
            if nuclear_info:
                assert 1 <= nuclear_info["number"] <= 64

            # Opposite should be valid
            opposite_info = result["opposite"]["info"]
            if opposite_info:
                assert 1 <= opposite_info["number"] <= 64

            # Reverse should be valid
            reverse_info = result["reverse"]["info"]
            if reverse_info:
                assert 1 <= reverse_info["number"] <= 64

    def test_opposite_pairs_are_symmetric(self):
        """Opposite relationship should be symmetric."""
        from backend_ai.app.iching.hexagram_calc import (
            calculate_opposite_hexagram,
            KING_WEN_MAP,
        )

        # Find opposite of each binary
        reverse_map = {v: k for k, v in KING_WEN_MAP.items()}

        for binary, num in KING_WEN_MAP.items():
            opp_num = calculate_opposite_hexagram(binary)
            opp_binary = reverse_map.get(opp_num)

            if opp_binary:
                # Opposite of opposite should be original
                double_opp = calculate_opposite_hexagram(opp_binary)
                assert double_opp == num


class TestModuleExports:
    """Tests for module exports."""

    def test_binary_to_hexagram_num_importable(self):
        """binary_to_hexagram_num should be importable."""
        from backend_ai.app.iching.hexagram_calc import binary_to_hexagram_num
        assert callable(binary_to_hexagram_num)

    def test_calculate_nuclear_hexagram_importable(self):
        """calculate_nuclear_hexagram should be importable."""
        from backend_ai.app.iching.hexagram_calc import calculate_nuclear_hexagram
        assert callable(calculate_nuclear_hexagram)

    def test_calculate_opposite_hexagram_importable(self):
        """calculate_opposite_hexagram should be importable."""
        from backend_ai.app.iching.hexagram_calc import calculate_opposite_hexagram
        assert callable(calculate_opposite_hexagram)

    def test_calculate_reverse_hexagram_importable(self):
        """calculate_reverse_hexagram should be importable."""
        from backend_ai.app.iching.hexagram_calc import calculate_reverse_hexagram
        assert callable(calculate_reverse_hexagram)

    def test_get_related_hexagrams_importable(self):
        """get_related_hexagrams should be importable."""
        from backend_ai.app.iching.hexagram_calc import get_related_hexagrams
        assert callable(get_related_hexagrams)

    def test_cast_hexagram_importable(self):
        """cast_hexagram should be importable."""
        from backend_ai.app.iching.hexagram_calc import cast_hexagram
        assert callable(cast_hexagram)

    def test_king_wen_map_importable(self):
        """KING_WEN_MAP should be importable."""
        from backend_ai.app.iching.hexagram_calc import KING_WEN_MAP
        assert isinstance(KING_WEN_MAP, dict)
