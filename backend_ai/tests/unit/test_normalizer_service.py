"""
Normalizer Service Tests

Tests for data normalization functions for birth data and Saju calculations.
"""

import pytest
from datetime import datetime

from backend_ai.app.services.normalizer_service import (
    STEM_TO_ELEMENT,
    normalize_day_master,
    _normalize_birth_date,
    _normalize_birth_time,
    _normalize_birth_payload,
)


class TestStemToElementMapping:
    """Tests for STEM_TO_ELEMENT mapping."""

    def test_hanja_wood_stems(self):
        """Hanja wood stems should map to 목."""
        assert STEM_TO_ELEMENT["甲"] == "목"
        assert STEM_TO_ELEMENT["乙"] == "목"

    def test_hanja_fire_stems(self):
        """Hanja fire stems should map to 화."""
        assert STEM_TO_ELEMENT["丙"] == "화"
        assert STEM_TO_ELEMENT["丁"] == "화"

    def test_hanja_earth_stems(self):
        """Hanja earth stems should map to 토."""
        assert STEM_TO_ELEMENT["戊"] == "토"
        assert STEM_TO_ELEMENT["己"] == "토"

    def test_hanja_metal_stems(self):
        """Hanja metal stems should map to 금."""
        assert STEM_TO_ELEMENT["庚"] == "금"
        assert STEM_TO_ELEMENT["辛"] == "금"

    def test_hanja_water_stems(self):
        """Hanja water stems should map to 수."""
        assert STEM_TO_ELEMENT["壬"] == "수"
        assert STEM_TO_ELEMENT["癸"] == "수"

    def test_korean_wood_stems(self):
        """Korean wood stems should map to 목."""
        assert STEM_TO_ELEMENT["갑"] == "목"
        assert STEM_TO_ELEMENT["을"] == "목"

    def test_korean_fire_stems(self):
        """Korean fire stems should map to 화."""
        assert STEM_TO_ELEMENT["병"] == "화"
        assert STEM_TO_ELEMENT["정"] == "화"

    def test_korean_earth_stems(self):
        """Korean earth stems should map to 토."""
        assert STEM_TO_ELEMENT["무"] == "토"
        assert STEM_TO_ELEMENT["기"] == "토"

    def test_korean_metal_stems(self):
        """Korean metal stems should map to 금."""
        assert STEM_TO_ELEMENT["경"] == "금"
        assert STEM_TO_ELEMENT["신"] == "금"

    def test_korean_water_stems(self):
        """Korean water stems should map to 수."""
        assert STEM_TO_ELEMENT["임"] == "수"
        assert STEM_TO_ELEMENT["계"] == "수"

    def test_all_ten_heavenly_stems_mapped(self):
        """All 10 heavenly stems should be mapped (20 entries: Hanja + Korean)."""
        assert len(STEM_TO_ELEMENT) == 20


class TestNormalizeDayMaster:
    """Tests for normalize_day_master function."""

    def test_returns_none_for_none_input(self):
        """None input should return None."""
        result = normalize_day_master(None)
        assert result is None

    def test_returns_saju_if_no_day_master(self):
        """If no dayMaster, return unchanged."""
        saju_data = {"year": 1990, "month": 1}
        result = normalize_day_master(saju_data)
        assert result == saju_data

    def test_normalizes_string_day_master_hanja(self):
        """String dayMaster (Hanja) should be normalized."""
        saju_data = {"dayMaster": "庚"}
        result = normalize_day_master(saju_data)

        assert result["dayMaster"]["name"] == "庚"
        assert result["dayMaster"]["heavenlyStem"] == "庚"
        assert result["dayMaster"]["element"] == "금"

    def test_normalizes_string_day_master_korean(self):
        """String dayMaster (Korean) should be normalized."""
        saju_data = {"dayMaster": "경"}
        result = normalize_day_master(saju_data)

        assert result["dayMaster"]["name"] == "경"
        assert result["dayMaster"]["heavenlyStem"] == "경"
        assert result["dayMaster"]["element"] == "금"

    def test_normalizes_nested_heavenly_stem(self):
        """Nested heavenlyStem object should be flattened."""
        saju_data = {
            "dayMaster": {
                "heavenlyStem": {
                    "name": "庚",
                    "element": "금"
                },
                "element": "金"
            }
        }
        result = normalize_day_master(saju_data)

        assert result["dayMaster"]["name"] == "庚"
        assert result["dayMaster"]["heavenlyStem"] == "庚"
        assert result["dayMaster"]["element"] == "금"

    def test_normalizes_heavenly_stem_as_string(self):
        """heavenlyStem as string should be normalized."""
        saju_data = {
            "dayMaster": {
                "heavenlyStem": "庚",
                "element": "금"
            }
        }
        result = normalize_day_master(saju_data)

        assert result["dayMaster"]["name"] == "庚"
        assert result["dayMaster"]["heavenlyStem"] == "庚"
        assert result["dayMaster"]["element"] == "금"

    def test_preserves_other_saju_data(self):
        """Other saju data should be preserved."""
        saju_data = {
            "dayMaster": "庚",
            "year": 1990,
            "pillars": ["year", "month", "day", "hour"]
        }
        result = normalize_day_master(saju_data)

        assert result["year"] == 1990
        assert result["pillars"] == ["year", "month", "day", "hour"]

    def test_handles_empty_day_master(self):
        """Empty dayMaster dict should be handled."""
        saju_data = {"dayMaster": {}}
        result = normalize_day_master(saju_data)
        # Should return as-is or with normalized structure
        assert result is not None

    def test_handles_unknown_stem(self):
        """Unknown stem should return empty element."""
        saju_data = {"dayMaster": "X"}
        result = normalize_day_master(saju_data)

        assert result["dayMaster"]["name"] == "X"
        assert result["dayMaster"]["element"] == ""

    def test_does_not_mutate_original(self):
        """Original saju_data should not be mutated."""
        original = {"dayMaster": "庚", "other": "data"}
        result = normalize_day_master(original)

        # Check original is unchanged
        assert original["dayMaster"] == "庚"
        # Result should be different
        assert result["dayMaster"]["name"] == "庚"

    def test_handles_non_dict_non_string(self):
        """Non-dict, non-string dayMaster should return unchanged."""
        saju_data = {"dayMaster": 123}
        result = normalize_day_master(saju_data)
        assert result == saju_data


