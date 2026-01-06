# backend_ai/app/astro_parser.py
def calculate_astrology_data(params=None):
    """
    DestinyMap에서 전달받은 점성 데이터(payload)를 그대로 사용한다.
    프론트에서 계산된 planets/houses/aspects/ascendant/mc/elementRatios 등을 받는다.
    """
    if params and isinstance(params, dict):
        # planets, houses, aspects, ascendant, mc, elementRatios 등 전체 포맷
        print(f"[AstroParser] Using front-engine astro payload keys: {list(params.keys())}")
        return params

    raise ValueError("Astrology payload missing. computeDestinyMap result required.")
