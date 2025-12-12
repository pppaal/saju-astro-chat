"""
점성학 그래프 CSV 관계 파일 생성 스크립트
JSON 해석 데이터와 매칭되는 CSV 관계 파일들을 생성합니다.
"""

import csv
import os
from itertools import combinations, product

# 기본 경로
BASE_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(BASE_PATH, "data", "graph", "astro_database")

# 기본 요소 정의
PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition", "semisextile", "quincunx", "quintile", "biquintile"]
MAJOR_ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"]

# 특수 포인트
POINTS = ["Chiron", "Lilith", "NorthNode", "SouthNode", "PartOfFortune", "Vertex", "Ascendant", "MC", "IC", "Descendant"]

# 항성 목록
FIXED_STARS = [
    ("Regulus", "29Leo50", "Mars/Jupiter", "왕의 별, 성공과 명예"),
    ("Spica", "23Libra50", "Venus/Mars", "수확의 별, 성공과 재능"),
    ("Algol", "26Taurus10", "Saturn/Jupiter", "악마의 별, 강렬한 변형"),
    ("Aldebaran", "09Gemini47", "Mars", "봄의 눈, 성공과 명예"),
    ("Antares", "09Sagittarius46", "Mars/Jupiter", "전갈의 심장, 강렬한 열정"),
    ("Fomalhaut", "03Pisces52", "Venus/Mercury", "물고기 입, 이상주의"),
    ("Sirius", "14Cancer05", "Jupiter/Mars", "가장 밝은 별, 명성"),
    ("Canopus", "14Cancer58", "Saturn/Jupiter", "항해자의 별, 지혜"),
    ("Vega", "15Capricorn19", "Venus/Mercury", "하프 별, 예술적 재능"),
    ("Capella", "21Gemini51", "Mars/Mercury", "작은 염소, 호기심"),
    ("Rigel", "16Gemini50", "Jupiter/Mars", "오리온 발, 교육과 명예"),
    ("Betelgeuse", "28Gemini45", "Mars/Mercury", "오리온 어깨, 성공"),
    ("Polaris", "28Gemini34", "Saturn/Venus", "북극성, 방향과 안내"),
    ("Deneb", "05Pisces20", "Venus/Mercury", "백조 꼬리, 예술적 재능"),
    ("Altair", "01Aquarius47", "Mars/Jupiter", "독수리, 대담함과 야망"),
]

# 미드포인트 조합
MIDPOINT_PAIRS = [
    ("Sun", "Moon", "영혼의 점"),
    ("Venus", "Mars", "열정의 점"),
    ("Mercury", "Venus", "사랑 언어의 점"),
    ("Sun", "Venus", "매력의 점"),
    ("Sun", "Mars", "의지력의 점"),
    ("Moon", "Venus", "감정적 사랑의 점"),
    ("Moon", "Mars", "감정적 행동의 점"),
    ("Jupiter", "Saturn", "성공의 점"),
    ("Sun", "Jupiter", "행운의 점"),
    ("Mars", "Jupiter", "행동적 성공의 점"),
    ("Mercury", "Jupiter", "지적 성공의 점"),
    ("Venus", "Jupiter", "풍요의 점"),
    ("Mars", "Saturn", "절제된 행동의 점"),
    ("Sun", "Saturn", "성숙의 점"),
    ("Moon", "Saturn", "감정적 성숙의 점"),
    ("Venus", "Saturn", "사랑의 시험의 점"),
    ("Sun", "Pluto", "권력과 변형의 점"),
    ("Moon", "Pluto", "감정적 변형의 점"),
    ("Venus", "Pluto", "변형적 사랑의 점"),
    ("Mars", "Pluto", "권력 의지의 점"),
    ("Sun", "Uranus", "각성의 점"),
    ("Moon", "Uranus", "감정적 독립의 점"),
    ("Venus", "Uranus", "자유로운 사랑의 점"),
    ("Mars", "Uranus", "혁명적 행동의 점"),
    ("Sun", "Neptune", "영적 자아의 점"),
    ("Moon", "Neptune", "직관의 점"),
    ("Venus", "Neptune", "이상적 사랑의 점"),
    ("Jupiter", "Neptune", "확장된 영성의 점"),
]