class TestNormalizeBirthDate:
    """Tests for _normalize_birth_date function."""

    def test_standard_format(self):
        """Standard YYYY-MM-DD format."""
        result = _normalize_birth_date("2000-01-15")
        assert result == "2000-01-15"

    def test_dot_separator(self):
        """Dot separator format YYYY.MM.DD."""
        result = _normalize_birth_date("2000.01.15")
        assert result == "2000-01-15"

    def test_slash_separator(self):
        """Slash separator format YYYY/MM/DD."""
        result = _normalize_birth_date("2000/01/15")
        assert result == "2000-01-15"

    def test_no_separator_format(self):
        """No separator format YYYYMMDD."""
        result = _normalize_birth_date("20000115")
        assert result == "2000-01-15"

    def test_single_digit_month_day(self):
        """Single digit month and day should be padded."""
        result = _normalize_birth_date("2000-1-5")
        assert result == "2000-01-05"

    def test_none_input(self):
        """None input should return None."""
        result = _normalize_birth_date(None)
        assert result is None

    def test_empty_string(self):
        """Empty string should return None."""
        result = _normalize_birth_date("")
        assert result is None

    def test_whitespace_only(self):
        """Whitespace only should return None."""
        result = _normalize_birth_date("   ")
        assert result is None

    def test_invalid_date(self):
        """Invalid date should return None."""
        result = _normalize_birth_date("2000-13-45")  # Invalid month/day
        assert result is None

    def test_invalid_format(self):
        """Invalid format should return None."""
        result = _normalize_birth_date("not-a-date")
        assert result is None

    def test_integer_input(self):
        """Integer input should be converted."""
        result = _normalize_birth_date(20000115)
        assert result == "2000-01-15"

    def test_float_input(self):
        """Float input should be converted."""
        result = _normalize_birth_date(20000115.0)
        assert result == "2000-01-15"

    def test_feb_29_leap_year(self):
        """Feb 29 on leap year should be valid."""
        result = _normalize_birth_date("2000-02-29")
        assert result == "2000-02-29"

    def test_feb_29_non_leap_year(self):
        """Feb 29 on non-leap year should return None."""
        result = _normalize_birth_date("1999-02-29")
        assert result is None

    def test_short_year_invalid(self):
        """Year with less than 4 digits should return None."""
        result = _normalize_birth_date("99-01-15")
        assert result is None


