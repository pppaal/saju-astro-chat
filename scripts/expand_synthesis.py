"""
Synthesis 파일 확장 스크립트
==============================
외행성(Jupiter, Saturn, Uranus, Neptune, Pluto) synthesis 파일을
내행성(Sun, Moon, Mercury, Venus, Mars) 수준으로 400% 확장합니다.

Usage:
    python scripts/expand_synthesis.py --planet uranus
    python scripts/expand_synthesis.py --all
    python scripts/expand_synthesis.py --planet jupiter --dry-run
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Fix Windows encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# OpenAI setup
try:
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    print("⚠️ OpenAI not installed. Run: pip install openai")

# Base path
BASE_PATH = Path(__file__).parent.parent / "backend_ai" / "data" / "graph" / "astro" / "placements" / "synthesis"

# Planet-specific prompts
PLANET_CONTEXTS = {
    "jupiter": {
        "archetype": "대교사, 행운의 신, 확장자",
        "themes": "성장, 풍요, 철학, 낙관, 과잉, 믿음",
        "jung": "집단 무의식의 확장 원리, 의미 추구",
    },
    "saturn": {
        "archetype": "현자, 시간의 신, 구조의 건설자",
        "themes": "책임, 한계, 성숙, 카르마, 두려움, 인내",
        "jung": "자아의 경계, 사회적 페르소나, 내면의 비평가",
    },
    "uranus": {
        "archetype": "혁명가, 각성자, 천재",
        "themes": "자유, 혁신, 돌파, 예측불가, 개인화, 반항",
        "jung": "개성화의 촉매, 집단 무의식의 돌파",
        "generation": "세대별 특성 (각 사인에 7년)",
    },
    "neptune": {
        "archetype": "신비주의자, 몽상가, 치유자",
        "themes": "영감, 환상, 초월, 예술, 희생, 도피",
        "jung": "집단 무의식의 바다, 아니마/아니무스의 이상화",
        "generation": "세대별 특성 (각 사인에 14년)",
    },
    "pluto": {
        "archetype": "변형자, 죽음과 재탄생의 신, 심층 심리학자",
        "themes": "변형, 권력, 집착, 재생, 그림자, 트라우마",
        "jung": "그림자의 통합, 죽음-재탄생 원형",
        "generation": "세대별 특성 (각 사인에 12-30년)",
    },
    "chiron": {
        "archetype": "상처받은 치유자, 멘토, 다리",
        "themes": "상처, 치유, 가르침, 아웃사이더, 통합",
        "jung": "상처받은 치유자 원형, 그림자의 선물",
    },
    "nodes": {
        "archetype": "운명의 축, 과거와 미래",
        "themes": "카르마, 영혼의 성장, 익숙함(남), 성장(북)",
        "jung": "개성화 여정의 방향, 그림자(남)와 자기(북)",
    },
}

ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

ZODIAC_KOREAN = {
    "Aries": "양자리", "Taurus": "황소자리", "Gemini": "쌍둥이자리", "Cancer": "게자리",
    "Leo": "사자자리", "Virgo": "처녀자리", "Libra": "천칭자리", "Scorpio": "전갈자리",
    "Sagittarius": "궁수자리", "Capricorn": "염소자리", "Aquarius": "물병자리", "Pisces": "물고기자리"
}

HOUSE_AREAS = {
    1: "자아, 정체성, 외모, 첫인상",
    2: "재정, 자원, 가치관, 자존감",
    3: "소통, 학습, 형제, 단거리 이동",
    4: "가정, 가족, 뿌리, 내면의 기반",
    5: "창조성, 로맨스, 자녀, 즐거움",
    6: "건강, 일상, 봉사, 직장",
    7: "파트너십, 결혼, 계약, 열린 적",
    8: "변형, 친밀감, 공유 자원, 죽음/재탄생",
    9: "철학, 여행, 고등교육, 믿음",
    10: "커리어, 명성, 사회적 위치, 권위",
    11: "친구, 그룹, 희망, 인류애",
    12: "영성, 무의식, 은둔, 카르마"
}


def create_expansion_prompt(planet: str, sign: str, house: int, basic_data: dict) -> str:
    """확장을 위한 프롬프트 생성"""

    context = PLANET_CONTEXTS.get(planet.lower(), {})
    sign_ko = ZODIAC_KOREAN.get(sign, sign)
    house_area = HOUSE_AREAS.get(house, "")

    # Reference structure from inner planets
    reference_structure = """
    {
      "essence": "핵심 의미 (1-2문장)",
      "expression": "이 배치가 삶에서 어떻게 표현되는지 (2-3문장)",
      "strength": "이 배치의 강점들 (쉼표로 구분된 5-7개)",
      "shadow": "그림자/도전 (쉼표로 구분된 5-7개)",
      "growth": "성장 포인트와 통합 방법 (2-3문장)",
      "jung_insight": "융 심리학적 관점에서의 해석 (2-3문장)",
      "life_advice": "이 배치를 가진 사람에게 주는 조언 (1-2문장)",
      "psychology_depth": {
        "ego_development": "자아 발달 관점 (1-2문장)",
        "shadow_work": "그림자 작업 (1-2문장)",
        "individuation_path": "개성화 경로 (1-2문장)"
      },
      "manifestation": {
        "behavior": "행동 패턴 (1문장)",
        "emotional": "감정 패턴 (1문장)",
        "physical": "신체/건강 관련 (1문장)"
      },
      "relationship_dynamics": {
        "romantic": "연애 관계에서 (1-2문장)",
        "friendship": "우정에서 (1문장)",
        "family": "가족 관계에서 (1문장)"
      },
      "career_path": {
        "ideal_fields": "적합한 분야들 (쉼표로 구분)",
        "work_style": "업무 스타일 (1문장)",
        "success_keys": "성공의 열쇠 (1문장)"
      }
    }
    """

    prompt = f"""당신은 전문 점성술사이자 융 심리학 전문가입니다.