def write_csv(filename, headers, rows):
    """CSV 파일 작성"""
    filepath = os.path.join(OUTPUT_PATH, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Generated: {filename} ({len(rows)} rows)")


def generate_transit_relations():
    """트랜짓 관계 생성: 트랜짓 행성 -> 네이탈 행성/포인트"""
    rows = []
    transit_planets = PLANETS  # 모든 행성이 트랜짓 가능
    natal_points = PLANETS + ["Ascendant", "MC", "NorthNode", "Chiron"]

    for t_planet in transit_planets:
        for n_point in natal_points:
            for aspect in MAJOR_ASPECTS:
                rel_id = f"TR_{t_planet}_{aspect}_{n_point}"
                desc = f"트랜짓 {t_planet}이(가) 네이탈 {n_point}와(과) {aspect}"
                rows.append([rel_id, f"TR_{t_planet}", n_point, aspect, desc])

    write_csv("relations/relations_astro_transit.csv",
              ["id", "source", "target", "relation", "description"], rows)


def generate_synastry_aspect_relations():
    """시너스트리 애스펙트 관계: A의 행성 -> B의 행성"""
    rows = []

    for p1 in PLANETS:
        for p2 in PLANETS:
            for aspect in MAJOR_ASPECTS:
                rel_id = f"SYN_{p1}_{aspect}_{p2}"
                desc = f"A의 {p1}이(가) B의 {p2}와(과) {aspect}"
                rows.append([rel_id, f"A_{p1}", f"B_{p2}", aspect, desc])

    write_csv("relations/relations_astro_synastry_aspect.csv",
              ["id", "source", "target", "relation", "description"], rows)


def generate_synastry_overlay_relations():
    """시너스트리 하우스 오버레이: A의 행성 -> B의 하우스"""
    rows = []

    for planet in PLANETS:
        for house in HOUSES:
            rel_id = f"OVERLAY_{planet}_H{house}"
            desc = f"A의 {planet}이(가) B의 {house}하우스에 위치"
            rows.append([rel_id, f"A_{planet}", f"B_H{house}", "overlay", desc])

    write_csv("relations/relations_astro_synastry_overlay.csv",
              ["id", "source", "target", "relation", "description"], rows)


def generate_midpoint_nodes():
    """미드포인트 노드 생성"""
    rows = []

    for p1, p2, name in MIDPOINT_PAIRS:
        mp_id = f"MP_{p1}_{p2}"
        desc = f"{p1}/{p2} 미드포인트 - {name}"
        rows.append([mp_id, "미드포인트", desc])

    write_csv("nodes/nodes_astro_midpoints.csv",
              ["id", "type", "description"], rows)


def generate_midpoint_relations():
    """미드포인트 관계: 행성 -> 미드포인트 활성화"""
    rows = []

    for p1, p2, name in MIDPOINT_PAIRS:
        mp_id = f"MP_{p1}_{p2}"
        # 미드포인트를 활성화하는 행성들
        for activator in PLANETS:
            if activator not in [p1, p2]:  # 자기 자신은 제외
                for aspect in ["conjunction", "square", "opposition"]:
                    rel_id = f"{activator}_{aspect}_{mp_id}"
                    desc = f"{activator}이(가) {p1}/{p2} 미드포인트를 {aspect}으로 활성화"
                    rows.append([rel_id, activator, mp_id, aspect, desc])

    write_csv("relations/relations_astro_midpoint.csv",
              ["id", "source", "target", "relation", "description"], rows)


def generate_progression_relations():
    """프로그레션 관계"""
    rows = []

    # 진행 달이 사인에 들어감
    for sign in SIGNS:
        rel_id = f"SP_Moon_enters_{sign}"
        desc = f"진행 달이 {sign}에 진입"
        rows.append([rel_id, "SP_Moon", sign, "enters", desc])

    # 진행 달이 하우스에 들어감
    for house in HOUSES:
        rel_id = f"SP_Moon_enters_H{house}"
        desc = f"진행 달이 {house}하우스에 진입"
        rows.append([rel_id, "SP_Moon", f"H{house}", "enters", desc])

    # 진행 태양이 사인에 들어감
    for sign in SIGNS:
        rel_id = f"SP_Sun_enters_{sign}"
        desc = f"진행 태양이 {sign}에 진입"
        rows.append([rel_id, "SP_Sun", sign, "enters", desc])

    # 솔라 아크: 진행 행성 -> 네이탈 포인트
    for sa_planet in PLANETS:
        for natal_point in PLANETS + ["Ascendant", "MC"]:
            for aspect in MAJOR_ASPECTS:
                rel_id = f"SA_{sa_planet}_{aspect}_{natal_point}"
                desc = f"솔라 아크 {sa_planet}이(가) 네이탈 {natal_point}와(과) {aspect}"
                rows.append([rel_id, f"SA_{sa_planet}", natal_point, aspect, desc])

    write_csv("relations/relations_astro_progression.csv",
              ["id", "source", "target", "relation", "description"], rows)


def generate_return_relations():
    """솔라/루나 리턴 관계"""
    rows = []

    # 솔라 리턴 어센던트 in 사인
    for sign in SIGNS:
        rel_id = f"SR_ASC_{sign}"
        desc = f"솔라 리턴 어센던트가 {sign}에 위치"
        rows.append([rel_id, "SR_ASC", sign, "in_sign", desc])

    # 솔라 리턴 태양 in 하우스
    for house in HOUSES:
        rel_id = f"SR_Sun_H{house}"
        desc = f"솔라 리턴 태양이 {house}하우스에 위치"
        rows.append([rel_id, "SR_Sun", f"H{house}", "in_house", desc])

    # 솔라 리턴 달 in 하우스
    for house in HOUSES:
        rel_id = f"SR_Moon_H{house}"
        desc = f"솔라 리턴 달이 {house}하우스에 위치"
        rows.append([rel_id, "SR_Moon", f"H{house}", "in_house", desc])

    # 솔라 리턴 행성 in 하우스
    for planet in PLANETS:
        for house in HOUSES:
            rel_id = f"SR_{planet}_H{house}"
            desc = f"솔라 리턴 {planet}이(가) {house}하우스에 위치"
            rows.append([rel_id, f"SR_{planet}", f"H{house}", "in_house", desc])

    # 루나 리턴 달 in 하우스
    for house in HOUSES:
        rel_id = f"LR_Moon_H{house}"
        desc = f"루나 리턴 달이 {house}하우스에 위치"
        rows.append([rel_id, "LR_Moon", f"H{house}", "in_house", desc])

    write_csv("relations/relations_astro_return.csv",
              ["id", "source", "target", "relation", "description"], rows)


def generate_fixed_star_nodes():
    """항성 노드 생성"""
    rows = []

    for name, position, nature, desc in FIXED_STARS:
        rows.append([name, "항성", position, nature, desc])

    write_csv("nodes/nodes_astro_fixed_stars.csv",
              ["id", "type", "position", "nature", "description"], rows)


def generate_fixed_star_relations():
    """항성-행성 관계"""
    rows = []

    for star_name, _, _, _ in FIXED_STARS:
        for planet in PLANETS + ["Ascendant", "MC"]:
            rel_id = f"{star_name}_conjunct_{planet}"
            desc = f"{star_name}이(가) {planet}와(과) 합"
            rows.append([rel_id, star_name, planet, "conjunction", desc])

    write_csv("relations/relations_astro_fixed_stars.csv",
              ["id", "source", "target", "relation", "description"], rows)


def generate_eclipse_relations():
    """이클립스 관계"""
    rows = []

    # 일식/월식 in 하우스
    for eclipse_type in ["Solar", "Lunar"]:
        for house in HOUSES:
            rel_id = f"{eclipse_type}_Eclipse_H{house}"
            desc = f"{eclipse_type} 이클립스가 {house}하우스에서 발생"
            rows.append([rel_id, f"{eclipse_type}_Eclipse", f"H{house}", "in_house", desc])

    # 일식/월식 in 사인
    for eclipse_type in ["Solar", "Lunar"]:
        for sign in SIGNS:
            rel_id = f"{eclipse_type}_Eclipse_{sign}"
            desc = f"{eclipse_type} 이클립스가 {sign}에서 발생"
            rows.append([rel_id, f"{eclipse_type}_Eclipse", sign, "in_sign", desc])

    write_csv("relations/relations_astro_eclipse.csv",
              ["id", "source", "target", "relation", "description"], rows)


def generate_retrograde_nodes():
    """역행 노드 생성"""
    rows = []
    retrograde_planets = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]

    for planet in retrograde_planets:
        rows.append([f"{planet}_Rx", "역행", f"{planet} 역행 상태"])

    write_csv("nodes/nodes_astro_retrograde.csv",
              ["id", "type", "description"], rows)


