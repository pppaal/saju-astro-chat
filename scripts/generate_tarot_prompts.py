# -*- coding: utf-8 -*-
"""
Generate Midjourney prompts for 78 tarot cards x 3 styles = 234 images
"""

import json
import os

# 78 Tarot Cards
TAROT_CARDS = [
    # Major Arcana (0-21)
    {"id": 0, "name": "The Fool", "korean": "바보", "symbol": "young traveler at cliff edge, white rose, small dog, mountains"},
    {"id": 1, "name": "The Magician", "korean": "마법사", "symbol": "figure with wand raised, infinity symbol above head, four elements on table"},
    {"id": 2, "name": "The High Priestess", "korean": "여사제", "symbol": "seated woman between pillars, crescent moon, scroll of Torah"},
    {"id": 3, "name": "The Empress", "korean": "여황제", "symbol": "pregnant woman on throne, wheat field, venus symbol, nature"},
    {"id": 4, "name": "The Emperor", "korean": "황제", "symbol": "stern ruler on stone throne, rams head, red robes, mountains"},
    {"id": 5, "name": "The Hierophant", "korean": "교황", "symbol": "religious figure between pillars, blessing gesture, two acolytes"},
    {"id": 6, "name": "The Lovers", "korean": "연인", "symbol": "naked man and woman, angel above, tree of knowledge, sun"},
    {"id": 7, "name": "The Chariot", "korean": "전차", "symbol": "armored warrior in chariot, two sphinxes, city behind, stars"},
    {"id": 8, "name": "Strength", "korean": "힘", "symbol": "woman gently closing lion's mouth, infinity symbol, flowers"},
    {"id": 9, "name": "The Hermit", "korean": "은둔자", "symbol": "old man with lantern and staff, mountain peak, grey robes"},
    {"id": 10, "name": "Wheel of Fortune", "korean": "운명의 수레바퀴", "symbol": "great wheel with symbols, sphinx, snake, four creatures"},
    {"id": 11, "name": "Justice", "korean": "정의", "symbol": "seated figure with scales and sword, pillars, crown"},
    {"id": 12, "name": "The Hanged Man", "korean": "매달린 사람", "symbol": "man suspended upside down from tree, halo, serene face"},
    {"id": 13, "name": "Death", "korean": "죽음", "symbol": "skeleton knight on white horse, fallen figures, rising sun"},
    {"id": 14, "name": "Temperance", "korean": "절제", "symbol": "angel pouring water between cups, one foot in water, irises"},
    {"id": 15, "name": "The Devil", "korean": "악마", "symbol": "horned figure on pedestal, chained couple, inverted pentagram"},
    {"id": 16, "name": "The Tower", "korean": "탑", "symbol": "lightning striking tower, falling figures, crown falling, flames"},
    {"id": 17, "name": "The Star", "korean": "별", "symbol": "nude woman pouring water, eight stars, ibis bird, night sky"},
    {"id": 18, "name": "The Moon", "korean": "달", "symbol": "full moon with face, two towers, dog and wolf, crayfish"},
    {"id": 19, "name": "The Sun", "korean": "태양", "symbol": "joyful child on white horse, sunflowers, bright sun, wall"},
    {"id": 20, "name": "Judgement", "korean": "심판", "symbol": "angel with trumpet, rising dead, mountains, clouds"},
    {"id": 21, "name": "The World", "korean": "세계", "symbol": "dancing figure in wreath, four creatures, completion"},

    # Wands (22-35)
    {"id": 22, "name": "Ace of Wands", "korean": "완드 에이스", "symbol": "hand holding sprouting wand from cloud, leaves falling"},
    {"id": 23, "name": "Two of Wands", "korean": "완드 2", "symbol": "man on castle holding globe, looking at sea, two wands"},
    {"id": 24, "name": "Three of Wands", "korean": "완드 3", "symbol": "figure watching ships at sea, three wands, cliff"},
    {"id": 25, "name": "Four of Wands", "korean": "완드 4", "symbol": "garland between four wands, celebration, castle, couple"},
    {"id": 26, "name": "Five of Wands", "korean": "완드 5", "symbol": "five youths fighting with wands, conflict, competition"},
    {"id": 27, "name": "Six of Wands", "korean": "완드 6", "symbol": "victorious rider on horse, laurel wreath, crowd"},
    {"id": 28, "name": "Seven of Wands", "korean": "완드 7", "symbol": "man defending position on hill, six wands below"},
    {"id": 29, "name": "Eight of Wands", "korean": "완드 8", "symbol": "eight wands flying through clear sky, movement"},
    {"id": 30, "name": "Nine of Wands", "korean": "완드 9", "symbol": "wounded man guarding eight wands, bandaged head"},
    {"id": 31, "name": "Ten of Wands", "korean": "완드 10", "symbol": "man carrying heavy bundle of ten wands, town ahead"},
    {"id": 32, "name": "Page of Wands", "korean": "완드 페이지", "symbol": "young person holding wand, desert landscape, salamanders"},
    {"id": 33, "name": "Knight of Wands", "korean": "완드 기사", "symbol": "knight on rearing horse, wand raised, pyramids, fire"},
    {"id": 34, "name": "Queen of Wands", "korean": "완드 여왕", "symbol": "queen on throne with sunflowers, black cat, wand"},
    {"id": 35, "name": "King of Wands", "korean": "완드 왕", "symbol": "king on throne with living wand, salamander, lion"},

    # Cups (36-49)
    {"id": 36, "name": "Ace of Cups", "korean": "컵 에이스", "symbol": "hand holding overflowing chalice, dove, lotus, water"},
    {"id": 37, "name": "Two of Cups", "korean": "컵 2", "symbol": "man and woman exchanging cups, caduceus, lion"},
    {"id": 38, "name": "Three of Cups", "korean": "컵 3", "symbol": "three dancing women raising cups, harvest, celebration"},
    {"id": 39, "name": "Four of Cups", "korean": "컵 4", "symbol": "seated figure under tree, three cups, hand offering cup"},
    {"id": 40, "name": "Five of Cups", "korean": "컵 5", "symbol": "cloaked figure mourning spilled cups, bridge, river"},
    {"id": 41, "name": "Six of Cups", "korean": "컵 6", "symbol": "children exchanging flowers in cups, garden, nostalgia"},
    {"id": 42, "name": "Seven of Cups", "korean": "컵 7", "symbol": "figure facing seven cups with visions, clouds, choices"},
    {"id": 43, "name": "Eight of Cups", "korean": "컵 8", "symbol": "figure walking away from stacked cups, moon, mountains"},
    {"id": 44, "name": "Nine of Cups", "korean": "컵 9", "symbol": "satisfied man with arms crossed, nine cups arranged"},
    {"id": 45, "name": "Ten of Cups", "korean": "컵 10", "symbol": "happy family under rainbow, home, children dancing"},
    {"id": 46, "name": "Page of Cups", "korean": "컵 페이지", "symbol": "young person with cup, fish emerging, sea, blue outfit"},
    {"id": 47, "name": "Knight of Cups", "korean": "컵 기사", "symbol": "knight on white horse holding cup, river, wings"},
    {"id": 48, "name": "Queen of Cups", "korean": "컵 여왕", "symbol": "queen on throne by sea, ornate cup, angels"},
    {"id": 49, "name": "King of Cups", "korean": "컵 왕", "symbol": "king on throne in turbulent sea, cup, fish amulet"},

    # Swords (50-63)
    {"id": 50, "name": "Ace of Swords", "korean": "소드 에이스", "symbol": "hand holding sword from cloud, crown, mountains"},
    {"id": 51, "name": "Two of Swords", "korean": "소드 2", "symbol": "blindfolded woman crossing swords, moon, water"},
    {"id": 52, "name": "Three of Swords", "korean": "소드 3", "symbol": "heart pierced by three swords, rain, clouds"},
    {"id": 53, "name": "Four of Swords", "korean": "소드 4", "symbol": "knight lying on tomb, stained glass, prayer"},
    {"id": 54, "name": "Five of Swords", "korean": "소드 5", "symbol": "victor with three swords, defeated figures, stormy sky"},
    {"id": 55, "name": "Six of Swords", "korean": "소드 6", "symbol": "ferryman rowing woman and child, six swords, calm water ahead"},
    {"id": 56, "name": "Seven of Swords", "korean": "소드 7", "symbol": "figure sneaking with five swords, camp behind"},
    {"id": 57, "name": "Eight of Swords", "korean": "소드 8", "symbol": "bound blindfolded woman surrounded by swords, water"},
    {"id": 58, "name": "Nine of Swords", "korean": "소드 9", "symbol": "person sitting up in bed, nine swords on wall, nightmare"},
    {"id": 59, "name": "Ten of Swords", "korean": "소드 10", "symbol": "figure lying face down, ten swords in back, dawn"},
    {"id": 60, "name": "Page of Swords", "korean": "소드 페이지", "symbol": "young person holding sword, windy sky, birds"},
    {"id": 61, "name": "Knight of Swords", "korean": "소드 기사", "symbol": "knight charging on horse, sword raised, storm"},
    {"id": 62, "name": "Queen of Swords", "korean": "소드 여왕", "symbol": "stern queen on throne, raised sword, butterfly"},
    {"id": 63, "name": "King of Swords", "korean": "소드 왕", "symbol": "king on throne with upright sword, clouds, authority"},

    # Pentacles (64-77)
    {"id": 64, "name": "Ace of Pentacles", "korean": "펜타클 에이스", "symbol": "hand holding golden pentacle, garden gate, lilies"},
    {"id": 65, "name": "Two of Pentacles", "korean": "펜타클 2", "symbol": "juggler balancing two pentacles, infinity, ships"},
    {"id": 66, "name": "Three of Pentacles", "korean": "펜타클 3", "symbol": "craftsman in cathedral, architects, collaboration"},
    {"id": 67, "name": "Four of Pentacles", "korean": "펜타클 4", "symbol": "man holding pentacle tightly, crown, city behind"},
    {"id": 68, "name": "Five of Pentacles", "korean": "펜타클 5", "symbol": "two beggars in snow, stained glass window, poverty"},
    {"id": 69, "name": "Six of Pentacles", "korean": "펜타클 6", "symbol": "wealthy man giving to beggars, scales, generosity"},
    {"id": 70, "name": "Seven of Pentacles", "korean": "펜타클 7", "symbol": "farmer leaning on hoe, pentacles on vine, patience"},
    {"id": 71, "name": "Eight of Pentacles", "korean": "펜타클 8", "symbol": "craftsman carving pentacles, workshop, diligence"},
    {"id": 72, "name": "Nine of Pentacles", "korean": "펜타클 9", "symbol": "elegant woman in garden, falcon, abundance"},
    {"id": 73, "name": "Ten of Pentacles", "korean": "펜타클 10", "symbol": "wealthy family under archway, dogs, generations"},
    {"id": 74, "name": "Page of Pentacles", "korean": "펜타클 페이지", "symbol": "young person gazing at pentacle, green field"},
    {"id": 75, "name": "Knight of Pentacles", "korean": "펜타클 기사", "symbol": "knight on heavy horse, pentacle, plowed field"},
    {"id": 76, "name": "Queen of Pentacles", "korean": "펜타클 여왕", "symbol": "queen on throne in garden, rabbit, pentacle"},
    {"id": 77, "name": "King of Pentacles", "korean": "펜타클 왕", "symbol": "king on throne with pentacle, grapes, bull"},
]

