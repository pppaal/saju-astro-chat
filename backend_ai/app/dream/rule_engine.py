# backend_ai/app/dream/rule_engine.py
"""
Dream Rule Engine
==================
Rule engine for dream interpretation with advanced features.
"""

import os
import json
import traceback

try:
    from backend_ai.app.realtime_astro import get_current_transits
except ImportError:
    from app.realtime_astro import get_current_transits


class DreamRuleEngine:
    """Rule engine specifically for dream interpretation."""

    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(__file__))
        rules_dir = os.path.join(base_dir, "data", "graph", "rules", "dream")
        self.rules_dir = rules_dir
        self.rules = {}
        self.advanced_data = {}  # For combinations, taemong, lucky_numbers
        self.astro_rules = {}
        self._load_rules()
        self._load_advanced_data()

    def _load_rules(self):
        if not os.path.exists(self.rules_dir):
            print(f"[DreamRuleEngine] Creating rules directory: {self.rules_dir}")
            os.makedirs(self.rules_dir, exist_ok=True)
            return

        for filename in os.listdir(self.rules_dir):
            if not filename.endswith('.json'):
                continue
            path = os.path.join(self.rules_dir, filename)
            try:
                with open(path, encoding='utf-8') as f:
                    key = os.path.splitext(filename)[0]
                    self.rules[key] = json.load(f)
            except Exception as e:
                print(f"[DreamRuleEngine] Failed to load {filename}: {e}")

        print(f"[DreamRuleEngine] Loaded {len(self.rules)} rule files: {list(self.rules.keys())}")

    def _load_advanced_data(self):
        """Load premium features: combinations, taemong, lucky_numbers."""
        advanced_path = os.path.join(self.rules_dir, "dream_symbols_advanced.json")
        if os.path.exists(advanced_path):
            try:
                with open(advanced_path, encoding='utf-8') as f:
                    data = json.load(f)
                    self.advanced_data = {
                        'combinations': data.get('symbol_combinations', {}).get('combinations', {}),
                        'taemong': data.get('taemong', {}).get('symbols', {}),
                        'lucky_numbers': data.get('lucky_numbers', {}),
                        'categories': data.get('categories', {})
                    }
                    print(f"[DreamRuleEngine] Loaded advanced data: {len(self.advanced_data['combinations'])} combinations, "
                          f"{len(self.advanced_data['taemong'])} taemong symbols, "
                          f"{len(self.advanced_data['lucky_numbers'].get('symbol_mappings', {}))} lucky mappings")
            except Exception as e:
                print(f"[DreamRuleEngine] Failed to load advanced data: {e}")

        # Load astro rules for dream interpretation
        self._load_astro_rules()

    def _load_astro_rules(self):
        """Load celestial/astro rules for dream interpretation."""
        astro_path = os.path.join(self.rules_dir, "dream_astro_rules.json")
        self.astro_rules = {}
        if os.path.exists(astro_path):
            try:
                with open(astro_path, encoding='utf-8') as f:
                    self.astro_rules = json.load(f)
                    print(f"[DreamRuleEngine] Loaded astro rules: "
                          f"{len(self.astro_rules.get('moon_phase_dream_effects', {}))} moon phases, "
                          f"{len(self.astro_rules.get('planet_transit_dream_effects', {}))} transit effects")
            except Exception as e:
                print(f"[DreamRuleEngine] Failed to load astro rules: {e}")

    def get_celestial_context(self, locale: str = "ko") -> dict:
        """Get current celestial context for dream interpretation."""
        try:
            # Get current transits from realtime_astro
            transits = get_current_transits()
            moon_phase = transits.get('moon', {})

            # Get moon phase dream effects
            phase_name = moon_phase.get('phase_name', '')
            moon_effects = self.astro_rules.get('moon_phase_dream_effects', {}).get(phase_name, {})

            # Get current moon sign (if available in transits)
            moon_planet = next((p for p in transits.get('planets', []) if p.get('name') == 'Moon'), None)
            moon_sign = moon_planet.get('sign', '') if moon_planet else ''
            moon_sign_effects = self.astro_rules.get('planet_transit_dream_effects', {}).get('moon_sign_effect', {}).get('signs', {}).get(moon_sign, {})

            # Check for retrograde planets
            retrogrades = transits.get('retrogrades', [])
            retrograde_effects = []
            transit_effects = self.astro_rules.get('planet_transit_dream_effects', {})

            for planet in retrogrades:
                planet_lower = planet.lower()
                if planet_lower == 'mercury':
                    effect = transit_effects.get('mercury_retrograde', {})
                    if effect:
                        retrograde_effects.append({
                            'planet': planet,
                            'korean': effect.get('korean', ''),
                            'emoji': effect.get('emoji', ''),
                            'themes': effect.get('dream_effects', {}).get('themes', []),
                            'common_symbols': effect.get('dream_effects', {}).get('common_symbols', []),
                            'interpretation': effect.get('dream_effects', {}).get('interpretation_guide', {}).get(locale, '')
                        })
                elif planet_lower == 'venus':
                    effect = transit_effects.get('venus_retrograde', {})
                    if effect:
                        retrograde_effects.append({
                            'planet': planet,
                            'korean': effect.get('korean', ''),
                            'themes': effect.get('dream_effects', {}).get('themes', [])
                        })
                elif planet_lower == 'mars':
                    effect = transit_effects.get('mars_retrograde', {})
                    if effect:
                        retrograde_effects.append({
                            'planet': planet,
                            'korean': effect.get('korean', ''),
                            'themes': effect.get('dream_effects', {}).get('themes', [])
                        })

            # Check for significant planetary aspects
            aspects = transits.get('aspects', [])
            significant_aspects = []
            for aspect in aspects[:5]:  # Top 5 aspects
                p1 = aspect.get('planet1', '').lower()
                p2 = aspect.get('planet2', '').lower()
                aspect_type = aspect.get('aspect', '')

                # Check for Jupiter/Neptune transits (important for dreams)
                if 'jupiter' in [p1, p2]:
                    effect = transit_effects.get('jupiter_transit', {})
                    if effect:
                        significant_aspects.append({
                            'aspect': f"{aspect['planet1']} {aspect_type} {aspect['planet2']}",
                            'themes': effect.get('dream_effects', {}).get('themes', []),
                            'interpretation': effect.get('dream_effects', {}).get('interpretation_guide', {}).get(locale, '')
                        })
                if 'neptune' in [p1, p2]:
                    effect = transit_effects.get('neptune_transit', {})
                    if effect:
                        significant_aspects.append({
                            'aspect': f"{aspect['planet1']} {aspect_type} {aspect['planet2']}",
                            'themes': effect.get('dream_effects', {}).get('themes', []),
                            'special_note': effect.get('dream_effects', {}).get('special_note', {}).get(locale, ''),
                            'interpretation': effect.get('dream_effects', {}).get('interpretation_guide', {}).get(locale, '')
                        })

            # Build celestial context
            return {
                'timestamp': transits.get('timestamp'),
                'moon_phase': {
                    'name': phase_name,
                    'korean': moon_effects.get('korean', moon_phase.get('phase_ko', '')),
                    'emoji': moon_effects.get('emoji', moon_phase.get('emoji', '')),
                    'illumination': moon_phase.get('illumination', 0),
                    'age_days': moon_phase.get('age_days', 0),
                    'dream_quality': moon_effects.get('dream_quality', ''),
                    'dream_meaning': moon_effects.get('dream_meaning', {}).get(locale, ''),
                    'favorable_symbols': moon_effects.get('favorable_symbols', []),
                    'intensified_symbols': moon_effects.get('intensified_symbols', []),
                    'advice': moon_effects.get('advice', {}).get(locale, ''),
                    'weight_modifier': moon_effects.get('interpretation_boost', {}).get('weight_modifier', 1.0),
                    'enhanced_themes': moon_effects.get('interpretation_boost', {}).get('themes', [])
                },
                'moon_sign': {
                    'sign': moon_sign,
                    'korean': moon_sign_effects.get('ko', ''),
                    'dream_flavor': moon_sign_effects.get('dream_flavor', ''),
                    'enhanced_symbols': moon_sign_effects.get('enhanced_symbols', [])
                },
                'retrogrades': retrograde_effects,
                'significant_aspects': significant_aspects[:3],
                'planets': [
                    {
                        'name': p.get('name'),
                        'name_ko': p.get('name_ko'),
                        'sign': p.get('sign'),
                        'sign_ko': p.get('sign_ko'),
                        'retrograde': p.get('retrograde', False)
                    }
                    for p in transits.get('planets', [])[:7]  # Sun through Saturn
                ],
                'source': transits.get('source', 'unknown')
            }

        except Exception as e:
            print(f"[DreamRuleEngine] Failed to get celestial context: {e}")
            traceback.print_exc()
            return None

    def detect_combinations(self, dream_text: str, symbols: list) -> list:
        """Detect symbol combinations in dream for enhanced interpretation."""
        combinations = self.advanced_data.get('combinations', {})
        if not combinations:
            return []

        detected = []
        dream_lower = dream_text.lower()
        symbol_set = set(s.lower() for s in symbols)

        for combo_key, combo_data in combinations.items():
            # Parse combination key (e.g., "뱀+물", "돼지+금색")
            parts = [p.strip() for p in combo_key.split('+')]

            # Check if all parts are present in symbols or dream text
            all_present = all(
                part in symbol_set or part in dream_lower
                for part in parts
            )

            if all_present:
                detected.append({
                    'combination': combo_key,
                    'meaning': combo_data.get('meaning', ''),
                    'interpretation': combo_data.get('interpretation', ''),
                    'fortune_type': combo_data.get('fortune_type', ''),
                    'is_lucky': combo_data.get('is_lucky', False),
                    'lucky_score': combo_data.get('lucky_score', 50)
                })

        # Sort by lucky_score descending
        detected.sort(key=lambda x: x['lucky_score'], reverse=True)
        return detected[:5]  # Return top 5 combinations

    def detect_taemong(self, dream_text: str, symbols: list, themes: list) -> dict:
        """Detect if this is a taemong (conception dream) and provide interpretation."""
        taemong_data = self.advanced_data.get('taemong', {})
        if not taemong_data:
            return None

        # Check if taemong-related themes are selected
        taemong_keywords = ['태몽', '임신', 'taemong', 'conception', 'pregnancy', '아기', '출산']
        is_taemong_context = any(
            kw in theme.lower() for theme in themes for kw in taemong_keywords
        ) or any(
            kw in dream_text.lower() for kw in taemong_keywords
        )

        # Find matching taemong symbols
        detected_symbols = []
        dream_lower = dream_text.lower()
        all_inputs = set(s.lower() for s in symbols) | set(dream_lower.split())

        for symbol, data in taemong_data.items():
            if symbol.lower() in all_inputs or symbol.lower() in dream_lower:
                detected_symbols.append({
                    'symbol': symbol,
                    'child_trait': data.get('child_trait', ''),
                    'gender_hint': data.get('gender_hint', ''),
                    'interpretation': data.get('interpretation', ''),
                    'celebrity_examples': data.get('celebrity_examples', []),
                    'lucky_score': data.get('lucky_score', 0)
                })

        if detected_symbols:
            # Sort by lucky_score
            detected_symbols.sort(key=lambda x: x['lucky_score'], reverse=True)
            return {
                'is_taemong': is_taemong_context or len(detected_symbols) > 0,
                'symbols': detected_symbols[:3],
                'primary_symbol': detected_symbols[0] if detected_symbols else None
            }

        return None

    def generate_lucky_numbers(self, dream_text: str, symbols: list) -> dict:
        """Generate lucky numbers based on dream symbols."""
        lucky_data = self.advanced_data.get('lucky_numbers', {})
        symbol_mappings = lucky_data.get('symbol_mappings', {})

        if not symbol_mappings:
            return None

        dream_lower = dream_text.lower()
        all_inputs = set(s.lower() for s in symbols)

        # Collect numbers from matched symbols
        primary_numbers = []
        secondary_numbers = []
        elements = []
        matched_symbols = []

        for symbol, mapping in symbol_mappings.items():
            if symbol.lower() in all_inputs or symbol.lower() in dream_lower:
                matched_symbols.append(symbol)
                primary_numbers.extend(mapping.get('primary', []))
                secondary_numbers.extend(mapping.get('secondary', []))
                elements.append(mapping.get('element', ''))

        if not matched_symbols:
            return None

        # Extract numbers mentioned in dream text
        import re
        dream_numbers = [int(n) for n in re.findall(r'\d+', dream_text) if 1 <= int(n) <= 45]

        # Build final number set
        # Priority: dream_numbers > primary > secondary
        final_numbers = set()

        # Add numbers from dream first
        for n in dream_numbers[:2]:
            if 1 <= n <= 45:
                final_numbers.add(n)

        # Add primary numbers
        import random
        random.shuffle(primary_numbers)
        for n in primary_numbers:
            if len(final_numbers) >= 6:
                break
            if n not in final_numbers and 1 <= n <= 45:
                final_numbers.add(n)

        # Add secondary numbers if needed
        random.shuffle(secondary_numbers)
        for n in secondary_numbers:
            if len(final_numbers) >= 6:
                break
            if n not in final_numbers and 1 <= n <= 45:
                final_numbers.add(n)

        # If still not enough, generate based on element compatibility
        while len(final_numbers) < 6:
            # Add a random number if we don't have enough
            new_num = random.randint(1, 45)
            if new_num not in final_numbers:
                final_numbers.add(new_num)

        dominant_element = max(set(elements), key=elements.count) if elements else None

        return {
            'numbers': sorted(list(final_numbers))[:6],
            'matched_symbols': matched_symbols[:5],
            'dominant_element': dominant_element,
            'element_analysis': f"오행 {dominant_element} 기운이 강한 꿈입니다." if dominant_element else None,
            'confidence': min(len(matched_symbols) / 3, 1.0)  # Higher confidence with more matches
        }

    def evaluate(self, facts: dict) -> dict:
        """
        Evaluate dream facts against rules and return matched interpretations.
        Returns dict with: texts, korean_notes, specifics, categories
        """
        # Flatten all facts into tokens
        tokens = set()
        dream_text = facts.get('dream', '').lower()

        def add_tokens(obj):
            if isinstance(obj, str):
                for word in obj.lower().replace(',', ' ').split():
                    tokens.add(word.strip())
                # Also add the full string for phrase matching
                tokens.add(obj.lower())
            elif isinstance(obj, list):
                for item in obj:
                    add_tokens(item)
            elif isinstance(obj, dict):
                for v in obj.values():
                    add_tokens(v)

        add_tokens(facts.get('dream', ''))
        add_tokens(facts.get('symbols', []))
        add_tokens(facts.get('emotions', []))
        add_tokens(facts.get('themes', []))
        add_tokens(facts.get('context', []))
        add_tokens(facts.get('cultural', {}))

        # Match against rules with enhanced scoring
        matches = []
        korean_notes = []
        specific_matches = []
        categories = set()

        for rule_file, rules in self.rules.items():
            for rule_id, rule in rules.items():
                if not isinstance(rule, dict):
                    continue
                if rule_id.startswith('_'):  # Skip metadata
                    continue

                conditions = rule.get('when', [])
                if isinstance(conditions, str):
                    conditions = [conditions]

                # Calculate match score
                match_score = 0
                matched_conditions = []

                for c in conditions:
                    c_lower = c.lower()
                    # Direct token match
                    if c_lower in tokens:
                        match_score += 2
                        matched_conditions.append(c)
                    # Substring match in dream text
                    elif c_lower in dream_text:
                        match_score += 1
                        matched_conditions.append(c)

                if match_score > 0:
                    weight = rule.get('weight', 1)
                    final_score = weight * match_score
                    text = rule.get('text', '')

                    if text:
                        matches.append((final_score, text, rule_file))

                    # Collect Korean interpretation
                    korean = rule.get('korean', '')
                    if korean:
                        korean_notes.append((final_score, korean))

                    # Collect category
                    category = rule.get('category', '')
                    if category:
                        categories.add(category)

                    # Check specifics for detailed matching
                    specifics = rule.get('specifics', {})
                    if specifics:
                        for specific_key, specific_value in specifics.items():
                            if any(word in dream_text for word in specific_key.lower().split()):
                                specific_matches.append((final_score + 5, f"{specific_key}: {specific_value}"))

        # Sort and deduplicate
        matches.sort(key=lambda x: x[0], reverse=True)
        korean_notes.sort(key=lambda x: x[0], reverse=True)
        specific_matches.sort(key=lambda x: x[0], reverse=True)

        return {
            'texts': [m[1] for m in matches[:15]],
            'korean_notes': [k[1] for k in korean_notes[:5]],
            'specifics': [s[1] for s in specific_matches[:10]],
            'categories': list(categories),
            'sources': list(set(m[2] for m in matches[:15]))
        }


# Singleton instance
_dream_rule_engine_instance = None


def get_dream_rule_engine():
    """Get singleton DreamRuleEngine instance for performance."""
    global _dream_rule_engine_instance
    if _dream_rule_engine_instance is None:
        _dream_rule_engine_instance = DreamRuleEngine()
    return _dream_rule_engine_instance
