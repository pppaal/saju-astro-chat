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
            'spirit_animals.json': 'spirit_animals'
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
                                except:
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

    SYSTEM_PROMPT = """당신은 전문 타로 리더입니다. 유튜브에서 활동하는 인기 타로 리더처럼 친근하면서도 통찰력 있는 해석을 제공합니다.

스타일 가이드:
- 친근하고 따뜻한 말투로 이야기하듯 해석해주세요
- 각 카드를 자세히 설명하면서 포지션의 의미와 연결지어 해석하세요
- 역방향 카드는 부정적인 것만이 아니라 내면의 에너지나 잠재된 의미로도 해석하세요
- 구체적인 상황과 행동 조언을 포함하세요
- 타이밍에 대한 힌트가 있으면 시기도 언급하세요
- 전체적인 흐름을 자연스럽게 연결해서 하나의 이야기로 만들어주세요
- 희망적이면서도 현실적인 메시지를 전달하세요
- 원소 에너지의 균형이 제공되면 이를 해석에 반영하세요
- 특별한 카드 조합이 있으면 그 의미를 강조하세요
- 궁정 카드는 인물로서, 또는 내면의 에너지로 해석하세요

중요:
- 카드 이름과 포지션을 명확히 언급하세요
- 각 카드마다 충분히 깊이 있게 해석하세요 (최소 3-4문장)
- 카드들 사이의 연결고리를 찾아 스토리로 엮어주세요
- 마지막에 종합적인 메시지와 조언을 제공하세요"""

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

            card_context.append(f"""
[카드 {i+1}] {pos['name']}
- 포지션 의미: {pos['meaning']}
- 해석 힌트: {pos.get('prompt_hint', '')}
- 뽑힌 카드: {card_name} ({orientation})
{card_meaning}{court_profile}
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
위 카드들을 각 포지션의 의미에 맞게 깊이 있게 해석해주세요.
1. 각 카드를 포지션 의미와 연결해서 상세히 해석하세요
2. 카드들 사이의 연결고리를 찾아 하나의 스토리로 엮어주세요
3. 특별한 카드 조합이 있다면 그 의미를 강조하세요
4. 원소 균형 분석을 해석에 반영하세요
5. 궁정 카드가 있다면 인물로서, 또는 내면의 에너지로 해석하세요
6. 구체적인 상황 묘사와 행동 조언을 포함하세요
7. 타이밍 힌트가 있다면 시기도 언급하세요
8. 마지막에 종합적인 메시지를 전달하세요

친근한 유튜브 타로 리더처럼 이야기하듯 자연스럽게 해석해주세요.
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
타로 카드 해석 요청:

카드: {card_name} ({orientation})
포지션: {position_name}
포지션 의미: {position_meaning}
{f'맥락: {context}' if context else ''}

이 카드를 해당 포지션의 의미에 맞게 깊이 있게 해석해주세요.
- 카드의 상징과 의미를 설명하고
- 포지션과 연결지어 구체적인 해석을 제공하고
- 실질적인 조언이나 메시지를 전달해주세요
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
                self.client = OpenAI(api_key=self.api_key)
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