def generate_composite_relations():
    """합성 차트 관계"""
    rows = []

    # 합성 차트 행성 in 하우스
    for planet in PLANETS:
        for house in HOUSES:
            rel_id = f"COMP_{planet}_H{house}"
            desc = f"합성 차트 {planet}이(가) {house}하우스에 위치"
            rows.append([rel_id, f"COMP_{planet}", f"H{house}", "in_house", desc])

    # 합성 차트 내 애스펙트
    for p1, p2 in combinations(PLANETS, 2):
        for aspect in MAJOR_ASPECTS:
            rel_id = f"COMP_{p1}_{aspect}_{p2}"
            desc = f"합성 차트에서 {p1}와(과) {p2}가 {aspect}"
            rows.append([rel_id, f"COMP_{p1}", f"COMP_{p2}", aspect, desc])

    write_csv("relations/relations_astro_composite.csv",
              ["id", "source", "target", "relation", "description"], rows)


def main():
    """모든 CSV 파일 생성"""
    print("=" * 50)
    print("Generating Astrology CSV Relations...")
    print("=" * 50)

    # 노드 생성
    generate_midpoint_nodes()
    generate_fixed_star_nodes()
    generate_retrograde_nodes()

    # 관계 생성
    generate_transit_relations()
    generate_synastry_aspect_relations()
    generate_synastry_overlay_relations()
    generate_midpoint_relations()
    generate_progression_relations()
    generate_return_relations()
    generate_fixed_star_relations()
    generate_eclipse_relations()
    generate_composite_relations()

    print("=" * 50)
    print("Done!")
    print("=" * 50)


if __name__ == "__main__":
    main()