# Three deck styles with their prompts
DECK_STYLES = {
    "mystic": {
        "name": "Mystic Ethereal",
        "base_prompt": "ethereal mystical tarot card, {card_name}, {symbol}, cosmic purple and deep indigo background, gold foil accents and mystical symbols, glowing ethereal energy, floating stardust particles, luminescent borders, divine light rays, sacred geometry patterns, dreamy otherworldly atmosphere",
        "style_suffix": "digital art, highly detailed, 8k, mystical illustration style --ar 2:3 --v 6.1 --s 750",
    },
    "nouveau": {
        "name": "Art Nouveau",
        "base_prompt": "art nouveau tarot card, {card_name}, {symbol}, Alphonse Mucha inspired, ornate flowing organic borders, elegant curved lines, muted earth tones with gold highlights, intricate floral frames, decorative mosaic background, vintage artistic style",
        "style_suffix": "fine art illustration, detailed linework, premium card game art --ar 2:3 --v 6.1 --s 750",
    },
    "modern": {
        "name": "Minimal Modern",
        "base_prompt": "minimalist modern tarot card, {card_name}, {symbol}, clean geometric design, stark black background with white line art, single accent color highlight, negative space composition, contemporary design, bold simple shapes, zen aesthetic",
        "style_suffix": "vector art style, clean edges, premium design, elegant simplicity --ar 2:3 --v 6.1 --s 500",
    },
}

