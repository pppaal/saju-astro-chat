# backend_ai/app/tarot_extractors.py
"""
Tarot Advanced Rules Extractors
================================
고급 타로 규칙 JSON 파일에서 검색 가능한 엔트리를 추출하는 함수들

Categories:
- combinations: 카드 조합 의미
- timing: 타이밍/시기 예측
- court_profiles: 궁정 카드 성격
- elements: 원소 상호작용
- narrative: 스토리텔링 템플릿
- numerology: 수비학
- colors: 색상 상징
- meditation: 명상/확언
- lucky: 행운 아이템
- followup: 후속 질문
- reversed: 역방향 해석
- chakra: 차크라 연결
- astrology: 점성술 대응
- yesno: 예/아니오 로직
- soulmate: 소울메이트 지표
- shadow: 그림자 작업
- moon: 달의 위상
- animals: 영적 동물
"""

from typing import List, Dict, Callable, Any


def add_entry(entries: List[Dict], category: str, subcategory: str, text: str, data: dict):
    """Add a searchable entry to the entries list"""
    if text and text.strip():
        entries.append({
            'category': category,
            'subcategory': subcategory,
            'text': text.strip(),
            'data': data
        })


def extract_combinations(entries: List[Dict], data: dict, filename: str):
    """Extract card combination entries"""
    # Powerful pairs
    pairs = data.get('powerful_pairs', {})
    for category, combos in pairs.items():
        for combo in combos:
            cards = combo.get('cards', [])
            meaning = combo.get('meaning', '') or combo.get('korean', '')
            text = f"카드 조합 {' + '.join(cards)}: {meaning}"
            add_entry(entries, 'combinations', category, text, combo)

    # Triple combinations
    triples = data.get('triple_combinations', {})
    for name, combo in triples.items():
        cards = combo.get('cards', [])
        meaning = combo.get('meaning', '') or combo.get('korean', '')
        text = f"세 카드 조합 {name} ({' + '.join(cards)}): {meaning}"
        add_entry(entries, 'combinations', 'triple', text, combo)


def extract_timing(entries: List[Dict], data: dict, filename: str):
    """Extract timing entries"""
    # Seasons
    seasons = data.get('seasons', {})
    for season, info in seasons.items():
        text = f"계절 타이밍 {info.get('korean', season)}: {info.get('meaning', '')}"
        add_entry(entries, 'timing', 'season', text, info)

    # Card timing meanings
    card_timing = data.get('card_timing_meanings', {})
    for timing_type, info in card_timing.items():
        cards = info.get('cards', [])
        text = f"타이밍 {info.get('korean', '')}: {', '.join(cards)} - {info.get('timeframe', '')}"
        add_entry(entries, 'timing', 'card', text, info)


def extract_court_profiles(entries: List[Dict], data: dict, filename: str):
    """Extract court card profile entries"""
    for rank in ['pages', 'knights', 'queens', 'kings']:
        rank_data = data.get(rank, {})
        cards = rank_data.get('cards', {})
        for card_name, profile in cards.items():
            personality = profile.get('personality', {})
            text = f"궁정카드 {card_name}: {personality.get('description', '')} 강점: {', '.join(personality.get('strengths', []))}"
            add_entry(entries, 'court_profiles', rank, text, profile)


def extract_elements(entries: List[Dict], data: dict, filename: str):
    """Extract elemental dignity entries"""
    interactions = data.get('element_interactions', {})
    for interaction_type, info in interactions.items():
        text = f"원소 상호작용 {info.get('korean', '')}: {info.get('description', '')} - {info.get('advice', '')}"
        add_entry(entries, 'elements', interaction_type, text, info)


def extract_narratives(entries: List[Dict], data: dict, filename: str):
    """Extract narrative templates"""
    for style_type in ['opening_styles', 'closing_styles']:
        styles = data.get(style_type, {})
        for style, info in styles.items():
            text = f"내러티브 {style}: {info.get('description', '')} 예시: {', '.join(info.get('templates', [])[:2])}"
            add_entry(entries, 'narrative', style_type, text, info)


