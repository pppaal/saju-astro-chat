# backend_ai/data/graph/utils.py
from sentence_transformers import SentenceTransformer, util

def search_graphs(query: str, top_k: int = 5, graph_root=None):
    """
    그래프 데이터를 기반으로 관련 키워드를 검색하는 간단한 목업 함수.
    실제 그래프 DB가 연결되면 여기서 RAG 검색을 수행할 예정.
    """
    dummy_nodes = [
        {"label": "Sun_Leo", "type": "astro", "source": "astro_database", "description": "태양이 사자자리일 때 리더십이 강하고 표현력이 풍부하다."},
        {"label": "Moon_Scorpio", "type": "astro", "source": "astro_database", "description": "깊은 감정과 비밀스러운 내면, 감성적 통찰력."},
        {"label": "甲午", "type": "saju", "source": "saju", "description": "목기(木氣)와 화기(火氣)가 결합해 창의성과 추진력이 강하다."},
        {"label": "火_運", "type": "cross", "source": "cross_analysis", "description": "성장과 추진의 시기. 목표 향해 활력을 얻는다."},
        {"label": "조언_리더십", "type": "rule", "source": "fusion_rule", "description": "리더십과 탈피 에너지의 균형을 잡는 시기."},
    ]
    return dummy_nodes[:top_k]