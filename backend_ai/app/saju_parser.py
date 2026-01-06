# backend_ai/app/saju_parser.py

def calculate_saju_data(*args, **kwargs):
    """
    DestinyMap에서 전달받은 사주 데이터(payload)를 그대로 사용한다.
    프론트에서 계산된 pillars/daeun/sinsal/annual 구조를 기대한다.
    """
    payload = kwargs.get("payload")
    if payload and isinstance(payload, dict):
        # front-engine에서 생성된 pillars, daeun, sinsal, annual 등 전체 포맷
        print(f"[SajuParser] Using front-engine saju payload keys: {list(payload.keys())}")
        return payload

    # payload가 없으면 계산된 데이터가 없다고 보고 오류
    raise ValueError("Saju payload missing. computeDestinyMap result required.")
