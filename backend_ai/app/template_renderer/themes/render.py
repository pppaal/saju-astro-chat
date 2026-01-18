"""
Main template report rendering function.
"""
import json
from typing import Dict, Any

from ..builders import (
    get_important_years,
    get_category_analysis,
    get_key_insights,
    get_lucky_elements,
    get_saju_highlight,
    get_astro_highlight,
)
from .sections import get_theme_sections
from .summary import get_theme_summary


def render_template_report(
    facts: Dict[str, Any],
    signals: Dict[str, Any],
    cross_summary: str,
    theme_cross: Dict[str, Any],
) -> str:
    """
    Return JSON report matching Display.tsx StructuredFortune format.
    Supports 9 themes: fortune_today/monthly/new_year/next_year, focus_career/love/family/health/overall
    Supports locales: ko (Korean), en (English)
    """
    saju = facts.get("saju") or {}
    astro = facts.get("astro") or {}
    theme = facts.get("theme", "focus_overall")
    locale = facts.get("locale", "ko")
    unse = saju.get("unse") or {}

    # Locale-specific strings
    if locale == "en":
        life_desc = "Key life moments analyzed from your Saju and astrology data. Make the most of each period for better outcomes. Destiny is not fixed - opportunities come to those who prepare."
        cross_default = "Cross-analysis of Eastern and Western wisdom creates your unique destiny map. Use this insight for better choices."
    else:
        life_desc = "동양과 서양의 지혜를 기반으로 분석한 당신의 인생 주요 시점입니다. 각 시기를 잘 활용하면 더 좋은 결과를 얻을 수 있어요. 운명은 정해진 것이 아니라 준비하는 사람에게 기회가 옵니다."
        cross_default = "동양과 서양의 지혜가 만나 당신만의 운명 지도가 완성됩니다. 이 분석을 참고해 더 나은 선택을 하세요."

    structured = {
        "themeSummary": get_theme_summary(theme, saju, astro, locale),
        "sections": get_theme_sections(theme, saju, astro, locale),
        "lifeTimeline": {
            "description": life_desc,
            "importantYears": get_important_years(unse, saju, astro, locale)
        },
        "categoryAnalysis": get_category_analysis(signals, theme_cross, locale),
        "keyInsights": get_key_insights(theme_cross, signals, saju, locale),
        "luckyElements": get_lucky_elements(signals, saju, locale),
        "sajuHighlight": get_saju_highlight(saju, locale),
        "astroHighlight": get_astro_highlight(astro, signals, locale),
        "crossHighlights": {
            "summary": cross_summary or cross_default,
            "points": (theme_cross or {}).get("intersections", [])[:3]
        }
    }

    return json.dumps(structured, ensure_ascii=False, indent=2)
