"""
Chart Service

Provides chart calculation and analysis services for Saju/Astrology fusion.

Services:
- Cross-analysis (9 types combining Saju and Astrology from GraphRAG)
- Theme-specific fusion rules (daily, monthly, yearly, family, health, wealth, life_path)

✅ Phase 2.5: Extracted from app.py (901 lines)
"""
import json
import logging
from typing import Dict, Any
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class ChartService:
    """
    Chart calculation and analysis service.

    Handles:
    - Cross-analysis with GraphRAG (9 types)
    - Theme-specific fusion rules (6+ domains)
    - Multi-language support (Korean/English)
    """

    def __init__(self):
        """Initialize ChartService."""
        pass

    def get_cross_analysis_for_chart(
        self,
        saju_data: dict,
        astro_data: dict,
        theme: str = "chat",
        locale: str = "ko"
    ) -> str:
        """
        Get detailed cross-analysis based on user's chart data.
        Enhanced v3: Uses ALL fusion rules with:
        - Planet + House combinations with timing/advice
        - Saju Ten Gods (십신) analysis
        - Element cross-matching (사주 오행 × 점성 원소)
        - Health, Wealth, Family, Life Path analysis
        - Actionable insights with specific timing
        - Supports both new (text_ko/advice) and legacy (text only) rule formats

        Args:
            saju_data: Saju chart data
            astro_data: Astrology chart data
            theme: Counseling theme (chat, career, love, health, wealth, family, life_path, etc.)
            locale: Language locale (ko, en)

        Returns:
            Formatted string with top 8 cross-analysis insights
        """
        # Import dependencies
        from backend_ai.app.redis_cache import get_cache

        cache_manager = get_cache()
        results = []
        is_ko = locale == "ko"

        # Extract key chart elements for indexing
        dm_data = saju_data.get("dayMaster", {})
        if not isinstance(dm_data, dict):
            dm_data = {}
        daymaster = dm_data.get("heavenlyStem") or dm_data.get("name", "")
        dm_element = dm_data.get("element", "")

        sun_data = astro_data.get("sun", {})
        sun_sign = sun_data.get("sign", "") if isinstance(sun_data, dict) else ""

        moon_data = astro_data.get("moon", {})
        moon_sign = moon_data.get("sign", "") if isinstance(moon_data, dict) else ""

        # Get dominant element for cross-matching
        element_counts = saju_data.get("elementCounts", {})
        if not isinstance(element_counts, dict):
            element_counts = {}
        dominant_element = max(element_counts.items(), key=lambda x: x[1] if isinstance(x[1], (int, float)) else 0)[0] if element_counts else ""

        # Get dominant Ten God for deeper insights
        ten_gods = saju_data.get("tenGods", {})
        if not isinstance(ten_gods, dict):
            ten_gods = {}
        dominant_god = ten_gods.get("dominant", "")
        # Ensure dominant_god is a string (not dict)
        if isinstance(dominant_god, dict):
            dominant_god = dominant_god.get("name", "") or dominant_god.get("ko", "") or ""
        elif not isinstance(dominant_god, str):
            dominant_god = str(dominant_god) if dominant_god else ""

        logger.info(f"[CROSS-ANALYSIS] DM={daymaster} SUN={sun_sign} MOON={moon_sign} ELEMENT={dominant_element} GOD={dominant_god} theme={theme}")

        # ===============================================================
        # 1. Load cross-analysis cache from GraphRAG
        # ===============================================================
        cross_analyses = {}
        cache_keys = [
            "cross_daymaster_sun",
            "cross_sibsin_planet",
            "cross_branch_house",
            "cross_relation_aspect",
            "cross_shinsal_asteroid",
            "cross_geokguk_house",
            "cross_daeun_progression",
            "cross_ganji_harmonic",
            "cross_gongmang_draconic"
        ]

        for cache_key in cache_keys:
            cache_data = cache_manager.get(cache_key)
            if cache_data:
                if isinstance(cache_data, dict):
                    cross_analyses[cache_key] = cache_data
                else:
                    try:
                        cross_analyses[cache_key] = json.loads(cache_data)
                    except Exception:
                        logger.warning(f"[CROSS-ANALYSIS] Failed to parse {cache_key}")

        # ===============================================================
        # 2. Extract insights from each cross-analysis domain
        # ===============================================================

        # 2.1 Daymaster × Sun Sign
        if "cross_daymaster_sun" in cross_analyses:
            dm_sun_key = f"{daymaster}_{sun_sign}"
            entry = cross_analyses["cross_daymaster_sun"].get(dm_sun_key)
            if entry and isinstance(entry, dict):
                text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                weight = entry.get("weight", 5)
                results.append((text, weight, "daymaster_sun"))

        # 2.2 Ten Gods × Planet
        if "cross_sibsin_planet" in cross_analyses and dominant_god:
            sibsin_entries = cross_analyses["cross_sibsin_planet"]
            for planet in ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]:
                planet_data = astro_data.get(planet, {})
                if not isinstance(planet_data, dict):
                    continue
                planet_sign = planet_data.get("sign", "")
                if planet_sign:
                    key = f"{dominant_god}_{planet}_{planet_sign}"
                    entry = sibsin_entries.get(key)
                    if entry and isinstance(entry, dict):
                        text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                        weight = entry.get("weight", 5)
                        results.append((text, weight, f"sibsin_{planet}"))

        # 2.3 Branch × House
        if "cross_branch_house" in cross_analyses:
            branch_entries = cross_analyses["cross_branch_house"]
            for pillar in ["yearPillar", "monthPillar", "dayPillar", "hourPillar"]:
                pillar_data = saju_data.get(pillar, {})
                if isinstance(pillar_data, dict):
                    branch = pillar_data.get("earthlyBranch", "")
                    if not isinstance(branch, str):
                        branch = str(branch) if branch else ""
                    if branch:
                        # Check houses 1, 4, 7, 10 (angular houses)
                        for house in [1, 4, 7, 10]:
                            key = f"{branch}_H{house}"
                            entry = branch_entries.get(key)
                            if entry and isinstance(entry, dict):
                                text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                                weight = entry.get("weight", 5)
                                results.append((text, weight, f"branch_h{house}"))

        # 2.4 Relations × Aspects
        if "cross_relation_aspect" in cross_analyses:
            relation_entries = cross_analyses["cross_relation_aspect"]
            saju_relations = saju_data.get("relations", [])
            if not isinstance(saju_relations, list):
                saju_relations = []
            for rel in saju_relations[:3]:  # Top 3 relations
                if not isinstance(rel, dict):
                    continue
                rel_type = rel.get("type", "")
                if rel_type:
                    # Check for conjunctions, squares, trines
                    for aspect_type in ["conjunction", "square", "trine", "opposition"]:
                        key = f"{rel_type}_{aspect_type}"
                        entry = relation_entries.get(key)
                        if entry and isinstance(entry, dict):
                            text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                            weight = entry.get("weight", 5)
                            results.append((text, weight, f"relation_{aspect_type}"))

        # 2.5 Shinsal × Asteroids
        if "cross_shinsal_asteroid" in cross_analyses:
            shinsal_entries = cross_analyses["cross_shinsal_asteroid"]
            shinsals = saju_data.get("shinsal", {})
            if not isinstance(shinsals, dict):
                shinsals = {}
            for shinsal_key, shinsal_val in shinsals.items():
                if shinsal_val:
                    # Check for major asteroids (chiron, ceres, pallas, juno, vesta)
                    for asteroid in ["chiron", "ceres", "pallas", "juno", "vesta"]:
                        key = f"{shinsal_key}_{asteroid}"
                        entry = shinsal_entries.get(key)
                        if entry and isinstance(entry, dict):
                            text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                            weight = entry.get("weight", 5)
                            results.append((text, weight, f"shinsal_{asteroid}"))

        # 2.6 Geokguk × House
        if "cross_geokguk_house" in cross_analyses:
            geokguk_entries = cross_analyses["cross_geokguk_house"]
            geokguk = saju_data.get("geokguk", {})
            if isinstance(geokguk, dict):
                geokguk_type = geokguk.get("name", "") or geokguk.get("type", "")
                if not isinstance(geokguk_type, str):
                    geokguk_type = str(geokguk_type) if geokguk_type else ""
                if geokguk_type:
                    # Check key houses (1, 2, 10)
                    for house in [1, 2, 10]:
                        key = f"{geokguk_type}_H{house}"
                        entry = geokguk_entries.get(key)
                        if entry and isinstance(entry, dict):
                            text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                            weight = entry.get("weight", 5)
                            results.append((text, weight, f"geokguk_h{house}"))

        # 2.7 Daeun × Progressions
        if "cross_daeun_progression" in cross_analyses:
            daeun_entries = cross_analyses["cross_daeun_progression"]
            daeun = saju_data.get("daeun", {})
            if isinstance(daeun, dict):
                current_daeun = daeun.get("current", {})
                if isinstance(current_daeun, dict):
                    daeun_stem = current_daeun.get("heavenlyStem", "")
                    if not isinstance(daeun_stem, str):
                        daeun_stem = str(daeun_stem) if daeun_stem else ""
                    if daeun_stem:
                        # Check progressed sun, moon
                        for prog_type in ["prog_sun", "prog_moon"]:
                            key = f"{daeun_stem}_{prog_type}"
                            entry = daeun_entries.get(key)
                            if entry and isinstance(entry, dict):
                                text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                                weight = entry.get("weight", 5)
                                results.append((text, weight, f"daeun_{prog_type}"))

        # 2.8 60 Ganji × Harmonics
        if "cross_ganji_harmonic" in cross_analyses:
            ganji_entries = cross_analyses["cross_ganji_harmonic"]
            day_pillar_data = saju_data.get("dayPillar", {})
            if isinstance(day_pillar_data, dict):
                ganji = f"{day_pillar_data.get('heavenlyStem', '')}{day_pillar_data.get('earthlyBranch', '')}"
                if ganji and len(ganji) == 2:
                    # Check harmonics 4, 5, 7, 9
                    for harmonic in [4, 5, 7, 9]:
                        key = f"{ganji}_H{harmonic}"
                        entry = ganji_entries.get(key)
                        if entry and isinstance(entry, dict):
                            text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                            weight = entry.get("weight", 5)
                            results.append((text, weight, f"ganji_h{harmonic}"))

        # 2.9 Gongmang × Draconic
        if "cross_gongmang_draconic" in cross_analyses:
            gongmang_entries = cross_analyses["cross_gongmang_draconic"]
            gongmang = saju_data.get("gongmang", [])
            if not isinstance(gongmang, list):
                gongmang = []
            for gm in gongmang[:2]:  # Check first 2
                if isinstance(gm, str):
                    # Check draconic sun, moon
                    for draconic_type in ["draconic_sun", "draconic_moon"]:
                        key = f"{gm}_{draconic_type}"
                        entry = gongmang_entries.get(key)
                        if entry and isinstance(entry, dict):
                            text = entry.get("text_ko" if is_ko else "text_en", entry.get("text", ""))
                            weight = entry.get("weight", 5)
                            results.append((text, weight, f"gongmang_{draconic_type}"))

        # ===============================================================
        # 3. Load ALL fusion rules and apply based on theme
        # ===============================================================

        # Theme to domain mapping
        theme_domains = {
            "focus_career": ["career"],
            "focus_love": ["love", "compatibility", "family"],
            "focus_health": ["health"],
            "focus_wealth": ["wealth"],
            "focus_family": ["family"],
            "focus_overall": ["daily", "monthly", "life_path"],
            "chat": ["daily", "life_path"]
        }

        domains = theme_domains.get(theme, ["daily"])

        # Load fusion rules
        rules_dir = Path(__file__).parent.parent / "data" / "graph" / "rules" / "fusion"
        loaded_rules = {}
        for domain in domains:
            rule_path = rules_dir / f"{domain}.json"
            if rule_path.exists():
                try:
                    with open(rule_path, "r", encoding="utf-8") as f:
                        loaded_rules[domain] = json.load(f)
                except Exception as e:
                    logger.warning(f"[CROSS-ANALYSIS] Failed to load {domain}.json: {e}")

        # Apply fusion rules (planet + house combinations)
        for domain, rules_data in loaded_rules.items():
            if not isinstance(rules_data, dict):
                continue

            # Iterate through all rules
            for rule_key, rule in rules_data.items():
                if not isinstance(rule, dict):
                    continue

                # Parse rule_key: e.g., "rule_sun_1", "rule_moon_4", "rule_jupiter_2"
                parts = rule_key.split("_")
                if len(parts) >= 3:
                    planet = parts[1]
                    house_str = parts[2]

                    # Check if user's planet is in that house
                    planet_data = astro_data.get(planet, {})
                    if isinstance(planet_data, dict):
                        user_house = planet_data.get("house")
                        if user_house:
                            user_house_num = str(user_house).replace("H", "")
                            if user_house_num == house_str:
                                # Rule applies!
                                text = rule.get("text_ko" if is_ko else "text_en", rule.get("text", ""))
                                advice = rule.get("advice_ko" if is_ko else "advice_en", rule.get("advice", ""))
                                weight = rule.get("weight", 5)

                                # Format with advice if available
                                if advice:
                                    full_text = f"{text}\n💡 {advice}"
                                else:
                                    full_text = text

                                results.append((full_text, weight, f"{domain}_{planet}_h{house_str}"))

        # ===============================================================
        # 4. Sort by weight and deduplicate
        # ===============================================================

        # Sort by weight (descending)
        results.sort(key=lambda x: x[1], reverse=True)

        # Deduplicate by text content
        seen_texts = set()
        unique_results = []
        for text, weight, source in results:
            text_normalized = text.strip().lower()[:100]  # First 100 chars
            if text_normalized not in seen_texts:
                seen_texts.add(text_normalized)
                unique_results.append(text)

        # ===============================================================
        # 5. Format and return top 8
        # ===============================================================

        if unique_results:
            top_8 = unique_results[:8]
            logger.info(f"[CROSS-ANALYSIS] Generated {len(top_8)} unique insights for {theme}")

            # Format with section headers
            formatted = []
            formatted.append("🔮 **사주 × 점성 융합 분석**\n" if is_ko else "🔮 **Saju × Astrology Fusion Analysis**\n")
            for i, insight in enumerate(top_8, 1):
                formatted.append(f"{i}. {insight}")

            return "\n\n".join(formatted)

        logger.info(f"[CROSS-ANALYSIS] No insights generated for {theme}")
        return ""

    def get_theme_fusion_rules(
        self,
        saju_data: dict,
        astro_data: dict,
        theme: str,
        locale: str = "ko",
        birth_year: int = None
    ) -> str:
        """
        Get theme-specific fusion rules based on counselor theme.
        Applies rules from daily.json, monthly.json, new_year.json, next_year.json, family.json, life_path.json.

        Returns actionable insights tailored to the specific counseling theme.

        Args:
            saju_data: Saju chart data
            astro_data: Astrology chart data
            theme: Counseling theme (focus_overall, focus_career, focus_love, focus_health, focus_wealth, focus_family, focus_2025, focus_compatibility, chat)
            locale: Language locale (ko, en)
            birth_year: Birth year for age calculation

        Returns:
            Formatted string with top 5 theme-specific insights
        """
        results = []
        is_ko = locale == "ko"
        now = datetime.now()

        # Theme to rule file mapping
        theme_file_map = {
            "focus_overall": ["daily", "monthly", "life_path", "new_year"],
            "focus_career": ["daily", "monthly", "career"],
            "focus_love": ["daily", "monthly", "love", "family"],
            "focus_health": ["daily", "monthly", "health"],
            "focus_wealth": ["daily", "monthly", "wealth"],
            "focus_family": ["daily", "monthly", "family"],
            "focus_2025": ["new_year", "next_year", "monthly"],
            "focus_compatibility": ["compatibility", "love", "family"],
            "chat": ["daily", "life_path"],
        }

        rule_files = theme_file_map.get(theme, ["daily", "life_path"])

        # Load fusion rules
        rules_dir = Path(__file__).parent.parent / "data" / "graph" / "rules" / "fusion"
        loaded_rules = {}
        for rf in rule_files:
            rule_path = rules_dir / f"{rf}.json"
            if rule_path.exists():
                try:
                    with open(rule_path, "r", encoding="utf-8") as f:
                        loaded_rules[rf] = json.load(f)
                except Exception as e:
                    logger.warning(f"[THEME-FUSION] Failed to load {rf}.json: {e}")

        # Extract chart data
        dm_data = saju_data.get("dayMaster", {})
        if not isinstance(dm_data, dict):
            dm_data = {}
        daymaster = dm_data.get("heavenlyStem") or dm_data.get("name", "")
        dm_element = dm_data.get("element", "")
        ten_gods = saju_data.get("tenGods", {})
        if not isinstance(ten_gods, dict):
            ten_gods = {}
        dominant_god = ten_gods.get("dominant", "")
        # Ensure dominant_god is a string (not dict)
        if isinstance(dominant_god, dict):
            dominant_god = dominant_god.get("name", "") or dominant_god.get("ko", "") or ""
        elif not isinstance(dominant_god, str):
            dominant_god = str(dominant_god) if dominant_god else ""

        # Astrology data - safely handle non-dict values
        sun_data = astro_data.get("sun", {})
        sun_sign = sun_data.get("sign", "") if isinstance(sun_data, dict) else ""
        moon_data = astro_data.get("moon", {})
        moon_sign = moon_data.get("sign", "") if isinstance(moon_data, dict) else ""

        # Calculate age if birth_year provided
        current_age = now.year - birth_year if birth_year else None

        # Helper to get localized text
        def get_text(rule):
            if is_ko:
                return rule.get("text_ko", rule.get("text", ""))
            return rule.get("text_en", rule.get("text", ""))

        def get_advice(rule):
            return rule.get("advice_ko", "") if is_ko else rule.get("advice_en", "")

        # ===============================================================
        # 1. DAILY RULES - Moon phases, planetary transits, day energy
        # ===============================================================
        if "daily" in loaded_rules:
            daily_rules = loaded_rules["daily"]

            # Check moon phase (simplified - use current day of lunar month)
            lunar_day = now.day % 30
            if lunar_day <= 3:  # New moon period
                rule = daily_rules.get("rule_new_moon_day")
                if rule:
                    results.append(f"🌑 {get_text(rule)}\n💡 {get_advice(rule)}")
            elif 13 <= lunar_day <= 17:  # Full moon period
                rule = daily_rules.get("rule_full_moon_day")
                if rule:
                    results.append(f"🌕 {get_text(rule)}\n💡 {get_advice(rule)}")

            # Check daily Ten God energy (ilgan)
            if dominant_god:
                god_category = ""
                if dominant_god in ["비견", "겁재"]:
                    god_category = "bigyeop"
                elif dominant_god in ["식신", "상관"]:
                    god_category = "siksang"
                elif dominant_god in ["정재", "편재"]:
                    god_category = "jaesung"
                elif dominant_god in ["정관", "편관"]:
                    god_category = "gwansung"
                elif dominant_god in ["정인", "편인"]:
                    god_category = "insung"

                if god_category:
                    rule_key = f"rule_ilgan_{god_category}"
                    rule = daily_rules.get(rule_key)
                    if rule:
                        results.append(f"📅 오늘의 기운 [{dominant_god}]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # ===============================================================
        # 2. MONTHLY RULES - Seasonal energy, monthly transits
        # ===============================================================
        if "monthly" in loaded_rules:
            monthly_rules = loaded_rules["monthly"]

            # Check monthly Ten God energy (wolgon)
            if dominant_god:
                god_category = ""
                if dominant_god in ["비견", "겁재"]:
                    god_category = "bigyeop"
                elif dominant_god in ["식신", "상관"]:
                    god_category = "siksang"
                elif dominant_god in ["정재", "편재"]:
                    god_category = "jaesung"
                elif dominant_god in ["정관", "편관"]:
                    god_category = "gwansung"
                elif dominant_god in ["정인", "편인"]:
                    god_category = "insung"

                if god_category:
                    rule_key = f"rule_wolgon_{god_category}"
                    rule = monthly_rules.get(rule_key)
                    if rule:
                        results.append(f"📆 이번 달 에너지 [{dominant_god}]: {get_text(rule)}\n💡 {get_advice(rule)}")

            # Check for eclipse month (simple approximation - eclipse seasons)
            if now.month in [3, 4, 9, 10]:  # Approximate eclipse seasons
                rule = monthly_rules.get("rule_eclipse_month")
                if rule and rule.get("weight", 0) >= 8:
                    results.append(f"🌓 {get_text(rule)}\n💡 {get_advice(rule)}")

        # ===============================================================
        # 3. NEW YEAR / 2025 RULES - Annual themes, daeun
        # ===============================================================
        if "new_year" in loaded_rules and theme in ["focus_2025", "focus_overall"]:
            new_year_rules = loaded_rules["new_year"]

            # Check daeun (10-year luck cycle) based on dominant god
            if dominant_god:
                god_category = ""
                if dominant_god in ["비견", "겁재"]:
                    god_category = "bigyeop"
                elif dominant_god in ["식신", "상관"]:
                    god_category = "siksang"
                elif dominant_god in ["정재", "편재"]:
                    god_category = "jaesung"
                elif dominant_god in ["정관", "편관"]:
                    god_category = "gwansung"
                elif dominant_god in ["정인", "편인"]:
                    god_category = "insung"

                if god_category:
                    rule_key = f"rule_daeun_{god_category}"
                    rule = new_year_rules.get(rule_key)
                    if rule:
                        results.append(f"🎊 2025년 대운 [{dominant_god}]: {get_text(rule)}\n💡 {get_advice(rule)}")

            # Check year pillar harmony/clash (simplified)
            # 2025 is 을사년 (乙巳年) - Wood Snake
            year_snake_compatible = ["자", "축", "신", "유"]  # Generally harmonious
            year_snake_clash = ["해"]  # 사해충

            day_pillar_data = saju_data.get("dayPillar", {})
            day_branch = day_pillar_data.get("earthlyBranch", "") if isinstance(day_pillar_data, dict) else ""
            if not isinstance(day_branch, str):
                day_branch = str(day_branch) if day_branch else ""
            branch_ko = {"子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
                         "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해"}.get(day_branch, "")

            if branch_ko in year_snake_compatible:
                rule = new_year_rules.get("rule_year_pillar_match")
                if rule:
                    results.append(f"✨ 2025년 운세 조화: {get_text(rule)}\n💡 {get_advice(rule)}")
            elif branch_ko in year_snake_clash:
                rule = new_year_rules.get("rule_year_pillar_clash")
                if rule:
                    results.append(f"⚡ 2025년 변화의 해: {get_text(rule)}\n💡 {get_advice(rule)}")

        # ===============================================================
        # 4. NEXT YEAR RULES - Future planning
        # ===============================================================
        if "next_year" in loaded_rules and theme in ["focus_2025"]:
            next_year_rules = loaded_rules["next_year"]

            # Seun (yearly luck) based on dominant god
            if dominant_god:
                god_category = ""
                if dominant_god in ["비견", "겁재"]:
                    god_category = "bigyeop"
                elif dominant_god in ["식신", "상관"]:
                    god_category = "siksang"
                elif dominant_god in ["정재", "편재"]:
                    god_category = "jaesung"
                elif dominant_god in ["정관", "편관"]:
                    god_category = "gwansung"
                elif dominant_god in ["정인", "편인"]:
                    god_category = "insung"

                if god_category:
                    rule_key = f"rule_seun_{god_category}"
                    rule = next_year_rules.get(rule_key)
                    if rule:
                        results.append(f"🔮 2026년 세운 전망 [{dominant_god}]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # ===============================================================
        # 5. FAMILY RULES - Relationship dynamics
        # ===============================================================
        if "family" in loaded_rules and theme in ["focus_love", "focus_family", "focus_compatibility"]:
            family_rules = loaded_rules["family"]

            # Check moon house position for family dynamics
            moon_house = astro_data.get("moon", {}).get("house")
            if moon_house:
                house_num = str(moon_house).replace("H", "")
                rule_key = f"rule_moon_{house_num}"
                rule = family_rules.get(rule_key)
                if rule:
                    results.append(f"👨‍👩‍👧‍👦 가족 관계 [달 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

            # Check venus for relationships
            venus_house = astro_data.get("venus", {}).get("house")
            if venus_house:
                house_num = str(venus_house).replace("H", "")
                rule_key = f"rule_venus_{house_num}"
                rule = family_rules.get(rule_key)
                if rule:
                    results.append(f"💕 관계 에너지 [금성 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # ===============================================================
        # 5-1. HEALTH RULES - Element balance, 6th/12th house
        # ===============================================================
        if "health" in loaded_rules and theme == "focus_health":
            health_rules = loaded_rules["health"]

            # Check element deficiencies
            element_counts = saju_data.get("elementCounts", {})
            if not isinstance(element_counts, dict):
                element_counts = {}
            element_map = {"木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water"}

            for elem_ko, elem_en in element_map.items():
                count_val = element_counts.get(elem_ko, 0)
                count = count_val if isinstance(count_val, (int, float)) else 0
                if count == 0:
                    rule_key = f"rule_{elem_en}_zero"
                    rule = health_rules.get(rule_key)
                    if rule:
                        results.append(f"⚕️ 오행 부족 [{elem_ko}]: {get_text(rule)}\n💡 {get_advice(rule)}")
                elif count >= 3:
                    rule_key = f"rule_{elem_en}_high"
                    rule = health_rules.get(rule_key)
                    if rule:
                        results.append(f"⚕️ 오행 과다 [{elem_ko}]: {get_text(rule)}\n💡 {get_advice(rule)}")

            # Check health houses (6, 12)
            for planet in ["mars", "saturn", "moon", "neptune", "jupiter", "pluto"]:
                planet_data = astro_data.get(planet, {})
                if not isinstance(planet_data, dict):
                    continue
                house = planet_data.get("house")
                if house:
                    house_num = str(house).replace("H", "")
                    if house_num in ["6", "12", "1"]:
                        rule_key = f"rule_{planet}_{house_num}"
                        rule = health_rules.get(rule_key)
                        if rule:
                            results.append(f"🏥 건강 관리 [{planet} {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # ===============================================================
        # 5-2. WEALTH RULES - Money houses, financial potential
        # ===============================================================
        if "wealth" in loaded_rules and theme == "focus_wealth":
            wealth_rules = loaded_rules["wealth"]

            # Check money houses (2, 8, 10, 11)
            for planet in ["jupiter", "venus", "saturn", "uranus", "pluto", "moon", "mars", "mercury", "sun"]:
                planet_data = astro_data.get(planet, {})
                if not isinstance(planet_data, dict):
                    continue
                house = planet_data.get("house")
                if house:
                    house_num = str(house).replace("H", "")
                    if house_num in ["2", "8", "10", "11"]:
                        rule_key = f"rule_{planet}_{house_num}"
                        rule = wealth_rules.get(rule_key)
                        if rule:
                            results.append(f"💰 재물운 [{planet} {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

            # Check jaesung (재성) strength
            ten_gods_count = saju_data.get("tenGodsCount", {})
            if not isinstance(ten_gods_count, dict):
                ten_gods_count = {}
            jeongjae_val = ten_gods_count.get("정재", 0)
            pyeonjae_val = ten_gods_count.get("편재", 0)
            # Ensure values are numeric
            jeongjae_count = jeongjae_val if isinstance(jeongjae_val, (int, float)) else 0
            pyeonjae_count = pyeonjae_val if isinstance(pyeonjae_val, (int, float)) else 0
            jaesung_count = jeongjae_count + pyeonjae_count
            if jaesung_count >= 2:
                rule = wealth_rules.get("rule_jaesung_strong")
                if rule:
                    results.append(f"💎 재성 분석: {get_text(rule)}\n💡 {get_advice(rule)}")
            elif jaesung_count == 0:
                rule = wealth_rules.get("rule_jaesung_weak")
                if rule:
                    results.append(f"💎 재성 분석: {get_text(rule)}\n💡 {get_advice(rule)}")

        # ===============================================================
        # 6. LIFE PATH RULES - Soul purpose, individuation
        # ===============================================================
        if "life_path" in loaded_rules and theme in ["focus_overall", "chat"]:
            life_path_rules = loaded_rules["life_path"]

            # Check sun house for life purpose
            sun_data = astro_data.get("sun", {})
            sun_house = sun_data.get("house") if isinstance(sun_data, dict) else None
            if sun_house:
                house_num = str(sun_house).replace("H", "")
                rule_key = f"rule_sun_{house_num}"
                rule = life_path_rules.get(rule_key)
                if rule:
                    results.append(f"🌟 인생 방향 [태양 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

            # Check north node for karmic direction
            north_node = astro_data.get("northNode", {}) or astro_data.get("north_node", {})
            if not isinstance(north_node, dict):
                north_node = {}
            nn_house = north_node.get("house")
            if nn_house:
                house_num = str(nn_house).replace("H", "")
                rule_key = f"rule_north_node_{house_num}"
                rule = life_path_rules.get(rule_key)
                if rule:
                    results.append(f"🧭 영혼의 성장 방향 [북교점 {house_num}하우스]: {get_text(rule)}\n💡 {get_advice(rule)}")

        # Limit results and format
        if results:
            logger.info(f"[THEME-FUSION] Generated {len(results)} theme-specific insights for {theme}")
            return "\n\n".join(results[:5])  # Top 5 insights

        return ""
