# backend_ai/app/chart_generator.py
"""
Chart Visualization Generator
==============================
Generates SVG charts for:
1. Saju Paljja Table (사주팔자표)
2. Natal Chart Wheel (네이탈 차트)
3. Element Balance Chart (오행 균형표)

Output: SVG string or base64 encoded image
"""

import math
import base64
from typing import Dict, List, Optional, Tuple
from io import BytesIO

# Zodiac symbols
ZODIAC_SYMBOLS = {
    "Aries": "♈", "Taurus": "♉", "Gemini": "♊", "Cancer": "♋",
    "Leo": "♌", "Virgo": "♍", "Libra": "♎", "Scorpio": "♏",
    "Sagittarius": "♐", "Capricorn": "♑", "Aquarius": "♒", "Pisces": "♓"
}

PLANET_SYMBOLS = {
    "Sun": "☉", "Moon": "☽", "Mercury": "☿", "Venus": "♀", "Mars": "♂",
    "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅", "Neptune": "♆", "Pluto": "♇",
    "North Node": "☊", "South Node": "☋", "Chiron": "⚷"
}

ELEMENT_COLORS = {
    "木": "#4CAF50", "wood": "#4CAF50",  # Green
    "火": "#F44336", "fire": "#F44336",  # Red
    "土": "#FF9800", "earth": "#FF9800",  # Orange
    "金": "#9E9E9E", "metal": "#9E9E9E",  # Gray
    "水": "#2196F3", "water": "#2196F3",  # Blue
    "Fire": "#F44336", "Earth": "#FF9800",
    "Air": "#00BCD4", "Water": "#2196F3"
}

HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]


# ===============================================================
# SAJU PALJJA TABLE (사주팔자표)
# ===============================================================
def generate_saju_table_svg(pillars: Dict, day_master: Dict = None, five_elements: Dict = None) -> str:
    """
    Generate SVG for Saju Paljja Table.

    Args:
        pillars: {"year": "甲子", "month": "乙丑", "day": "丙寅", "time": "丁卯"}
        day_master: {"name": "丙", "element": "火", "strength": "strong"}
        five_elements: {"木": 2, "火": 3, "土": 1, "金": 1, "水": 1}
    """
    width, height = 400, 320

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
    <defs>
        <linearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea"/>
            <stop offset="100%" style="stop-color:#764ba2"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.2"/>
        </filter>
    </defs>

    <!-- Background -->
    <rect width="{width}" height="{height}" fill="#fafafa" rx="12"/>

    <!-- Title -->
    <text x="{width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">
        四柱八字 사주팔자
    </text>
'''

    # Column positions
    cols = [50, 140, 230, 320]
    col_labels = ["年柱", "月柱", "日柱", "時柱"]
    col_labels_ko = ["년주", "월주", "일주", "시주"]
    pillar_keys = ["year", "month", "day", "time"]

    # Headers
    for i, (col, label, label_ko) in enumerate(zip(cols, col_labels, col_labels_ko)):
        svg += f'''
    <rect x="{col-35}" y="50" width="70" height="35" fill="url(#headerGrad)" rx="6"/>
    <text x="{col}" y="72" text-anchor="middle" font-size="14" fill="white" font-weight="bold">{label}</text>
'''

    # Pillar values
    for i, (col, key) in enumerate(zip(cols, pillar_keys)):
        pillar = pillars.get(key, "")
        if pillar and len(pillar) >= 2:
            stem = pillar[0]  # Heavenly Stem (천간)
            branch = pillar[1]  # Earthly Branch (지지)

            # Determine element colors
            stem_elem = get_stem_element(stem)
            branch_elem = get_branch_element(branch)

            # Stem cell
            svg += f'''
    <rect x="{col-30}" y="95" width="60" height="50" fill="{ELEMENT_COLORS.get(stem_elem, '#eee')}" rx="6" filter="url(#shadow)" opacity="0.9"/>
    <text x="{col}" y="130" text-anchor="middle" font-size="28" fill="white" font-weight="bold">{stem}</text>
'''
            # Branch cell
            svg += f'''
    <rect x="{col-30}" y="155" width="60" height="50" fill="{ELEMENT_COLORS.get(branch_elem, '#eee')}" rx="6" filter="url(#shadow)" opacity="0.9"/>
    <text x="{col}" y="190" text-anchor="middle" font-size="28" fill="white" font-weight="bold">{branch}</text>
