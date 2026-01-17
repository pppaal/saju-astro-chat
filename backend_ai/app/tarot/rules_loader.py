# backend_ai/app/tarot/rules_loader.py
"""
Advanced Tarot Rules Loader
===========================
Load and manage advanced tarot interpretation rules from JSON/CSV files.
Extracted from tarot_hybrid_rag.py for better modularity.
"""

import os
import json
from typing import Dict, List, Optional, Any


class AdvancedRulesLoader:
    """Load and manage advanced tarot interpretation rules"""

    def __init__(self, rules_dir: str = None):
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot", "advanced")

        self.rules_dir = rules_dir
        self.combinations: Dict = {}
        self.timing_rules: Dict = {}
        self.court_profiles: Dict = {}
        self.elemental_dignities: Dict = {}
        self.narrative_templates: Dict = {}
        self.numerology: Dict = {}
        self.color_symbolism: Dict = {}
        self.meditation_affirmations: Dict = {}
        self.lucky_items: Dict = {}
        self.followup_questions: Dict = {}
        self.reversed_special: Dict = {}
        self.chakra_connections: Dict = {}
        self.astrological_correspondences: Dict = {}
        self.yes_no_logic: Dict = {}
        self.soulmate_indicators: Dict = {}
        self.shadow_work: Dict = {}
        self.moon_phases: Dict = {}
        self.spirit_animals: Dict = {}
        self.spread_positions: Dict = {}
        self.multidimensional_matrix: Dict = {}
        self.card_pair_combinations: List = []
        self.crisis_support: Dict = {}
        self.decision_framework: Dict = {}
        self.reverse_interpretations: Dict = {}
        self.jungian_archetypes: Dict = {}
        self._load_all_rules()

    def _load_all_rules(self):
        """Load all advanced rule JSON files"""
        if not os.path.exists(self.rules_dir):
            return

        rule_files = {
            'card_combinations.json': 'combinations',
            'timing_rules.json': 'timing_rules',
            'court_card_profiles.json': 'court_profiles',
            'elemental_dignities.json': 'elemental_dignities',
            'narrative_templates.json': 'narrative_templates',
            'numerology.json': 'numerology',
            'color_symbolism.json': 'color_symbolism',
            'meditation_affirmations.json': 'meditation_affirmations',
            'lucky_items.json': 'lucky_items',
            'followup_questions.json': 'followup_questions',
            'reversed_special.json': 'reversed_special',
            'chakra_connections.json': 'chakra_connections',
            'astrological_correspondences.json': 'astrological_correspondences',
            'yes_no_logic.json': 'yes_no_logic',
            'soulmate_indicators.json': 'soulmate_indicators',
            'shadow_work_prompts.json': 'shadow_work',
            'moon_phase_rules.json': 'moon_phases',
            'spirit_animals.json': 'spirit_animals',
            'tarot_spread_positions.json': 'spread_positions',
            'tarot_multidimensional_matrix.json': 'multidimensional_matrix',
            'crisis.json': 'crisis_support',
            'decisions.json': 'decision_framework',
            'tarot_reverse_interpretations.json': 'reverse_interpretations',
            'jungian_archetypes.json': 'jungian_archetypes'
        }

        for filename, attr in rule_files.items():
            path = os.path.join(self.rules_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as f:
                        setattr(self, attr, json.load(f))
                except Exception:
                    pass

        self._load_card_pair_combinations()

    def _load_card_pair_combinations(self):
        """Load tarot_combinations.csv for card pair interpretations"""
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        csv_path = os.path.join(base_dir, "data", "graph", "rules", "tarot", "tarot_combinations.csv")

        if not os.path.exists(csv_path):
            return

        try:
            import csv
            with open(csv_path, encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                self.card_pair_combinations = list(reader)
        except Exception:
            pass

    def _card_name_to_id(self, card_name: str) -> Optional[str]:
        """Convert English card name to card_id format"""
        major_names = [
            'Fool', 'Magician', 'High Priestess', 'Empress', 'Emperor',
            'Hierophant', 'Lovers', 'Chariot', 'Strength', 'Hermit',
            'Wheel of Fortune', 'Justice', 'Hanged Man', 'Death',
            'Temperance', 'Devil', 'Tower', 'Star', 'Moon', 'Sun',
            'Judgement', 'World'
        ]
        for idx, name in enumerate(major_names):
            if name in card_name:
                return f"MAJOR_{idx}"

        suits = {'Wands': 'WANDS', 'Cups': 'CUPS', 'Swords': 'SWORDS', 'Pentacles': 'PENTACLES'}
        ranks = {'Ace': 1, 'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5, 'Six': 6,
                 'Seven': 7, 'Eight': 8, 'Nine': 9, 'Ten': 10,
                 'Page': 11, 'Knight': 12, 'Queen': 13, 'King': 14}
        for suit, suit_id in suits.items():
            if suit in card_name:
                for rank, rank_num in ranks.items():
                    if rank in card_name:
                        return f"{suit_id}_{rank_num}"
        return None

    def find_card_pair_interpretation(self, card1_name: str, card2_name: str) -> Optional[Dict]:
        """Find interpretation for a specific card pair from CSV data"""
        if not self.card_pair_combinations:
            return None

        card1_id = self._card_name_to_id(card1_name)
        card2_id = self._card_name_to_id(card2_name)

        for combo in self.card_pair_combinations:
            combo_card1_id = combo.get('card1_id', '')
            combo_card2_id = combo.get('card2_id', '')

            if (combo_card1_id == card1_id and combo_card2_id == card2_id) or \
               (combo_card1_id == card2_id and combo_card2_id == card1_id):
                return {
                    'card1': card1_name,
                    'card2': card2_name,
                    'element_relation': combo.get('element_relation'),
                    'love': combo.get('love_interpretation'),
                    'career': combo.get('career_interpretation'),
                    'finance': combo.get('finance_interpretation'),
                    'advice': combo.get('advice')
                }
        return None

    def find_card_combination(self, card_names: List[str]) -> Optional[Dict]:
        """Find special meaning if cards form a known combination"""
        if not self.combinations:
            return None

        powerful_pairs = self.combinations.get('powerful_pairs', {})
        for category, pairs in powerful_pairs.items():
            for pair in pairs:
                pair_cards = set(pair.get('cards', []))
                if pair_cards.issubset(set(card_names)):
                    return {
                        'category': category,
                        'cards': pair.get('cards'),
                        'meaning': pair.get('meaning', ''),
                        'korean': pair.get('korean', ''),
                        'advice': pair.get('advice', '')
                    }

        triple_combos = self.combinations.get('triple_combinations', {})
        for combo_name, combo_data in triple_combos.items():
            combo_cards = set(combo_data.get('cards', []))
            if combo_cards.issubset(set(card_names)):
                return {
                    'category': combo_name,
                    'cards': combo_data.get('cards'),
                    'meaning': combo_data.get('meaning', ''),
                    'korean': combo_data.get('korean', '')
                }

        return None

    def get_court_card_profile(self, card_name: str) -> Optional[Dict]:
        """Get detailed profile for a court card"""
        if not self.court_profiles:
            return None

        for rank in ['pages', 'knights', 'queens', 'kings']:
            rank_data = self.court_profiles.get(rank, {})
            cards = rank_data.get('cards', {})
            if card_name in cards:
                profile = cards[card_name].copy()
                profile['rank'] = rank
                profile['rank_description'] = rank_data.get('description', '')
                return profile

        return None

    def get_timing_hint(self, card_name: str) -> Optional[str]:
        """Get timing hint for a card"""
        if not self.timing_rules:
            return None

        card_timing = self.timing_rules.get('card_timing_meanings', {})
        for timing_category, data in card_timing.items():
            if card_name in data.get('cards', []):
                return f"{data.get('korean', '')}: {data.get('timeframe', '')}"

        return None

    def analyze_elemental_balance(self, cards: List[Dict]) -> Dict:
        """Analyze elemental balance of cards"""
        if not self.elemental_dignities:
            return {}

        element_count = {'fire': 0, 'water': 0, 'air': 0, 'earth': 0}
        suit_to_element = {'Wands': 'fire', 'Cups': 'water', 'Swords': 'air', 'Pentacles': 'earth'}

        major_elements = self.elemental_dignities.get('major_arcana_elements', {}).get('cards', {})

        for card in cards:
            card_name = card.get('name', '')
            for suit, element in suit_to_element.items():
                if suit in card_name:
                    element_count[element] += 1
                    break
            else:
                if card_name in major_elements:
                    element = major_elements[card_name].get('element', '')
                    if element in element_count:
                        element_count[element] += 1

        dominant = max(element_count, key=element_count.get) if any(element_count.values()) else None
        missing = [e for e, c in element_count.items() if c == 0]

        return {
            'element_count': element_count,
            'dominant': dominant,
            'missing': missing
        }

    def get_narrative_template(self, template_type: str) -> Optional[Dict]:
        """Get narrative template for storytelling"""
        if not self.narrative_templates:
            return None
        return self.narrative_templates.get(template_type)

    def get_card_astrology(self, card_name: str) -> Optional[Dict]:
        """Get astrological correspondence for a card"""
        if not self.astrological_correspondences:
            return None
        cards_data = self.astrological_correspondences.get('cards', {})
        return cards_data.get(card_name)

    def get_card_chakras(self, card_name: str) -> Optional[Dict]:
        """Get chakra connections for a card"""
        if not self.chakra_connections:
            return None
        cards_data = self.chakra_connections.get('cards', {})
        return cards_data.get(card_name)

    def get_spirit_animal(self, card_name: str) -> Optional[Dict]:
        """Get spirit animal for a card"""
        if not self.spirit_animals:
            return None
        cards_data = self.spirit_animals.get('cards', {})
        return cards_data.get(card_name)

    def get_shadow_work_prompt(self, card_name: str) -> Optional[Dict]:
        """Get shadow work prompts for a card"""
        if not self.shadow_work:
            return None
        cards_data = self.shadow_work.get('cards', {})
        return cards_data.get(card_name)

    def get_card_lucky_items(self, card_name: str) -> Optional[Dict]:
        """Get lucky items for a card"""
        if not self.lucky_items:
            return None
        cards_data = self.lucky_items.get('cards', {})
        return cards_data.get(card_name)

    def get_meditation_for_card(self, card_name: str) -> Optional[Dict]:
        """Get meditation/affirmation for a card"""
        if not self.meditation_affirmations:
            return None
        cards_data = self.meditation_affirmations.get('cards', {})
        return cards_data.get(card_name)

    def get_reversed_special_meaning(self, card_name: str) -> Optional[Dict]:
        """Get special reversed meaning for a card"""
        if not self.reversed_special:
            return None
        cards_data = self.reversed_special.get('cards', {})
        return cards_data.get(card_name)

    def get_card_deep_meaning(self, card_name: str) -> Optional[Dict]:
        """Get deep psychological/archetypal meaning for a card"""
        if not self.multidimensional_matrix:
            return None
        cards_data = self.multidimensional_matrix.get('cards', {})
        return cards_data.get(card_name)

    def get_all_card_pair_interpretations(self, cards: List) -> List[Dict]:
        """Get interpretations for all card pairs in a reading"""
        results = []
        card_names = [c.get('name', '') if isinstance(c, dict) else str(c) for c in cards]
        for i, card1 in enumerate(card_names):
            for card2 in card_names[i+1:]:
                interpretation = self.find_card_pair_interpretation(card1, card2)
                if interpretation:
                    results.append(interpretation)
        return results

    def get_jungian_archetype(self, card_name: str, is_reversed: bool = False) -> Optional[Dict]:
        """Get Jungian archetype interpretation for a card"""
        if not self.jungian_archetypes:
            return None
        cards_data = self.jungian_archetypes.get('cards', {})
        card_data = cards_data.get(card_name)
        if card_data and is_reversed:
            return card_data.get('reversed', card_data)
        return card_data

    def get_individuation_stage(self, cards: List) -> Optional[Dict]:
        """Analyze individuation stage based on cards"""
        if not self.jungian_archetypes:
            return None
        stages = self.jungian_archetypes.get('individuation_stages', {})
        # Simple analysis based on card count and types
        return stages.get('general') if stages else None

    def detect_crisis_situation(self, cards: List, question: str) -> Optional[Dict]:
        """Detect if reading indicates a crisis situation"""
        if not self.crisis_support:
            return None
        # Check for crisis indicators in cards
        crisis_cards = self.crisis_support.get('crisis_cards', [])
        card_names = [c.get('name', '') if isinstance(c, dict) else str(c) for c in cards]
        for card in card_names:
            if card in crisis_cards:
                return {'detected': True, 'card': card}
        return None

    def get_crisis_support(self, crisis_type: str, severity: str = 'moderate') -> Optional[Dict]:
        """Get crisis support resources"""
        if not self.crisis_support:
            return None
        support = self.crisis_support.get('support', {})
        return support.get(crisis_type, support.get('general'))

    def get_detailed_reverse_interpretation(self, card_name: str) -> Optional[Dict]:
        """Get detailed reverse interpretation for a card"""
        if not self.reverse_interpretations:
            return None
        cards_data = self.reverse_interpretations.get('cards', {})
        return cards_data.get(card_name)

    def get_followup_questions(self, category: str, sentiment: str = 'neutral') -> List[str]:
        """Get followup questions for a theme category"""
        if not self.followup_questions:
            return []
        category_data = self.followup_questions.get(category, {})
        if isinstance(category_data, dict):
            return category_data.get(sentiment, category_data.get('neutral', []))
        if isinstance(category_data, list):
            return category_data
        return []


# Singleton instance
_rules_loader: Optional[AdvancedRulesLoader] = None


def get_rules_loader() -> AdvancedRulesLoader:
    """Get or create singleton AdvancedRulesLoader instance"""
    global _rules_loader
    if _rules_loader is None:
        _rules_loader = AdvancedRulesLoader()
    return _rules_loader
