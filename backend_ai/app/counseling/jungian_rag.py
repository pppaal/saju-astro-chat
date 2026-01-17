# backend_ai/app/counseling/jungian_rag.py
"""
Jungian RAG - 융 심리학 시맨틱 검색 엔진
=========================================
- SentenceTransformer로 질문/상황 → 치료적 개입 매칭
- RuleEngine으로 조건 기반 규칙 매칭
"""

import os
import json
import hashlib
from typing import List, Dict, Tuple, Any

# External dependencies (optional)
try:
    import torch
    from sentence_transformers import util
    EMBEDDING_AVAILABLE = True
except ImportError:
    EMBEDDING_AVAILABLE = False
    torch = None

# Shared model from saju_astro_rag
try:
    from backend_ai.app.saju_astro_rag import get_model as get_shared_model
except ImportError:
    try:
        from saju_astro_rag import get_model as get_shared_model
    except ImportError:
        get_shared_model = None

# RuleEngine
try:
    from backend_ai.app.rule_engine import RuleEngine
    RULE_ENGINE_AVAILABLE = True
except ImportError:
    try:
        from rule_engine import RuleEngine
        RULE_ENGINE_AVAILABLE = True
    except ImportError:
        RULE_ENGINE_AVAILABLE = False
        RuleEngine = None


