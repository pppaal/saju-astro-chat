# backend_ai/app/counseling/__init__.py
"""
Counseling Package
==================
융 심리학 기반 상담 시스템

Modules:
- crisis_detector: 위기 감지 및 안전 프로토콜
- therapeutic_questions: 치료적 질문 생성
- jungian_rag: 융 심리학 시맨틱 검색
"""

from .crisis_detector import CrisisDetector
from .therapeutic_questions import TherapeuticQuestionGenerator
from .jungian_rag import JungianRAG, get_jungian_rag

__all__ = [
    "CrisisDetector",
    "TherapeuticQuestionGenerator",
    "JungianRAG",
    "get_jungian_rag",
]
