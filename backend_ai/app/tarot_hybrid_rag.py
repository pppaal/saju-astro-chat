# backend_ai/app/tarot_hybrid_rag.py
"""
Tarot Hybrid RAG System (Premium YouTube-Level)
================================================
Combines:
- Structured tarot card data & spreads (RAG)
- OpenAI GPT for rich narrative interpretation
- Position-based deep readings
- Streaming support for real-time delivery
- Advanced rules: combinations, timing, court cards, elemental dignities
- Enhanced narrative templates for storytelling

유튜브 타로 리더 수준의 심층 해석 시스템
- 테마별 서브토픽 (연애 10개+, 직업 10개+)
- 포지션별 카드 해석
- 카드 조합 의미
- 타이밍 규칙
- 원소 상호작용
- 자연스러운 스토리텔링
- 스트리밍 지원
"""

import os
import json
import random
from typing import List, Dict, Optional, Generator, Any, Tuple

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None
    OPENAI_AVAILABLE = False
    print("[TarotHybridRAG] openai not installed. LLM features disabled.")

try:
    from backend_ai.app.tarot_rag import get_tarot_rag, TarotRAG, SUIT_MEANINGS
    from backend_ai.app.tarot_advanced_embeddings import get_tarot_advanced_embeddings, TarotAdvancedEmbeddings
    from backend_ai.app.tarot_pattern_engine import (
        get_pattern_engine, TarotPatternEngine,
        get_premium_engine, TarotPatternEnginePremium
    )
except ImportError:
    # Fallback for direct execution
    from tarot_rag import get_tarot_rag, TarotRAG, SUIT_MEANINGS
    from tarot_advanced_embeddings import get_tarot_advanced_embeddings, TarotAdvancedEmbeddings
    from tarot_pattern_engine import (
        get_pattern_engine, TarotPatternEngine,
        get_premium_engine, TarotPatternEnginePremium
    )


