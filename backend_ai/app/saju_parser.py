# backend_ai/app/saju_parser.py

def calculate_saju_data(*args, **kwargs):
    """
    프론트엔드 DestinyMap 엔진이 계산한 실제 사주·운세·신살 데이터를 그대로 사용.
    mock 계산 제거.
    """
    payload = kwargs.get("payload")
    if payload and isinstance(payload, dict):
        # 프론트에서 생성된 pillars, daeun, sinsal, annual 등 모두 포함
        print(f"[SajuParser] ✅ Using front‑engine saju payload keys: {list(payload.keys())}")
        return payload

    # 프론트에서 데이터가 안 왔을 때만 오류 표시
    raise ValueError("❌ Saju payload missing. computeDestinyMap 결과를 전달해야 합니다.")