def generate_prompts():
    """Generate all prompts for 234 cards."""
    all_prompts = {}

    for style_id, style_info in DECK_STYLES.items():
        all_prompts[style_id] = {
            "name": style_info["name"],
            "cards": []
        }

        for card in TAROT_CARDS:
            prompt = style_info["base_prompt"].format(
                card_name=card["name"],
                symbol=card["symbol"]
            )
            full_prompt = f"{prompt}, {style_info['style_suffix']}"

            all_prompts[style_id]["cards"].append({
                "id": card["id"],
                "name": card["name"],
                "korean": card["korean"],
                "filename": f"{card['id']}.jpg",
                "prompt": full_prompt
            })

    return all_prompts

def save_prompts(output_dir: str = "scripts"):
    """Save prompts to JSON file."""
    prompts = generate_prompts()

    # Save as JSON
    output_path = os.path.join(output_dir, "tarot_prompts.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(prompts, f, ensure_ascii=False, indent=2)
    print(f"Saved prompts to: {output_path}")

    # Also save as text for easy copy-paste
    for style_id, style_data in prompts.items():
        txt_path = os.path.join(output_dir, f"tarot_prompts_{style_id}.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(f"# {style_data['name']} Deck - 78 Cards\n\n")
            for card in style_data["cards"]:
                f.write(f"## {card['id']}. {card['name']} ({card['korean']})\n")
                f.write(f"Filename: {card['filename']}\n")
                f.write(f"Prompt:\n{card['prompt']}\n\n")
                f.write("-" * 80 + "\n\n")
        print(f"Saved text prompts to: {txt_path}")

    # Summary
    total = len(TAROT_CARDS) * len(DECK_STYLES)
    print(f"\nTotal prompts generated: {total}")
    print(f"Styles: {', '.join(DECK_STYLES.keys())}")
    print(f"Cards per style: {len(TAROT_CARDS)}")

if __name__ == "__main__":
    save_prompts()
