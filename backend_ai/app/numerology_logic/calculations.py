# backend_ai/app/numerology_logic/calculations.py
"""
Core numerology calculation functions.
Contains functions for life path, expression, soul urge, personality, and personal cycles.
"""

from datetime import datetime
from typing import Dict, Any

from .constants import (
    PYTHAGOREAN_MAP,
    VOWELS,
    MASTER_NUMBERS,
    KOREAN_STROKES,
)


def reduce_to_single(num: int, keep_master: bool = True) -> int:
    """Reduce number to single digit, optionally keeping master numbers."""
    while num > 9:
        if keep_master and num in MASTER_NUMBERS:
            return num
        num = sum(int(d) for d in str(num))
    return num


def calculate_life_path(birth_date: str) -> Dict[str, Any]:
    """
    Calculate Life Path Number from birth date.

    Args:
        birth_date: Format 'YYYY-MM-DD' or 'YYYYMMDD'

    Returns:
        Dict with life_path number and calculation breakdown
    """
    # Parse date
    date_str = birth_date.replace('-', '').replace('/', '')
    if len(date_str) != 8:
        raise ValueError(f"Invalid date format: {birth_date}")

    year = int(date_str[:4])
    month = int(date_str[4:6])
    day = int(date_str[6:8])

    # Method 1: Reduce each component separately
    year_sum = reduce_to_single(sum(int(d) for d in str(year)), keep_master=True)
    month_sum = reduce_to_single(month, keep_master=True)
    day_sum = reduce_to_single(day, keep_master=True)

    # Final life path
    total = year_sum + month_sum + day_sum
    life_path = reduce_to_single(total, keep_master=True)

    return {
        'life_path': life_path,
        'year_component': year_sum,
        'month_component': month_sum,
        'day_component': day_sum,
        'calculation': f"{year} -> {year_sum}, {month} -> {month_sum}, {day} -> {day_sum} = {total} -> {life_path}",
        'is_master': life_path in MASTER_NUMBERS
    }


def calculate_expression_number(full_name: str) -> Dict[str, Any]:
    """
    Calculate Expression Number from full name (all letters).

    Args:
        full_name: Full name in English letters

    Returns:
        Dict with expression number and breakdown
    """
    name_upper = full_name.upper().replace(' ', '')
    total = 0
    letter_values = []

    for letter in name_upper:
        if letter in PYTHAGOREAN_MAP:
            val = PYTHAGOREAN_MAP[letter]
            total += val
            letter_values.append((letter, val))

    expression = reduce_to_single(total, keep_master=True)

    return {
        'expression': expression,
        'total_before_reduce': total,
        'letter_values': letter_values,
        'is_master': expression in MASTER_NUMBERS
    }


def calculate_soul_urge(full_name: str) -> Dict[str, Any]:
    """
    Calculate Soul Urge Number from vowels only.

    Args:
        full_name: Full name in English letters

    Returns:
        Dict with soul urge number and breakdown
    """
    name_upper = full_name.upper().replace(' ', '')
    total = 0
    vowel_values = []

    for letter in name_upper:
        if letter in VOWELS and letter in PYTHAGOREAN_MAP:
            val = PYTHAGOREAN_MAP[letter]
            total += val
            vowel_values.append((letter, val))

    soul_urge = reduce_to_single(total, keep_master=True)

    return {
        'soul_urge': soul_urge,
        'total_before_reduce': total,
        'vowel_values': vowel_values,
        'is_master': soul_urge in MASTER_NUMBERS
    }


def calculate_personality_number(full_name: str) -> Dict[str, Any]:
    """
    Calculate Personality Number from consonants only.

    Args:
        full_name: Full name in English letters

    Returns:
        Dict with personality number and breakdown
    """
    name_upper = full_name.upper().replace(' ', '')
    total = 0
    consonant_values = []

    for letter in name_upper:
        if letter not in VOWELS and letter in PYTHAGOREAN_MAP:
            val = PYTHAGOREAN_MAP[letter]
            total += val
            consonant_values.append((letter, val))

    personality = reduce_to_single(total, keep_master=True)

    return {
        'personality': personality,
        'total_before_reduce': total,
        'consonant_values': consonant_values,
        'is_master': personality in MASTER_NUMBERS
    }


