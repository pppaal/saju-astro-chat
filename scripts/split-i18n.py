#!/usr/bin/env python3
"""
Split large i18n JSON files into smaller domain-specific files.
"""
import json
import os
from pathlib import Path

# Define the split strategy
SPLIT_STRATEGY = {
    "common.json": ["app", "ui", "error", "menu", "emoji"],
    "landing.json": ["landing", "about", "contact", "faq", "footer"],
    "chat.json": [],  # Will be manually created with unified chat i18n
    "services.json": ["services"],
    "tarot.json": ["tarot"],
    "calendar.json": ["calendar"],
    "personality.json": ["personality"],
    "dream.json": ["dream"],
    "numerology.json": ["numerology"],
    "iching.json": ["iching"],
    "pastlife.json": ["pastLife"],
    "compatibility.json": ["compatibilityPage"],
    "destinymap.json": ["destinyMap", "destinyPal"],
    "features.json": ["community", "myjourney", "history", "profile", "auth", "premiumNotifications", "share"],
    "misc.json": ["pricing", "policy", "form", "success", "common"],
}

def split_locale_file(input_path: Path, output_dir: Path, locale: str):
    """Split a large JSON file into smaller files based on strategy."""

    print(f"\n[*] Processing {locale.upper()} locale...")

    # Read the original file
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"   Total keys in source: {len(data)}")

    # Create output directory
    locale_dir = output_dir / locale
    locale_dir.mkdir(parents=True, exist_ok=True)

    processed_keys = set()

    # Split according to strategy
    for output_file, keys in SPLIT_STRATEGY.items():
        if output_file == "chat.json":
            continue  # Skip, will be created separately

        file_data = {}
        for key in keys:
            if key in data:
                file_data[key] = data[key]
                processed_keys.add(key)

        if file_data:
            output_path = locale_dir / output_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(file_data, f, ensure_ascii=False, indent=2)
            print(f"   [+] Created {output_file} with {len(file_data)} namespaces")

    # Check for unprocessed keys
    unprocessed = set(data.keys()) - processed_keys
    if unprocessed:
        print(f"\n   [!] Warning: {len(unprocessed)} keys not assigned to any file:")
        for key in sorted(unprocessed):
            print(f"      - {key}")

        # Put unprocessed keys in misc.json
        misc_path = locale_dir / "misc.json"
        if misc_path.exists():
            with open(misc_path, 'r', encoding='utf-8') as f:
                misc_data = json.load(f)
        else:
            misc_data = {}

        for key in unprocessed:
            misc_data[key] = data[key]

        with open(misc_path, 'w', encoding='utf-8') as f:
            json.dump(misc_data, f, ensure_ascii=False, indent=2)
        print(f"   [+] Added {len(unprocessed)} unprocessed keys to misc.json")

    print(f"   [OK] {locale.upper()} split complete!")

def main():
    # Project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    locales_dir = project_root / "src" / "i18n" / "locales"

    print("Starting i18n file split...")
    print(f"Working directory: {locales_dir}")

    # Split both locales
    for locale in ["ko", "en"]:
        input_file = locales_dir / f"{locale}.json"
        if input_file.exists():
            split_locale_file(input_file, locales_dir, locale)
        else:
            print(f"   [!] {input_file} not found, skipping...")

    print("\nSplit complete! New structure created in:")
    print(f"   - {locales_dir / 'ko'}")
    print(f"   - {locales_dir / 'en'}")
    print("\nNext steps:")
    print("   1. Review the split files")
    print("   2. Create unified chat.json")
    print("   3. Update I18nProvider to load from new structure")

if __name__ == "__main__":
    main()