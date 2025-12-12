#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, os, sys, hashlib
from itertools import product
from pathlib import Path

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

class CorpusLoader:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
        self.jung_quotes = {}
        self.stoic_quotes = {}
        self.load_all()

    def load_all(self):
        jung_path = self.base_path / "corpus" / "jung"
        stoic_path = self.base_path / "corpus" / "stoic"
        if jung_path.exists():
            for file in jung_path.glob("*.json"):
                try:
                    with open(file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.jung_quotes[data.get("concept", file.stem)] = data.get("quotes", [])
                except: pass
        if stoic_path.exists():
            for file in stoic_path.glob("*.json"):
                try:
                    with open(file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.stoic_quotes[data.get("philosopher", file.stem)] = data.get("quotes", [])
                except: pass
        print(f"[Corpus] Jung: {list(self.jung_quotes.keys())}")
        print(f"[Corpus] Stoic: {list(self.stoic_quotes.keys())}")

    def get_jung_quote(self, concept, seed=None):
        quotes = self.jung_quotes.get(concept, [])
        if not quotes:
            for key in self.jung_quotes:
                if concept.lower() in key.lower(): quotes = self.jung_quotes[key]; break
        if not quotes: quotes = self.jung_quotes.get("shadow", [])
        if quotes:
            idx = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(quotes) if seed else 0
            return quotes[idx]
        return None

    def get_stoic_quote(self, philosopher=None, seed=None):
        if philosopher and philosopher in self.stoic_quotes:
            quotes = self.stoic_quotes[philosopher]
        else:
            quotes = [q for ql in self.stoic_quotes.values() for q in ql]
        if quotes:
            idx = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(quotes) if seed else 0
            return quotes[idx]
        return None

PLANETS = {"Sun": {"kr": "태양", "jung": "의식의 중심", "stoic": "이성의 불꽃"},
    "Moon": {"kr": "달", "jung": "무의식의 바다", "stoic": "감정 관찰"},
    "Mercury": {"kr": "수성", "jung": "메신저", "stoic": "분별력"},
    "Venus": {"kr": "금성", "jung": "아니마", "stoic": "내적 아름다움"},
    "Mars": {"kr": "화성", "jung": "전사", "stoic": "용기"},
    "Jupiter": {"kr": "목성", "jung": "현자", "stoic": "만족"},
    "Saturn": {"kr": "토성", "jung": "시련", "stoic": "메멘토 모리"},
    "Uranus": {"kr": "천왕성", "jung": "번갯불", "stoic": "유연성"},
    "Neptune": {"kr": "해왕성", "jung": "합일", "stoic": "환상 경계"},
    "Pluto": {"kr": "명왕성", "jung": "심연", "stoic": "변화 수용"}}

SIGNS = {"Aries": "양자리", "Taurus": "황소자리", "Gemini": "쌍둥이자리", "Cancer": "게자리",
    "Leo": "사자자리", "Virgo": "처녀자리", "Libra": "천칭자리", "Scorpio": "전갈자리",
    "Sagittarius": "궁수자리", "Capricorn": "염소자리", "Aquarius": "물병자리", "Pisces": "물고기자리"}

HOUSES = {1: "자아", 2: "가치", 3: "소통", 4: "가정", 5: "창조", 6: "일상",
    7: "파트너십", 8: "변환", 9: "철학", 10: "커리어", 11: "공동체", 12: "무의식"}

ARCHETYPES = {"Hero": {"light": "용기", "shadow": "무모함", "corpus": "hero"},
    "Mother": {"light": "무조건적 사랑", "shadow": "질식 사랑", "corpus": "mother"},
    "Father": {"light": "지혜로운 인도", "shadow": "권위주의", "corpus": "father_wise"},
    "Shadow": {"light": "막대한 에너지", "shadow": "투사", "corpus": "shadow"},
    "Self": {"light": "온전함", "shadow": "팽창", "corpus": "self"},
    "Persona": {"light": "적응력", "shadow": "자아 상실", "corpus": "persona"},
    "Anima": {"light": "감수성", "shadow": "변덕", "corpus": "anima_animus"},
    "Animus": {"light": "논리", "shadow": "독단", "corpus": "anima_animus"},
    "Child": {"light": "창조성", "shadow": "미성숙", "corpus": "child_trickster"},
    "Trickster": {"light": "유머", "shadow": "기만", "corpus": "child_trickster"},
    "Wise Old Man": {"light": "깊은 지혜", "shadow": "현학", "corpus": "father_wise"},
    "Maiden": {"light": "순수", "shadow": "성장 거부", "corpus": "individuation"},
    "Complex": {"light": "자기 이해", "shadow": "무의식 지배", "corpus": "complexes"},
    "Imagination": {"light": "내면 탐험", "shadow": "현실 이탈", "corpus": "active_imagination"},
    "Transcendence": {"light": "통합", "shadow": "분열", "corpus": "transcendent_function"}}

VIRTUES = {"Wisdom": "marcus_aurelius", "Courage": "seneca", "Temperance": "epictetus", "Justice": "marcus_aurelius"}

def gen_jung(corpus, p, s, h, a):
    seed = f"{p}-{s}-{h}-{a}"
    q = corpus.get_jung_quote(ARCHETYPES[a]["corpus"], seed)
    quote = q.get("kr", "") if q else ""
    src = q.get("source", "Jung") if q else "Jung"
    pk = PLANETS[p]["kr"]
    sk = SIGNS[s]
    hk = HOUSES[h]
    light = ARCHETYPES[a]["light"]
    shadow = ARCHETYPES[a]["shadow"]
    return f'Jung: "{quote}" ({src})\n\n{pk}이 {sk} 에너지로 {h}하우스({hk})에서 {a}을 활성화. 빛: {light}. 그림자: {shadow}.'

def gen_stoic(corpus, v, p, h):
    seed = f"{v}-{p}-{h}"
    q = corpus.get_stoic_quote(VIRTUES[v], seed)
    quote = q.get("kr", "") if q else ""
    src = q.get("source", "Stoic") if q else "Stoic"
    pk = PLANETS[p]["kr"]
    hk = HOUSES[h]
    stoic = PLANETS[p]["stoic"]
    return f'스토아: "{quote}" ({src})\n\n{pk}이 {h}하우스({hk})에서 {v}를 요청. {stoic}'

if __name__ == "__main__":
    print("V4 Ultimate Edition")
    script_dir = Path(__file__).parent
    graph_dir = script_dir.parent  # graph folder
    data_dir = graph_dir.parent    # data folder (contains corpus)
    rules_dir = graph_dir / "rules" / "persona"
    rules_dir.mkdir(parents=True, exist_ok=True)

    corpus = CorpusLoader(data_dir)

    jung = {"meta": {"persona": "Analyst", "count": 0}}
    rid = 1
    print("[Jung V4] 생성 중...")
    for p, s, h, a in product(PLANETS.keys(), SIGNS.keys(), HOUSES.keys(), ARCHETYPES.keys()):
        jung[f"rule_{rid}"] = {"when": [p.lower(), s.lower(), f"house {h}", a.lower()], "text": gen_jung(corpus, p, s, h, a), "weight": 4}
        rid += 1
        if rid % 5000 == 0: print(f"  {rid}개...")
    jung["meta"]["count"] = rid - 1
    print(f"[Jung V4] {rid-1}개 완료")

    stoic = {"meta": {"persona": "Strategist", "count": 0}}
    rid = 1
    print("[Stoic V4] 생성 중...")
    for v, p, h in product(VIRTUES.keys(), PLANETS.keys(), HOUSES.keys()):
        stoic[f"rule_{rid}"] = {"when": [v.lower(), p.lower(), f"house {h}"], "text": gen_stoic(corpus, v, p, h), "weight": 4}
        rid += 1
    stoic["meta"]["count"] = rid - 1
    print(f"[Stoic V4] {rid-1}개 완료")

    with open(rules_dir / "analyst_jung_v4.json", "w", encoding="utf-8") as f:
        json.dump(jung, f, ensure_ascii=False, indent=2)
    with open(rules_dir / "strategist_stoic_v4.json", "w", encoding="utf-8") as f:
        json.dump(stoic, f, ensure_ascii=False, indent=2)

    jc = jung["meta"]["count"]
    sc = stoic["meta"]["count"]
    print(f"\nJung: {jc:,}개")
    print(f"Stoic: {sc:,}개")
    print(f"Total: {jc + sc:,}개")
    print("\n[Sample Jung]")
    print(jung["rule_1"]["text"][:200])
