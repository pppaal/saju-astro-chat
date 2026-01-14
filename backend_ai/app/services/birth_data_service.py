"""
Birth Data Service

Handles birth data normalization, validation, and conversion.

This service provides:
- Birth date/time parsing and validation
- Timezone conversion
- Coordinate normalization
- Gender validation
- Birth data standardization for calculations

Used by:
- chart_routes.py
- prediction_routes.py
- saju_routes.py
- astrology_routes.py
"""
from datetime import datetime
from typing import Dict, Any, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class BirthDataService:
    """
    Service for birth data processing and validation.

    Handles all birth data transformations needed by Saju and
    Astrology calculation endpoints.
    """

    @staticmethod
    def normalize_birth_data(
        birth_date: str,
        birth_time: str,
        latitude: float = None,
        longitude: float = None,
        timezone: str = "Asia/Seoul",
        gender: str = None,
        city: str = None
    ) -> Dict[str, Any]:
        """
        Normalize and validate birth data for calculations.

        Args:
            birth_date: Date in YYYY-MM-DD format
            birth_time: Time in HH:MM format
            latitude: Birth latitude (optional)
            longitude: Birth longitude (optional)
            timezone: IANA timezone string
            gender: "M" or "F" (optional)
            city: Birth city name (optional)

        Returns:
            Dictionary with normalized birth data

        Raises:
            ValueError: If data is invalid

        Example:
            >>> data = BirthDataService.normalize_birth_data(
            ...     "1990-01-15",
            ...     "14:30",
            ...     latitude=37.5665,
            ...     longitude=126.9780,
            ...     gender="M"
            ... )
            >>> data["birth_datetime"]
            datetime(1990, 1, 15, 14, 30)
        """
        # Validate date format
        try:
            birth_datetime = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")
        except ValueError as e:
            raise ValueError(f"Invalid date/time format: {e}")

        # Validate latitude/longitude if provided
        if latitude is not None:
            if not -90 <= latitude <= 90:
                raise ValueError(f"Invalid latitude: {latitude} (must be -90 to 90)")

        if longitude is not None:
            if not -180 <= longitude <= 180:
                raise ValueError(f"Invalid longitude: {longitude} (must be -180 to 180)")

        # Validate gender if provided
        if gender is not None:
            gender = gender.strip().upper()
            if gender not in ["M", "F", "MALE", "FEMALE"]:
                raise ValueError(f"Invalid gender: {gender} (must be M/F/Male/Female)")
            # Normalize to M/F
            gender = "M" if gender in ["M", "MALE"] else "F"

        # Build normalized result
        result = {
            "birth_date": birth_date,
            "birth_time": birth_time,
            "birth_datetime": birth_datetime,
            "year": birth_datetime.year,
            "month": birth_datetime.month,
            "day": birth_datetime.day,
            "hour": birth_datetime.hour,
            "minute": birth_datetime.minute,
            "timezone": timezone,
        }

        # Add optional fields
        if latitude is not None:
            result["latitude"] = latitude
        if longitude is not None:
            result["longitude"] = longitude
        if gender is not None:
            result["gender"] = gender
        if city is not None:
            result["city"] = city.strip()

        logger.debug(f"[BirthDataService] Normalized birth data: {result}")
        return result

    @staticmethod
    def parse_birth_datetime(birth_date: str, birth_time: str) -> datetime:
        """
        Parse birth date and time into datetime object.

        Args:
            birth_date: YYYY-MM-DD format
            birth_time: HH:MM format

        Returns:
            datetime object

        Raises:
            ValueError: If format is invalid
        """
        try:
            return datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")
        except ValueError as e:
            raise ValueError(f"Invalid date/time format: {e}")

    @staticmethod
    def validate_coordinates(latitude: float, longitude: float) -> Tuple[bool, str]:
        """
        Validate geographic coordinates.

        Args:
            latitude: Latitude value
            longitude: Longitude value

        Returns:
            Tuple of (is_valid, error_message)

        Example:
            >>> valid, error = BirthDataService.validate_coordinates(37.5, 126.9)
            >>> valid
            True
        """
        if latitude is None or longitude is None:
            return False, "Latitude and longitude are required"

        try:
            lat = float(latitude)
            lon = float(longitude)
        except (ValueError, TypeError):
            return False, "Latitude and longitude must be numbers"

        if not -90 <= lat <= 90:
            return False, f"Invalid latitude: {lat} (must be -90 to 90)"

        if not -180 <= lon <= 180:
            return False, f"Invalid longitude: {lon} (must be -180 to 180)"

        return True, ""

    @staticmethod
    def extract_birth_data_from_request(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and normalize birth data from API request body.

        Common pattern used across multiple endpoints.

        Args:
            data: Request JSON body

        Returns:
            Normalized birth data dictionary

        Raises:
            ValueError: If required fields are missing or invalid

        Example:
            >>> body = request.get_json()
            >>> birth_data = BirthDataService.extract_birth_data_from_request(body)
            >>> birth_data["birth_datetime"]
        """
        # Extract required fields
        birth_date = data.get("birth_date", "").strip()
        birth_time = data.get("birth_time", "").strip()

        if not birth_date or not birth_time:
            raise ValueError("birth_date and birth_time are required")

        # Extract optional fields
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        timezone = data.get("timezone", "Asia/Seoul").strip()
        gender = data.get("gender", "").strip() if data.get("gender") else None
        city = data.get("city", "").strip() if data.get("city") else None

        # Normalize
        return BirthDataService.normalize_birth_data(
            birth_date=birth_date,
            birth_time=birth_time,
            latitude=latitude,
            longitude=longitude,
            timezone=timezone,
            gender=gender,
            city=city
        )

    @staticmethod
    def format_birth_summary(birth_data: Dict[str, Any]) -> str:
        """
        Create human-readable birth data summary.

        Used for logging and user confirmation messages.

        Args:
            birth_data: Normalized birth data dictionary

        Returns:
            Formatted summary string

        Example:
            >>> summary = BirthDataService.format_birth_summary(birth_data)
            >>> summary
            "1990-01-15 14:30 (Seoul, 37.57°N 126.98°E, Male)"
        """
        dt = birth_data.get("birth_datetime")
        if not dt:
            dt_str = f"{birth_data.get('birth_date')} {birth_data.get('birth_time')}"
        else:
            dt_str = dt.strftime("%Y-%m-%d %H:%M")

        parts = [dt_str]

        # Add location info
        city = birth_data.get("city")
        lat = birth_data.get("latitude")
        lon = birth_data.get("longitude")

        if city or (lat and lon):
            location_parts = []
            if city:
                location_parts.append(city)
            if lat is not None and lon is not None:
                lat_dir = "N" if lat >= 0 else "S"
                lon_dir = "E" if lon >= 0 else "W"
                location_parts.append(f"{abs(lat):.2f}°{lat_dir} {abs(lon):.2f}°{lon_dir}")
            parts.append(f"({', '.join(location_parts)})")

        # Add gender
        gender = birth_data.get("gender")
        if gender:
            gender_str = "Male" if gender == "M" else "Female"
            parts.append(gender_str)

        return " ".join(parts)

    @staticmethod
    def convert_to_utc(
        birth_datetime: datetime,
        timezone: str = "Asia/Seoul"
    ) -> datetime:
        """
        Convert local birth time to UTC.

        Args:
            birth_datetime: Local birth datetime
            timezone: IANA timezone string

        Returns:
            UTC datetime

        Note:
            Requires pytz package. If not available, returns original datetime.
        """
        try:
            import pytz
            local_tz = pytz.timezone(timezone)
            local_dt = local_tz.localize(birth_datetime)
            utc_dt = local_dt.astimezone(pytz.UTC)
            return utc_dt
        except ImportError:
            logger.warning("[BirthDataService] pytz not available, skipping UTC conversion")
            return birth_datetime
        except Exception as e:
            logger.error(f"[BirthDataService] UTC conversion failed: {e}")
            return birth_datetime


# ============================================================================
# Convenience functions
# ============================================================================

def normalize_birth_data(*args, **kwargs) -> Dict[str, Any]:
    """Convenience function for BirthDataService.normalize_birth_data()"""
    return BirthDataService.normalize_birth_data(*args, **kwargs)


def extract_birth_data_from_request(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for BirthDataService.extract_birth_data_from_request()"""
    return BirthDataService.extract_birth_data_from_request(data)


def format_birth_summary(birth_data: Dict[str, Any]) -> str:
    """Convenience function for BirthDataService.format_birth_summary()"""
    return BirthDataService.format_birth_summary(birth_data)
