"""
Fill Empty Descriptions Script
==============================
Auto-generates descriptions for empty entries in CSV and JSON files.
Uses contextual patterns from existing data.
"""

import os
import csv
import json
import re
from typing import Dict, List, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAPH_DIR = os.path.join(BASE_DIR, "backend_ai", "data", "graph")

# =============================================================================
# DESCRIPTION TEMPLATES BY CATEGORY
# =============================================================================

ASTRO_TEMPLATES = {
    "house": "The {num} house governs {domain}. It represents {meaning} in the natal chart.",
    "sign": "{name} ({element} {modality}) embodies {traits}. Core energy: {core}.",
    "planet": "{name} symbolizes {domain}. In astrology, it rules {rulership} and represents {meaning}.",
    "aspect": "{aspect_name} ({angle}°) between planets creates {dynamic}. This aspect indicates {meaning}.",
    "transit": "When {planet} transits {target}, it activates {theme}. Key period for {advice}.",
}

SAJU_TEMPLATES = {
    "stem": "{hanja} ({name}) is a {element} {yin_yang} stem. Core nature: {nature}. Life theme: {theme}.",
    "branch": "{hanja} ({name}) is the {animal} branch ({element}). Hidden stems: {hidden}. Meaning: {meaning}.",
    "pillar": "The {pillar_type} pillar represents {domain}. {stem}-{branch} combination indicates {interpretation}.",
    "sibsin": "{name} ({hanja}) ten god represents {relation}. In life: {life_meaning}. Career: {career}.",
    "fortune": "{name} fortune indicates {state}. Life energy: {energy}. Advice: {advice}.",
    "combination": "{combo_type} of {elements} creates {result}. Interpretation: {meaning}.",
}

TAROT_TEMPLATES = {
    "major": "{name} (#{number}) represents {meaning}. Upright: {upright}. Reversed: {reversed}.",
    "minor": "{rank} of {suit} signifies {meaning}. Element: {element}. Advice: {advice}.",
    "combination": "When {card1} appears with {card2}: {interpretation}. Theme: {theme}.",
    "spread_position": "Position {num} ({name}): Reveals {meaning}. Focus on {focus}.",
}