다음 점성학 배치를 상세하게 확장해주세요:

## 기본 정보
- 행성: {planet.upper()} ({context.get('archetype', '')})
- 사인: {sign} ({sign_ko})
- 하우스: {house}하우스 ({house_area})
- 행성 테마: {context.get('themes', '')}
- 융 심리학적 맥락: {context.get('jung', '')}

## 기존 기본 해석
{json.dumps(basic_data, ensure_ascii=False, indent=2)}

## 요청사항
위 기본 해석을 바탕으로, 아래 구조에 맞게 상세하게 확장해주세요.
모든 텍스트는 한국어로 작성하세요.
점성학적으로 정확하고 심리학적으로 깊이 있게 작성해주세요.

## 출력 형식 (JSON)
{reference_structure}

주의사항:
1. 각 필드는 지정된 형식을 따르세요
2. {planet}의 세대적 특성(외행성)을 고려하세요
3. {house}하우스의 삶의 영역({house_area})에 맞게 해석하세요
4. {sign}의 에너지 특성을 반영하세요
5. 융 심리학적 통찰을 포함하세요
6. 실용적이고 통찰력 있는 조언을 제공하세요

JSON만 출력하세요. 다른 텍스트는 포함하지 마세요."""

    return prompt


def expand_single_entry(planet: str, sign: str, house: int, basic_data: dict, dry_run: bool = False) -> Optional[dict]:
    """단일 항목 확장"""

    if not HAS_OPENAI:
        print("❌ OpenAI not available")
        return None

    prompt = create_expansion_prompt(planet, sign, house, basic_data)

    if dry_run:
        print(f"  [DRY RUN] Would expand {sign}_{planet} H{house}")
        return None

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert astrologer and Jungian psychologist. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except json.JSONDecodeError as e:
        print(f"  ❌ JSON parse error: {e}")
        return None
    except Exception as e:
        print(f"  ❌ API error: {e}")
        return None


def expand_synthesis_file(planet: str, dry_run: bool = False, start_sign: str = None):
    """전체 synthesis 파일 확장"""

    filename = f"{planet.lower()}_synthesis.json"
    filepath = BASE_PATH / filename

    if not filepath.exists():
        print(f"❌ File not found: {filepath}")
        return

    print(f"\n{'='*60}")
    print(f"🔄 Processing: {filename}")
    print(f"{'='*60}")

    # Load existing file
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Track progress
    total_entries = 0
    processed = 0
    skipped = 0
    errors = 0

    # Determine starting point
    started = start_sign is None

    for key, value in data.items():
        # Skip metadata
        if key.startswith('$') or key == 'overview':
            continue

        # Parse sign from key (e.g., "Aries_Uranus" -> "Aries")
        parts = key.split('_')
        if len(parts) < 2:
            continue

        sign = parts[0]

        # Check if we should start processing
        if not started:
            if sign == start_sign:
                started = True
            else:
                continue

        print(f"\n📍 {key}")

        for house_num in range(1, 13):
            house_key = f"H{house_num}"
            total_entries += 1

            if house_key not in value:
                print(f"  ⚠️ {house_key} not found, skipping")
                skipped += 1
                continue

            basic = value[house_key]

            # Check if already expanded (has 'essence' field)
            if isinstance(basic, dict) and 'essence' in basic:
                print(f"  ⏭️ {house_key} already expanded, skipping")
                skipped += 1
                continue

            print(f"  🔧 Expanding {house_key}...", end=" ", flush=True)

            expanded = expand_single_entry(planet, sign, house_num, basic, dry_run)

            if expanded:
                # Merge with existing data
                if isinstance(basic, dict):
                    expanded = {**basic, **expanded}
                value[house_key] = expanded
                processed += 1
                print("✅")
            elif not dry_run:
                errors += 1
                print("❌")
            else:
                print("(dry run)")

            # Rate limiting - be nice to API
            if not dry_run:
                time.sleep(0.5)

        # Save after each sign (checkpoint)
        if not dry_run and processed > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  💾 Checkpoint saved")

    # Final save
    if not dry_run:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"📊 Summary for {filename}:")
    print(f"   Total entries: {total_entries}")
    print(f"   Processed: {processed}")
    print(f"   Skipped: {skipped}")
    print(f"   Errors: {errors}")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Expand synthesis files using LLM")
    parser.add_argument("--planet", type=str, help="Planet to expand (jupiter, saturn, uranus, neptune, pluto, chiron, nodes)")
    parser.add_argument("--all", action="store_true", help="Expand all outer planet files")
    parser.add_argument("--dry-run", action="store_true", help="Don't actually call API, just show what would be done")
    parser.add_argument("--start-sign", type=str, help="Start from specific sign (for resuming)")

    args = parser.parse_args()

    if not args.planet and not args.all:
        parser.print_help()
        print("\n예시:")
        print("  python scripts/expand_synthesis.py --planet uranus")
        print("  python scripts/expand_synthesis.py --all")
        print("  python scripts/expand_synthesis.py --planet jupiter --dry-run")
        print("  python scripts/expand_synthesis.py --planet neptune --start-sign Cancer")
        return

    if not HAS_OPENAI:
        print("❌ OpenAI package not installed")
        print("   Run: pip install openai")
        return

    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not set")
        print("   Add it to your .env file")
        return

    planets_to_process = []

    if args.all:
        planets_to_process = ["jupiter", "saturn", "uranus", "neptune", "pluto"]
    elif args.planet:
        planets_to_process = [args.planet.lower()]

    print(f"\n🚀 Starting expansion...")
    print(f"   Planets: {', '.join(planets_to_process)}")
    print(f"   Dry run: {args.dry_run}")
    if args.start_sign:
        print(f"   Starting from: {args.start_sign}")

    for planet in planets_to_process:
        expand_synthesis_file(planet, args.dry_run, args.start_sign)

    print("\n✨ Done!")


if __name__ == "__main__":
    main()
