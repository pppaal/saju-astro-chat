# backend_ai/app/realtime_astro.py
"""
Real-time Astronomy API Integration
====================================
Fetches current planetary positions from free astronomy APIs.

APIs Used (Free Tier):
1. Astronomy API (astronomyapi.com) - 100 req/day free
2. SwissEph (local calculation) - unlimited, offline
3. Open Notify (ISS position) - bonus feature

This provides LIVE transit data for accurate current readings.
"""

import os
import math
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from functools import lru_cache
import requests
from dotenv import load_dotenv

load_dotenv()

# API Keys
ASTRONOMY_API_ID = os.getenv("ASTRONOMY_API_ID", "")
ASTRONOMY_API_SECRET = os.getenv("ASTRONOMY_API_SECRET", "")

# Zodiac signs
ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

ZODIAC_KOREAN = [
    "양자리", "황소자리", "쌍둥이자리", "게자리",
    "사자자리", "처녀자리", "천칭자리", "전갈자리",
    "궁수자리", "염소자리", "물병자리", "물고기자리"
]


# ===============================================================
# SWISS EPHEMERIS (Offline Calculation)
# ===============================================================
try:
    import swisseph as swe
    HAS_SWISSEPH = True
    swe.set_ephe_path(None)  # Use built-in data
except ImportError:
    HAS_SWISSEPH = False
    print("[RealtimeAstro] swisseph not installed, using API fallback")


def _julian_day(dt: datetime) -> float:
    """Convert datetime to Julian Day."""
    if HAS_SWISSEPH:
        return swe.julday(
            dt.year, dt.month, dt.day,
            dt.hour + dt.minute / 60.0 + dt.second / 3600.0
        )
    # Manual calculation
    a = (14 - dt.month) // 12
    y = dt.year + 4800 - a
    m = dt.month + 12 * a - 3
    jdn = dt.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
    return jdn + (dt.hour - 12) / 24.0 + dt.minute / 1440.0 + dt.second / 86400.0


def _longitude_to_sign(longitude: float) -> Tuple[str, str, float]:
    """Convert ecliptic longitude to zodiac sign and degree."""
    sign_idx = int(longitude / 30) % 12
    degree = longitude % 30
    return ZODIAC_SIGNS[sign_idx], ZODIAC_KOREAN[sign_idx], round(degree, 2)


def calculate_planets_swisseph(dt: datetime = None) -> List[Dict]:
    """Calculate planetary positions using Swiss Ephemeris."""
    if not HAS_SWISSEPH:
        return []

    dt = dt or datetime.now(timezone.utc)
    jd = _julian_day(dt)

    planets_info = [
        (swe.SUN, "Sun", "태양"),
        (swe.MOON, "Moon", "달"),
        (swe.MERCURY, "Mercury", "수성"),
        (swe.VENUS, "Venus", "금성"),
        (swe.MARS, "Mars", "화성"),
        (swe.JUPITER, "Jupiter", "목성"),
        (swe.SATURN, "Saturn", "토성"),
        (swe.URANUS, "Uranus", "천왕성"),
        (swe.NEPTUNE, "Neptune", "해왕성"),
        (swe.PLUTO, "Pluto", "명왕성"),
        (swe.MEAN_NODE, "North Node", "북교점"),
    ]

    results = []
    for planet_id, name_en, name_ko in planets_info:
        try:
            pos, _ = swe.calc_ut(jd, planet_id)
            longitude = pos[0]
            latitude = pos[1]
            distance = pos[2]
            speed = pos[3]

            sign_en, sign_ko, degree = _longitude_to_sign(longitude)

            results.append({
                "name": name_en,
                "name_ko": name_ko,
                "longitude": round(longitude, 4),
                "latitude": round(latitude, 4),
                "distance_au": round(distance, 6),
                "speed": round(speed, 4),
                "retrograde": speed < 0,
                "sign": sign_en,
                "sign_ko": sign_ko,
                "degree": degree,
                "source": "swisseph",
            })
        except Exception as e:
            print(f"[SwissEph] Error calculating {name_en}: {e}")

    return results


