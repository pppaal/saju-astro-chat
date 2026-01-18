# backend_ai/app/compatibility/constants.py
"""
Compatibility Analysis Constants
================================
사주/점성술 궁합 분석에 사용되는 모든 상수 정의

이 파일은 리팩토링되어 하위 모듈에서 임포트합니다.
하위 호환성을 위해 모든 상수를 재export합니다.

Submodules:
- elements.py: 오행/점성술 원소 매핑
- stems_branches.py: 천간/지지 관계 (합, 충, 형 등)
- synastry_mapping.py: 사주↔점성술 시나스트리 매핑
- shinsal.py: 신살(神殺) 궁합 분석
- naeum.py: 납음오행(納音五行) 궁합
- house_system.py: 12하우스 시스템 및 ASC/DSC
- astrology_aspects.py: 점성술 애스펙트, Lilith, Chiron
- timing.py: 타이밍 (삼재, 대운, 프로그레션 등)
- sipsung.py: 십성(十星) 및 금성-화성 시나스트리
"""

# ===============================================================
# ELEMENT MAPPING CONSTANTS
# ===============================================================
from .elements import (
    OHENG_TO_ASTRO,
    ASTRO_ELEMENT_TO_OHENG,
    BRANCH_ELEMENTS,
    MONTH_BRANCHES,
    OHENG_ORDER,
    STEM_TO_ELEMENT,
    STEM_POLARITY,
    ZODIAC_ELEMENTS,
    ASTRO_ELEMENT_COMPATIBILITY,
    ZODIAC_OPPOSITES,
    ZODIAC_DEGREES,
)

# ===============================================================
# HEAVENLY STEMS & EARTHLY BRANCHES
# ===============================================================
from .stems_branches import (
    HEAVENLY_STEMS,
    STEM_COMBINATIONS,
    STEM_CLASHES,
    EARTHLY_BRANCHES,
    BRANCH_SAMHAP,
    BRANCH_BANHAP,
    BRANCH_BANGHAP,
    BRANCH_BANGHAP_HALF,
    BRANCH_YUKHAP,
    BRANCH_CHUNG,
    BRANCH_HYUNG,
    BRANCH_WONGJIN,
    BRANCH_HAE,
    TWELVE_STAGES,
    TWELVE_STAGES_COMPATIBILITY,
    GONGMANG_BY_CYCLE,
)

# ===============================================================
# SYNASTRY MAPPING
# ===============================================================
from .synastry_mapping import (
    YUKHAP_SYNASTRY_MAPPING,
    CHEONGAN_HAP_SYNASTRY,
    ILGAN_SYNASTRY_MAPPING,
    SPOUSE_INDICATORS,
    YUKSIN_DYNAMICS,
    COMPOSITE_HOUSES_SAJU,
    COMPOSITE_PLANETS_SAJU,
)

# ===============================================================
# SHINSAL (神殺) CONSTANTS
# ===============================================================
from .shinsal import (
    SHINSAL_COMPATIBILITY,
    SHINSAL_DETERMINATION,
    GUIIN_DETERMINATION,
)

# ===============================================================
# NAEUM (納音) CONSTANTS
# ===============================================================
from .naeum import (
    GANJI_TO_NAEUM,
    NAEUM_TO_ELEMENT,
    NAEUM_CHARACTERISTICS,
    NAEUM_ELEMENT_COMPATIBILITY,
)

# ===============================================================
# HOUSE SYSTEM CONSTANTS
# ===============================================================
from .house_system import (
    BRANCH_TO_HOUSE,
    HOUSE_COMPATIBILITY_MEANING,
    HOUSE_AXIS_COMPATIBILITY,
    SAME_HOUSE_SCORE,
    ASC_SIGN_TRAITS,
    ASC_DSC_COMPATIBILITY,
    DSC_PARTNER_NEEDS,
)

# ===============================================================
# ASTROLOGY ASPECTS
# ===============================================================
from .astrology_aspects import (
    LILITH_SYNASTRY,
    CHIRON_SYNASTRY,
    ASPECTS,
    PLANET_SYNASTRY_WEIGHT,
    SATURN_ASPECTS_MEANING,
    ADDITIONAL_PLANET_ASPECTS,
)

