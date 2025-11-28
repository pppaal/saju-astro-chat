# backend_ai/model/fusion_generate.py

# backend_ai/model/fusion_generate.py
import os
import re
import json
import traceback
from datetime import datetime
from dotenv import load_dotenv
from together import Together
from openai import OpenAI
from backend_ai.data.graph.utils import search_graphs

"""
Fusion Generator 2단계 하이브리드 버전 (완전 안정판)
1️⃣ Together AI (Llama 3.3 70B Turbo) → 분석 / 서술 초안 생성
2️⃣ GPT‑5 mini (OpenAI) → 감성적·자연스러운 서사체로 후처리
"""

# ===============================================================
# 🔑 환경 변수 로드
# ===============================================================
load_dotenv()
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ===============================================================
# 🧩 LLM 클라이언트 세팅
# ===============================================================
def get_together_llm():
    if not TOGETHER_API_KEY:
        raise ValueError("❌ TOGETHER_API_KEY 환경 변수 없음.")
    return Together(api_key=TOGETHER_API_KEY)


def get_openai_llm():
    if not OPENAI_API_KEY:
        raise ValueError("❌ OPENAI_API_KEY 환경 변수 없음.")
    return OpenAI(api_key=OPENAI_API_KEY)


# ===============================================================
# 🧱 프롬프트 프리셋
# ===============================================================
PRESETS = {
    "life_path": """당신은 동서양의 명리학과 점성학을 융합하여 해석하는 전문가이자 작가입니다.
사주와 점성 데이터를 종합해 한 인간의 기질, 성장, 인생 흐름을 이야기처럼 서술하세요.
결과는 온전히 한국어로만 표현하며, 영어·기호·코드 표기는 절대 금지됩니다.
""",
    "career": """당신은 동서양 통합 명리·점성 커리어 해석 전문가입니다.
사주와 점성의 흐름을 기반으로 개인의 직업적 강점과 성장 과정을 서사적으로 요약하세요.
""",
    "relationship": """당신은 관계와 감정의 성향을 통합적으로 해석하는 라이프 컨설턴트입니다.
사주와 점성을 함께 읽어 인간관계의 본질을 따뜻하고 자연스럽게 풀어내세요.
""",
}

# ===============================================================
# ⚙️ GPT‑5 mini 후처리 함수 (최신 규격)
# ===============================================================
def refine_with_gpt5mini(raw_text: str, theme: str) -> str:
    """
    Llama 출력문을 GPT‑5 mini로 감성적·자연스러운 서사체로 재작성
    """
    try:
        gpt = get_openai_llm()
        system_prompt = (
            "너는 점성학적 데이터를 감성적으로 해석하는 작가야. "
            "아래의 분석 결과를 자연스러운 한국어 서사체로 다듬되, "
            "중복된 표현을 줄이고 문단 구조를 정돈해줘."
        )

        # ✅ GPT‑5 mini는 temperature, top_p 미지원 → 제거
        resp = gpt.chat.completions.create(
            model="gpt-5-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"주제: {theme}\n\n아래 내용을 작가적 서술로 다듬어줘:\n\n{raw_text}",
                },
            ],
            max_completion_tokens=7000,
        )

        return resp.choices[0].message.content.strip()

    except Exception as e:
        print(f"[refine_with_gpt5mini] ⚠️ GPT‑5 mini 오류: {e}")
        return raw_text


# ===============================================================
# 🧠 Fusion Report Generator
# ===============================================================
def generate_fusion_report(
    model,
    saju_text: str,
    astro_text: str,
    theme: str,
    user_prompt: str = "",
    dataset_text: str = "",
):
    """
    사주 + 점성 + 그래프 + 사용자 데이터 기반 융합 리포트 생성
    1단계: Together AI로 논리 해석
    2단계: GPT‑5 mini로 감성 보정
    """
    try:
        print("🚀 [FusionGenerate] 1단계: Together LLM 요청 시작")

        # 🔍 그래프 검색
        query = f"{saju_text}\n{astro_text}\n{theme}"
        graph_context = search_graphs(query, top_k=6)

        # 🌐 프롬프트 구성
        preset_text = PRESETS.get(theme, PRESETS["life_path"])
        dataset_summary = (
            f"\n\n📚 사용자 데이터셋 요약:\n{dataset_text.strip()}\n"
            if dataset_text else ""
        )
        extra_user = f"\n\n🗣️ 사용자의 요청: {user_prompt}\n" if user_prompt else ""

        # ==========================================================
        # 1단계: Together Llama로 섹션별 생성
        # ==========================================================
        sections = ["요약", "개요", "성향", "조언"]
        section_texts = []

        for sec in sections:
            print(f"📄 [Together] '{sec}' 생성 중...")
            sub_prompt = f"""
{preset_text}

지금은 '{sec}' 부분을 작성하는 단계입니다.
사주, 점성, 그래프, 사용자 데이터를 종합하여 '{sec}'에 맞는 내용을 서술형 한국어로 작성하세요.
- 중복 문장·해석 금지
- 자연스러운 연결
- 길이: 약 1200~2000자
- 제목은 포함하지 말 것

[그래프]
{graph_context}

[사주]
{saju_text}

[점성]
{astro_text}

{dataset_summary}
{extra_user}
"""
            resp = model.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                messages=[{"role": "user", "content": sub_prompt.strip()}],
                temperature=0.1,
                top_p=0.9,
                max_tokens=2600,
            )

            text = resp.choices[0].message.content.strip()
            text = re.sub(r"(#+\s*(요약|개요|성향|조언)\s*)", "", text)
            text = re.sub(r"\n{3,}", "\n\n", text)
            section_texts.append(text.strip())

        llama_report = "\n\n".join(section_texts).strip()
        print("✅ [Together] 1단계 생성 완료, GPT‑5 mini 후처리 시작...")

        # ==========================================================
        # 2단계: GPT‑5 mini 후처리
        # ==========================================================
        refined_report = refine_with_gpt5mini(llama_report, theme)

        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "theme": theme,
            "fusion_layer": refined_report,
            "graph_context": graph_context,
        }

    except Exception as e:
        print(f"[FusionGenerate] ❌ 오류: {e}")
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc(),
            "fusion_layer": "",
            "graph_context": "",
        }


# ===============================================================
# 🧪 LOCAL TEST
# ===============================================================
if __name__ == "__main__":
    """로컬 테스트 실행"""
    try:
        llama = get_together_llm()

        saju_sample = (
            "일간은 임수(水)로 감수성과 직관이 뛰어나며, "
            "목기(木氣)와 화기(火氣)가 균형을 이뤄 창의력과 추진력이 함께 발현됩니다. "
            "대운과 세운의 흐름은 이 사람의 인생을 성장과 전환의 시기로 이끕니다."
        )
        astro_sample = (
            "태양은 사자자리에, 달은 쌍둥이자리에 있습니다. "
            "상승궁은 물병자리로 리더십과 지적 호기심, 독창적인 세계관이 돋보입니다."
        )
        dataset_info = (
            "사용자 데이터셋에 따르면 타인의 감정을 빠르게 파악하며, "
            "내면의 균형과 자율성을 중요하게 여깁니다."
        )

        result = generate_fusion_report(
            llama,
            saju_sample,
            astro_sample,
            "life_path",
            user_prompt="전체를 이야기처럼 연결하되 따뜻한 어조로 작성",
            dataset_text=dataset_info,
        )

        print("\n🌟 ✅ 결과 미리보기:")
        print(result["fusion_layer"][:800], "...\n")

    except Exception as err:
        print("❌ 테스트 실패:", err)