class JungianRAG:
    """
    융 심리학 기반 시맨틱 검색 엔진
    - SentenceTransformer로 질문/상황 → 치료적 개입 매칭
    - RuleEngine으로 조건 기반 규칙 매칭
    """

    MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

    def __init__(self, rules_dir: str = None):
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "jung")

        self.rules_dir = rules_dir
        self._model = None
        self._model_failed = False

        # 임베딩 데이터
        self.corpus_texts = []  # 검색 대상 텍스트
        self.corpus_meta = []   # 메타데이터 (source, category, etc.)
        self.corpus_embeds = None
        self.embed_cache_path = os.path.join(rules_dir, "jung_embeds.pt") if rules_dir else None

        # RuleEngine (조건 매칭용)
        self.rule_engine = None
        if RULE_ENGINE_AVAILABLE and os.path.exists(rules_dir):
            try:
                self.rule_engine = RuleEngine(rules_dir)
                print(f"[JungianRAG] RuleEngine loaded with {len(self.rule_engine.rules)} rule sets")
            except Exception as e:
                print(f"[JungianRAG] RuleEngine init failed: {e}")

        # 데이터 로드 및 임베딩 준비
        self._load_corpus()
        self._prepare_embeddings()

    @property
    def model(self):
        """Get shared model singleton from saju_astro_rag"""
        if self._model is None and not self._model_failed:
            if not EMBEDDING_AVAILABLE or get_shared_model is None:
                self._model_failed = True
                return None
            try:
                print("[JungianRAG] Using shared model from saju_astro_rag...")
                self._model = get_shared_model()
            except Exception as e:
                print(f"[JungianRAG] Model load failed: {e}")
                self._model_failed = True
        return self._model

    def _load_corpus(self):
        """융 심리학 JSON 파일에서 검색 코퍼스 구축"""
        if not os.path.exists(self.rules_dir):
            return

        for filename in os.listdir(self.rules_dir):
            if not filename.endswith(".json"):
                continue

            filepath = os.path.join(self.rules_dir, filename)
            try:
                with open(filepath, encoding="utf-8") as f:
                    data = json.load(f)
                    self._extract_corpus_items(data, filename)
            except Exception as e:
                print(f"[JungianRAG] Failed to load {filename}: {e}")

        print(f"[JungianRAG] Corpus built: {len(self.corpus_texts)} items from {self.rules_dir}")

    def _extract_corpus_items(self, data: Any, source: str, prefix: str = ""):
        """재귀적으로 텍스트 항목 추출"""
        if isinstance(data, dict):
            # 치료적 질문 추출
            if "questions" in data and isinstance(data["questions"], list):
                for q in data["questions"]:
                    if isinstance(q, str) and len(q) > 10:
                        self.corpus_texts.append(q)
                        self.corpus_meta.append({
                            "source": source,
                            "category": prefix,
                            "type": "question"
                        })

            # 통찰/조언 추출
            for key in ["insight", "advice", "description", "therapeutic_focus", "approach"]:
                if key in data and isinstance(data[key], str) and len(data[key]) > 10:
                    self.corpus_texts.append(data[key])
                    self.corpus_meta.append({
                        "source": source,
                        "category": prefix,
                        "type": key
                    })

            # 재귀
            for k, v in data.items():
                self._extract_corpus_items(v, source, f"{prefix}/{k}" if prefix else k)

        elif isinstance(data, list):
            for item in data:
                self._extract_corpus_items(item, source, prefix)

    def _calculate_hash(self) -> str:
        """코퍼스 해시 계산 (캐시 무효화용)"""
        content = "|".join(self.corpus_texts[:100])  # 앞 100개만 해시
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _prepare_embeddings(self):
        """임베딩 준비 (캐시 활용)"""
        if not self.corpus_texts:
            return

        current_hash = self._calculate_hash()

        # 캐시 확인
        if self.embed_cache_path and os.path.exists(self.embed_cache_path):
            try:
                cache = torch.load(self.embed_cache_path, map_location="cpu")
                if cache.get("hash") == current_hash and cache.get("count") == len(self.corpus_texts):
                    self.corpus_embeds = cache["embeds"]
                    print(f"[JungianRAG] Loaded cached embeddings: {self.corpus_embeds.shape}")
                    return
            except Exception as e:
                print(f"[JungianRAG] Cache load failed: {e}")

        # 새로 생성
        if self.model is None:
            print("[JungianRAG] Model not available, skipping embeddings")
            return

        try:
            print(f"[JungianRAG] Generating embeddings for {len(self.corpus_texts)} items...")
            self.corpus_embeds = self.model.encode(
                self.corpus_texts,
                convert_to_tensor=True,
                normalize_embeddings=True,
                batch_size=32
            )
            print(f"[JungianRAG] Generated embeddings: {self.corpus_embeds.shape}")

            # 캐시 저장
            if self.embed_cache_path:
                torch.save({
                    "embeds": self.corpus_embeds,
                    "count": len(self.corpus_texts),
                    "hash": current_hash
                }, self.embed_cache_path)
        except Exception as e:
            print(f"[JungianRAG] Embedding generation failed: {e}")

    def search(self, query: str, top_k: int = 5, threshold: float = 0.3) -> List[Dict]:
        """
        시맨틱 검색: 질문/상황에 맞는 융 심리학 컨텐츠 검색

        Args:
            query: 사용자 메시지 또는 검색 쿼리
            top_k: 반환할 결과 수
            threshold: 최소 유사도 점수

        Returns:
            List of {text, similarity, source, category, type}
        """
        if self.corpus_embeds is None or self.model is None:
            return self._fallback_keyword_search(query, top_k)

        try:
            query_embed = self.model.encode(query, convert_to_tensor=True, normalize_embeddings=True)
            scores = util.cos_sim(query_embed, self.corpus_embeds)[0]
            top_results = torch.topk(scores, k=min(top_k * 2, len(self.corpus_texts)))

            results = []
            for idx, score in zip(top_results.indices, top_results.values):
                if float(score) < threshold:
                    continue
                results.append({
                    "text": self.corpus_texts[int(idx)],
                    "similarity": round(float(score), 4),
                    **self.corpus_meta[int(idx)]
                })
                if len(results) >= top_k:
                    break

            return results
        except Exception as e:
            print(f"[JungianRAG] Search error: {e}")
            return self._fallback_keyword_search(query, top_k)

    def _fallback_keyword_search(self, query: str, top_k: int = 5) -> List[Dict]:
        """키워드 기반 폴백 검색"""
        query_lower = query.lower()
        keywords = query_lower.split()

        results = []
        for i, text in enumerate(self.corpus_texts):
            text_lower = text.lower()
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                results.append({
                    "text": text,
                    "similarity": score / len(keywords),
                    **self.corpus_meta[i],
                    "fallback": True
                })

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    def get_rule_based_response(self, facts: Dict[str, Any]) -> Dict[str, Any]:
        """
        RuleEngine 기반 조건 매칭

        Args:
            facts: {"theme": "...", "saju": {...}, "astro": {...}, "emotion": "...", ...}

        Returns:
            매칭된 규칙 결과
        """
        if not self.rule_engine:
            return {"matched_rules": [], "matched_count": 0}

        return self.rule_engine.evaluate(facts, search_all=True)

    def get_therapeutic_intervention(self, user_message: str, context: Dict = None) -> Dict[str, Any]:
        """
        통합 치료적 개입 제안

        시맨틱 검색 + RuleEngine 결합

        Args:
            user_message: 사용자 메시지
            context: {"saju": {...}, "astro": {...}, "theme": "...", ...}

        Returns:
            {
                "semantic_matches": [...],
                "rule_matches": [...],
                "recommended_questions": [...],
                "insights": [...]
            }
        """
        result = {
            "semantic_matches": [],
            "rule_matches": [],
            "recommended_questions": [],
            "insights": []
        }

        # 1. 시맨틱 검색
        semantic = self.search(user_message, top_k=5)
        result["semantic_matches"] = semantic

        # 질문과 통찰 분리
        for item in semantic:
            if item.get("type") == "question":
                result["recommended_questions"].append(item["text"])
            else:
                result["insights"].append(item["text"])

        # 2. RuleEngine 매칭
        if context and self.rule_engine:
            facts = {
                "theme": context.get("theme", "general"),
                "saju": context.get("saju", {}),
                "astro": context.get("astro", {}),
                "emotion": self._detect_emotion(user_message),
                "keywords": user_message.lower().split()
            }
            rule_result = self.rule_engine.evaluate(facts, search_all=True)
            result["rule_matches"] = rule_result.get("matched_rules", [])

        return result

    def _detect_emotion(self, text: str) -> str:
        """간단한 감정 감지"""
        emotion_keywords = {
            "anger": ["화나", "짜증", "분노", "열받", "싫어"],
            "sadness": ["슬프", "우울", "눈물", "외로", "힘들"],
            "anxiety": ["불안", "걱정", "두려", "무서", "떨려"],
            "confusion": ["모르겠", "혼란", "복잡", "갈피"],
            "hopelessness": ["희망", "의미", "소용없", "포기"],
        }
        text_lower = text.lower()
        for emotion, keywords in emotion_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return emotion
        return "neutral"

    def health_check(self) -> Tuple[bool, str]:
        """상태 확인"""
        issues = []
        if not self.corpus_texts:
            issues.append("No corpus loaded")
        if self.corpus_embeds is None:
            issues.append("Embeddings not ready")
        if self._model_failed:
            issues.append("Model load failed")
        if not self.rule_engine:
            issues.append("RuleEngine not available")

        if issues:
            return False, f"Issues: {', '.join(issues)}"
        return True, f"OK: {len(self.corpus_texts)} items, RuleEngine active"


# Singleton
_jungian_rag = None


def get_jungian_rag() -> JungianRAG:
    """Get or create singleton JungianRAG"""
    global _jungian_rag
    if _jungian_rag is None:
        _jungian_rag = JungianRAG()
    return _jungian_rag