# ===============================================================
# ASTRONOMY API (Online)
# ===============================================================
def calculate_planets_api(
    dt: datetime = None,
    latitude: float = 37.5665,
    longitude: float = 126.9780,
) -> List[Dict]:
    """Fetch planetary positions from Astronomy API."""
    if not ASTRONOMY_API_ID or not ASTRONOMY_API_SECRET:
        return []

    dt = dt or datetime.now(timezone.utc)

    try:
        import base64
        auth = base64.b64encode(
            f"{ASTRONOMY_API_ID}:{ASTRONOMY_API_SECRET}".encode()
        ).decode()

        url = "https://api.astronomyapi.com/api/v2/bodies/positions"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "elevation": 0,
            "from_date": dt.strftime("%Y-%m-%d"),
            "to_date": dt.strftime("%Y-%m-%d"),
            "time": dt.strftime("%H:%M:%S"),
        }
        headers = {"Authorization": f"Basic {auth}"}

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        results = []
        for row in data.get("data", {}).get("table", {}).get("rows", []):
            entry = row.get("entry", {})
            name = entry.get("name", "")
            position = row.get("cells", [{}])[0].get("position", {})

            # Parse right ascension to longitude (approximate)
            ra = position.get("equatorial", {}).get("rightAscension", {})
            dec = position.get("equatorial", {}).get("declination", {})

            # Convert RA to rough ecliptic longitude
            ra_hours = float(ra.get("hours", 0))
            ra_mins = float(ra.get("minutes", 0))
            ra_secs = float(ra.get("seconds", 0))
            ra_deg = (ra_hours + ra_mins/60 + ra_secs/3600) * 15

            # Approximate ecliptic longitude (simplified)
            longitude = ra_deg % 360
            sign_en, sign_ko, degree = _longitude_to_sign(longitude)

            results.append({
                "name": name,
                "longitude": round(longitude, 4),
                "sign": sign_en,
                "sign_ko": sign_ko,
                "degree": degree,
                "source": "astronomyapi",
            })

        return results

    except Exception as e:
        print(f"[AstronomyAPI] Error: {e}")
        return []


# ===============================================================
# MOON PHASE
# ===============================================================
def calculate_moon_phase(dt: datetime = None) -> Dict:
    """Calculate current moon phase."""
    dt = dt or datetime.now(timezone.utc)

    # Known new moon reference: Jan 6, 2000 at 18:14 UTC
    ref_new_moon = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
    lunar_cycle = 29.53058867  # days

    days_since = (dt - ref_new_moon).total_seconds() / 86400
    phase_fraction = (days_since % lunar_cycle) / lunar_cycle
    phase_angle = phase_fraction * 360

    # Phase names
    if phase_fraction < 0.0625:
        phase_name = "New Moon"
        phase_ko = "삭(朔) - 새달"
        emoji = "🌑"
    elif phase_fraction < 0.1875:
        phase_name = "Waxing Crescent"
        phase_ko = "초승달"
        emoji = "🌒"
    elif phase_fraction < 0.3125:
        phase_name = "First Quarter"
        phase_ko = "상현달"
        emoji = "🌓"
    elif phase_fraction < 0.4375:
        phase_name = "Waxing Gibbous"
        phase_ko = "상현망간"
        emoji = "🌔"
    elif phase_fraction < 0.5625:
        phase_name = "Full Moon"
        phase_ko = "보름달"
        emoji = "🌕"
    elif phase_fraction < 0.6875:
        phase_name = "Waning Gibbous"
        phase_ko = "하현망간"
        emoji = "🌖"
    elif phase_fraction < 0.8125:
        phase_name = "Last Quarter"
        phase_ko = "하현달"
        emoji = "🌗"
    elif phase_fraction < 0.9375:
        phase_name = "Waning Crescent"
        phase_ko = "그믐달"
        emoji = "🌘"
    else:
        phase_name = "New Moon"
        phase_ko = "삭(朔) - 새달"
        emoji = "🌑"

    return {
        "phase_name": phase_name,
        "phase_ko": phase_ko,
        "emoji": emoji,
        "illumination": round(abs(math.cos(math.radians(phase_angle / 2))) * 100, 1),
        "age_days": round((phase_fraction * lunar_cycle), 1),
        "phase_angle": round(phase_angle, 2),
    }


# ===============================================================
# CURRENT TRANSITS
# ===============================================================
@lru_cache(maxsize=1)
def _get_cached_transits(cache_key: str) -> Dict:
    """Cache transits for 1 hour (cache_key = hour timestamp)."""
    return get_current_transits_uncached()


