# backend_ai/app/numerology_logic.py
"""
Numerology Logic - Backward Compatibility Shim
==============================================
This module has been refactored into the numerology_logic/ package.
This file provides backward compatibility for existing imports.

New imports should use:
    from backend_ai.app.numerology_logic import analyze_numerology, calculate_life_path
"""

# Re-export everything from the new package
from backend_ai.app.numerology_logic import (
    # Constants
    PYTHAGOREAN_MAP,
    VOWELS,
    MASTER_NUMBERS,
    KOREAN_STROKES,
    COMPATIBILITY_MATRIX,
    # Calculations
    reduce_to_single,
    calculate_life_path,
    calculate_expression_number,
    calculate_soul_urge,
    calculate_personality_number,
    calculate_personal_year,
    calculate_personal_month,
    calculate_personal_day,
    calculate_korean_name_number,
    calculate_full_numerology,
    # Compatibility
    calculate_numerology_compatibility,
    # Interpreter
    NumerologyInterpreter,
    get_number_interpretation,
    get_saju_numerology_correlation,
    get_therapeutic_question,
    analyze_numerology,
    analyze_numerology_compatibility,
)

# Re-export internal data loading for backward compatibility
from backend_ai.app.numerology_logic.interpreter import _load_numerology_data

__all__ = [
    "PYTHAGOREAN_MAP",
    "VOWELS",
    "MASTER_NUMBERS",
    "KOREAN_STROKES",
    "COMPATIBILITY_MATRIX",
    "reduce_to_single",
    "calculate_life_path",
    "calculate_expression_number",
    "calculate_soul_urge",
    "calculate_personality_number",
    "calculate_personal_year",
    "calculate_personal_month",
    "calculate_personal_day",
    "calculate_korean_name_number",
    "calculate_full_numerology",
    "calculate_numerology_compatibility",
    "NumerologyInterpreter",
    "get_number_interpretation",
    "get_saju_numerology_correlation",
    "get_therapeutic_question",
    "analyze_numerology",
    "analyze_numerology_compatibility",
    "_load_numerology_data",
]