# ===============================================================
# TIMING CONSTANTS
# ===============================================================
from .timing import (
    SAMJAE_GROUPS,
    SAMJAE_COMPATIBILITY_EFFECT,
    YONGSIN_INTERACTION,
    YONGSIN_CHARACTERISTICS,
    PROGRESSED_SUN_SIGN_CHANGE,
    PROGRESSED_MOON_PHASES,
    PROGRESSED_VENUS_RETROGRADE,
    PROGRESSED_MARS_ASPECTS,
    DAEUN_PROGRESSION_CORRELATION,
    SOLAR_ARC_DIRECTIONS,
    CRITICAL_PERIODS,
    DAEUN_INTERACTION,
    SEUN_INTERACTION,
)

# ===============================================================
# SIPSUNG & VENUS-MARS CONSTANTS
# ===============================================================
from .sipsung import (
    SIPSUNG_COMPATIBILITY,
    VENUS_CHARACTERISTICS,
    MARS_CHARACTERISTICS,
    VENUS_MARS_SYNASTRY,
)

# ===============================================================
# __all__ for explicit exports
# ===============================================================
__all__ = [
    # Elements
    "OHENG_TO_ASTRO",
    "ASTRO_ELEMENT_TO_OHENG",
    "BRANCH_ELEMENTS",
    "MONTH_BRANCHES",
    "OHENG_ORDER",
    "STEM_TO_ELEMENT",
    "STEM_POLARITY",
    "ZODIAC_ELEMENTS",
    "ASTRO_ELEMENT_COMPATIBILITY",
    "ZODIAC_OPPOSITES",
    "ZODIAC_DEGREES",
    # Stems/Branches
    "HEAVENLY_STEMS",
    "STEM_COMBINATIONS",
    "STEM_CLASHES",
    "EARTHLY_BRANCHES",
    "BRANCH_SAMHAP",
    "BRANCH_BANHAP",
    "BRANCH_BANGHAP",
    "BRANCH_BANGHAP_HALF",
    "BRANCH_YUKHAP",
    "BRANCH_CHUNG",
    "BRANCH_HYUNG",
    "BRANCH_WONGJIN",
    "BRANCH_HAE",
    "TWELVE_STAGES",
    "TWELVE_STAGES_COMPATIBILITY",
    "GONGMANG_BY_CYCLE",
    # Synastry Mapping
    "YUKHAP_SYNASTRY_MAPPING",
    "CHEONGAN_HAP_SYNASTRY",
    "ILGAN_SYNASTRY_MAPPING",
    "SPOUSE_INDICATORS",
    "YUKSIN_DYNAMICS",
    "COMPOSITE_HOUSES_SAJU",
    "COMPOSITE_PLANETS_SAJU",
    # Shinsal
    "SHINSAL_COMPATIBILITY",
    "SHINSAL_DETERMINATION",
    "GUIIN_DETERMINATION",
    # Naeum
    "GANJI_TO_NAEUM",
    "NAEUM_TO_ELEMENT",
    "NAEUM_CHARACTERISTICS",
    "NAEUM_ELEMENT_COMPATIBILITY",
    # House System
    "BRANCH_TO_HOUSE",
    "HOUSE_COMPATIBILITY_MEANING",
    "HOUSE_AXIS_COMPATIBILITY",
    "SAME_HOUSE_SCORE",
    "ASC_SIGN_TRAITS",
    "ASC_DSC_COMPATIBILITY",
    "DSC_PARTNER_NEEDS",
    # Astrology Aspects
    "LILITH_SYNASTRY",
    "CHIRON_SYNASTRY",
    "ASPECTS",
    "PLANET_SYNASTRY_WEIGHT",
    "SATURN_ASPECTS_MEANING",
    "ADDITIONAL_PLANET_ASPECTS",
    # Timing
    "SAMJAE_GROUPS",
    "SAMJAE_COMPATIBILITY_EFFECT",
    "YONGSIN_INTERACTION",
    "YONGSIN_CHARACTERISTICS",
    "PROGRESSED_SUN_SIGN_CHANGE",
    "PROGRESSED_MOON_PHASES",
    "PROGRESSED_VENUS_RETROGRADE",
    "PROGRESSED_MARS_ASPECTS",
    "DAEUN_PROGRESSION_CORRELATION",
    "SOLAR_ARC_DIRECTIONS",
    "CRITICAL_PERIODS",
    "DAEUN_INTERACTION",
    "SEUN_INTERACTION",
    # Sipsung
    "SIPSUNG_COMPATIBILITY",
    "VENUS_CHARACTERISTICS",
    "MARS_CHARACTERISTICS",
    "VENUS_MARS_SYNASTRY",
]
