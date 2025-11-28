# backend_ai/test_client.py
from backend_ai.model.fusion_generate import generate_fusion_report
from backend_ai.model.llm_connect import get_llm

def main():
    # 1️⃣ LLM 초기화
    model = get_llm()

    # 2️⃣ 테스트 데이터
    saju_text = "일주: 甲午, 월지: 丁巳, 시지: 己未 — 불의 기운이 강하고 추진력이 강함."
    astro_text = "Sun: Leo, Moon: Scorpio, Asc: Virgo — 리더십과 예민한 감정의 조화."
    theme = "life_path"

    # 3️⃣ Fusion 리포트 생성
    result = generate_fusion_report(model, saju_text, astro_text, theme)

    # 4️⃣ 그래프 컨텍스트 출력
    print("\n--- 그래프 맥락 ---")
    for node in result["graph_context"]:
        print(f"{node['source']} | {node['label']} ({node['type']}) : {node['description']}")

    # 5️⃣ Fusion 결과 출력
    print("\n--- Fusion 결과 (요약) ---")
    print(result["fusion_layer"][:1000])

if __name__ == "__main__":
    main()