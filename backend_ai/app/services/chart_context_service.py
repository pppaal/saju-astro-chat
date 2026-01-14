"""
Chart Context Service

Builds rich context summaries for AI fortune-telling from Saju and Astrology charts.

This service provides:
- Saju chart context building (pillars, elements, relationships)
- Astrology chart context building (planets, houses, aspects)
- Combined chart summaries for AI prompts
- Context formatting for streaming responses

Used by:
- ask-stream endpoints
- saju/ask-stream
- astrology/ask-stream
- All fortune-telling routes
"""
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class ChartContextService:
    """
    Service for building chart context summaries.

    Converts raw Saju and Astrology calculation results into
    human-readable context strings for AI prompt injection.
    """

    @staticmethod
    def build_saju_context(saju_data: Dict[str, Any], include_unse: bool = True) -> str:
        """
        Build Saju chart context summary.

        Args:
            saju_data: Saju calculation result from calc_saju endpoint
            include_unse: Whether to include 대운 (Daeun) information

        Returns:
            Formatted Saju context string

        Example:
            >>> context = ChartContextService.build_saju_context(saju_data)
            >>> context
            "사주 팔자:\\n年柱: 庚午 (경오)\\n月柱: 戊寅 (무인)\\n..."
        """
        if not saju_data:
            return ""

        lines = ["사주 팔자:"]

        # 사주 팔자 (Four Pillars)
        pillars = saju_data.get("pillars", {})
        for pillar_name, pillar_korean in [
            ("year", "年柱"),
            ("month", "月柱"),
            ("day", "日柱"),
            ("hour", "時柱")
        ]:
            pillar = pillars.get(pillar_name, {})
            stem = pillar.get("stem", "")
            branch = pillar.get("branch", "")
            hanja = pillar.get("hanja", "")
            if stem and branch:
                lines.append(f"{pillar_korean}: {stem}{branch} ({hanja})")

        # 일간 (Day Master)
        day_master = saju_data.get("day_master", {})
        if day_master:
            element = day_master.get("element", "")
            yin_yang = day_master.get("yin_yang", "")
            strength = day_master.get("strength_score", 0)
            lines.append(f"\n일간: {element} ({yin_yang}), 강도: {strength}")

        # 오행 균형 (Five Elements Balance)
        elements = saju_data.get("element_balance", {})
        if elements:
            lines.append("\n오행 균형:")
            for elem, count in elements.items():
                lines.append(f"  {elem}: {count}")

        # 십성 (Ten Gods)
        sibsin = saju_data.get("sibsin", {})
        if sibsin:
            lines.append("\n십성:")
            for god, info in sibsin.items():
                if isinstance(info, dict):
                    count = info.get("count", 0)
                    if count > 0:
                        lines.append(f"  {god}: {count}")

        # 격국 (Pattern/Structure)
        pattern = saju_data.get("pattern", {})
        if pattern:
            pattern_name = pattern.get("name", "")
            pattern_quality = pattern.get("quality", "")
            if pattern_name:
                lines.append(f"\n격국: {pattern_name} ({pattern_quality})")

        # 대운 (Daeun/Luck Periods)
        if include_unse:
            unse = saju_data.get("unse", [])
            if unse and len(unse) > 0:
                current_unse = unse[0]  # First one is current
                stem = current_unse.get("stem", "")
                branch = current_unse.get("branch", "")
                age_range = current_unse.get("age_range", "")
                if stem and branch:
                    lines.append(f"\n현재 대운: {stem}{branch} ({age_range})")

        return "\n".join(lines)

    @staticmethod
    def build_astrology_context(astro_data: Dict[str, Any], include_aspects: bool = True) -> str:
        """
        Build Astrology chart context summary.

        Args:
            astro_data: Astrology calculation result from calc_astro endpoint
            include_aspects: Whether to include aspects information

        Returns:
            Formatted astrology context string

        Example:
            >>> context = ChartContextService.build_astrology_context(astro_data)
            >>> context
            "Natal Chart:\\nSun in Leo (5th house)\\nMoon in Pisces (12th house)\\n..."
        """
        if not astro_data:
            return ""

        lines = ["Natal Chart:"]

        # Planets
        planets = astro_data.get("planets", {})
        if planets:
            lines.append("\nPlanets:")
            for planet_name, planet_data in planets.items():
                if isinstance(planet_data, dict):
                    sign = planet_data.get("sign", "")
                    house = planet_data.get("house", "")
                    degree = planet_data.get("longitude", 0)
                    if sign:
                        house_str = f" ({house} house)" if house else ""
                        lines.append(f"  {planet_name}: {sign} {degree:.1f}°{house_str}")

        # Ascendant & MC
        ascendant = astro_data.get("ascendant", {})
        if ascendant:
            sign = ascendant.get("sign", "")
            degree = ascendant.get("longitude", 0)
            if sign:
                lines.append(f"\nAscendant: {sign} {degree:.1f}°")

        mc = astro_data.get("mc", {})
        if mc:
            sign = mc.get("sign", "")
            degree = mc.get("longitude", 0)
            if sign:
                lines.append(f"MC: {sign} {degree:.1f}°")

        # Houses (simplified)
        houses = astro_data.get("houses", [])
        if houses and len(houses) > 0:
            lines.append("\nHouse Cusps:")
            for i, house in enumerate(houses[:4], 1):  # First 4 houses only
                if isinstance(house, dict):
                    sign = house.get("sign", "")
                    degree = house.get("longitude", 0)
                    if sign:
                        lines.append(f"  {i}H: {sign} {degree:.1f}°")

        # Aspects (major aspects only)
        if include_aspects:
            aspects = astro_data.get("aspects", [])
            if aspects:
                lines.append("\nMajor Aspects:")
                major_aspects = ["conjunction", "opposition", "trine", "square", "sextile"]
                for aspect in aspects[:10]:  # Limit to 10
                    if isinstance(aspect, dict):
                        planet1 = aspect.get("planet1", "")
                        planet2 = aspect.get("planet2", "")
                        aspect_type = aspect.get("aspect", "")
                        orb = aspect.get("orb", 0)
                        if aspect_type.lower() in major_aspects:
                            lines.append(f"  {planet1} {aspect_type} {planet2} (orb: {orb:.1f}°)")

        return "\n".join(lines)

    @staticmethod
    def build_combined_context(
        saju_data: Optional[Dict[str, Any]] = None,
        astro_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Build combined Saju + Astrology context.

        Args:
            saju_data: Saju calculation result (optional)
            astro_data: Astrology calculation result (optional)

        Returns:
            Combined context string

        Example:
            >>> context = ChartContextService.build_combined_context(saju_data, astro_data)
            >>> # Used in AI prompts for comprehensive readings
        """
        contexts = []

        if saju_data:
            saju_context = ChartContextService.build_saju_context(saju_data)
            if saju_context:
                contexts.append(saju_context)

        if astro_data:
            astro_context = ChartContextService.build_astrology_context(astro_data)
            if astro_context:
                contexts.append(astro_context)

        if not contexts:
            return ""

        return "\n\n" + "=" * 50 + "\n\n".join(contexts)

    @staticmethod
    def build_compact_saju_summary(saju_data: Dict[str, Any]) -> str:
        """
        Build compact Saju summary (one-line format).

        Used for logging and brief context.

        Args:
            saju_data: Saju calculation result

        Returns:
            Compact summary string

        Example:
            >>> summary = ChartContextService.build_compact_saju_summary(saju_data)
            >>> summary
            "庚午 戊寅 甲子 乙丑 | 일간: 木(陰) | 격국: 식신격"
        """
        if not saju_data:
            return ""

        parts = []

        # Pillars
        pillars = saju_data.get("pillars", {})
        pillar_str = " ".join([
            pillars.get(p, {}).get("hanja", "")
            for p in ["year", "month", "day", "hour"]
            if pillars.get(p, {}).get("hanja")
        ])
        if pillar_str:
            parts.append(pillar_str)

        # Day Master
        day_master = saju_data.get("day_master", {})
        if day_master:
            element = day_master.get("element", "")
            yin_yang = day_master.get("yin_yang", "")
            if element:
                parts.append(f"일간: {element}({yin_yang})")

        # Pattern
        pattern = saju_data.get("pattern", {})
        if pattern:
            pattern_name = pattern.get("name", "")
            if pattern_name:
                parts.append(f"격국: {pattern_name}")

        return " | ".join(parts)

    @staticmethod
    def extract_key_themes(
        saju_data: Optional[Dict[str, Any]] = None,
        astro_data: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        """
        Extract key themes from chart data.

        Used for tagging and filtering fortune content.

        Args:
            saju_data: Saju calculation result (optional)
            astro_data: Astrology calculation result (optional)

        Returns:
            List of theme keywords

        Example:
            >>> themes = ChartContextService.extract_key_themes(saju_data, astro_data)
            >>> themes
            ["career", "wealth", "relationship", "health"]
        """
        themes = set()

        if saju_data:
            # Extract from 십성 (Ten Gods)
            sibsin = saju_data.get("sibsin", {})
            if sibsin:
                # Map sibsin to themes
                if sibsin.get("재성", {}).get("count", 0) > 2:
                    themes.add("wealth")
                if sibsin.get("관성", {}).get("count", 0) > 2:
                    themes.add("career")
                if sibsin.get("식상", {}).get("count", 0) > 2:
                    themes.add("creativity")

            # Extract from pattern
            pattern = saju_data.get("pattern", {})
            if pattern:
                pattern_name = pattern.get("name", "")
                if "재격" in pattern_name:
                    themes.add("wealth")
                if "관격" in pattern_name:
                    themes.add("career")
                if "식신" in pattern_name or "상관" in pattern_name:
                    themes.add("creativity")

        if astro_data:
            # Extract from emphasized planets
            planets = astro_data.get("planets", {})
            if planets:
                # Venus emphasis -> relationship
                venus = planets.get("Venus", {})
                if venus.get("house") in ["7", "5"]:
                    themes.add("relationship")

                # Mars/Saturn -> career/ambition
                mars = planets.get("Mars", {})
                saturn = planets.get("Saturn", {})
                if mars.get("house") in ["10", "6"] or saturn.get("house") == "10":
                    themes.add("career")

                # Jupiter -> wealth/expansion
                jupiter = planets.get("Jupiter", {})
                if jupiter.get("house") in ["2", "8"]:
                    themes.add("wealth")

        # Default themes if none found
        if not themes:
            themes.update(["general", "fortune"])

        return sorted(list(themes))


# ============================================================================
# Convenience functions
# ============================================================================

def build_saju_context(saju_data: Dict[str, Any], include_unse: bool = True) -> str:
    """Convenience function for ChartContextService.build_saju_context()"""
    return ChartContextService.build_saju_context(saju_data, include_unse)


def build_astrology_context(astro_data: Dict[str, Any], include_aspects: bool = True) -> str:
    """Convenience function for ChartContextService.build_astrology_context()"""
    return ChartContextService.build_astrology_context(astro_data, include_aspects)


def build_combined_context(
    saju_data: Optional[Dict[str, Any]] = None,
    astro_data: Optional[Dict[str, Any]] = None
) -> str:
    """Convenience function for ChartContextService.build_combined_context()"""
    return ChartContextService.build_combined_context(saju_data, astro_data)
