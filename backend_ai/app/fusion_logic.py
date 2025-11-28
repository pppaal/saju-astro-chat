#//backend_ai/app/fusion_logic.py//

# backend_ai/app/fusion_logic.py
import os
import sys
import json
import traceback
import random
from datetime import datetime
from dotenv import load_dotenv

sys.path.append(os.path.dirname(__file__))

from graph_rag import GraphRAG
from rule_engine import RuleEngine
from backend_ai.model.fusion_generate import get_llm, generate_fusion_report

# 🔹 테마별 품질/길이 메모리
report_memory: dict[str, dict] = {}


# ===============================================================
# 🔧 FULL DATA NATURALIZER
# ===============================================================
def naturalize_facts(saju: dict, astro: dict) -> tuple[str, str]:
    """사주 + 점성 전체 데이터를 빠짐없이 서술화합니다."""
    # -------------------- SAJU --------------------
    s_parts = []
    facts = saju.get("facts", {})
    pillars = saju.get("pillars", {})
    day_master = saju.get("dayMaster", {})
    unse = saju.get("unse", {})
    sinsal = saju.get("sinsal", {})

    if pillars:
        s_parts.append(
            f"사주는 년주 {pillars.get('year')} · 월주 {pillars.get('month')} · "
            f"일주 {pillars.get('day')} · 시주 {pillars.get('time')}로 구성되어 있습니다."
        )
    if day_master:
        if isinstance(day_master, dict):
            s_parts.append(
                f"일간은 {day_master.get('name')}이며, 오행은 {day_master.get('element')} 기운을 가집니다."
            )
        else:
            s_parts.append(f"일간은 {day_master}입니다.")

    if "fiveElements" in facts:
        fe = facts["fiveElements"]
        if isinstance(fe, dict):
            fe_str = ", ".join([f"{k}:{v}" for k, v in fe.items()])
            s_parts.append(f"오행의 분포는 {fe_str} 입니다.")
    if "tenGods" in facts:
        s_parts.append(f"십성 분포: {facts['tenGods']}")
    if "powerBalance" in facts:
        s_parts.append(f"기운 강약: {facts['powerBalance']}")

    for key, label in [("daeun", "대운"), ("annual", "세운"), ("monthly", "월운"), ("iljin", "일진")]:
        cycles = unse.get(key, [])
        if cycles:
            names = [c.get("name") or str(c) for c in cycles[:8]]
            s_parts.append(f"{label}의 흐름은 {', '.join(names)} 등으로 이어집니다.")
    if sinsal and sinsal.get("hits"):
        s_names = [h.get("name") for h in sinsal["hits"] if h.get("name")]
        if s_names:
            s_parts.append(f"작용하는 주요 신살은 {', '.join(s_names[:15])} 등이 있습니다.")
    saju_text = " ".join(s_parts) or "사주 관련 데이터 없음."

    # -------------------- ASTRO --------------------
    a_parts = []
    facts = astro.get("facts", {})
    planets = astro.get("planets", [])
    houses = astro.get("houses", [])
    aspects = astro.get("aspects", [])
    asc = astro.get("ascendant")
    mc = astro.get("mc")
    meta = astro.get("meta", {})
    options = astro.get("options", {})

    if planets:
        for p in planets[:10]:
            if isinstance(p, dict):
                a_parts.append(f"{p.get('name')}은 {p.get('sign')} 자리 {p.get('house')} 하우스에 위치합니다.")
    if asc:
        a_parts.append(f"상승궁은 {asc.get('sign')} 자리이며 외적 인상과 진입 태도를 의미합니다.")
    if mc:
        a_parts.append(f"중천(MC)은 {mc.get('sign')} 자리로 사회적 성취와 목표를 상징합니다.")
    if houses:
        a_parts.append(f"{len(houses)}개의 하우스 데이터가 있으며, 각 영역의 에너지를 보여줍니다.")
    if aspects:
        asp_str = ", ".join([f"{a['planet1']}–{a['planet2']} {a['aspect']}" for a in aspects[:10]])
        a_parts.append(f"행성 간 주요 위상은 {asp_str} 입니다.")
    if facts.get("elementRatios"):
        er = facts["elementRatios"]
        er_str = ", ".join([f"{k}:{round(v,2)}" for k, v in er.items()])
        a_parts.append(f"원소 비율은 {er_str} 로 균형이 형성됩니다.")
    if meta:
        a_parts.append(f"점성 메타 데이터: {json.dumps(meta, ensure_ascii=False)[:500]}")
    if options:
        a_parts.append(f"옵션: {json.dumps(options, ensure_ascii=False)[:500]}")
    astro_text = " ".join(a_parts) or "점성 관련 데이터 없음."

    return saju_text, astro_text