PERSONA_TEMPLATES = {
    "jung": "From a Jungian perspective: {insight}. Archetypal pattern: {archetype}. Shadow work: {shadow}.",
    "stoic": "Stoic wisdom teaches: {insight}. Virtue focus: {virtue}. Daily practice: {practice}.",
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def infer_category(file_path: str) -> str:
    """Infer category from file path."""
    path_lower = file_path.lower()
    if "astro" in path_lower:
        return "astro"
    elif "saju" in path_lower:
        return "saju"
    elif "tarot" in path_lower:
        return "tarot"
    elif "persona" in path_lower or "jung" in path_lower or "stoic" in path_lower:
        return "persona"
    elif "dream" in path_lower:
        return "dream"
    elif "iching" in path_lower:
        return "iching"
    return "general"


def generate_description_from_row(row: Dict, category: str, file_name: str) -> str:
    """Generate description based on available fields."""
    parts = []

    # Common fields to extract
    name = row.get("name") or row.get("label") or row.get("id") or ""
    hanja = row.get("hanja") or row.get("chinese") or ""
    element = row.get("element") or row.get("오행") or ""
    meaning = row.get("meaning") or row.get("의미") or ""

    # Special handling for tarot combinations
    if "combination" in file_name.lower() and category == "tarot":
        card1 = row.get("card1_name") or ""
        card2 = row.get("card2_name") or ""
        relation = row.get("element_relation") or ""
        love = row.get("love_interpretation") or ""
        career = row.get("career_interpretation") or ""
        advice = row.get("advice") or ""

        parts.append(f"{card1}+{card2} 조합 ({relation}):")
        if love:
            parts.append(f"연애: {love[:100]}")
        if career:
            parts.append(f"직업: {career[:100]}")
        if advice:
            parts.append(f"조언: {advice[:80]}")
        return " ".join(parts)

    # Build description from available fields
    if category == "astro":
        if "house" in file_name.lower():
            num = row.get("number") or row.get("num") or name
            domain = row.get("domain") or row.get("theme") or "life matters"
            parts.append(f"House {num}: Governs {domain}.")
        elif "sign" in file_name.lower():
            traits = row.get("traits") or row.get("keywords") or "unique qualities"
            parts.append(f"{name}: {element} sign with {traits}.")
        elif "planet" in file_name.lower():
            rulership = row.get("rules") or row.get("rulership") or "its domain"
            parts.append(f"{name} rules {rulership}.")
        elif "transit" in file_name.lower():
            planet = row.get("planet") or row.get("transiting") or name
            target = row.get("target") or row.get("natal") or "natal position"
            parts.append(f"{planet} transit to {target}: Activates change and growth.")
        else:
            if name:
                parts.append(f"{name}:")
            if meaning:
                parts.append(meaning)

    elif category == "saju":
        if "stem" in file_name.lower() or "gan" in file_name.lower():
            yin_yang = row.get("yin_yang") or row.get("음양") or ""
            parts.append(f"{hanja} ({name}): {element} {yin_yang} energy.")
        elif "branch" in file_name.lower() or "ji" in file_name.lower():
            animal = row.get("animal") or row.get("동물") or ""
            hidden = row.get("hidden_stem") or row.get("지장간") or ""
            parts.append(f"{hanja} ({name}): {animal} branch, {element}. Hidden: {hidden}.")
        elif "sibsin" in file_name.lower() or "십신" in file_name.lower():
            relation = row.get("relation") or row.get("관계") or "important life aspect"
            parts.append(f"{name} ({hanja}): Represents {relation} in the chart.")
        elif "pillar" in file_name.lower() or "주" in file_name.lower():
            pillar = row.get("pillar_type") or row.get("주") or "life"
            parts.append(f"{pillar} pillar combination: {meaning or 'Significant life pattern'}.")
        elif "fortune" in file_name.lower() or "운" in file_name.lower():
            parts.append(f"{name}: Fortune cycle indicating {meaning or 'life phase transition'}.")
        else:
            if hanja:
                parts.append(f"{hanja} ({name}):")
            elif name:
                parts.append(f"{name}:")
            if element:
                parts.append(f"{element} energy.")
            if meaning:
                parts.append(meaning)

    elif category == "tarot":
        if "major" in file_name.lower():
            number = row.get("number") or row.get("num") or ""
            upright = row.get("upright") or row.get("정방향") or "positive transformation"
            reversed_m = row.get("reversed") or row.get("역방향") or "blocked energy"
            parts.append(f"{name} (#{number}): Upright - {upright}. Reversed - {reversed_m}.")
        elif any(suit in file_name.lower() for suit in ["wand", "cup", "sword", "pentacle", "coin"]):
            rank = row.get("rank") or row.get("number") or name
            suit = row.get("suit") or "the suit"
            parts.append(f"{rank} of {suit}: {meaning or 'Guidance for your path'}.")
        elif "combination" in file_name.lower():
            card1 = row.get("card1") or row.get("first") or ""
            card2 = row.get("card2") or row.get("second") or ""
            parts.append(f"Combination of {card1} + {card2}: {meaning or 'Creates unique synergy'}.")
        else:
            if name:
                parts.append(f"{name}:")
            if meaning:
                parts.append(meaning)
            else:
                parts.append("Tarot guidance for your journey.")

    elif category == "persona":
        insight = row.get("insight") or row.get("wisdom") or ""
        if "jung" in file_name.lower():
            archetype = row.get("archetype") or row.get("원형") or "the Self"
            parts.append(f"Jungian insight: {insight or 'Deep psychological pattern'}. Archetype: {archetype}.")
        elif "stoic" in file_name.lower():
            virtue = row.get("virtue") or row.get("덕목") or "wisdom"
            parts.append(f"Stoic wisdom: {insight or 'Path to virtue'}. Focus: {virtue}.")
        else:
            if name:
                parts.append(f"{name}:")
            parts.append(insight or "Guidance for inner growth.")

    else:  # general
        if name:
            parts.append(f"{name}:")
        for field in ["meaning", "description", "content", "text", "info"]:
            if row.get(field):
                parts.append(str(row[field]))
                break
        else:
            # Build from all non-empty string fields
            for k, v in row.items():
                if isinstance(v, str) and v.strip() and k not in ["id", "name", "label"]:
                    parts.append(f"{k}: {v}")
                    if len(parts) >= 3:
                        break

    result = " ".join(parts).strip()
    return result if len(result) > 10 else f"{name or 'Entry'}: {category.capitalize()} interpretation data."


def generate_json_description(key: str, value: Any, category: str) -> str:
    """Generate description for JSON entries."""
    if isinstance(value, str) and len(value) > 10:
        return value

    if isinstance(value, dict):
        parts = [f"{key}:"]
        for field in ["core", "meaning", "light", "shadow", "advice", "interpretation"]:
            if value.get(field):
                parts.append(str(value[field])[:100])
                break
        return " ".join(parts)

    return f"{key}: {category.capitalize()} interpretation guidance."


# =============================================================================
# MAIN PROCESSING
# =============================================================================

def process_csv_file(file_path: str, dry_run: bool = False) -> Dict:
    """Process a single CSV file and fill empty descriptions."""
    category = infer_category(file_path)
    file_name = os.path.basename(file_path)

    stats = {"total": 0, "filled": 0, "already_filled": 0}
    rows = []
    fieldnames = []

    try:
        with open(file_path, encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames or []

            # Ensure description field exists
            if "description" not in fieldnames:
                fieldnames = list(fieldnames) + ["description"]

            for row in reader:
                stats["total"] += 1
                desc = row.get("description", "").strip()
                content = row.get("content", "").strip()

                # Check if description is just the ID or very short
                is_just_id = desc and (desc.startswith("COMBO_") or desc == row.get("id", "") or desc.endswith(":"))
                needs_fill = (not desc and not content) or len(desc) < 10 or is_just_id

                if needs_fill:
                    # Generate description
                    new_desc = generate_description_from_row(row, category, file_name)
                    row["description"] = new_desc
                    stats["filled"] += 1
                else:
                    stats["already_filled"] += 1

                rows.append(row)

    except Exception as e:
        print(f"  Error reading {file_path}: {e}")
        return stats

    if not dry_run and stats["filled"] > 0:
        try:
            with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
            print(f"  Updated {file_path}: {stats['filled']} descriptions added")
        except Exception as e:
            print(f"  Error writing {file_path}: {e}")

    return stats


def process_json_file(file_path: str, dry_run: bool = False) -> Dict:
    """Process a single JSON file and fill empty descriptions."""
    category = infer_category(file_path)
    stats = {"total": 0, "filled": 0, "already_filled": 0}

    try:
        with open(file_path, encoding="utf-8-sig") as f:
            data = json.load(f)
    except Exception as e:
        print(f"  Error reading {file_path}: {e}")
        return stats

    modified = False

    if isinstance(data, dict):
        for key, value in data.items():
            if key.startswith("$"):  # Skip meta fields
                continue
            stats["total"] += 1

            if isinstance(value, dict):
                desc = value.get("description", "")
                if not desc or len(str(desc)) < 10:
                    # Generate description from other fields
                    parts = []
                    for field in ["core", "meaning", "light", "shadow", "expression", "advice"]:
                        if value.get(field):
                            parts.append(str(value[field])[:150])
                            if len(parts) >= 2:
                                break
                    if parts:
                        value["description"] = f"{key}: " + " ".join(parts)
                        stats["filled"] += 1
                        modified = True
                    else:
                        stats["already_filled"] += 1
                else:
                    stats["already_filled"] += 1
            elif isinstance(value, str):
                if len(value) < 10:
                    data[key] = f"{key}: {category.capitalize()} interpretation."
                    stats["filled"] += 1
                    modified = True
                else:
                    stats["already_filled"] += 1

    elif isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue
            stats["total"] += 1

            desc = item.get("description", "")
            if not desc or len(str(desc)) < 10:
                # Generate from available fields
                name = item.get("name") or item.get("label") or item.get("id") or ""
                parts = [f"{name}:"] if name else []
                for field in ["core", "meaning", "light", "shadow", "expression", "advice", "content"]:
                    if item.get(field):
                        parts.append(str(item[field])[:150])
                        if len(parts) >= 3:
                            break
                if len(parts) > 1:
                    item["description"] = " ".join(parts)
                    stats["filled"] += 1
                    modified = True
                else:
                    stats["already_filled"] += 1
            else:
                stats["already_filled"] += 1

    if not dry_run and modified:
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  Updated {file_path}: {stats['filled']} descriptions added")
        except Exception as e:
            print(f"  Error writing {file_path}: {e}")

    return stats


def main(dry_run: bool = True):
    """Main function to process all files."""
    print(f"{'DRY RUN - ' if dry_run else ''}Processing graph data files...")
    print(f"Base directory: {GRAPH_DIR}\n")

    total_stats = {"csv_total": 0, "csv_filled": 0, "json_total": 0, "json_filled": 0}

    for root, _, files in os.walk(GRAPH_DIR):
        for file in files:
            if file.startswith('.') or '__pycache__' in root:
                continue
            file_path = os.path.join(root, file)
            try:
                rel_path = os.path.relpath(file_path, GRAPH_DIR)
            except ValueError:
                rel_path = file_path

            if file.endswith(".csv"):
                print(f"Processing CSV: {rel_path}")
                stats = process_csv_file(file_path, dry_run)
                total_stats["csv_total"] += stats["total"]
                total_stats["csv_filled"] += stats["filled"]
                if stats["filled"] > 0:
                    print(f"  -> {stats['filled']}/{stats['total']} entries need descriptions")

            elif file.endswith(".json"):
                print(f"Processing JSON: {rel_path}")
                stats = process_json_file(file_path, dry_run)
                total_stats["json_total"] += stats["total"]
                total_stats["json_filled"] += stats["filled"]
                if stats["filled"] > 0:
                    print(f"  -> {stats['filled']}/{stats['total']} entries need descriptions")

    print(f"\n{'='*50}")
    print(f"Summary:")
    print(f"  CSV: {total_stats['csv_filled']}/{total_stats['csv_total']} entries to fill")
    print(f"  JSON: {total_stats['json_filled']}/{total_stats['json_total']} entries to fill")

    if dry_run:
        print(f"\nThis was a DRY RUN. Run with --execute to apply changes.")
    else:
        print(f"\nChanges applied successfully!")


if __name__ == "__main__":
    import sys
    dry_run = "--execute" not in sys.argv
    main(dry_run)