def get_current_transits_uncached() -> Dict:
    """Get current planetary transits (uncached)."""
    now = datetime.now(timezone.utc)

    # Try SwissEph first (more accurate, offline)
    planets = calculate_planets_swisseph(now)

    # Fallback to API
    if not planets:
        planets = calculate_planets_api(now)

    moon = calculate_moon_phase(now)

    # Find retrogrades
    retrogrades = [p["name"] for p in planets if p.get("retrograde")]

    # Find notable aspects (simplified)
    aspects = []
    for i, p1 in enumerate(planets):
        for p2 in planets[i+1:]:
            diff = abs(p1.get("longitude", 0) - p2.get("longitude", 0))
            if diff > 180:
                diff = 360 - diff

            aspect_type = None
            orb = 0
            if abs(diff) < 8:
                aspect_type = "conjunction"
                orb = diff
            elif abs(diff - 60) < 6:
                aspect_type = "sextile"
                orb = abs(diff - 60)
            elif abs(diff - 90) < 8:
                aspect_type = "square"
                orb = abs(diff - 90)
            elif abs(diff - 120) < 8:
                aspect_type = "trine"
                orb = abs(diff - 120)
            elif abs(diff - 180) < 8:
                aspect_type = "opposition"
                orb = abs(diff - 180)

            if aspect_type:
                aspects.append({
                    "planet1": p1["name"],
                    "planet2": p2["name"],
                    "aspect": aspect_type,
                    "orb": round(orb, 2),
                })

    return {
        "timestamp": now.isoformat(),
        "planets": planets,
        "moon": moon,
        "retrogrades": retrogrades,
        "aspects": aspects[:10],  # Top 10 aspects
        "source": planets[0].get("source") if planets else "none",
    }


def get_current_transits() -> Dict:
    """Get current transits with 1-hour cache."""
    cache_key = datetime.now(timezone.utc).strftime("%Y%m%d%H")
    return _get_cached_transits(cache_key)


# ===============================================================
# TRANSIT INTERPRETATION
# ===============================================================
def get_transit_interpretation(transits: Dict, locale: str = "en") -> str:
    """Generate natural language interpretation of current transits."""
    parts = []

    if locale == "ko":
        parts.append("【현재 천체 배치 - 실시간 트랜짓】")
    else:
        parts.append("【Current Celestial Positions - Live Transits】")

    # Moon phase
    moon = transits.get("moon", {})
    if moon:
        if locale == "ko":
            parts.append(f"\n[달의 위상] {moon.get('emoji', '')} {moon.get('phase_ko', '')}")
            parts.append(f"  • 밝기: {moon.get('illumination', 0)}%")
            parts.append(f"  • 달령: {moon.get('age_days', 0)}일")
        else:
            parts.append(f"\n[Moon Phase] {moon.get('emoji', '')} {moon.get('phase_name', '')}")
            parts.append(f"  • Illumination: {moon.get('illumination', 0)}%")
            parts.append(f"  • Age: {moon.get('age_days', 0)} days")

    # Key planets
    planets = transits.get("planets", [])
    if planets:
        if locale == "ko":
            parts.append(f"\n[행성 위치]")
        else:
            parts.append(f"\n[Planet Positions]")

        for p in planets[:7]:  # Sun through Saturn
            retro = " ℞" if p.get("retrograde") else ""
            if locale == "ko":
                parts.append(f"  • {p.get('name_ko', p.get('name'))}: {p.get('sign_ko', p.get('sign'))} {p.get('degree')}°{retro}")
            else:
                parts.append(f"  • {p.get('name')}: {p.get('sign')} {p.get('degree')}°{retro}")

    # Retrogrades
    retros = transits.get("retrogrades", [])
    if retros:
        if locale == "ko":
            parts.append(f"\n[역행 중] {', '.join(retros)}")
            parts.append("  → 역행 기간에는 해당 행성 에너지의 내면화, 재검토가 필요합니다")
        else:
            parts.append(f"\n[Retrograde] {', '.join(retros)}")
            parts.append("  → Retrograde periods require internalization and review")

    # Key aspects
    aspects = transits.get("aspects", [])
    if aspects:
        if locale == "ko":
            parts.append(f"\n[주요 상호작용]")
        else:
            parts.append(f"\n[Major Aspects]")

        for a in aspects[:5]:
            parts.append(f"  • {a['planet1']} {a['aspect']} {a['planet2']} (orb: {a['orb']}°)")

    return "\n".join(parts)


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    print("Testing Real-time Astro...")

    # Get current transits
    transits = get_current_transits()

    print(f"\nTimestamp: {transits['timestamp']}")
    print(f"Source: {transits['source']}")

    print(f"\nMoon: {transits['moon']}")

    print(f"\nPlanets:")
    for p in transits['planets'][:5]:
        print(f"  {p['name']}: {p['sign']} {p['degree']}°")

    print(f"\nRetrogrades: {transits['retrogrades']}")

    print(f"\nInterpretation (KO):")
    print(get_transit_interpretation(transits, "ko"))