# ===============================================================
# 🧠  MAIN INTERPRETER (Fusion Controller)
# ===============================================================
def interpret_with_ai(facts: dict):
    """
    사주 + 점성 + 그래프 + 룰 + LLM 융합 해석 메인 로직
    품질/길이 자동 보정 루프 포함
    """
    load_dotenv()
    try:
        api_key = os.getenv("TOGETHER_API_KEY")
        if not api_key:
            raise ValueError("❌ TOGETHER_API_KEY가 설정되어 있지 않습니다.")

        # 1️⃣  Graph + Rule 검색
        data_base = os.path.join(os.path.dirname(__file__), "..", "data")
        rag = GraphRAG(data_base)
        linked = {
            "saju": rag.query(facts.get("saju", {}), domain_priority="saju"),
            "astro": rag.query(facts.get("astro", {}), domain_priority="astro"),
        }

        rules_base = os.path.join(os.path.dirname(__file__), "..", "data", "rules")
        rule_engine = RuleEngine(os.path.join(rules_base, "fusion"))
        rule_eval = rule_engine.evaluate(facts)

        base_context = (
            f"[📊 그래프 검색요약]\n{json.dumps(linked, ensure_ascii=False, indent=2)}\n\n"
            f"[📖 룰엔진 요약]\n{json.dumps(rule_eval, ensure_ascii=False, indent=2)}"
        )

        # 2️⃣  데이터 자연화
        saju_text, astro_text = naturalize_facts(facts.get("saju", {}), facts.get("astro", {}))
        theme = facts.get("theme", "life_path")

        # 3️⃣  모델 호출 + 품질 루프
        model = get_llm()
        meta = report_memory.get(theme, {"avg_len": 4800, "calls": 0})
        prev_avg = meta["avg_len"]

        out = generate_fusion_report(model, saju_text, astro_text, theme)
        fusion_text = out["fusion_layer"]
        graph_context = out["graph_context"]
        current_len = len(fusion_text)

        # 길이/품질 기록 갱신
        meta["avg_len"] = (meta["avg_len"] * meta["calls"] + current_len) / (meta["calls"] + 1)
        meta["calls"] += 1
        report_memory[theme] = meta

        adjust = 0.1 if current_len < prev_avg * 0.8 else (-0.05 if current_len > prev_avg * 1.2 else 0)
        out["sample_adjust"] = adjust

        context_text = f"{base_context}\n\n[🔗 그래프 검색 결과]\n{graph_context}"

        # 반환
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "theme": theme,
            "fusion_layer": fusion_text,
            "context": context_text,
            "stats": {
                "current_len": current_len,
                "avg_len": round(meta["avg_len"]),
                "adjust": adjust,
                "calls": meta["calls"],
            },
        }

    except Exception as e:
        print(f"[FusionLogic] ❌ 오류: {e}")
        traceback.print_exc()
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}


# ===============================================================
# 🧪 LOCAL TEST
# ===============================================================
if __name__ == "__main__":
    sample = {
        "theme": "life_path",
        "saju": {
            "pillars": {"year": "경자", "month": "신축", "day": "임오", "time": "무술"},
            "dayMaster": {"name": "임", "element": "수"},
            "unse": {
                "daeun": [{"name": "갑인"}, {"name": "을묘"}],
                "annual": [{"name": "병진"}],
            },
            "sinsal": {"hits": [{"name": "홍염"}, {"name": "문창"}]},
        },
        "astro": {
            "planets": [
                {"name": "Sun", "sign": "Leo", "house": 10},
                {"name": "Moon", "sign": "Scorpio", "house": 2},
            ],
            "ascendant": {"sign": "Virgo"},
            "mc": {"sign": "Gemini"},
            "aspects": [{"planet1": "Sun", "planet2": "Moon", "aspect": "Square"}],
        },
        "prompt": "이 사람의 전 생애적 운명 흐름을 사주와 점성 관점에서 완전하게 결합하여 설명해줘.",
    }

    print(json.dumps(interpret_with_ai(sample), ensure_ascii=False, indent=2))