def calculate_personal_year(birth_date: str, target_year: int = None) -> Dict[str, Any]:
    """
    Calculate Personal Year Number.

    Args:
        birth_date: Format 'YYYY-MM-DD'
        target_year: Year to calculate for (default: current year)

    Returns:
        Dict with personal year number
    """
    date_str = birth_date.replace('-', '').replace('/', '')
    month = int(date_str[4:6])
    day = int(date_str[6:8])

    if target_year is None:
        target_year = datetime.now().year

    # Personal Year = birth month + birth day + target year
    total = reduce_to_single(month) + reduce_to_single(day) + reduce_to_single(sum(int(d) for d in str(target_year)))
    personal_year = reduce_to_single(total, keep_master=False)

    return {
        'personal_year': personal_year,
        'target_year': target_year,
        'cycle_position': personal_year,  # 9-year cycle position
        'calculation': f"{month} + {day} + {target_year} -> {personal_year}"
    }


def calculate_personal_month(birth_date: str, target_year: int = None, target_month: int = None) -> Dict[str, Any]:
    """Calculate Personal Month Number."""
    if target_year is None:
        target_year = datetime.now().year
    if target_month is None:
        target_month = datetime.now().month

    py = calculate_personal_year(birth_date, target_year)
    personal_month = reduce_to_single(py['personal_year'] + target_month, keep_master=False)

    return {
        'personal_month': personal_month,
        'personal_year': py['personal_year'],
        'target_month': target_month,
        'target_year': target_year
    }


def calculate_personal_day(birth_date: str, target_date: str = None) -> Dict[str, Any]:
    """Calculate Personal Day Number."""
    if target_date is None:
        target_date = datetime.now().strftime('%Y-%m-%d')

    target_dt = datetime.strptime(target_date.replace('/', '-'), '%Y-%m-%d')
    pm = calculate_personal_month(birth_date, target_dt.year, target_dt.month)

    personal_day = reduce_to_single(pm['personal_month'] + target_dt.day, keep_master=False)

    return {
        'personal_day': personal_day,
        'personal_month': pm['personal_month'],
        'personal_year': pm['personal_year'],
        'target_date': target_date
    }


def calculate_korean_name_number(korean_name: str) -> Dict[str, Any]:
    """
    Calculate numerology number from Korean name using stroke counts.

    Args:
        korean_name: Korean name (한글)

    Returns:
        Dict with name number and stroke breakdown
    """
    total_strokes = 0
    stroke_breakdown = []
    unknown_chars = []

    for char in korean_name:
        if char in KOREAN_STROKES:
            strokes = KOREAN_STROKES[char]
            total_strokes += strokes
            stroke_breakdown.append((char, strokes))
        elif char.strip():  # Not whitespace
            unknown_chars.append(char)
            # Estimate strokes for unknown characters (middle value)
            estimated = 10
            total_strokes += estimated
            stroke_breakdown.append((char, f"~{estimated}"))

    name_number = reduce_to_single(total_strokes, keep_master=True)

    return {
        'name_number': name_number,
        'total_strokes': total_strokes,
        'stroke_breakdown': stroke_breakdown,
        'unknown_characters': unknown_chars,
        'is_master': name_number in MASTER_NUMBERS,
        'reliability': 'high' if not unknown_chars else 'estimated'
    }


def calculate_full_numerology(
    birth_date: str,
    english_name: str = None,
    korean_name: str = None
) -> Dict[str, Any]:
    """
    Calculate complete numerology profile.

    Args:
        birth_date: Format 'YYYY-MM-DD'
        english_name: Full name in English (optional)
        korean_name: Korean name in 한글 (optional)

    Returns:
        Complete numerology profile
    """
    result = {
        'birth_date': birth_date,
        'life_path': calculate_life_path(birth_date),
        'personal_year': calculate_personal_year(birth_date),
        'personal_month': calculate_personal_month(birth_date),
        'personal_day': calculate_personal_day(birth_date)
    }

    if english_name:
        result['expression'] = calculate_expression_number(english_name)
        result['soul_urge'] = calculate_soul_urge(english_name)
        result['personality'] = calculate_personality_number(english_name)
        result['english_name'] = english_name

    if korean_name:
        result['korean_name_number'] = calculate_korean_name_number(korean_name)
        result['korean_name'] = korean_name

    # Calculate core numbers summary
    core_numbers = [result['life_path']['life_path']]
    if 'expression' in result:
        core_numbers.append(result['expression']['expression'])
    if 'soul_urge' in result:
        core_numbers.append(result['soul_urge']['soul_urge'])

    # Check for master numbers
    master_numbers_found = [n for n in core_numbers if n in MASTER_NUMBERS]

    result['summary'] = {
        'core_numbers': core_numbers,
        'dominant_number': max(set(core_numbers), key=core_numbers.count) if core_numbers else None,
        'has_master_numbers': len(master_numbers_found) > 0,
        'master_numbers': master_numbers_found
    }

    return result