'''

    # Day Master highlight
    if day_master:
        dm_name = day_master.get("name", "")
        dm_element = day_master.get("element", "")
        dm_strength = day_master.get("strength", "")
        svg += f'''
    <rect x="190" y="93" width="64" height="54" fill="none" stroke="#FFD700" stroke-width="3" rx="8"/>
    <text x="{width/2}" y="230" text-anchor="middle" font-size="12" fill="#666">
        日干: {dm_name} ({dm_element}) - {dm_strength}
    </text>
'''

    # Five Elements Bar
    if five_elements:
        svg += generate_element_bar(five_elements, y_start=250, width=width)

    svg += "</svg>"
    return svg


def generate_element_bar(elements: Dict, y_start: int, width: int) -> str:
    """Generate horizontal element balance bar."""
    total = sum(elements.values()) or 1
    bar_width = width - 40
    x_start = 20

    svg = f'''
    <text x="{width/2}" y="{y_start}" text-anchor="middle" font-size="12" fill="#666">오행 균형</text>
'''
    current_x = x_start
    for elem, count in elements.items():
        segment_width = (count / total) * bar_width
        color = ELEMENT_COLORS.get(elem, "#ccc")
        svg += f'''
    <rect x="{current_x}" y="{y_start + 10}" width="{segment_width}" height="25" fill="{color}" rx="3"/>
    <text x="{current_x + segment_width/2}" y="{y_start + 27}" text-anchor="middle" font-size="11" fill="white">{elem}{count}</text>
'''
        current_x += segment_width

    return svg


def get_stem_element(stem: str) -> str:
    """Get element for heavenly stem."""
    stem_elements = {
        "甲": "木", "乙": "木",
        "丙": "火", "丁": "火",
        "戊": "土", "己": "土",
        "庚": "金", "辛": "金",
        "壬": "水", "癸": "水"
    }
    return stem_elements.get(stem, "土")


def get_branch_element(branch: str) -> str:
    """Get element for earthly branch."""
    branch_elements = {
        "子": "水", "丑": "土", "寅": "木", "卯": "木",
        "辰": "土", "巳": "火", "午": "火", "未": "土",
        "申": "金", "酉": "金", "戌": "土", "亥": "水"
    }
    return branch_elements.get(branch, "土")


# ===============================================================
# NATAL CHART WHEEL
# ===============================================================
def generate_natal_chart_svg(
    planets: List[Dict],
    houses: List[float] = None,
    ascendant: float = 0,
    size: int = 400
) -> str:
    """
    Generate SVG natal chart wheel.

    Args:
        planets: [{"name": "Sun", "longitude": 45.5, "sign": "Taurus"}, ...]
        houses: [0, 30, 60, ...] house cusp longitudes
        ascendant: Ascendant degree
        size: SVG size
    """
    center = size / 2
    outer_radius = size / 2 - 20
    zodiac_radius = outer_radius - 30
    planet_radius = zodiac_radius - 40
    inner_radius = planet_radius - 30

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">
    <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e"/>
            <stop offset="100%" style="stop-color:#16213e"/>
        </linearGradient>
    </defs>

    <!-- Background -->
    <circle cx="{center}" cy="{center}" r="{outer_radius + 10}" fill="url(#bgGrad)"/>

    <!-- Outer circle -->
    <circle cx="{center}" cy="{center}" r="{outer_radius}" fill="none" stroke="#FFD700" stroke-width="2"/>

    <!-- Zodiac band -->
    <circle cx="{center}" cy="{center}" r="{zodiac_radius}" fill="none" stroke="#444" stroke-width="1"/>
'''

    # Draw zodiac signs
    for i in range(12):
        angle_start = (i * 30 - ascendant - 90) * math.pi / 180
        angle_mid = ((i * 30 + 15) - ascendant - 90) * math.pi / 180
        angle_end = ((i + 1) * 30 - ascendant - 90) * math.pi / 180

        # Sign dividers
        x1 = center + outer_radius * math.cos(angle_start)
        y1 = center + outer_radius * math.sin(angle_start)
        x2 = center + zodiac_radius * math.cos(angle_start)
        y2 = center + zodiac_radius * math.sin(angle_start)
        svg += f'    <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#666" stroke-width="1"/>\n'

        # Sign symbol
        sign_name = list(ZODIAC_SYMBOLS.keys())[i]
        symbol = ZODIAC_SYMBOLS[sign_name]
        sx = center + (zodiac_radius + 15) * math.cos(angle_mid)
        sy = center + (zodiac_radius + 15) * math.sin(angle_mid)

        # Element color
        element = ["Fire", "Earth", "Air", "Water"][i % 4]
        color = ELEMENT_COLORS.get(element, "#fff")

        svg += f'    <text x="{sx}" y="{sy}" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="{color}">{symbol}</text>\n'

    # Inner circle
    svg += f'    <circle cx="{center}" cy="{center}" r="{inner_radius}" fill="#1a1a2e" stroke="#333" stroke-width="1"/>\n'

    # Draw planets
    placed_positions = []
    for planet in planets:
        longitude = planet.get("longitude", 0)
        name = planet.get("name", "")
        symbol = PLANET_SYMBOLS.get(name, "?")

        # Calculate position
        angle = (longitude - ascendant - 90) * math.pi / 180
        px = center + planet_radius * math.cos(angle)
        py = center + planet_radius * math.sin(angle)

        # Avoid overlaps (simple)
        for placed_x, placed_y in placed_positions:
            if abs(px - placed_x) < 15 and abs(py - placed_y) < 15:
                px += 10
                py += 10
        placed_positions.append((px, py))

        # Planet marker
        svg += f'''
    <circle cx="{px}" cy="{py}" r="12" fill="#1a1a2e" stroke="#FFD700" stroke-width="1"/>
    <text x="{px}" y="{py}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#FFD700">{symbol}</text>
'''
        # Degree text
        degree = round(longitude % 30, 1)
        svg += f'    <text x="{px}" y="{py + 18}" text-anchor="middle" font-size="8" fill="#888">{degree}°</text>\n'

    # Ascendant marker
    asc_angle = (-90) * math.pi / 180
    asc_x = center + outer_radius * math.cos(asc_angle)
    asc_y = center + outer_radius * math.sin(asc_angle)
    svg += f'''
    <polygon points="{asc_x},{asc_y-10} {asc_x-8},{asc_y+5} {asc_x+8},{asc_y+5}" fill="#FF4444"/>
    <text x="{asc_x}" y="{asc_y-15}" text-anchor="middle" font-size="10" fill="#FF4444">ASC</text>
'''

    # Legend
    svg += f'''
    <text x="{center}" y="{size - 10}" text-anchor="middle" font-size="10" fill="#666">Natal Chart</text>
'''

    svg += "</svg>"
    return svg