class TestNormalizeBirthTime:
    """Tests for _normalize_birth_time function."""

    def test_standard_format(self):
        """Standard HH:MM format."""
        result = _normalize_birth_time("12:30")
        assert result == "12:30"

    def test_with_seconds(self):
        """HH:MM:SS format."""
        result = _normalize_birth_time("12:30:45")
        assert result == "12:30:45"

    def test_dot_separator(self):
        """Dot separator format HH.MM."""
        result = _normalize_birth_time("12.30")
        assert result == "12:30"

    def test_no_separator_four_digits(self):
        """No separator HHMM format."""
        result = _normalize_birth_time("1230")
        assert result == "12:30"

    def test_no_separator_three_digits(self):
        """No separator HMM format."""
        result = _normalize_birth_time("930")
        assert result == "09:30"

    def test_single_digit_hour(self):
        """Single digit hour should be padded."""
        result = _normalize_birth_time("9:30")
        assert result == "09:30"

    def test_midnight(self):
        """Midnight time."""
        result = _normalize_birth_time("00:00")
        assert result == "00:00"

    def test_end_of_day(self):
        """End of day time."""
        result = _normalize_birth_time("23:59")
        assert result == "23:59"

    def test_none_input(self):
        """None input should return None."""
        result = _normalize_birth_time(None)
        assert result is None

    def test_empty_string(self):
        """Empty string should return None."""
        result = _normalize_birth_time("")
        assert result is None

    def test_whitespace_only(self):
        """Whitespace only should return None."""
        result = _normalize_birth_time("   ")
        assert result is None

    def test_invalid_hour(self):
        """Invalid hour (>23) should return None."""
        result = _normalize_birth_time("25:00")
        assert result is None

    def test_invalid_minute(self):
        """Invalid minute (>59) should return None."""
        result = _normalize_birth_time("12:60")
        assert result is None

    def test_invalid_second(self):
        """Invalid second (>59) should return None."""
        result = _normalize_birth_time("12:30:60")
        assert result is None

    def test_invalid_format(self):
        """Invalid format should return None."""
        result = _normalize_birth_time("not-a-time")
        assert result is None

    def test_integer_input(self):
        """Integer input should be converted."""
        result = _normalize_birth_time(1230)
        assert result == "12:30"


