"""
Normalizer Service

Data normalization functions for birth data and Saju calculations.
Extracted from app.py for better modularity.

Functions:
- normalize_day_master(): Normalize dayMaster to flat structure
- _normalize_birth_date(): Parse and validate birth date
- _normalize_birth_time(): Parse and validate birth time
- _normalize_birth_payload(): Normalize birth data from various input formats
"""
import re
import logging
from datetime import datetime
from typing import Dict, Optional, Any, List

logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

# Stem to element mapping (Hanja and Korean)
STEM_TO_ELEMENT = {
    # Hanja (Chinese characters)
    "甲": "목", "乙": "목",
    "丙": "화", "丁": "화",
    "戊": "토", "己": "토",
    "庚": "금", "辛": "금",
    "壬": "수", "癸": "수",
    # Korean
    "갑": "목", "을": "목",
    "병": "화", "정": "화",
    "무": "토", "기": "토",
    "경": "금", "신": "금",
    "임": "수", "계": "수",
}

# Regex patterns (compiled for performance)
_DATE_YYYYMMDD_PATTERN = re.compile(r"^\d{8}$")
_TIME_HHMM_PATTERN = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?$")
_TIME_NUMERIC_PATTERN = re.compile(r"^\d{3,4}$")

# Field name mappings for payload normalization
_DATE_FIELDS = ["birthdate", "birth_date", "birthDate"]
_TIME_FIELDS = ["birthtime", "birth_time", "birthTime"]
_CITY_FIELDS = ["birthplace", "birth_place", "birthPlace", "city", "place", "location"]
_LON_FIELDS = ["lon", "longitude", "lng", "long"]

# Validation constants
_YEAR_LENGTH = 4
_MAX_HOUR = 23
_MAX_MINUTE = 59
_MAX_SECOND = 59


# ============================================================================
# Helper functions
# ============================================================================
def _pick(source: Dict[str, Any], keys: List[str]) -> Optional[Any]:
    """Pick first non-empty value from keys."""
    for key in keys:
        value = source.get(key)
        if value not in (None, ""):
            return value
    return None


def _coerce_float(value: Any) -> Optional[float]:
    """Coerce value to float."""
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return None
        try:
            return float(value)
        except ValueError:
            return None
    return None