# ===============================================================
# ELEMENT RATIO CHART (Pie/Donut)
# ===============================================================
def generate_element_pie_svg(
    elements: Dict,
    title: str = "Element Balance",
    size: int = 200
) -> str:
    """Generate pie chart for element ratios."""
    center = size / 2
    radius = size / 2 - 30
    inner_radius = radius * 0.5

    total = sum(elements.values()) or 1

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">
    <text x="{center}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">{title}</text>
'''

    start_angle = -90
    for elem, value in elements.items():
        if value == 0:
            continue

        sweep = (value / total) * 360
        end_angle = start_angle + sweep

        # Convert to radians
        start_rad = start_angle * math.pi / 180
        end_rad = end_angle * math.pi / 180

        # Arc points
        x1 = center + radius * math.cos(start_rad)
        y1 = center + radius * math.sin(start_rad)
        x2 = center + radius * math.cos(end_rad)
        y2 = center + radius * math.sin(end_rad)
        ix1 = center + inner_radius * math.cos(start_rad)
        iy1 = center + inner_radius * math.sin(start_rad)
        ix2 = center + inner_radius * math.cos(end_rad)
        iy2 = center + inner_radius * math.sin(end_rad)

        large_arc = 1 if sweep > 180 else 0
        color = ELEMENT_COLORS.get(elem, "#ccc")

        path = f"M {ix1} {iy1} L {x1} {y1} A {radius} {radius} 0 {large_arc} 1 {x2} {y2} L {ix2} {iy2} A {inner_radius} {inner_radius} 0 {large_arc} 0 {ix1} {iy1}"

        svg += f'    <path d="{path}" fill="{color}" stroke="white" stroke-width="2"/>\n'

        # Label
        mid_angle = (start_angle + sweep / 2) * math.pi / 180
        label_radius = (radius + inner_radius) / 2
        lx = center + label_radius * math.cos(mid_angle)
        ly = center + label_radius * math.sin(mid_angle)
        pct = round(value / total * 100)
        svg += f'    <text x="{lx}" y="{ly}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="white" font-weight="bold">{elem}</text>\n'
        svg += f'    <text x="{lx}" y="{ly + 12}" text-anchor="middle" font-size="9" fill="white">{pct}%</text>\n'

        start_angle = end_angle

    svg += "</svg>"
    return svg


# ===============================================================
# COMBINED CHART (Full Report)
# ===============================================================
def generate_full_chart_html(
    saju_data: Dict,
    astro_data: Dict,
    locale: str = "en"
) -> str:
    """Generate complete HTML with all charts."""
    pillars = saju_data.get("pillars", {})
    day_master = saju_data.get("dayMaster", {})
    five_elements = saju_data.get("facts", {}).get("fiveElements", {})
    planets = astro_data.get("planets", [])
    ascendant = astro_data.get("ascendant", {}).get("longitude", 0)
    element_ratios = astro_data.get("facts", {}).get("elementRatios", {})

    saju_svg = generate_saju_table_svg(pillars, day_master, five_elements)
    natal_svg = generate_natal_chart_svg(planets, ascendant=ascendant)
    element_svg = generate_element_pie_svg(element_ratios, "Western Elements")

    title = "운명 분석 차트" if locale == "ko" else "Destiny Analysis Charts"

    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
        }}
        h1 {{
            color: white;
            text-align: center;
            margin-bottom: 30px;
        }}
        .chart-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }}
        .chart-card {{
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }}
        .chart-card.full-width {{
            grid-column: 1 / -1;
        }}
        .chart-title {{
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            text-align: center;
        }}
        svg {{
            width: 100%;
            height: auto;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>{title}</h1>
        <div class="chart-grid">
            <div class="chart-card full-width">
                <div class="chart-title">{"사주팔자" if locale == "ko" else "Four Pillars (Saju)"}</div>
                {saju_svg}
            </div>
            <div class="chart-card">
                <div class="chart-title">{"네이탈 차트" if locale == "ko" else "Natal Chart"}</div>
                {natal_svg}
            </div>
            <div class="chart-card">
                <div class="chart-title">{"원소 균형" if locale == "ko" else "Element Balance"}</div>
                {element_svg}
            </div>
        </div>
    </div>
</body>
</html>'''

    return html


