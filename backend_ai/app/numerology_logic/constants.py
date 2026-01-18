# backend_ai/app/numerology_logic/constants.py
"""
Numerology constants and mappings.
Contains letter-to-number mappings and Korean stroke counts.
"""

from typing import Dict, Set


# Pythagorean letter-to-number mapping (English)
PYTHAGOREAN_MAP: Dict[str, int] = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 6, 'P': 7, 'Q': 8, 'R': 9,
    'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8
}

# Vowels for soul urge calculation
VOWELS: Set[str] = {'A', 'E', 'I', 'O', 'U'}

# Master numbers (not reduced)
MASTER_NUMBERS: Set[int] = {11, 22, 33}

# Korean name stroke counts (simplified - common characters)
# Full implementation would use a comprehensive database
KOREAN_STROKES: Dict[str, int] = {
    # Common surname characters
    '김': 8, '이': 7, '박': 6, '최': 12, '정': 9, '강': 10, '조': 10, '윤': 4,
    '장': 11, '임': 6, '한': 15, '오': 4, '서': 10, '신': 9, '권': 22, '황': 12,
    '안': 6, '송': 11, '류': 10, '홍': 9, '유': 9, '고': 10, '문': 4, '양': 15,
    '손': 10, '배': 11, '백': 6, '허': 11, '남': 9, '심': 12, '노': 15, '하': 3,
    # Common given name characters
    '민': 5, '준': 10, '서': 10, '지': 6, '현': 16, '수': 4, '영': 5, '진': 10,
    '우': 6, '예': 13, '은': 14, '소': 8, '주': 6, '재': 13, '성': 7, '희': 12,
    '승': 12, '아': 8, '태': 4, '시': 5, '도': 12, '경': 8, '인': 6, '상': 11,
    '동': 12, '혜': 15, '연': 14, '미': 9, '원': 10, '호': 9, '석': 5, '용': 16,
    '하': 3, '윤': 4, '정': 9, '나': 7, '린': 15, '빈': 11, '율': 6, '채': 11,
}

# Life Path compatibility matrix (simplified)
# Higher score = better compatibility
COMPATIBILITY_MATRIX: Dict[tuple, int] = {
    (1, 1): 70, (1, 2): 60, (1, 3): 85, (1, 4): 50, (1, 5): 90,
    (1, 6): 65, (1, 7): 55, (1, 8): 75, (1, 9): 80,
    (2, 2): 80, (2, 3): 75, (2, 4): 85, (2, 5): 55, (2, 6): 95,
    (2, 7): 70, (2, 8): 90, (2, 9): 65,
    (3, 3): 85, (3, 4): 50, (3, 5): 95, (3, 6): 90, (3, 7): 55,
    (3, 8): 60, (3, 9): 85,
    (4, 4): 70, (4, 5): 45, (4, 6): 80, (4, 7): 90, (4, 8): 85,
    (4, 9): 55,
    (5, 5): 75, (5, 6): 50, (5, 7): 85, (5, 8): 60, (5, 9): 90,
    (6, 6): 85, (6, 7): 55, (6, 8): 70, (6, 9): 95,
    (7, 7): 80, (7, 8): 50, (7, 9): 70,
    (8, 8): 75, (8, 9): 55,
    (9, 9): 85
}
