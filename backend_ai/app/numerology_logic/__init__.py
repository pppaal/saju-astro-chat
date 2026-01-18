# backend_ai/app/numerology_logic/__init__.py
"""
Numerology Logic Package
========================
Modular implementation of numerology analysis.

Package Structure:
- constants.py: Letter mappings, Korean strokes, compatibility matrix
- calculations.py: Core calculation functions (life path, expression, etc.)
- compatibility.py: Compatibility analysis between two people
- interpreter.py: NumerologyInterpreter class and analysis functions

Usage:
    from backend_ai.app.numerology_logic import analyze_numerology, calculate_life_path
"""

from .constants import (
    PYTHAGOREAN_MAP,
    VOWELS,
    MASTER_NUMBERS,
    KOREAN_STROKES,
    COMPATIBILITY_MATRIX,
)

from .calculations import (
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
)

from .compatibility import (
    calculate_numerology_compatibility,
)

from .interpreter import (
    NumerologyInterpreter,
    get_number_interpretation,
    get_saju_numerology_correlation,
    get_therapeutic_question,
    analyze_numerology,
    analyze_numerology_compatibility,
)

__all__ = [
    # Constants
    "PYTHAGOREAN_MAP",
    "VOWELS",
    "MASTER_NUMBERS",
    "KOREAN_STROKES",
    "COMPATIBILITY_MATRIX",
    # Calculations
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
    # Compatibility
    "calculate_numerology_compatibility",
    # Interpreter
    "NumerologyInterpreter",
    "get_number_interpretation",
    "get_saju_numerology_correlation",
    "get_therapeutic_question",
    "analyze_numerology",
    "analyze_numerology_compatibility",
]