# ===============================================================
# ADVANCED RULES LOADER
# ===============================================================
class AdvancedRulesLoader:
    """Load and manage advanced tarot interpretation rules"""

    def __init__(self, rules_dir: str = None):
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot", "advanced")

        self.rules_dir = rules_dir
        self.combinations = {}
        self.timing_rules = {}
        self.court_profiles = {}
        self.elemental_dignities = {}
        self.narrative_templates = {}
        self.numerology = {}
        self.color_symbolism = {}
        self.meditation_affirmations = {}
        self.lucky_items = {}
        self.followup_questions = {}
        self.reversed_special = {}
        self.chakra_connections = {}
        self.astrological_correspondences = {}
        self.yes_no_logic = {}
        self.soulmate_indicators = {}
        self.shadow_work = {}
        self.moon_phases = {}
        self.spirit_animals = {}
        # 추가된 데이터
        self.spread_positions = {}
        self.multidimensional_matrix = {}
        self.card_pair_combinations = []  # CSV에서 로드
        self.crisis_support = {}  # 위기/상실 상황 지원
        self.decision_framework = {}  # 결정 프레임워크
        self.reverse_interpretations = {}  # 역방향 카드 해석
        self._load_all_rules()

    def _load_all_rules(self):
        """Load all advanced rule JSON files"""
        if not os.path.exists(self.rules_dir):
            print(f"[AdvancedRulesLoader] Rules directory not found: {self.rules_dir}")
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
            # 추가: 스프레드 포지션 & 다차원 매트릭스
            'tarot_spread_positions.json': 'spread_positions',
            'tarot_multidimensional_matrix.json': 'multidimensional_matrix',
            'crisis.json': 'crisis_support',
            'decisions.json': 'decision_framework',
            'tarot_reverse_interpretations.json': 'reverse_interpretations'
        }

        for filename, attr in rule_files.items():
            path = os.path.join(self.rules_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, encoding='utf-8') as f:
                        setattr(self, attr, json.load(f))
                        print(f"[AdvancedRulesLoader] Loaded {filename}")
                except Exception as e:
                    print(f"[AdvancedRulesLoader] Failed to load {filename}: {e}")

        # CSV 파일 로드 (카드 조합)
        self._load_card_pair_combinations()

    def _load_card_pair_combinations(self):
        """Load tarot_combinations.csv for card pair interpretations"""
        # CSV는 tarot/ 폴더에 있음
        base_dir = os.path.dirname(os.path.dirname(__file__))
        csv_path = os.path.join(base_dir, "data", "graph", "rules", "tarot", "tarot_combinations.csv")

        if not os.path.exists(csv_path):
            return

        try:
            import csv
            with open(csv_path, encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                self.card_pair_combinations = list(reader)
            print(f"[AdvancedRulesLoader] Loaded tarot_combinations.csv ({len(self.card_pair_combinations)} pairs)")
        except Exception as e:
            print(f"[AdvancedRulesLoader] Failed to load tarot_combinations.csv: {e}")

    def _card_name_to_id(self, card_name: str) -> Optional[str]:
        """Convert English card name to card_id format (e.g., 'The Fool' -> 'MAJOR_0')"""
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

        # Minor Arcana
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

        # 카드 이름을 ID로 변환
        card1_id = self._card_name_to_id(card1_name)
        card2_id = self._card_name_to_id(card2_name)

        for combo in self.card_pair_combinations:
            combo_card1_id = combo.get('card1_id', '')
            combo_card2_id = combo.get('card2_id', '')

            # ID로 매칭 (순서 상관없이)
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

        # Check all categories
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

        # Check triple combinations
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

        # Check each rank
        for rank in ['pages', 'knights', 'queens', 'kings']:
            rank_data = self.court_profiles.get(rank, {})
            cards = rank_data.get('cards', {})
            if card_name in cards:
                profile = cards[card_name]
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

            # Check suit
            for suit, element in suit_to_element.items():
                if suit in card_name:
                    element_count[element] += 1
                    break
            else:
                # Major Arcana
                if card_name in major_elements:
                    element = major_elements[card_name].get('element', '')
                    if element in element_count:
                        element_count[element] += 1

        # Find dominant and missing elements
        dominant = max(element_count, key=element_count.get) if any(element_count.values()) else None
        missing = [e for e, c in element_count.items() if c == 0]

        result = {
            'element_count': element_count,
            'dominant': dominant,
            'missing': missing
        }

        # Add interpretation
        if dominant and element_count[dominant] >= 3:
            rules = self.elemental_dignities.get('reading_rules', {}).get('dominant_element', {}).get('rules', [])
            for rule in rules:
                if dominant in rule.get('condition', '').lower():
                    result['dominant_meaning'] = rule.get('meaning', '')
                    result['dominant_advice'] = rule.get('advice', '')
                    break

        if missing:
            rules = self.elemental_dignities.get('reading_rules', {}).get('missing_element', {}).get('rules', [])
            missing_meanings = []
            for rule in rules:
                for m in missing:
                    if m.capitalize() in rule.get('condition', ''):
                        missing_meanings.append({
                            'element': m,
                            'meaning': rule.get('meaning', ''),
                            'advice': rule.get('advice', '')
                        })
            result['missing_meanings'] = missing_meanings

        return result

    def get_narrative_opener(self, style: str = 'mystical') -> str:
        """Get a narrative opening phrase"""
        if not self.narrative_templates:
            return ""

        openers = self.narrative_templates.get('opening_styles', {}).get(style, {}).get('templates', [])
        return random.choice(openers) if openers else ""

    def get_narrative_closer(self, style: str = 'empowering') -> str:
        """Get a narrative closing phrase"""
        if not self.narrative_templates:
            return ""

        closers = self.narrative_templates.get('closing_styles', {}).get(style, {}).get('templates', [])
        return random.choice(closers) if closers else ""

    def get_transition_phrase(self, transition_type: str = 'card_to_card') -> str:
        """Get a transition phrase"""
        if not self.narrative_templates:
            return ""

        transitions = self.narrative_templates.get('transition_phrases', {}).get(transition_type, [])
        return random.choice(transitions) if transitions else ""

    def get_numerology_meaning(self, number: int) -> Optional[Dict]:
        """Get numerology meaning for a number"""
        if not self.numerology:
            return None

        number_meanings = self.numerology.get('number_meanings', {})
        return number_meanings.get(str(number))

    def get_card_lucky_items(self, card_name: str) -> Optional[Dict]:
        """Get lucky items for a specific card"""
        if not self.lucky_items:
            return None

        return self.lucky_items.get('card_lucky_items', {}).get(card_name)

    def get_meditation_for_card(self, card_name: str) -> Optional[Dict]:
        """Get meditation and affirmation for a major arcana card"""
        if not self.meditation_affirmations:
            return None

        return self.meditation_affirmations.get('major_arcana_meditations', {}).get(card_name)

    def get_followup_questions(self, theme: str, reading_outcome: str = 'neutral') -> List[str]:
        """Get follow-up question suggestions based on theme and outcome"""
        if not self.followup_questions:
            return []

        # Get theme-specific questions
        theme_questions = self.followup_questions.get('by_theme', {}).get(theme, {})
        outcome_key = f"{reading_outcome}_reading"
        questions = theme_questions.get(outcome_key, theme_questions.get('general', []))

        # Add some general followups
        general = self.followup_questions.get('general_followups', [])

        return questions[:3] + general[:2]

    def get_reversed_special_meaning(self, card_name: str) -> Optional[Dict]:
        """Get special meaning for reversed major arcana"""
        if not self.reversed_special:
            return None

        reversed_majors = self.reversed_special.get('reversed_major_arcana_special', {})
        return reversed_majors.get(f"{card_name} (R)")

    def analyze_reversed_ratio(self, cards: List[Dict]) -> Dict:
        """Analyze the ratio of reversed cards in a reading"""
        if not cards:
            return {}

        reversed_count = sum(1 for c in cards if c.get('isReversed', False))
        total = len(cards)
        ratio = reversed_count / total

        result = {
            'reversed_count': reversed_count,
            'total_count': total,
            'ratio': ratio
        }

        if ratio == 1.0 and self.reversed_special:
            result['interpretation'] = self.reversed_special.get('all_reversed_reading', {})
        elif ratio >= 0.7 and self.reversed_special:
            result['interpretation'] = self.reversed_special.get('mostly_reversed_reading', {})

        return result

    def get_card_chakras(self, card_name: str) -> List[Dict]:
        """Get chakra connections for a specific card"""
        if not self.chakra_connections:
            return []

        card_mapping = self.chakra_connections.get('card_chakra_mapping', {}).get('major_arcana', {})
        chakra_names = card_mapping.get(card_name, [])

        if not chakra_names:
            return []

        chakras = self.chakra_connections.get('chakras', {})
        result = []
        for chakra_name in chakra_names:
            if chakra_name == 'all':
                result.append({
                    'name': 'all',
                    'korean': '모든 차크라',
                    'meaning': '전체 에너지 시스템에 영향'
                })
            elif chakra_name in chakras:
                chakra_data = chakras[chakra_name]
                result.append({
                    'name': chakra_name,
                    'korean': chakra_data.get('korean', ''),
                    'color': chakra_data.get('color', ''),
                    'theme': chakra_data.get('theme', ''),
                    'balanced': chakra_data.get('balanced', ''),
                    'blocked': chakra_data.get('blocked', ''),
                    'healing_affirmation': chakra_data.get('healing_affirmation', '')
                })
        return result

    def analyze_chakra_balance(self, cards: List[Dict]) -> Dict:
        """Analyze chakra balance based on drawn cards"""
        if not self.chakra_connections:
            return {}

        chakra_count = {}
        chakras = self.chakra_connections.get('chakras', {})
        card_mapping = self.chakra_connections.get('card_chakra_mapping', {}).get('major_arcana', {})

        for card in cards:
            card_name = card.get('name', '')
            chakra_names = card_mapping.get(card_name, [])
            for chakra_name in chakra_names:
                if chakra_name != 'all':
                    chakra_count[chakra_name] = chakra_count.get(chakra_name, 0) + 1

        # Find dominant and missing
        all_chakras = ['root', 'sacral', 'solar_plexus', 'heart', 'throat', 'third_eye', 'crown']
        dominant = max(chakra_count, key=chakra_count.get) if chakra_count else None
        missing = [c for c in all_chakras if c not in chakra_count]

        result = {
            'chakra_count': chakra_count,
            'dominant': dominant,
            'missing': missing
        }

        if dominant and dominant in chakras:
            result['dominant_info'] = {
                'korean': chakras[dominant].get('korean', ''),
                'theme': chakras[dominant].get('theme', ''),
                'healing_activity': chakras[dominant].get('healing_activity', '')
            }

        if missing:
            result['missing_info'] = []
            for m in missing[:2]:  # Top 2 missing
                if m in chakras:
                    result['missing_info'].append({
                        'name': m,
                        'korean': chakras[m].get('korean', ''),
                        'blocked': chakras[m].get('blocked', ''),
                        'healing_activity': chakras[m].get('healing_activity', '')
                    })

        return result

    def get_card_astrology(self, card_name: str) -> Optional[Dict]:
        """Get astrological correspondence for a card"""
        if not self.astrological_correspondences:
            return None

        # Check Major Arcana
        major_astro = self.astrological_correspondences.get('major_arcana_astrology', {})
        if card_name in major_astro:
            data = major_astro[card_name]
            return {
                'planet': data.get('planet'),
                'korean_planet': data.get('korean_planet'),
                'zodiac': data.get('zodiac'),
                'korean_zodiac': data.get('korean_zodiac'),
                'element': data.get('element'),
                'meaning': data.get('meaning')
            }

        # Check Minor Arcana (decans)
        decans = self.astrological_correspondences.get('minor_arcana_decans', {})
        for suit in ['wands', 'cups', 'swords', 'pentacles']:
            suit_data = decans.get(suit, {})
            for number, decan_info in suit_data.items():
                if f"{number} of {suit.capitalize()}" in card_name:
                    return {
                        'zodiac': decan_info.get('zodiac'),
                        'decan': decan_info.get('decan'),
                        'dates': decan_info.get('dates'),
                        'planet': decan_info.get('planet'),
                        'element': suit.capitalize()
                    }

        # Check Court Cards
        court = self.astrological_correspondences.get('court_card_zodiac', {})
        for rank in ['kings', 'queens']:
            rank_data = court.get(rank, {})
            if card_name in rank_data:
                return {
                    'zodiac': rank_data[card_name].get('zodiac'),
                    'element': rank_data[card_name].get('element')
                }

        return None

    def calculate_yes_no(self, cards: List[Dict], spread_type: str = 'single_card') -> Dict:
        """Calculate Yes/No answer based on cards"""
        if not self.yes_no_logic:
            return {}

        card_values = self.yes_no_logic.get('card_values', {})
        reversal_modifier = self.yes_no_logic.get('reversal_modifier', {}).get('rules', {})
        calculation = self.yes_no_logic.get('calculation_method', {})
        answer_templates = self.yes_no_logic.get('answer_templates', {})

        def get_card_value(card_name: str, is_reversed: bool) -> float:
            # Find card's base category
            for category, data in card_values.items():
                if card_name in data.get('cards', []):
                    base_value = data.get('value', 0)
                    if is_reversed:
                        # Apply reversal modifier
                        modifier_key = f"{category}_reversed"
                        if modifier_key in reversal_modifier:
                            # Parse modifier (simplified)
                            if 'value: ' in reversal_modifier[modifier_key]:
                                try:
                                    return float(reversal_modifier[modifier_key].split('value: ')[1].replace(')', ''))
                                except (ValueError, IndexError, AttributeError):
                                    return base_value * -0.5
                            return base_value * -0.5
                    return base_value
            return 0  # Neutral if not found

        # Calculate total value
        total_value = 0
        card_details = []
        for card in cards:
            card_name = card.get('name', '')
            is_reversed = card.get('isReversed', False)
            value = get_card_value(card_name, is_reversed)
            total_value += value
            card_details.append({
                'name': card_name,
                'reversed': is_reversed,
                'value': value
            })

        # Determine answer based on spread type
        if spread_type == 'single_card':
            threshold = calculation.get('single_card', {}).get('threshold', {})
        elif spread_type == 'three_card':
            threshold = calculation.get('three_card', {}).get('threshold', {})
        else:
            threshold = calculation.get('single_card', {}).get('threshold', {})

        # Determine answer
        answer = 'maybe'
        if total_value >= 4:
            answer = 'strong_yes'
        elif total_value >= 2:
            answer = 'yes'
        elif total_value >= 0:
            answer = 'maybe'
        elif total_value >= -2:
            answer = 'no'
        else:
            answer = 'strong_no'

        template = answer_templates.get(answer, {})

        # Check special combinations
        special_combos = self.yes_no_logic.get('special_combinations', {})
        card_names = [c.get('name', '') for c in cards]
        special_match = None

        for combo_type in ['definite_yes', 'definite_no', 'timing_not_right']:
            combos = special_combos.get(combo_type, [])
            for combo in combos:
                if set(combo.get('combo', [])).issubset(set(card_names)):
                    special_match = {
                        'type': combo_type,
                        'cards': combo.get('combo'),
                        'meaning': combo.get('meaning')
                    }
                    # Override answer for definite combos
                    if combo_type == 'definite_yes':
                        answer = 'strong_yes'
                        template = answer_templates.get('strong_yes', {})
                    elif combo_type == 'definite_no':
                        answer = 'strong_no'
                        template = answer_templates.get('strong_no', {})
                    elif combo_type == 'timing_not_right':
                        answer = 'maybe'
                        template = answer_templates.get('maybe', {})
                    break

        return {
            'total_value': total_value,
            'answer': answer,
            'korean': template.get('korean', ''),
            'confidence': template.get('confidence', ''),
            'advice': template.get('advice', ''),
            'card_details': card_details,
            'special_combination': special_match
        }

    def get_optimal_reading_time(self, question_type: str) -> Optional[str]:
        """Get optimal reading time based on question type"""
        if not self.astrological_correspondences:
            return None

        timing = self.astrological_correspondences.get('reading_timing_recommendation', {})
        return timing.get(f"{question_type}_reading")

    # ===========================================
    # SOULMATE & RELATIONSHIP INDICATORS
    # ===========================================
    def analyze_soulmate_connection(self, cards: List[Dict]) -> Dict:
        """Analyze cards for soulmate/relationship connection indicators"""
        if not self.soulmate_indicators:
            return {}

        card_names = [c.get('name', '') for c in cards]
        indicators = self.soulmate_indicators.get('soulmate_card_indicators', {})

        found_connections = []
        for connection_type, data in indicators.items():
            matching_cards = [c for c in card_names if c in data.get('cards', [])]
            if matching_cards:
                found_connections.append({
                    'type': connection_type,
                    'cards': matching_cards,
                    'meaning': data.get('meaning', '')
                })

        # Check for special love combinations
        combos = self.soulmate_indicators.get('card_combinations_for_love', {})
        special_combo = None
        for combo_type, combo_list in combos.items():
            for combo in combo_list:
                if set(combo.get('combo', [])).issubset(set(card_names)):
                    special_combo = {
                        'type': combo_type,
                        'cards': combo.get('combo'),
                        'meaning': combo.get('meaning'),
                        'korean': combo.get('korean')
                    }
                    break

        # Check relationship stage
        stages = self.soulmate_indicators.get('relationship_stage_indicators', {})
        current_stage = None
        for stage_name, stage_data in stages.items():
            if any(c in card_names for c in stage_data.get('cards', [])):
                current_stage = {
                    'stage': stage_name,
                    'korean': stage_data.get('korean', ''),
                    'description': stage_data.get('description', '')
                }
                break

        # Check red flags
        red_flags = []
        warning_cards = self.soulmate_indicators.get('red_flags', {}).get('warning_cards', [])
        for warning in warning_cards:
            if warning.get('card') in card_names:
                red_flags.append(warning)

        return {
            'connections': found_connections,
            'special_combination': special_combo,
            'relationship_stage': current_stage,
            'red_flags': red_flags
        }

    def get_love_timeline(self, cards: List[Dict]) -> Optional[Dict]:
        """Get timeline prediction for love based on cards"""
        if not self.soulmate_indicators:
            return None

        card_names = [c.get('name', '') for c in cards]
        timeline = self.soulmate_indicators.get('timeline_for_love', {})

        for timing, data in timeline.items():
            if any(c in card_names for c in data.get('cards', [])):
                return {
                    'timing': timing,
                    'korean': data.get('korean', ''),
                    'meaning': data.get('meaning', '')
                }
        return None

    # ===========================================
    # SHADOW WORK
    # ===========================================
    def get_shadow_work_prompt(self, card_name: str) -> Optional[Dict]:
        """Get shadow work prompt for a major arcana card"""
        if not self.shadow_work:
            return None

        shadows = self.shadow_work.get('major_arcana_shadows', {})
        return shadows.get(card_name)

    def get_shadow_spread(self, spread_name: str = 'meet_your_shadow') -> Optional[Dict]:
        """Get a shadow work spread configuration"""
        if not self.shadow_work:
            return None

        spreads = self.shadow_work.get('shadow_work_spreads', {})
        return spreads.get(spread_name)

    def get_integration_exercise(self, exercise_type: str = 'journal') -> Optional[Dict]:
        """Get shadow integration exercise"""
        if not self.shadow_work:
            return None

        exercises = self.shadow_work.get('integration_exercises', {})
        return exercises.get(exercise_type)

    # ===========================================
    # MOON PHASES
    # ===========================================
    def get_moon_phase_guidance(self, phase: str) -> Optional[Dict]:
        """Get guidance for a specific moon phase"""
        if not self.moon_phases:
            return None

        phases = self.moon_phases.get('moon_phases', {})
        return phases.get(phase)

    def get_current_moon_advice(self, phase: str, question_type: str = None) -> Dict:
        """Get advice based on current moon phase"""
        if not self.moon_phases:
            return {}

        phase_data = self.moon_phases.get('moon_phases', {}).get(phase, {})
        result = {
            'phase': phase,
            'korean': phase_data.get('korean', ''),
            'energy': phase_data.get('energy', ''),
            'best_questions': phase_data.get('best_questions', []),
            'reading_tip': phase_data.get('reading_tip', '')
        }

        if phase_data.get('warning'):
            result['warning'] = phase_data.get('warning')

        return result

    def get_moon_zodiac_guidance(self, zodiac: str) -> Optional[Dict]:
        """Get guidance when moon is in a specific zodiac sign"""
        if not self.moon_phases:
            return None

        zodiac_data = self.moon_phases.get('moon_in_zodiac', {})
        return zodiac_data.get(zodiac.lower())

    # ===========================================
    # SPIRIT ANIMALS
    # ===========================================
    def get_spirit_animal(self, card_name: str) -> Optional[Dict]:
        """Get spirit animal for a tarot card"""
        if not self.spirit_animals:
            return None

        # Check major arcana
        major = self.spirit_animals.get('major_arcana_animals', {})
        if card_name in major:
            return major[card_name]

        # Check court cards
        courts = self.spirit_animals.get('court_card_animals', {})
        for rank in ['pages', 'knights', 'queens', 'kings']:
            rank_data = courts.get(rank, {})
            animals = rank_data.get('animals', {})
            if card_name in animals:
                return {
                    'animal': animals[card_name],
                    'rank': rank,
                    'description': rank_data.get('description', '')
                }

        return None

    def analyze_spirit_animal_messages(self, cards: List[Dict]) -> Dict:
        """Analyze spirit animals in a reading"""
        if not self.spirit_animals:
            return {}

        suit_animals = self.spirit_animals.get('suit_animals', {})
        element_count = {'Fire': 0, 'Water': 0, 'Air': 0, 'Earth': 0}

        animals_found = []
        for card in cards:
            card_name = card.get('name', '')
            animal = self.get_spirit_animal(card_name)
            if animal:
                animals_found.append({
                    'card': card_name,
                    'animal': animal.get('animal') or animal.get('korean_animal', ''),
                    'message': animal.get('message', '')
                })

            # Count elements from suits
            for suit, data in suit_animals.items():
                if suit.capitalize() in card_name:
                    element = data.get('element', '')
                    if element in element_count:
                        element_count[element] += 1

        # Get element-based messages
        messages = self.spirit_animals.get('animal_messages_by_reading', {})
        dominant_element = max(element_count, key=element_count.get) if any(element_count.values()) else None
        element_message = None

        if dominant_element and element_count[dominant_element] >= 2:
            key = f"multiple_{dominant_element.lower()}_animals"
            if key in messages:
                element_message = messages[key]

        return {
            'animals_found': animals_found,
            'element_count': element_count,
            'dominant_element': dominant_element,
            'element_message': element_message
        }

    # ===========================================
    # CRISIS SUPPORT (위기/상실 상황 지원)
    # ===========================================
    def get_crisis_support(self, crisis_type: str, card_name: str) -> Optional[Dict]:
        """Get crisis support message for a specific card in crisis situation"""
        if not self.crisis_support:
            return None

        crisis_data = self.crisis_support.get('crisis_types', {}).get(crisis_type, {})
        supportive_cards = crisis_data.get('supportive_cards', {})

        if card_name in supportive_cards:
            return {
                'crisis_type': crisis_type,
                'crisis_name': crisis_data.get('name', ''),
                'card': card_name,
                'validation': supportive_cards[card_name].get('validation', ''),
                'hope': supportive_cards[card_name].get('hope', ''),
                'action': supportive_cards[card_name].get('action', ''),
                'recovery_message': crisis_data.get('recovery_message', '')
            }
        return None

    def get_crisis_recovery_cards(self, crisis_type: str) -> List[str]:
        """Get recovery cards for a crisis type"""
        if not self.crisis_support:
            return []

        crisis_data = self.crisis_support.get('crisis_types', {}).get(crisis_type, {})
        return crisis_data.get('recovery_cards', [])

    def detect_crisis_situation(self, cards: List[Dict], question: str = '') -> Optional[Dict]:
        """Detect if reading involves a crisis situation"""
        if not self.crisis_support:
            return None

        crisis_keywords = {
            'breakup': ['이별', '헤어', '결별', '끝났', '관계 끝'],
            'loss_grief': ['돌아가', '사별', '죽', '떠나', '상실'],
            'job_loss': ['해고', '실직', '퇴사', '잘렸', '그만두'],
            'health_crisis': ['암', '수술', '입원', '병원', '진단'],
            'financial_crisis': ['파산', '빚', '대출', '경제적'],
            'existential': ['의미 없', '살고 싶지', '포기', '무기력']
        }

        detected = None
        for crisis_type, keywords in crisis_keywords.items():
            for keyword in keywords:
                if keyword in question:
                    detected = crisis_type
                    break
            if detected:
                break

        if detected:
            crisis_data = self.crisis_support.get('crisis_types', {}).get(detected, {})
            return {
                'crisis_type': detected,
                'crisis_name': crisis_data.get('name', ''),
                'severity': crisis_data.get('severity', 'moderate'),
                'professional_help_needed': crisis_data.get('severity') == 'critical'
            }
        return None

    # ===========================================
    # DECISION FRAMEWORK (결정 도움)
    # ===========================================
    def get_decision_guidance(self, decision_type: str, cards: List[Dict]) -> Optional[Dict]:
        """Get guidance for decision-making based on cards"""
        if not self.decision_framework:
            return None

        decision_data = self.decision_framework.get('decision_types', {}).get(decision_type, {})
        if not decision_data:
            return None

        card_names = [c.get('name', '') for c in cards]

        # For stay_or_go decisions
        if decision_type == 'stay_or_go':
            key_cards = decision_data.get('key_cards', {})
            stay_score = sum(1 for c in card_names if c in key_cards.get('stay', {}).get('positive', []))
            go_score = sum(1 for c in card_names if c in key_cards.get('go', {}).get('positive', []))
            wait_score = sum(1 for c in card_names if c in key_cards.get('wait', {}).get('cards', []))

            if wait_score > 0:
                suggestion = 'wait'
                meaning = key_cards.get('wait', {}).get('meaning', '')
            elif go_score > stay_score:
                suggestion = 'go'
                meaning = key_cards.get('go', {}).get('meaning', '')
            elif stay_score > go_score:
                suggestion = 'stay'
                meaning = key_cards.get('stay', {}).get('meaning', '')
            else:
                suggestion = 'unclear'
                meaning = '카드가 명확한 방향을 제시하지 않습니다. 더 깊이 생각해보세요.'

            return {
                'decision_type': decision_type,
                'suggestion': suggestion,
                'meaning': meaning,
                'scores': {'stay': stay_score, 'go': go_score, 'wait': wait_score}
            }

        return {
            'decision_type': decision_type,
            'name': decision_data.get('name', ''),
            'description': decision_data.get('description', ''),
            'positions': decision_data.get('positions', {})
        }

    # ===========================================
    # SPREAD POSITIONS (스프레드 위치 정보)
    # ===========================================
    def get_spread_position_meaning(self, spread_name: str, position: int) -> Optional[Dict]:
        """Get meaning for a specific position in a spread"""
        if not self.spread_positions:
            return None

        spreads = self.spread_positions.get('spreads', {})
        spread = spreads.get(spread_name, {})
        positions = spread.get('positions', {})

        pos_data = positions.get(str(position), {})
        if pos_data:
            return {
                'spread': spread_name,
                'position': position,
                'name': pos_data.get('name', ''),
                'description': pos_data.get('description', '')
            }
        return None

    def get_spread_info(self, spread_name: str) -> Optional[Dict]:
        """Get full info about a spread"""
        if not self.spread_positions:
            return None

        spreads = self.spread_positions.get('spreads', {})
        spread = spreads.get(spread_name, {})

        if spread:
            return {
                'name': spread.get('name', spread_name),
                'total_positions': spread.get('total_positions', 0),
                'positions': spread.get('positions', {}),
                'reading_guide': spread.get('reading_guide', {})
            }
        return None

    # ===========================================
    # MULTIDIMENSIONAL MATRIX (심층 해석)
    # ===========================================
    def get_card_deep_meaning(self, card_name: str) -> Optional[Dict]:
        """Get deep psychological/archetypal meaning for a card"""
        if not self.multidimensional_matrix:
            return None

        # Convert card name to key format (e.g., "The Fool" -> "fool")
        key = card_name.lower().replace('the ', '').replace(' ', '_')

        journey = self.multidimensional_matrix.get('major_arcana_journey', {})
        if key in journey:
            data = journey[key]
            return {
                'card': card_name,
                'archetype': data.get('archetype', ''),
                'jung': data.get('jung', ''),
                'upright': data.get('upright', ''),
                'reversed': data.get('reversed', ''),
                'therapeutic_question': data.get('therapeutic_question', '')
            }
        return None

    # ===========================================
    # REVERSE INTERPRETATIONS (역방향 상세 해석)
    # ===========================================
    def get_detailed_reverse_interpretation(self, card_id: str, theme: str = None) -> Optional[Dict]:
        """Get detailed reverse interpretation for a card"""
        if not self.reverse_interpretations:
            return None

        cards = self.reverse_interpretations.get('cards', {})
        card_data = cards.get(card_id, {})

        if not card_data:
            return None

        result = {
            'card_id': card_id,
            'name': card_data.get('name', ''),
            'core': card_data.get('reverse_meaning', {}).get('core', ''),
            'blocked_energy': card_data.get('reverse_meaning', {}).get('blocked_energy', ''),
            'shadow_aspect': card_data.get('reverse_meaning', {}).get('shadow_aspect', ''),
            'lesson': card_data.get('reverse_meaning', {}).get('lesson', ''),
            'advice': card_data.get('advice', ''),
            'action_items': card_data.get('action_items', [])
        }

        # Add theme-specific interpretation if requested
        if theme:
            interpretations = card_data.get('interpretations', {})
            if theme in interpretations:
                result['theme_interpretation'] = interpretations[theme]
        else:
            result['interpretations'] = card_data.get('interpretations', {})

        return result

    # ===========================================
    # CARD PAIR COMBINATIONS (카드 쌍 해석)
    # ===========================================
    def get_all_card_pair_interpretations(self, cards: List[Dict]) -> List[Dict]:
        """Get interpretations for all card pairs in a reading"""
        if not self.card_pair_combinations or len(cards) < 2:
            return []

        results = []
        card_names = [c.get('name', '') for c in cards]

        # Check all pairs
        for i in range(len(card_names)):
            for j in range(i + 1, len(card_names)):
                pair = self.find_card_pair_interpretation(card_names[i], card_names[j])
                if pair:
                    results.append(pair)

        return results


# ===============================================================
# SPREAD LOADER
# ===============================================================
class SpreadLoader:
    """Load and manage tarot spread configurations"""

    def __init__(self, spreads_dir: str = None):
        if spreads_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            spreads_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot", "spreads")

        self.spreads_dir = spreads_dir
        self.spreads = {}  # theme -> {sub_topics, narrative_templates}
        self._load_all_spreads()

    def _load_all_spreads(self):
        """Load all spread JSON files"""
        if not os.path.exists(self.spreads_dir):
            print(f"[SpreadLoader] Spreads directory not found: {self.spreads_dir}")
            return

        for filename in os.listdir(self.spreads_dir):
            if not filename.endswith('.json'):
                continue

            theme_name = filename.replace('_spreads.json', '')
            path = os.path.join(self.spreads_dir, filename)

            try:
                with open(path, encoding='utf-8') as f:
                    data = json.load(f)
                    self.spreads[theme_name] = data
                    print(f"[SpreadLoader] Loaded {theme_name}: {len(data.get('sub_topics', {}))} sub-topics")
            except Exception as e:
                print(f"[SpreadLoader] Failed to load {filename}: {e}")

        print(f"[SpreadLoader] Total themes: {len(self.spreads)}")

    def get_spread(self, theme: str, sub_topic: str) -> Optional[Dict]:
        """Get specific spread configuration"""
        if theme not in self.spreads:
            return None

        sub_topics = self.spreads[theme].get('sub_topics', {})
        return sub_topics.get(sub_topic)

    def get_sub_topics(self, theme: str) -> List[Dict]:
        """Get all sub-topics for a theme"""
        if theme not in self.spreads:
            return []

        sub_topics = self.spreads[theme].get('sub_topics', {})
        return [
            {
                'id': st_id,
                'title': st_data.get('title', st_id),
                'korean': st_data.get('korean', ''),
                'description': st_data.get('description', ''),
                'card_count': st_data.get('card_count', 3)
            }
            for st_id, st_data in sub_topics.items()
        ]

    def get_available_themes(self) -> List[str]:
        """Get list of available themes"""
        return list(self.spreads.keys())


# ===============================================================
# GPT PROMPT BUILDER
# ===============================================================
class TarotPromptBuilder:
    """Build prompts for GPT based on spread and cards"""

    SYSTEM_PROMPT = """당신은 편하게 이야기하는 타로 리더이자 심리 상담가예요. 친구한테 얘기하듯이 자연스럽게 해석해주세요.

스타일:
- "~해요", "~네요", "~것 같아요" 같은 편한 말투 사용
- "에너지", "우주", "통찰", "지혜" 같은 뻔한 표현 쓰지 말기
- 실제로 도움 되는 구체적인 얘기 해주기
- 역방향 카드도 무섭게 말고 그냥 "좀 막혀있다" 정도로
- 뜬구름 잡는 소리 말고 현실적인 조언

심리학적 깊이:
- 카드의 원형(archetype) 의미를 자연스럽게 녹여내기
- 그림자 작업, 페르소나, 아니마/아니무스 등 융 심리학 개념을 쉽게 풀어서 설명
- 제공된 심리학적 질문을 통해 자기 성찰 유도
- 융 인용구가 있으면 해석에 자연스럽게 연결

하지 말아야 할 것:
- "당신의 내면", "영혼이 이끄는", "신비로운" 같은 표현
- 너무 장황하게 늘어놓기
- 억지로 희망적인 척 하기
- 심리학 용어를 딱딱하게 나열하기

해야 할 것:
- 카드 이름이랑 자리 먼저 말하기
- 카드마다 3-4문장으로 요점만
- 카드들 연결해서 전체 흐름 설명
- 심리학적 통찰을 한두 문장으로 자연스럽게
- 마지막에 "그래서 어떻게 하면 좋을지" 정리 + 성찰 질문 하나"""

    @staticmethod
    def build_reading_prompt(
        spread: Dict,
        drawn_cards: List[Dict],
        question: str = "",
        tarot_rag: TarotRAG = None,
        advanced_rules: 'AdvancedRulesLoader' = None
    ) -> str:
        """Build prompt for a complete tarot reading with advanced features"""

        spread_name = spread.get('spread_name', 'Tarot Reading')
        topic_title = spread.get('korean', spread.get('title', ''))
        positions = spread.get('positions', [])

        # Collect card names for combination checking
        card_names = [c.get('name', '') for c in drawn_cards]

        # Build advanced context
        advanced_context = ""
        if advanced_rules:
            # Check for special combinations
            combination = advanced_rules.find_card_combination(card_names)
            if combination:
                advanced_context += f"""
## 특별한 카드 조합 발견!
- 조합: {', '.join(combination.get('cards', []))}
- 카테고리: {combination.get('category', '')}
- 의미: {combination.get('korean', combination.get('meaning', ''))}
{f"- 조언: {combination.get('advice')}" if combination.get('advice') else ''}
"""

            # Analyze elemental balance
            elemental = advanced_rules.analyze_elemental_balance(drawn_cards)
            if elemental:
                element_korean = {'fire': '불', 'water': '물', 'air': '공기', 'earth': '땅'}
                counts = elemental.get('element_count', {})
                dominant = elemental.get('dominant')
                missing = elemental.get('missing', [])

                advanced_context += f"""
## 원소 분석
- 원소 분포: {', '.join([f"{element_korean.get(e, e)} {c}장" for e, c in counts.items() if c > 0])}
"""
                if dominant and counts.get(dominant, 0) >= 3:
                    advanced_context += f"- 지배적 원소: {element_korean.get(dominant, dominant)} - {elemental.get('dominant_meaning', '')}\n"
                    if elemental.get('dominant_advice'):
                        advanced_context += f"- 원소 조언: {elemental.get('dominant_advice')}\n"

                if missing:
                    missing_korean = [element_korean.get(m, m) for m in missing]
                    advanced_context += f"- 부족한 원소: {', '.join(missing_korean)}\n"
                    for mm in elemental.get('missing_meanings', []):
                        advanced_context += f"  → {mm.get('meaning', '')}\n"

        # Build card context
        card_context = []
        for i, card_info in enumerate(drawn_cards):
            if i >= len(positions):
                break

            pos = positions[i]
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)
            orientation = "역방향" if is_reversed else "정방향"

            # Get card meaning from RAG
            card_meaning = ""
            if tarot_rag:
                card_data = tarot_rag.search_for_card(
                    card_name,
                    'reversed' if is_reversed else 'upright'
                )
                if card_data:
                    keywords = card_data.get('keywords', [])[:5]
                    meaning = card_data.get('meaning', '')
                    advice = card_data.get('advice', '')
                    suit = card_data.get('suit', 'major')
                    suit_info = SUIT_MEANINGS.get(suit, {})

                    card_meaning = f"""
    - 키워드: {', '.join(keywords)}
    - 기본 의미: {meaning}
    - 조언: {advice}
    - 원소: {suit_info.get('element', '')} ({suit_info.get('korean', '')})"""

            # Get court card profile if applicable
            court_profile = ""
            if advanced_rules:
                profile = advanced_rules.get_court_card_profile(card_name)
                if profile:
                    personality = profile.get('personality', {})
                    in_love = profile.get('in_love', {})
                    in_career = profile.get('in_career', {})
                    court_profile = f"""
    - [궁정 카드 프로필]
    - 성격: {personality.get('description', '')}
    - 강점: {', '.join(personality.get('strengths', [])[:3])}
    - 연애에서: {in_love.get('message', '')}
    - 커리어에서: {in_career.get('message', '')}"""

                # Get timing hint
                timing = advanced_rules.get_timing_hint(card_name)
                if timing:
                    card_meaning += f"\n    - 타이밍: {timing}"

            # Get Jung psychological depth (archetype, therapeutic question)
            jung_depth = ""
            if advanced_rules:
                deep_meaning = advanced_rules.get_card_deep_meaning(card_name)
                if deep_meaning:
                    archetype = deep_meaning.get('archetype', '')
                    jung_insight = deep_meaning.get('jung', '')
                    therapeutic_q = deep_meaning.get('therapeutic_question', '')
                    if archetype or jung_insight:
                        jung_depth = f"""
    - [심리학적 깊이]
    - 원형: {archetype}
    - 융 심리학: {jung_insight}
    - 성찰 질문: {therapeutic_q}"""

            card_context.append(f"""
[카드 {i+1}] {pos['name']}
- 포지션 의미: {pos['meaning']}
- 해석 힌트: {pos.get('prompt_hint', '')}
- 뽑힌 카드: {card_name} ({orientation})
{card_meaning}{court_profile}{jung_depth}
""")

        prompt = f"""
# 타로 리딩 요청

## 스프레드: {spread_name}
## 주제: {topic_title}
{f'## 질문: {question}' if question else ''}
{advanced_context}
## 뽑힌 카드들:
{''.join(card_context)}

## 요청사항:
1. 카드 이름이랑 포지션 먼저 말하기
2. 카드마다 핵심만 3-4문장으로
3. 카드들 연결해서 전체 흐름 설명
4. 특별한 조합 있으면 짚어주기
5. 심리학적 깊이가 있으면 자연스럽게 녹여서 설명 (딱딱하게 X)
6. "그래서 어떻게 하면 좋을지" 정리
7. 마지막에 성찰 질문 하나 던지기 (제공된 질문 중 선택하거나 변형)

편하게 친구한테 얘기하듯이, 하지만 깊이 있게 해주세요.
"""
        return prompt

    @staticmethod
    def build_single_card_prompt(
        card_name: str,
        is_reversed: bool,
        position_name: str,
        position_meaning: str,
        context: str = ""
    ) -> str:
        """Build prompt for single card interpretation"""

        orientation = "역방향" if is_reversed else "정방향"

        return f"""
카드: {card_name} ({orientation})
포지션: {position_name} - {position_meaning}
{f'맥락: {context}' if context else ''}

이 카드 해석해줘. 3-4문장으로 핵심만, 그래서 뭘 하면 좋을지도 알려줘.
"""