def svg_to_base64(svg_string: str) -> str:
    """Convert SVG string to base64 data URI."""
    encoded = base64.b64encode(svg_string.encode('utf-8')).decode('utf-8')
    return f"data:image/svg+xml;base64,{encoded}"


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    print("Testing Chart Generator...")

    # Test Saju table
    saju_svg = generate_saju_table_svg(
        pillars={"year": "甲子", "month": "乙丑", "day": "丙寅", "time": "丁卯"},
        day_master={"name": "丙", "element": "火", "strength": "strong"},
        five_elements={"木": 2, "火": 3, "土": 1, "金": 1, "水": 1}
    )
    print(f"Saju SVG length: {len(saju_svg)}")

    # Test natal chart
    natal_svg = generate_natal_chart_svg([
        {"name": "Sun", "longitude": 45.5},
        {"name": "Moon", "longitude": 120.3},
        {"name": "Mercury", "longitude": 50.2},
        {"name": "Venus", "longitude": 30.0},
        {"name": "Mars", "longitude": 200.5},
    ])
    print(f"Natal SVG length: {len(natal_svg)}")

    # Save test HTML
    html = generate_full_chart_html(
        saju_data={
            "pillars": {"year": "甲子", "month": "乙丑", "day": "丙寅", "time": "丁卯"},
            "dayMaster": {"name": "丙", "element": "火", "strength": "strong"},
            "facts": {"fiveElements": {"木": 2, "火": 3, "土": 1, "金": 1, "水": 1}}
        },
        astro_data={
            "planets": [
                {"name": "Sun", "longitude": 45.5},
                {"name": "Moon", "longitude": 120.3},
                {"name": "Mercury", "longitude": 50.2},
            ],
            "ascendant": {"longitude": 0},
            "facts": {"elementRatios": {"Fire": 0.3, "Earth": 0.25, "Air": 0.25, "Water": 0.2}}
        },
        locale="ko"
    )
    print(f"HTML length: {len(html)}")