class TestNormalizeBirthPayload:
    """Tests for _normalize_birth_payload function."""

    def test_nested_birth_object(self):
        """Nested birth object should be extracted."""
        data = {
            "birth": {
                "date": "2000-01-15",
                "time": "12:30",
                "gender": "M",
                "city": "Seoul"
            }
        }
        result = _normalize_birth_payload(data)

        assert result["date"] == "2000-01-15"
        assert result["time"] == "12:30"
        assert result["gender"] == "M"
        assert result["city"] == "Seoul"

    def test_flat_birthdate_birthtime(self):
        """Flat birthdate/birthtime fields."""
        data = {
            "birthdate": "2000-01-15",
            "birthtime": "12:30"
        }
        result = _normalize_birth_payload(data)

        assert result["date"] == "2000-01-15"
        assert result["time"] == "12:30"

    def test_flat_birth_date_birth_time(self):
        """Flat birth_date/birth_time fields."""
        data = {
            "birth_date": "2000-01-15",
            "birth_time": "12:30"
        }
        result = _normalize_birth_payload(data)

        assert result["date"] == "2000-01-15"
        assert result["time"] == "12:30"

    def test_camel_case_fields(self):
        """Camel case birthDate/birthTime fields."""
        data = {
            "birthDate": "2000-01-15",
            "birthTime": "12:30"
        }
        result = _normalize_birth_payload(data)

        assert result["date"] == "2000-01-15"
        assert result["time"] == "12:30"

    def test_gender_field(self):
        """Gender field should be extracted."""
        data = {
            "birthdate": "2000-01-15",
            "birthtime": "12:30",
            "gender": "F"
        }
        result = _normalize_birth_payload(data)

        assert result["gender"] == "F"

    def test_sex_field_as_gender(self):
        """Sex field should be extracted as gender."""
        data = {
            "birthdate": "2000-01-15",
            "birthtime": "12:30",
            "sex": "M"
        }
        result = _normalize_birth_payload(data)

        assert result["gender"] == "M"

    def test_city_from_various_fields(self):
        """City from various field names."""
        # birthplace
        data = {"birthplace": "Seoul", "birthdate": "2000-01-15", "birthtime": "12:30"}
        result = _normalize_birth_payload(data)
        assert result["city"] == "Seoul"

        # birth_place
        data = {"birth_place": "Busan", "birthdate": "2000-01-15", "birthtime": "12:30"}
        result = _normalize_birth_payload(data)
        assert result["city"] == "Busan"

        # location
        data = {"location": "Daegu", "birthdate": "2000-01-15", "birthtime": "12:30"}
        result = _normalize_birth_payload(data)
        assert result["city"] == "Daegu"

    def test_latitude_longitude(self):
        """Latitude and longitude should be extracted."""
        data = {
            "birthdate": "2000-01-15",
            "birthtime": "12:30",
            "lat": 37.5665,
            "lon": 126.9780
        }
        result = _normalize_birth_payload(data)

        assert result["lat"] == 37.5665
        assert result["latitude"] == 37.5665
        assert result["lon"] == 126.9780
        assert result["longitude"] == 126.9780

    def test_latitude_longitude_full_names(self):
        """Full latitude/longitude names should work."""
        data = {
            "birthdate": "2000-01-15",
            "birthtime": "12:30",
            "latitude": 37.5665,
            "longitude": 126.9780
        }
        result = _normalize_birth_payload(data)

        assert result["latitude"] == 37.5665
        assert result["longitude"] == 126.9780

    def test_lng_as_longitude(self):
        """lng should be recognized as longitude."""
        data = {
            "birthdate": "2000-01-15",
            "birthtime": "12:30",
            "lat": 37.5665,
            "lng": 126.9780
        }
        result = _normalize_birth_payload(data)

        assert result["lon"] == 126.9780

    def test_coordinates_as_strings(self):
        """String coordinates should be converted to floats."""
        data = {
            "birthdate": "2000-01-15",
            "birthtime": "12:30",
            "lat": "37.5665",
            "lon": "126.9780"
        }
        result = _normalize_birth_payload(data)

        assert result["lat"] == 37.5665
        assert result["lon"] == 126.9780

    def test_invalid_coordinates(self):
        """Invalid coordinates should not be included."""
        data = {
            "birthdate": "2000-01-15",
            "birthtime": "12:30",
            "lat": "invalid",
            "lon": "invalid"
        }
        result = _normalize_birth_payload(data)

        assert "lat" not in result
        assert "lon" not in result

    def test_none_input(self):
        """None input should return empty dict."""
        result = _normalize_birth_payload(None)
        assert result == {}

    def test_non_dict_input(self):
        """Non-dict input should return empty dict."""
        result = _normalize_birth_payload("not a dict")
        assert result == {}

    def test_empty_dict(self):
        """Empty dict should return empty dict."""
        result = _normalize_birth_payload({})
        assert result == {}

    def test_nested_birth_takes_priority(self):
        """Nested birth object should take priority over flat fields."""
        data = {
            "birth": {
                "date": "2000-01-15",
                "time": "12:30"
            },
            "birthdate": "1999-12-31",  # Should be ignored
            "birthtime": "00:00"  # Should be ignored
        }
        result = _normalize_birth_payload(data)

        assert result["date"] == "2000-01-15"
        assert result["time"] == "12:30"

    def test_normalizes_date_format(self):
        """Date should be normalized to YYYY-MM-DD."""
        data = {
            "birthdate": "20000115"  # YYYYMMDD format
        }
        result = _normalize_birth_payload(data)

        assert result["date"] == "2000-01-15"

    def test_normalizes_time_format(self):
        """Time should be normalized to HH:MM."""
        data = {
            "birthtime": "1230"  # HHMM format
        }
        result = _normalize_birth_payload(data)

        assert result["time"] == "12:30"

    def test_preserves_invalid_date_as_string(self):
        """Invalid date should be preserved as string."""
        data = {
            "birthdate": "invalid-date"
        }
        result = _normalize_birth_payload(data)

        # Should preserve the original string if normalization fails
        assert result["date"] == "invalid-date"


class TestEdgeCases:
    """Edge case tests."""

    def test_normalize_day_master_all_hanja_stems(self):
        """All Hanja stems should be normalized correctly."""
        stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
        expected_elements = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"]

        for stem, expected in zip(stems, expected_elements):
            result = normalize_day_master({"dayMaster": stem})
            assert result["dayMaster"]["element"] == expected

    def test_normalize_day_master_all_korean_stems(self):
        """All Korean stems should be normalized correctly."""
        stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
        expected_elements = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"]

        for stem, expected in zip(stems, expected_elements):
            result = normalize_day_master({"dayMaster": stem})
            assert result["dayMaster"]["element"] == expected

    def test_birth_date_boundary_years(self):
        """Boundary years should be handled."""
        # Very old date
        result = _normalize_birth_date("1900-01-01")
        assert result == "1900-01-01"

        # Future date
        result = _normalize_birth_date("2100-12-31")
        assert result == "2100-12-31"

    def test_birth_time_boundary_values(self):
        """Boundary time values should be handled."""
        assert _normalize_birth_time("00:00") == "00:00"
        assert _normalize_birth_time("23:59") == "23:59"
        assert _normalize_birth_time("00:00:00") == "00:00:00"
        assert _normalize_birth_time("23:59:59") == "23:59:59"

    def test_payload_with_only_coordinates(self):
        """Payload with only coordinates should work."""
        data = {
            "lat": 37.5665,
            "lon": 126.9780
        }
        result = _normalize_birth_payload(data)

        assert result["lat"] == 37.5665
        assert result["lon"] == 126.9780