# ===============================================================
# TAROT HYBRID RAG
# ===============================================================
class TarotHybridRAG:
    """
    Premium Tarot Reading System
    - Combines structured data with OpenAI GPT
    - Supports streaming for real-time delivery
    - YouTube-level depth and narrative
    - Advanced rules: combinations, timing, court cards, elemental dignities
    """

    def __init__(self, api_key: str = None):
        # Initialize OpenAI
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = None
        self.model_name = "gpt-4o-mini"  # Cost-effective, fast

        if OPENAI_AVAILABLE and self.api_key:
            try:
                import httpx
                self.client = OpenAI(
                    api_key=self.api_key,
                    timeout=httpx.Timeout(60.0, connect=10.0)
                )
                print(f"[TarotHybridRAG] OpenAI client initialized (model: {self.model_name})")
            except Exception as e:
                print(f"[TarotHybridRAG] Failed to initialize OpenAI: {e}")
        elif not OPENAI_AVAILABLE:
            print("[TarotHybridRAG] openai not installed")
        else:
            print("[TarotHybridRAG] No OpenAI API key provided")

        # Initialize components
        self.tarot_rag = get_tarot_rag()
        self.spread_loader = SpreadLoader()
        self.prompt_builder = TarotPromptBuilder()
        self.advanced_rules = AdvancedRulesLoader()
        self.advanced_embeddings = get_tarot_advanced_embeddings()
        self.pattern_engine = get_pattern_engine()
        self.premium_engine = get_premium_engine()
        print("[TarotHybridRAG] Pattern engine initialized (Basic + Premium)")

    def search_advanced_rules(self, query: str, top_k: int = 5, category: str = None) -> List[Dict]:
        """
        Semantic search across all advanced tarot rules

        Args:
            query: Search query (e.g., "소울메이트 트윈플레임", "보름달 리딩 타이밍")
            top_k: Number of results to return
            category: Optional filter (combinations, timing, soulmate, moon, chakra, etc.)

        Returns:
            List of matching entries with relevance scores
        """
        return self.advanced_embeddings.search(query, top_k=top_k, category=category)

    def get_card_insights(self, card_name: str) -> Dict:
        """
        Get comprehensive insights for a specific card from all advanced rules

        Args:
            card_name: Name of the tarot card (e.g., "The Lovers", "Ten of Cups")

        Returns:
            Dictionary with all relevant insights (astrology, chakra, spirit animal, etc.)
        """
        insights = {}

        # From AdvancedRulesLoader (direct lookup)
        insights['astrology'] = self.advanced_rules.get_card_astrology(card_name)
        insights['chakras'] = self.advanced_rules.get_card_chakras(card_name)
        insights['spirit_animal'] = self.advanced_rules.get_spirit_animal(card_name)
        insights['shadow_work'] = self.advanced_rules.get_shadow_work_prompt(card_name)
        insights['lucky_items'] = self.advanced_rules.get_card_lucky_items(card_name)
        insights['meditation'] = self.advanced_rules.get_meditation_for_card(card_name)
        insights['timing'] = self.advanced_rules.get_timing_hint(card_name)
        insights['court_profile'] = self.advanced_rules.get_court_card_profile(card_name)
        insights['reversed_special'] = self.advanced_rules.get_reversed_special_meaning(card_name)

        # 새로 추가된 데이터
        insights['deep_meaning'] = self.advanced_rules.get_card_deep_meaning(card_name)

        # From semantic search (related entries)
        related = self.advanced_embeddings.search_by_card(card_name, top_k=5)
        insights['related_entries'] = related

        # Filter out None values
        return {k: v for k, v in insights.items() if v}

    def get_available_themes(self) -> List[str]:
        """Get available themes with spreads"""
        return self.spread_loader.get_available_themes()

    def get_sub_topics(self, theme: str) -> List[Dict]:
        """Get sub-topics for a theme"""
        return self.spread_loader.get_sub_topics(theme)

    def get_spread_info(self, theme: str, sub_topic: str) -> Optional[Dict]:
        """Get spread information"""
        return self.spread_loader.get_spread(theme, sub_topic)

    def generate_reading(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = "",
        stream: bool = False
    ) -> Any:
        """
        Generate a complete tarot reading

        Args:
            theme: Theme (love, career, etc.)
            sub_topic: Sub-topic (crush, job_search, etc.)
            drawn_cards: List of {name, isReversed} dicts
            question: Optional user question
            stream: Whether to stream the response

        Returns:
            Generated reading text or stream generator
        """
        # Get spread configuration
        spread = self.spread_loader.get_spread(theme, sub_topic)
        if not spread:
            return f"스프레드를 찾을 수 없습니다: {theme}/{sub_topic}"

        # Build prompt with advanced rules
        prompt = self.prompt_builder.build_reading_prompt(
            spread=spread,
            drawn_cards=drawn_cards,
            question=question,
            tarot_rag=self.tarot_rag,
            advanced_rules=self.advanced_rules
        )

        if not self.client:
            return "OpenAI API가 설정되지 않았습니다."

        # Generate with GPT
        try:
            if stream:
                return self._stream_response(prompt)
            else:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": TarotPromptBuilder.SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.8,
                    top_p=0.95,
                    max_tokens=4096,
                )
                return response.choices[0].message.content

        except Exception as e:
            return f"리딩 생성 중 오류 발생: {str(e)}"

    def _stream_response(self, prompt: str) -> Generator[str, None, None]:
        """Stream response from GPT"""
        if not OPENAI_AVAILABLE or not self.client:
            yield "OpenAI API가 설정되지 않았습니다."
            return

        try:
            stream = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": TarotPromptBuilder.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                top_p=0.95,
                max_tokens=4096,
                stream=True
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            yield f"스트리밍 오류: {str(e)}"

    def generate_quick_reading(
        self,
        card_name: str,
        is_reversed: bool = False,
        context: str = ""
    ) -> str:
        """Generate quick single card reading"""

        if not self.client:
            # Fallback to RAG only
            card_data = self.tarot_rag.search_for_card(
                card_name,
                'reversed' if is_reversed else 'upright'
            )
            if card_data:
                return f"""
{card_name} {'(역방향)' if is_reversed else '(정방향)'}

키워드: {', '.join(card_data.get('keywords', []))}

의미: {card_data.get('meaning', '')}

조언: {card_data.get('advice', '')}
"""
            return "카드 정보를 찾을 수 없습니다."

        prompt = f"""
단일 카드 리딩:

카드: {card_name} {'(역방향)' if is_reversed else '(정방향)'}
{f'상황: {context}' if context else ''}

이 카드에 대해 간단하지만 통찰력 있는 해석을 제공해주세요.
- 카드의 핵심 메시지
- 현재 상황에 대한 조언
- 행동 제안

3-4문장으로 친근하게 해석해주세요.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"오류: {str(e)}"

    def build_reading_context(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = ""
    ) -> str:
        """
        Build RAG context string for LLM prompt (used by GPT-4)

        Args:
            theme: Theme (love, career, etc.)
            sub_topic: Sub-topic (crush, job_search, etc.)
            drawn_cards: List of {name, isReversed} dicts
            question: Optional user question

        Returns:
            Formatted string with all relevant card meanings, rules, and insights
        """
        context_parts = []

        # Get spread configuration
        spread = self.spread_loader.get_spread(theme, sub_topic)
        if spread:
            context_parts.append(f"[스프레드: {spread.get('spread_name', '')}]")
            context_parts.append(f"주제: {spread.get('korean', spread.get('title', ''))}")
            positions = spread.get('positions', [])
        else:
            positions = []

        # Card meanings and positions
        context_parts.append("\n## 카드별 해석:")
        for i, card_info in enumerate(drawn_cards):
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)
            orientation = "역방향" if is_reversed else "정방향"

            # Position info
            pos_name = positions[i].get('name', f'위치 {i+1}') if i < len(positions) else f'카드 {i+1}'
            pos_meaning = positions[i].get('meaning', '') if i < len(positions) else ''

            context_parts.append(f"\n### {pos_name}: {card_name} ({orientation})")
            if pos_meaning:
                context_parts.append(f"- 포지션 의미: {pos_meaning}")

            # Get card data from RAG
            card_data = self.tarot_rag.search_for_card(
                card_name,
                'reversed' if is_reversed else 'upright'
            )
            if card_data:
                keywords = card_data.get('keywords', [])[:5]
                meaning = card_data.get('meaning', '')
                advice = card_data.get('advice', '')
                context_parts.append(f"- 키워드: {', '.join(keywords)}")
                context_parts.append(f"- 의미: {meaning}")
                context_parts.append(f"- 조언: {advice}")

            # Court card profile
            profile = self.advanced_rules.get_court_card_profile(card_name)
            if profile:
                personality = profile.get('personality', {})
                context_parts.append(f"- 성격: {personality.get('description', '')}")

            # Timing hint
            timing = self.advanced_rules.get_timing_hint(card_name)
            if timing:
                context_parts.append(f"- 타이밍: {timing}")

            # Get insights from advanced embeddings
            insights = self.get_card_insights(card_name)
            if insights.get('astrology'):
                astro = insights['astrology']
                if astro.get('zodiac'):
                    context_parts.append(f"- 점성술: {astro.get('korean_zodiac', astro.get('zodiac', ''))}")
            if insights.get('chakras'):
                chakras = insights['chakras']
                if chakras:
                    chakra_names = [c.get('korean', c.get('name', '')) for c in chakras[:2]]
                    context_parts.append(f"- 차크라: {', '.join(chakra_names)}")

        # Check for special combinations
        card_names = [c.get('name', '') for c in drawn_cards]
        combination = self.advanced_rules.find_card_combination(card_names)
        if combination:
            context_parts.append("\n## 특별 카드 조합:")
            context_parts.append(f"- 조합: {', '.join(combination.get('cards', []))}")
            context_parts.append(f"- 의미: {combination.get('korean', combination.get('meaning', ''))}")
            if combination.get('advice'):
                context_parts.append(f"- 조언: {combination.get('advice')}")

        # Elemental balance
        elemental = self.advanced_rules.analyze_elemental_balance(drawn_cards)
        if elemental:
            element_korean = {'fire': '불', 'water': '물', 'air': '공기', 'earth': '땅'}
            counts = elemental.get('element_count', {})
            active_elements = [f"{element_korean.get(e, e)}: {c}" for e, c in counts.items() if c > 0]
            if active_elements:
                context_parts.append(f"\n## 원소 균형: {', '.join(active_elements)}")
                if elemental.get('dominant_meaning'):
                    context_parts.append(f"- {elemental.get('dominant_meaning')}")

        # Pattern Engine Analysis (규칙 기반 동적 분석)
        pattern = self.pattern_engine.analyze(drawn_cards)
        if pattern:
            context_parts.append("\n## 패턴 분석:")

            # 숫자 패턴
            if pattern.get('number_analysis', {}).get('repeated'):
                for rep in pattern['number_analysis']['repeated']:
                    context_parts.append(f"- 숫자 {rep['number']} 반복: {rep['korean']}")

            # 시퀀스
            if pattern.get('number_analysis', {}).get('sequences'):
                for seq in pattern['number_analysis']['sequences']:
                    context_parts.append(f"- 숫자 시퀀스 {seq['numbers']}: {seq['meaning']}")

            # 메이저 아르카나 비율
            arcana = pattern.get('arcana_analysis', {})
            if arcana.get('significance') in ['highly_karmic', 'significant']:
                context_parts.append(f"- 메이저 아르카나 {arcana.get('major_ratio')}%: {arcana.get('messages', [''])[0]}")

            # 극성 쌍
            if pattern.get('polarity_analysis', {}).get('pairs_found'):
                for pair in pattern['polarity_analysis']['pairs_found']:
                    context_parts.append(f"- 극성 쌍: {pair['cards'][0]} + {pair['cards'][1]} = {pair['meaning']}")

            # 에너지 흐름
            energy = pattern.get('energy_flow', {})
            if energy.get('messages'):
                context_parts.append(f"- 에너지 흐름: {energy['messages'][0]}")

            # 변환 시퀀스
            if pattern.get('transformation', {}).get('sequences_found'):
                for seq in pattern['transformation']['sequences_found']:
                    context_parts.append(f"- {seq['korean']}: {seq['meaning']}")

            # 종합
            synthesis = pattern.get('synthesis', {})
            if synthesis.get('summary'):
                context_parts.append(f"\n## 종합: {synthesis['summary']}")

        # 카드 쌍 해석 (CSV 데이터)
        card_pairs = self.advanced_rules.get_all_card_pair_interpretations(drawn_cards)
        if card_pairs:
            context_parts.append("\n## 카드 쌍 해석:")
            for pair in card_pairs[:3]:  # 최대 3개
                context_parts.append(f"- {pair.get('card1')} + {pair.get('card2')}")
                if theme == 'love' and pair.get('love'):
                    context_parts.append(f"  연애: {pair.get('love')}")
                elif theme == 'career' and pair.get('career'):
                    context_parts.append(f"  커리어: {pair.get('career')}")
                elif theme == 'wealth' and pair.get('finance'):
                    context_parts.append(f"  재정: {pair.get('finance')}")
                if pair.get('advice'):
                    context_parts.append(f"  조언: {pair.get('advice')}")

        # 위기 상황 감지
        if question:
            crisis = self.advanced_rules.detect_crisis_situation(drawn_cards, question)
            if crisis:
                context_parts.append("\n## ⚠️ 감지된 상황:")
                context_parts.append(f"- 유형: {crisis.get('crisis_name', '')}")
                context_parts.append(f"- 심각도: {crisis.get('severity', 'moderate')}")
                if crisis.get('professional_help_needed'):
                    context_parts.append("- 전문 상담 권유 필요")

                # 해당 위기 상황에 맞는 카드 해석 추가
                for card_info in drawn_cards:
                    card_name = card_info.get('name', '')
                    crisis_support = self.advanced_rules.get_crisis_support(
                        crisis.get('crisis_type', ''), card_name
                    )
                    if crisis_support:
                        context_parts.append(f"\n[{card_name} 위기 지원]")
                        context_parts.append(f"- 공감: {crisis_support.get('validation', '')}")
                        context_parts.append(f"- 희망: {crisis_support.get('hope', '')}")
                        context_parts.append(f"- 행동: {crisis_support.get('action', '')}")

        # 역방향 카드 상세 해석
        for card_info in drawn_cards:
            if card_info.get('isReversed'):
                card_name = card_info.get('name', '')
                # card_id 변환 (예: "The Fool" -> "MAJOR_0")
                card_id = None
                if 'major' in card_name.lower() or card_name.startswith('The '):
                    major_names = ['Fool', 'Magician', 'High Priestess', 'Empress', 'Emperor',
                                   'Hierophant', 'Lovers', 'Chariot', 'Strength', 'Hermit',
                                   'Wheel of Fortune', 'Justice', 'Hanged Man', 'Death',
                                   'Temperance', 'Devil', 'Tower', 'Star', 'Moon', 'Sun',
                                   'Judgement', 'World']
                    for idx, name in enumerate(major_names):
                        if name in card_name:
                            card_id = f"MAJOR_{idx}"
                            break

                if card_id:
                    reverse_detail = self.advanced_rules.get_detailed_reverse_interpretation(
                        card_id, theme
                    )
                    if reverse_detail and reverse_detail.get('core'):
                        context_parts.append(f"\n[{card_name} 역방향 상세]")
                        context_parts.append(f"- 핵심: {reverse_detail.get('core', '')}")
                        context_parts.append(f"- 막힌 에너지: {reverse_detail.get('blocked_energy', '')}")
                        if reverse_detail.get('theme_interpretation'):
                            context_parts.append(f"- {theme}: {reverse_detail.get('theme_interpretation', '')}")

        # Semantic search for additional context
        if question:
            related = self.advanced_embeddings.search(question, top_k=3)
            if related:
                context_parts.append("\n## 관련 지식:")
                for entry in related:
                    context_parts.append(f"- {entry.get('text', '')[:200]}")

        return "\n".join(context_parts)

    def get_reading_context(self, theme: str, sub_topic: str, drawn_cards: List[Dict]) -> Dict:
        """Get structured context for a reading (useful for frontend)"""

        spread = self.spread_loader.get_spread(theme, sub_topic)
        if not spread:
            return {}

        positions = spread.get('positions', [])
        card_interpretations = []

        for i, card_info in enumerate(drawn_cards):
            if i >= len(positions):
                break

            pos = positions[i]
            card_name = card_info.get('name', '')
            is_reversed = card_info.get('isReversed', False)

            # Get base card data
            card_data = self.tarot_rag.search_for_card(
                card_name,
                'reversed' if is_reversed else 'upright'
            )

            # Get court card profile if applicable
            court_profile = self.advanced_rules.get_court_card_profile(card_name)

            # Get timing hint
            timing = self.advanced_rules.get_timing_hint(card_name)

            card_interpretations.append({
                'position': i + 1,
                'position_name': pos.get('name', ''),
                'position_meaning': pos.get('meaning', ''),
                'card_name': card_name,
                'is_reversed': is_reversed,
                'keywords': card_data.get('keywords', []) if card_data else [],
                'meaning': card_data.get('meaning', '') if card_data else '',
                'advice': card_data.get('advice', '') if card_data else '',
                'suit': card_data.get('suit', 'major') if card_data else 'major',
                'court_profile': court_profile,
                'timing': timing
            })

        # Get advanced analysis
        card_names = [c.get('name', '') for c in drawn_cards]
        combination = self.advanced_rules.find_card_combination(card_names)
        elemental = self.advanced_rules.analyze_elemental_balance(drawn_cards)

        return {
            'theme': theme,
            'sub_topic': sub_topic,
            'spread_name': spread.get('spread_name', ''),
            'topic_title': spread.get('korean', spread.get('title', '')),
            'card_count': spread.get('card_count', len(positions)),
            'card_interpretations': card_interpretations,
            'special_combination': combination,
            'elemental_analysis': elemental
        }

    def get_advanced_analysis(self, drawn_cards: List[Dict]) -> Dict:
        """Get advanced analysis for cards (combinations, elements, timing, patterns)"""

        card_names = [c.get('name', '') for c in drawn_cards]

        # Card combination check
        combination = self.advanced_rules.find_card_combination(card_names)

        # Elemental balance
        elemental = self.advanced_rules.analyze_elemental_balance(drawn_cards)

        # Court card profiles
        court_profiles = {}
        for card in drawn_cards:
            card_name = card.get('name', '')
            profile = self.advanced_rules.get_court_card_profile(card_name)
            if profile:
                court_profiles[card_name] = profile

        # Timing hints
        timing_hints = {}
        for card in drawn_cards:
            card_name = card.get('name', '')
            timing = self.advanced_rules.get_timing_hint(card_name)
            if timing:
                timing_hints[card_name] = timing

        # Pattern Engine Analysis (규칙 기반 동적 분석)
        pattern_analysis = self.pattern_engine.analyze(drawn_cards)

        return {
            'special_combination': combination,
            'elemental_analysis': elemental,
            'court_profiles': court_profiles,
            'timing_hints': timing_hints,
            'pattern_analysis': pattern_analysis,
        }

    def get_pattern_analysis(self, drawn_cards: List[Dict]) -> Dict:
        """
        Get comprehensive pattern analysis for any number of cards.
        Works with 1 card to 78 cards, any deck.

        Args:
            drawn_cards: List of {'name': str, 'isReversed': bool}

        Returns:
            Complete pattern analysis including:
            - suit_analysis: 슈트 분포 및 지배적 슈트
            - number_analysis: 숫자 패턴 (반복, 시퀀스, 수비학)
            - arcana_analysis: 메이저/마이너 비율
            - court_analysis: 궁정 카드 패턴
            - polarity_analysis: 극성/대칭 쌍
            - energy_flow: 에너지 흐름 패턴
            - element_interaction: 원소 간 상호작용
            - transformation: 변환 시퀀스
            - reversal_analysis: 역방향 패턴
            - synthesis: 종합 메시지
        """
        return self.pattern_engine.analyze(drawn_cards)

    # =========================================================================
    # PREMIUM FEATURES (Tier 4-6)
    # =========================================================================

    def get_premium_analysis(
        self,
        drawn_cards: List[Dict],
        birthdate: str = None,
        theme: str = None,
        moon_phase: str = None,
        include_narrative: bool = True
    ) -> Dict:
        """
        Get comprehensive premium analysis with personalization, multi-layer interpretation,
        and storytelling.

        Args:
            drawn_cards: List of {'name': str, 'isReversed': bool}
            birthdate: User's birthdate 'YYYY-MM-DD' for personalization
            theme: Analysis theme (love, career, money, health, spiritual)
            moon_phase: Current moon phase for realtime context
            include_narrative: Whether to include storytelling elements

        Returns:
            Premium analysis including:
            - base_analysis: Tier 1-3 pattern analysis
            - theme_analysis: Theme-specific scores
            - realtime_context: Current date/moon energy
            - personalization: Birth card, year card connections
            - multi_layer: Surface/psychological/shadow/spiritual/action layers
            - narrative: Story arc, opening hook, climax, resolution
            - card_connections: Narrative connections between cards
            - premium_summary: Unified summary with highlights
        """
        return self.premium_engine.analyze_premium(
            cards=drawn_cards,
            birthdate=birthdate,
            theme=theme,
            moon_phase=moon_phase,
            include_narrative=include_narrative
        )

    def get_birth_card(self, birthdate: str) -> Dict:
        """
        Calculate user's tarot birth card (Life Path Card).

        Args:
            birthdate: 'YYYY-MM-DD' or 'YYYYMMDD' format

        Returns:
            Birth card info with primary/secondary cards and traits
        """
        return self.premium_engine.calculate_birth_card(birthdate)

    def get_year_card(self, birthdate: str, target_year: int = None) -> Dict:
        """
        Calculate user's personal year card.

        Args:
            birthdate: User's birthdate
            target_year: Year to calculate for (default: current year)

        Returns:
            Year card info with theme and advice
        """
        return self.premium_engine.calculate_year_card(birthdate, target_year)

    def get_personalized_reading(self, drawn_cards: List[Dict], birthdate: str) -> Dict:
        """
        Get personalized reading with birth/year card connections.

        Args:
            drawn_cards: Cards in the reading
            birthdate: User's birthdate

        Returns:
            Personalization data including card connections
        """
        return self.premium_engine.personalize_reading(drawn_cards, birthdate)

    def get_multi_layer_interpretation(self, card_name: str, is_reversed: bool = False) -> Dict:
        """
        Get multi-layer interpretation for a single card.

        Args:
            card_name: Card name (e.g., "The Fool", "Two of Cups")
            is_reversed: Whether the card is reversed

        Returns:
            5 layers: surface, psychological, shadow, spiritual, action
        """
        return self.premium_engine.get_multi_layer_interpretation(
            card_name,
            {'is_reversed': is_reversed}
        )

    def get_reading_narrative(self, drawn_cards: List[Dict], theme: str = None) -> Dict:
        """
        Build narrative arc for the reading.

        Args:
            drawn_cards: Cards in the reading
            theme: Optional theme context

        Returns:
            Narrative structure with opening, climax, resolution, transitions
        """
        return self.premium_engine.build_narrative_arc(drawn_cards, {'theme': theme})

    def get_card_connections(self, drawn_cards: List[Dict]) -> List[str]:
        """
        Get narrative connections between consecutive cards.

        Args:
            drawn_cards: Cards in the reading

        Returns:
            List of connection descriptions
        """
        return self.premium_engine.weave_card_connections(drawn_cards)

    def build_premium_reading_context(
        self,
        theme: str,
        sub_topic: str,
        drawn_cards: List[Dict],
        question: str = None,
        birthdate: str = None,
        moon_phase: str = None
    ) -> str:
        """
        Build enhanced reading context with premium features for LLM prompt.

        Args:
            theme: Reading theme
            sub_topic: Specific sub-topic/spread
            drawn_cards: Cards drawn
            question: User's question
            birthdate: User's birthdate for personalization
            moon_phase: Current moon phase

        Returns:
            Rich context string for LLM interpretation
        """
        # Start with base context
        context_parts = []

        # Basic reading context
        base_context = self.build_reading_context(theme, sub_topic, drawn_cards, question)
        context_parts.append(base_context)

        # Premium additions
        premium = self.get_premium_analysis(
            drawn_cards,
            birthdate=birthdate,
            theme=theme,
            moon_phase=moon_phase,
            include_narrative=True
        )

        # Personalization (if birthdate provided)
        if birthdate and premium.get('personalization'):
            pers = premium['personalization']
            if pers.get('birth_card'):
                bc = pers['birth_card']
                context_parts.append(f"\n## 개인화 정보")
                context_parts.append(f"- 탄생 카드: {bc.get('korean')} ({bc.get('primary_card')})")
                context_parts.append(f"- 핵심 특성: {', '.join(bc.get('traits', []))}")

            if pers.get('year_card'):
                yc = pers['year_card']
                context_parts.append(f"- 올해 테마: {yc.get('korean')}")

            if pers.get('personal_connections'):
                for conn in pers['personal_connections']:
                    context_parts.append(f"- 🎯 {conn['message']}")

        # Narrative elements
        if premium.get('narrative'):
            narr = premium['narrative']
            context_parts.append(f"\n## 스토리 구조")
            if narr.get('opening_hook'):
                context_parts.append(f"[오프닝] {narr['opening_hook']}")
            if narr.get('tone', {}).get('mood'):
                context_parts.append(f"[톤] {narr['tone']['mood']} - {narr['tone'].get('description', '')}")
            if narr.get('resolution'):
                context_parts.append(f"[결말] {narr['resolution']}")

        # Card connections
        if premium.get('card_connections'):
            context_parts.append(f"\n## 카드 연결")
            for conn in premium['card_connections'][:5]:
                context_parts.append(f"- {conn}")

        # Premium summary highlights
        summary = premium.get('premium_summary', {})
        if summary.get('highlights'):
            context_parts.append(f"\n## 핵심 포인트")
            for h in summary['highlights'][:5]:
                context_parts.append(f"- {h}")

        return '\n'.join(context_parts)


# Singleton
_tarot_hybrid_rag = None


def get_tarot_hybrid_rag() -> TarotHybridRAG:
    """Get or create singleton TarotHybridRAG instance"""
    global _tarot_hybrid_rag
    if _tarot_hybrid_rag is None:
        _tarot_hybrid_rag = TarotHybridRAG()
    return _tarot_hybrid_rag


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("[TAROT HYBRID RAG TEST]")
    print("=" * 70)

    hybrid_rag = get_tarot_hybrid_rag()

    # Test available themes
    print("\n[Available Themes]")
    themes = hybrid_rag.get_available_themes()
    for t in themes:
        print(f"  - {t}")

    # Test sub-topics
    if 'love' in themes:
        print("\n[Love Sub-Topics]")
        sub_topics = hybrid_rag.get_sub_topics('love')
        for st in sub_topics[:5]:
            print(f"  - {st['id']}: {st['korean']} ({st['card_count']} cards)")

    # Test spread info
    print("\n[Spread Info: love/secret_admirer]")
    spread = hybrid_rag.get_spread_info('love', 'secret_admirer')
    if spread:
        print(f"  Name: {spread.get('spread_name')}")
        print(f"  Cards: {spread.get('card_count')}")
        print(f"  Positions: {len(spread.get('positions', []))}")

    # Test context generation
    print("\n[Reading Context]")
    test_cards = [
        {"name": "The Fool", "isReversed": False},
        {"name": "The Lovers", "isReversed": True},
        {"name": "The Star", "isReversed": False}
    ]
    context = hybrid_rag.get_reading_context('love', 'crush', test_cards)
    if context:
        print(f"  Theme: {context.get('theme')}")
        print(f"  Topic: {context.get('topic_title')}")
        print(f"  Cards: {len(context.get('card_interpretations', []))}")

    # Test reading generation (if API key available)
    if hybrid_rag.client:
        print("\n[Generating Reading...]")
        reading = hybrid_rag.generate_reading(
            theme='love',
            sub_topic='crush',
            drawn_cards=test_cards[:3],
            question="그 사람이 나를 좋아할까요?"
        )
        print(reading[:500] + "..." if len(reading) > 500 else reading)
    else:
        print("\n[Skipping generation - No API key]")

    print("\n" + "=" * 70)
    print("[TEST COMPLETE]")
    print("=" * 70)
