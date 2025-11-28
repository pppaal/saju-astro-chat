#backend_ai/app/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from backend_ai.app.fusion_logic import interpret_with_ai
from backend_ai.app.saju_parser import calculate_saju_data
from backend_ai.app.astro_parser import calculate_astrology_data
import os

# ============================================================
# 🚀 Flask Application
# ============================================================
app = Flask(__name__)
CORS(app)  # ✅ 프론트(Next.js)와 연동 시 CORS 허용

# ------------------------------------------------------------
# 기본 확인용 라우트
# ------------------------------------------------------------
@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status": "ok",
        "message": "✨ Fusion AI (Saju + Astrology + Tarot) backend is running!"
    })


# ------------------------------------------------------------
# 🔮 Fusion 통합 해석 엔드포인트
# ------------------------------------------------------------
@app.route("/ask", methods=["POST"])
def ask():
    """
    프런트엔드에서 전달한 사주, 점성, 타로 데이터를 받아
    fusion_logic을 통해 해석 결과를 반환.
    """
    try:
        data = request.get_json(force=True)
        saju_data = data.get("saju") or {}
        astro_data = data.get("astro") or {}
        tarot_data = data.get("tarot") or {}
        theme = data.get("theme", "daily")
        prompt = data.get("prompt")  # ✅ 추가된 부분 (테마 프롬프트 전달 받기)

        print(f"📩 [ASK] Theme: {theme}")  # 로그 확인용

        # ✅ 필수 facts 구성
        facts = {
            "theme": theme,
            "saju": saju_data,
            "astro": astro_data,
            "tarot": tarot_data,
            "prompt": prompt,  # ✅ 추가된 부분 (interpret_with_ai로 전달)
        }

        result = interpret_with_ai(facts)
        return jsonify({"status": "success", "data": result})

    except Exception as e:
        print(f"[ERROR] /ask 실패 → {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# ------------------------------------------------------------
# 🧭 사주만 단독 계산 테스트
# ------------------------------------------------------------
@app.route("/calc_saju", methods=["POST"])
def calc_saju():
    try:
        body = request.get_json(force=True)
        birth_date = body.get("birth_date")
        birth_time = body.get("birth_time")
        gender = body.get("gender", "male")

        result = calculate_saju_data(birth_date, birth_time, gender)
        return jsonify({"status": "success", "saju": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ------------------------------------------------------------
# 🌌 점성학만 단독 계산 테스트
# ------------------------------------------------------------
@app.route("/calc_astro", methods=["POST"])
def calc_astro():
    try:
        body = request.get_json(force=True)
        result = calculate_astrology_data({
            "year": body.get("year"),
            "month": body.get("month"),
            "day": body.get("day"),
            "hour": body.get("hour"),
            "minute": body.get("minute"),
            "latitude": body.get("latitude"),
            "longitude": body.get("longitude"),
        })
        return jsonify({"status": "success", "astro": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ------------------------------------------------------------
# ✨ 구동 시작점
# ------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Flask server starting on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)