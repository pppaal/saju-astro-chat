
# backend_ai/app/astro_parser.py
def calculate_astrology_data(params=None):
    """
    프론트엔드 DestinyMap 엔진이 계산한 실제 점성학 데이터를 그대로 사용.
    mock 계산 제거.
    """
    if params and isinstance(params, dict):
        # planets, houses, aspects, ascendant, mc, elementRatios 등 전체 포함
        print(f"[AstroParser] ✅ Using front‑engine astro payload keys: {list(params.keys())}")
        return params

    raise ValueError("❌ Astrology payload missing. computeDestinyMap 결과를 전달해야 합니다.")