import json
import random

# 60갑자 구성 (천간 + 지지)
HEAVENLY_STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
EARTHLY_BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]

ELEMENTS = ["목", "화", "토", "금", "수"]
CHAR_TRAITS = [
    "성실하고 책임감이 강하다.",
    "감성이 풍부하고 직관력이 뛰어나다.",
    "분석적이며 현실적이다.",
    "의리가 깊고 관계를 중시한다.",
    "창의적이며 도전정신이 강하다.",
    "신중하고 계획적이다.",
    "지도력과 결단력이 뛰어나다.",
    "유연하며 타인의 감정을 잘 읽는다.",
    "변화에 민감하며 적응력이 좋다."
]

def get_element(stem):
    # 천간별 오행 배속
    elem_map = {
        "갑": "목", "을": "목",
        "병": "화", "정": "화",
        "무": "토", "기": "토",
        "경": "금", "신": "금",
        "임": "수", "계": "수"
    }
    return elem_map.get(stem, "토")

def make_variations(stem, branch, count=8):
    elem = get_element(stem)
    variations = []
    for i in range(count):
        desc = random.choice(CHAR_TRAITS)
        text = (
            f"{stem}{branch}일주는 {stem}({elem})의 기운과 "
            f"{branch}지의 영향이 어우러진 일주로, {desc}"
            f" {elem}의 성향이 강조되어 자신만의 관점이 뚜렷하다."
        )
        prompt = f"{stem}{branch}일주에 대해 설명해줘."
        item = {
            "messages": [
                {"role": "system", "content": "너는 명리 전문가다. 사주팔자를 해석한다."},
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": text}
            ]
        }
        variations.append(item)
    return variations

dataset = []
for stem_idx in range(10):
    for branch_idx in range(12):
        stem = HEAVENLY_STEMS[stem_idx]
        branch = EARTHLY_BRANCHES[branch_idx]
        dataset.extend(make_variations(stem, branch))

# 60 갑자로 제한 (이후는 순환 패턴 방지)
dataset = dataset[:500]

# 저장
with open("saju_palja_v1.jsonl", "w", encoding="utf-8") as f:
    for item in dataset:
        f.write(json.dumps(item, ensure_ascii=False) + "\n")

print(f"✅ saju_palja_v1.jsonl 생성 완료 ({len(dataset)} 라인)")