def extract_numerology(entries: List[Dict], data: dict, filename: str):
    """Extract numerology entries"""
    numbers = data.get('number_meanings', {})
    for num, info in numbers.items():
        text = f"수비학 숫자 {num} ({info.get('korean', '')}): {info.get('meaning', '')} 타로: {info.get('tarot_connection', '')}"
        add_entry(entries, 'numerology', 'number', text, info)


def extract_colors(entries: List[Dict], data: dict, filename: str):
    """Extract color symbolism entries"""
    for category in ['primary_colors', 'secondary_colors', 'neutral_colors']:
        colors = data.get(category, {})
        for color, info in colors.items():
            text = f"색상 {info.get('korean', color)}: {info.get('meaning', '')} 감정: {info.get('emotional', '')}"
            add_entry(entries, 'colors', category, text, info)


def extract_meditations(entries: List[Dict], data: dict, filename: str):
    """Extract meditation entries"""
    meditations = data.get('major_arcana_meditations', {})
    for card, info in meditations.items():
        text = f"명상 {card}: {info.get('theme', '')} 확언: {info.get('affirmation', '')}"
        add_entry(entries, 'meditation', 'major_arcana', text, info)


def extract_lucky(entries: List[Dict], data: dict, filename: str):
    """Extract lucky items entries"""
    items = data.get('card_lucky_items', {})
    for card, info in items.items():
        text = f"행운 {card}: 색 {info.get('lucky_color', '')} 숫자 {info.get('lucky_number', '')} 크리스탈 {info.get('crystal', '')}"
        add_entry(entries, 'lucky', 'items', text, info)


def extract_followups(entries: List[Dict], data: dict, filename: str):
    """Extract follow-up question entries"""
    by_theme = data.get('by_theme', {})
    for theme, readings in by_theme.items():
        for reading_type, questions in readings.items():
            if isinstance(questions, list):
                text = f"후속질문 {theme} {reading_type}: {', '.join(questions[:3])}"
                add_entry(entries, 'followup', theme, text, {'questions': questions})


def extract_reversed(entries: List[Dict], data: dict, filename: str):
    """Extract reversed card entries"""
    majors = data.get('reversed_major_arcana_special', {})
    for card, info in majors.items():
        text = f"역방향 {card}: {info.get('special_meaning', '')} 조언: {info.get('advice', '')}"
        add_entry(entries, 'reversed', 'major_arcana', text, info)

    # Interpretation styles
    styles = data.get('reversed_interpretation_styles', {})
    for style, info in styles.items():
        text = f"역방향 해석 {style}: {info.get('meaning', '')} 예시: {info.get('example', '')}"
        add_entry(entries, 'reversed', 'style', text, info)


def extract_chakras(entries: List[Dict], data: dict, filename: str):
    """Extract chakra entries"""
    chakras = data.get('chakras', {})
    for chakra, info in chakras.items():
        cards = info.get('cards', [])
        text = f"차크라 {info.get('korean', chakra)}: {info.get('theme', '')} 균형: {info.get('balanced', '')} 관련카드: {', '.join(cards)}"
        add_entry(entries, 'chakra', chakra, text, info)


def extract_astrology(entries: List[Dict], data: dict, filename: str):
    """Extract astrology entries"""
    major = data.get('major_arcana_astrology', {})
    for card, info in major.items():
        planet = info.get('korean_planet') or info.get('korean_zodiac', '')
        text = f"점성술 {card}: {planet} - {info.get('meaning', '')}"
        add_entry(entries, 'astrology', 'major_arcana', text, info)


def extract_yesno(entries: List[Dict], data: dict, filename: str):
    """Extract yes/no logic entries"""
    values = data.get('card_values', {})
    for category, info in values.items():
        cards = info.get('cards', [])
        text = f"예/아니오 {category} ({info.get('meaning', '')}): {', '.join(cards)}"
        add_entry(entries, 'yesno', category, text, info)

    # Special combinations
    combos = data.get('special_combinations', {})
    for combo_type, combo_list in combos.items():
        for combo in combo_list:
            text = f"예/아니오 조합 {combo_type}: {' + '.join(combo.get('combo', []))} - {combo.get('meaning', '')}"
            add_entry(entries, 'yesno', 'combo', text, combo)