# ============================================================================
# Day Master Normalization
# ============================================================================
def normalize_day_master(saju_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize dayMaster to flat structure { name, element }.

    Handles various input formats:
    - String: "庚" -> { name: "庚", heavenlyStem: "庚", element: "금" }
    - Nested: { heavenlyStem: { name: "庚", element: "금" }, element: "..." }
    - Flat: { name: "庚", element: "금" } or { heavenlyStem: "庚", element: "금" }

    Args:
        saju_data: Saju calculation data containing dayMaster

    Returns:
        Normalized saju_data with flat dayMaster structure
    """
    if not saju_data or not saju_data.get("dayMaster"):
        return saju_data

    dm = saju_data.get("dayMaster", {})

    # Handle dayMaster as string (e.g., "庚" or "경")
    if isinstance(dm, str):
        element = STEM_TO_ELEMENT.get(dm, "")
        normalized_dm = {
            "name": dm,
            "heavenlyStem": dm,
            "element": element,
        }
        saju_data = dict(saju_data)
        saju_data["dayMaster"] = normalized_dm
        logger.debug(f"[NORMALIZE] dayMaster: string -> dict: {normalized_dm}")
        return saju_data

    if not isinstance(dm, dict):
        return saju_data

    # Check if heavenlyStem is a nested object
    hs = dm.get("heavenlyStem")
    if isinstance(hs, dict):
        # Nested structure: { heavenlyStem: { name, element } }
        normalized_dm = {
            "name": hs.get("name", ""),
            "heavenlyStem": hs.get("name", ""),
            "element": hs.get("element") or dm.get("element", ""),
        }
        saju_data = dict(saju_data)
        saju_data["dayMaster"] = normalized_dm
        logger.debug(f"[NORMALIZE] dayMaster: nested -> flat: {normalized_dm}")
    elif isinstance(hs, str):
        # Already flat but with heavenlyStem as string
        normalized_dm = {
            "name": hs,
            "heavenlyStem": hs,
            "element": dm.get("element", ""),
        }
        saju_data = dict(saju_data)
        saju_data["dayMaster"] = normalized_dm

    return saju_data


# ============================================================================
# Birth Date/Time Normalization
# ============================================================================
def _normalize_birth_date(value: Any) -> Optional[str]:
    """
    Parse and normalize birth date to YYYY-MM-DD format.

    Accepts formats:
    - "2000-01-15"
    - "2000.01.15"
    - "2000/01/15"
    - "20000115"

    Args:
        value: Date value to normalize

    Returns:
        Normalized date string (YYYY-MM-DD) or None if invalid
    """
    if value is None:
        return None

    if isinstance(value, (int, float)):
        value = str(int(value))

    if not isinstance(value, str):
        return None

    text = value.strip()
    if not text:
        return None

    # Normalize separators
    text = text.replace(".", "-").replace("/", "-")

    # Handle YYYYMMDD format
    if _DATE_YYYYMMDD_PATTERN.match(text):
        year, month, day = text[:4], text[4:6], text[6:8]
    else:
        # Handle YYYY-MM-DD format
        parts = [p for p in text.split("-") if p]
        if len(parts) != 3:
            return None

        year, month, day = parts
        if not (year.isdigit() and month.isdigit() and day.isdigit()):
            return None

        if len(year) != _YEAR_LENGTH:
            return None

        month = month.zfill(2)
        day = day.zfill(2)

    # Validate date
    try:
        datetime.strptime(f"{year}-{month}-{day}", "%Y-%m-%d")
    except ValueError:
        return None

    return f"{year}-{month}-{day}"


def _normalize_birth_time(value: Any) -> Optional[str]:
    """
    Parse and normalize birth time to HH:MM or HH:MM:SS format.

    Accepts formats:
    - "12:30"
    - "12:30:45"
    - "12.30"
    - "1230"

    Args:
        value: Time value to normalize

    Returns:
        Normalized time string (HH:MM or HH:MM:SS) or None if invalid
    """
    if value is None:
        return None

    if isinstance(value, (int, float)):
        value = str(value)

    if not isinstance(value, str):
        return None

    text = value.strip()
    if not text:
        return None

    # Normalize separator
    text = text.replace(".", ":")

    # Handle HH:MM or HH:MM:SS format
    if _TIME_HHMM_PATTERN.match(text):
        parts = text.split(":")
        hour = int(parts[0])
        minute = int(parts[1])
        second = int(parts[2]) if len(parts) > 2 else None

        if hour > _MAX_HOUR or minute > _MAX_MINUTE:
            return None
        if second is not None and second > _MAX_SECOND:
            return None

        if second is None:
            return f"{hour:02d}:{minute:02d}"
        return f"{hour:02d}:{minute:02d}:{second:02d}"

    # Handle HHMM format
    if _TIME_NUMERIC_PATTERN.match(text):
        padded = text.zfill(4)
        hour = int(padded[:2])
        minute = int(padded[2:])

        if hour > _MAX_HOUR or minute > _MAX_MINUTE:
            return None

        return f"{hour:02d}:{minute:02d}"

    return None


def _normalize_birth_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize birth payload from nested or legacy fields.

    Handles various input structures:
    - { birth: { date, time, gender, city, lat, lon } }
    - { birthdate, birthtime, gender, birthplace }
    - { birth_date, birth_time, gender, city }

    Args:
        data: Input data dict with birth information

    Returns:
        Normalized birth data dict with standard field names
    """
    if not isinstance(data, dict):
        return {}

    birth = data.get("birth")
    birth_data = birth if isinstance(birth, dict) else {}
    normalized = dict(birth_data)

    # Extract values from various field names
    date_raw = _pick(birth_data, ["date"]) or _pick(data, _DATE_FIELDS)
    time_raw = _pick(birth_data, ["time"]) or _pick(data, _TIME_FIELDS)
    gender = _pick(birth_data, ["gender"]) or _pick(data, ["gender", "sex"])
    city = _pick(birth_data, ["city", "place"]) or _pick(data, _CITY_FIELDS)
    lat_val = _pick(birth_data, ["lat", "latitude"]) or _pick(data, ["lat", "latitude"])
    lon_val = _pick(birth_data, ["lon", "longitude"]) or _pick(data, _LON_FIELDS)

    # Normalize date
    date = _normalize_birth_date(date_raw)
    if date:
        normalized["date"] = date
    elif date_raw:
        normalized["date"] = str(date_raw).strip()

    # Normalize time
    time_val = _normalize_birth_time(time_raw)
    if time_val:
        normalized["time"] = time_val
    elif time_raw:
        normalized["time"] = str(time_raw).strip()

    # Other fields
    if gender:
        normalized["gender"] = gender
    if city:
        normalized["city"] = city

    # Coordinates
    lat = _coerce_float(lat_val)
    lon = _coerce_float(lon_val)

    if lat is not None:
        normalized["lat"] = lat
        if "latitude" not in normalized:
            normalized["latitude"] = lat

    if lon is not None:
        normalized["lon"] = lon
        if "longitude" not in normalized:
            normalized["longitude"] = lon

    return normalized


# ============================================================================
# Exports
# ============================================================================
__all__ = [
    "STEM_TO_ELEMENT",
    "normalize_day_master",
    "_normalize_birth_date",
    "_normalize_birth_time",
    "_normalize_birth_payload",
]
