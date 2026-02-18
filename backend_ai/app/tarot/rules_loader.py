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
        self.multi_card_rules: Dict = {}
        self.pattern_interpretations: Dict = {}
        self.pair_overrides: Dict = {}
        self._pair_override_index: Dict[str, Dict] = {}
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
            'jungian_archetypes.json': 'jungian_archetypes',
            'multi_card_rules.json': 'multi_card_rules',
            'pattern_interpretations.json': 'pattern_interpretations',
            'card_pair_overrides.json': 'pair_overrides'
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
        self._build_pair_override_index()

    def _build_pair_override_index(self):
        """Build quick lookup index for pair overrides."""
        self._pair_override_index = {}
        overrides = self.pair_overrides or {}
        for item in overrides.get("pairs", []) or []:
            id1 = item.get("card1_id")
            id2 = item.get("card2_id")
            if not id1 or not id2:
                continue
            key = self._pair_key(id1, id2)
            self._pair_override_index[key] = item

    def _pair_key(self, id1: str, id2: str) -> str:
        """Stable key for unordered card pairs."""
        return "||".join(sorted([id1, id2]))

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

    def get_multi_card_rule_hints(
        self,
        pattern: Dict,
        theme: Optional[str] = None,
        spread: Optional[Dict] = None
    ) -> List[str]:
        """Apply stored multi-card rules to a pattern analysis result."""
        priority_hints: List[str] = []
        general_hints: List[str] = []
        rules = self.multi_card_rules or {}
        pattern_rules = self.pattern_interpretations or {}
        if not rules or not pattern:
            return []

        # Suit dominance + missing
        suit_rules = rules.get("suit_dominance", {})
        suit_analysis = pattern.get("suit_analysis", {})
        dominant = suit_analysis.get("dominant")
        if dominant and isinstance(dominant, dict):
            suit = dominant.get("suit")
            if suit:
                msg = suit_rules.get("messages", {}).get(suit)
                if msg:
                    general_hints.append(msg)

        if suit_analysis.get("balance") == "balanced":
            balanced_msg = suit_rules.get("balanced_message")
            if balanced_msg:
                general_hints.append(balanced_msg)

        for miss in suit_analysis.get("missing", []) or []:
            suit = miss.get("suit")
            if suit:
                msg = suit_rules.get("missing_messages", {}).get(suit)
                if msg:
                    general_hints.append(msg)

        # Major ratio rules
        arcana = pattern.get("arcana_analysis", {})
        major_ratio_percent = arcana.get("major_ratio")
        if isinstance(major_ratio_percent, (int, float)):
            major_ratio = major_ratio_percent / 100.0
            for rule in rules.get("major_ratio_rules", []):
                if major_ratio >= rule.get("min", 1.1):
                    msg = rule.get("message")
                    if msg:
                        general_hints.append(msg)
                    break

        # Reversal ratio rules
        reversal = pattern.get("reversal_analysis", {})
        reversal_ratio_percent = reversal.get("ratio")
        if isinstance(reversal_ratio_percent, (int, float)):
            reversal_ratio = reversal_ratio_percent / 100.0
            applied = False
            for rule in rules.get("reversal_ratio_rules", []):
                if "exact" in rule and reversal_ratio == rule.get("exact"):
                    msg = rule.get("message")
                    if msg:
                        general_hints.append(msg)
                    applied = True
                    break
                if reversal_ratio >= rule.get("min", 1.1):
                    msg = rule.get("message")
                    if msg:
                        general_hints.append(msg)
                    applied = True
                    break
            if not applied and reversal_ratio == 0:
                msg = next((r.get("message") for r in rules.get("reversal_ratio_rules", [])
                            if r.get("exact") == 0), None)
                if msg:
                    general_hints.append(msg)

        # Court focus
        court = pattern.get("court_analysis", {})
        court_rules = rules.get("court_focus", {})
        if court_rules:
            min_count = court_rules.get("min_count", 3)
            min_ratio = court_rules.get("min_ratio", 0.4)
            if court.get("count", 0) >= min_count or (court.get("ratio", 0) / 100.0) >= min_ratio:
                msg = court_rules.get("message")
                if msg:
                    general_hints.append(msg)

        # Element energy
        element = pattern.get("element_interaction", {})
        element_energy = element.get("overall_energy")
        if element_energy:
            msg = rules.get("element_energy", {}).get(element_energy)
            if msg:
                general_hints.append(msg)

        # Energy flow
        energy_flow = pattern.get("energy_flow", {})
        trend = energy_flow.get("trend")
        pattern_state = energy_flow.get("pattern")
        flow_rules = rules.get("energy_flow", {})
        if trend and flow_rules.get(trend):
            general_hints.append(flow_rules.get(trend))
        elif pattern_state and flow_rules.get(pattern_state):
            general_hints.append(flow_rules.get(pattern_state))

        # Number repeats
        num_rules = rules.get("number_repeats", {})
        number_analysis = pattern.get("number_analysis", {})
        for rep in number_analysis.get("repeated", []) or []:
            num = rep.get("number")
            if num is None:
                continue
            msg = num_rules.get(str(num))
            if msg:
                general_hints.append(msg)

        # Sequences
        seq_rule = rules.get("sequence_rule", {})
        min_len = seq_rule.get("min_len", 3)
        for seq in number_analysis.get("sequences", []) or []:
            nums = seq.get("numbers", [])
            if isinstance(nums, list) and len(nums) >= min_len:
                msg = seq_rule.get("message")
                if msg:
                    general_hints.append(msg)
                    break

        # === Enrich with pattern_interpretations.json ===
        # Reversed reading tips
        reversed_guide = pattern_rules.get("reversed_interpretation_guide", {})
        if reversed_guide:
            tips = reversed_guide.get("reading_tips", [])
            if isinstance(tips, list) and tips:
                if reversal_ratio_percent and reversal_ratio_percent >= 50:
                    general_hints.append(tips[0])
                elif reversal_ratio_percent and reversal_ratio_percent >= 30 and len(tips) > 1:
                    general_hints.append(tips[1])

        # Number interpretations (richer wording)
        num_interp = pattern_rules.get("number_interpretations", {})
        num_key_map = {
            1: "aces", 2: "twos", 3: "threes", 4: "fours", 5: "fives",
            6: "sixes", 7: "sevens", 8: "eights", 9: "nines", 10: "tens"
        }
        for rep in number_analysis.get("repeated", []) or []:
            num = rep.get("number")
            key = num_key_map.get(num)
            if key and key in num_interp:
                rich = num_interp[key]
                extra = rich.get("korean") or rich.get("core_meaning")
                if extra:
                    general_hints.append(extra)
                    break

        # Court card interpretation (if court focus)
        court_interp = pattern_rules.get("court_card_interpretations", {})
        if court_interp and court:
            rank_key_map = {
                "Page": "pages",
                "Knight": "knights",
                "Queen": "queens",
                "King": "kings",
            }
            ranks = court.get("ranks", {}) or {}
            for rank, data in ranks.items():
                if data.get("count", 0) >= 2:
                    key = rank_key_map.get(rank)
                    if key and key in court_interp:
                        extra = court_interp[key].get("korean") or court_interp[key].get("core_meaning")
                        if extra:
                            general_hints.append(extra)
                            break

        # General interpretation principle tip
        tips = pattern_rules.get("reading_enhancement_tips", {}).get("interpretation_principles", [])
        if isinstance(tips, list) and tips:
            if len(general_hints) < 6:
                general_hints.append(tips[0])

        # === Theme + spread focused hints ===
        theme_key = (theme or "").strip().lower()
        theme_alias = {
            "money": "wealth",
            "finance": "wealth",
            "family": "love",
            "life_path": "spiritual",
            "daily": "general",
            "monthly": "general",
        }
        theme_key = theme_alias.get(theme_key, theme_key)
        theme_rules = rules.get("theme_focus", {})
        theme_data = theme_rules.get(theme_key) or theme_rules.get("general") or {}

        focus_msg = theme_data.get("focus")
        if focus_msg:
            priority_hints.append(focus_msg)

        dominant_suit = None
        if isinstance(dominant, dict):
            dominant_suit = dominant.get("suit")
        if dominant_suit:
            dom_note = (theme_data.get("dominant_suit_notes") or {}).get(dominant_suit)
            if dom_note:
                priority_hints.append(dom_note)

        missing_list = suit_analysis.get("missing", []) or []
        if missing_list:
            miss_note_map = theme_data.get("missing_suit_notes") or {}
            for miss in missing_list:
                miss_suit = miss.get("suit")
                if miss_suit and miss_note_map.get(miss_suit):
                    priority_hints.append(miss_note_map.get(miss_suit))
                    break

        if isinstance(major_ratio_percent, (int, float)) and major_ratio_percent >= 50:
            major_note = theme_data.get("major_ratio_note")
            if major_note:
                priority_hints.append(major_note)

        if isinstance(reversal_ratio_percent, (int, float)) and reversal_ratio_percent >= 50:
            reversal_note = theme_data.get("reversal_note")
            if reversal_note:
                priority_hints.append(reversal_note)

        spread_key = None
        if isinstance(spread, dict):
            spread_name = (spread.get("spread_name") or "").lower()
            card_count = spread.get("card_count")
            if "celtic" in spread_name or "cross" in spread_name:
                spread_key = "celtic_cross"
            elif any(word in spread_name for word in ["relationship", "partner", "heart", "crush"]):
                spread_key = "relationship_spread"
            elif card_count == 3:
                spread_key = "three_card"

        if spread_key:
            guides = rules.get("spread_guides", {})
            guide = guides.get(spread_key)
            if guide:
                guide_msg = guide.get("message")
                if guide_msg:
                    priority_hints.append(guide_msg)
                trend = energy_flow.get("trend")
                flow_msg = (guide.get("energy_flow") or {}).get(trend)
                if flow_msg:
                    priority_hints.append(flow_msg)

        # Merge (priority first), remove duplicates while preserving order
        merged: List[str] = []
        for msg in priority_hints + general_hints:
            if msg and msg not in merged:
                merged.append(msg)

        return merged

    def find_card_pair_interpretation(self, card1_name: str, card2_name: str) -> Optional[Dict]:
        """Find interpretation for a specific card pair from CSV data"""
        if not self.card_pair_combinations and not self._pair_override_index:
            return None

        card1_id = self._card_name_to_id(card1_name)
        card2_id = self._card_name_to_id(card2_name)

        if not card1_id or not card2_id:
            return None

        override = self._pair_override_index.get(self._pair_key(card1_id, card2_id))
        base = None
        if self.card_pair_combinations:
            for combo in self.card_pair_combinations:
                combo_card1_id = combo.get('card1_id', '')
                combo_card2_id = combo.get('card2_id', '')

                if (combo_card1_id == card1_id and combo_card2_id == card2_id) or \
                   (combo_card1_id == card2_id and combo_card2_id == card1_id):
                    base = combo
                    break

        if not override and not base:
            return None

        def _pick(field: str, alt: str = None):
            if override:
                value = override.get(field)
                if value:
                    return value
                if alt:
                    value = override.get(alt)
                    if value:
                        return value
            if base:
                return base.get(alt or field)
            return None

        return {
            'card1': card1_name,
            'card2': card2_name,
            'element_relation': _pick('element_relation'),
            'love': _pick('love', 'love_interpretation'),
            'career': _pick('career', 'career_interpretation'),
            'finance': _pick('finance', 'finance_interpretation'),
            'advice': _pick('advice')
        }

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

        question_text = (question or "").strip().lower()
        safety = self.crisis_support.get("safety_guidelines", {}) or {}
        warning_phrases = [
            str(p).strip().lower()
            for p in (safety.get("warning_phrases", []) or [])
            if str(p).strip()
        ]
        # Safety fallback terms even if rule files are incomplete.
        default_warning_phrases = [
            "죽고 싶다",
            "살고 싶지 않다",
            "자해",
            "kill myself",
            "want to die",
            "suicide",
            "self harm",
        ]
        for phrase in default_warning_phrases:
            if phrase not in warning_phrases:
                warning_phrases.append(phrase)

        # 1) High-priority safety phrase detection from question text.
        for phrase in warning_phrases:
            if phrase and phrase in question_text:
                return {
                    "detected": True,
                    "crisis_type": "safety",
                    "crisis_name": "Safety risk",
                    "severity": "high",
                    "professional_help_needed": True,
                    "matched_phrase": phrase,
                    "trigger": "question_warning_phrase",
                }

        crisis_types = self.crisis_support.get("crisis_types", {}) or {}
        keyword_map = {
            "breakup": ["breakup", "divorce", "separation", "헤어", "이별"],
            "loss_grief": ["grief", "bereavement", "funeral", "상실", "사별"],
            "job_loss": ["laid off", "fired", "unemployed", "실직", "해고"],
            "health_crisis": ["illness", "hospital", "diagnosis", "건강", "병원"],
            "existential_crisis": ["meaningless", "empty", "lost", "무의미", "공허"],
        }

        # 2) Question intent hints for known crisis types.
        for crisis_type, keywords in keyword_map.items():
            if any(kw in question_text for kw in keywords):
                cfg = crisis_types.get(crisis_type, {}) or {}
                return {
                    "detected": True,
                    "crisis_type": crisis_type,
                    "crisis_name": cfg.get("name", crisis_type),
                    "severity": cfg.get("severity", "moderate"),
                    "professional_help_needed": bool(cfg.get("professional_help_trigger")),
                    "trigger": "question_keyword",
                }

        # 3) Card-based crisis detection.
        crisis_cards = set(self.crisis_support.get("crisis_cards", []) or [])
        supportive_card_map: Dict[str, str] = {}
        for crisis_type, cfg in crisis_types.items():
            supportive = cfg.get("supportive_cards", {}) or {}
            if isinstance(supportive, dict):
                for card_name in supportive.keys():
                    normalized = str(card_name).strip()
                    if normalized:
                        crisis_cards.add(normalized)
                        supportive_card_map[normalized] = crisis_type

        card_names = [c.get('name', '') if isinstance(c, dict) else str(c) for c in cards]
        for card in card_names:
            normalized_card = str(card).strip()
            if not normalized_card:
                continue
            if normalized_card in crisis_cards:
                crisis_type = supportive_card_map.get(normalized_card, "general")
                cfg = crisis_types.get(crisis_type, {}) or {}
                return {
                    "detected": True,
                    "card": normalized_card,
                    "crisis_type": crisis_type,
                    "crisis_name": cfg.get("name", crisis_type),
                    "severity": cfg.get("severity", "moderate"),
                    "professional_help_needed": bool(cfg.get("professional_help_trigger")),
                    "trigger": "card_indicator",
                }
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