def extract_soulmate(entries: List[Dict], data: dict, filename: str):
    """Extract soulmate entries"""
    # Connection types
    types = data.get('connection_types', {})
    for conn_type, info in types.items():
        text = f"인연유형 {info.get('korean', conn_type)}: {info.get('description', '')} 특징: {', '.join(info.get('characteristics', []))}"
        add_entry(entries, 'soulmate', 'type', text, info)

    # Card indicators
    indicators = data.get('soulmate_card_indicators', {})
    for indicator_type, info in indicators.items():
        cards = info.get('cards', [])
        text = f"소울메이트 지표 {indicator_type}: {', '.join(cards)} - {info.get('meaning', '')}"
        add_entry(entries, 'soulmate', 'indicator', text, info)

    # Love combinations
    combos = data.get('card_combinations_for_love', {})
    for combo_type, combo_list in combos.items():
        for combo in combo_list:
            text = f"연애조합 {combo_type}: {' + '.join(combo.get('combo', []))} - {combo.get('korean', combo.get('meaning', ''))}"
            add_entry(entries, 'soulmate', 'combo', text, combo)


def extract_shadow(entries: List[Dict], data: dict, filename: str):
    """Extract shadow work entries"""
    shadows = data.get('major_arcana_shadows', {})
    for card, info in shadows.items():
        text = f"그림자작업 {card}: 그림자 {info.get('shadow', '')} 빛 {info.get('light', '')} 질문: {info.get('journal_prompt', '')}"
        add_entry(entries, 'shadow', 'major_arcana', text, info)


def extract_moon(entries: List[Dict], data: dict, filename: str):
    """Extract moon phase entries"""
    phases = data.get('moon_phases', {})
    for phase, info in phases.items():
        if isinstance(info, dict):
            text = f"달의위상 {info.get('korean', phase)}: {info.get('energy', '')} 좋은질문: {', '.join(info.get('best_questions', [])[:2])}"
            add_entry(entries, 'moon', 'phase', text, info)

    # Moon in zodiac
    zodiac = data.get('moon_in_zodiac', {})
    for sign, info in zodiac.items():
        if isinstance(info, dict):
            text = f"달의별자리 {info.get('korean', sign)}: {info.get('energy', '')} 적합: {info.get('best_for', '')}"
            add_entry(entries, 'moon', 'zodiac', text, info)


def extract_animals(entries: List[Dict], data: dict, filename: str):
    """Extract spirit animal entries"""
    animals = data.get('major_arcana_animals', {})
    for card, info in animals.items():
        text = f"영적동물 {card}: {info.get('korean_animal', '')} - {info.get('meaning', '')} 메시지: {info.get('message', '')}"
        add_entry(entries, 'animals', 'major_arcana', text, info)


# File handlers mapping
FILE_HANDLERS: Dict[str, Callable[[List[Dict], dict, str], None]] = {
    'card_combinations.json': extract_combinations,
    'timing_rules.json': extract_timing,
    'court_card_profiles.json': extract_court_profiles,
    'elemental_dignities.json': extract_elements,
    'narrative_templates.json': extract_narratives,
    'numerology.json': extract_numerology,
    'color_symbolism.json': extract_colors,
    'meditation_affirmations.json': extract_meditations,
    'lucky_items.json': extract_lucky,
    'followup_questions.json': extract_followups,
    'reversed_special.json': extract_reversed,
    'chakra_connections.json': extract_chakras,
    'astrological_correspondences.json': extract_astrology,
    'yes_no_logic.json': extract_yesno,
    'soulmate_indicators.json': extract_soulmate,
    'shadow_work_prompts.json': extract_shadow,
    'moon_phase_rules.json': extract_moon,
    'spirit_animals.json': extract_animals,
}
