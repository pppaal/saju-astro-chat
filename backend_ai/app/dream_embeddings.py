# backend_ai/app/dream_embeddings.py
"""
Dream Interpretation Embedding System (Standalone)
Uses SentenceTransformer for semantic similarity matching
- 독립적인 드림 전용 임베딩 시스템
- 사주/점성 GraphRAG와 분리된 캐시 사용
"""

import os
import json
import torch
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer, util


class DreamEmbedRAG:
    """
    임베딩 기반 꿈 해석 검색 엔진
    - 꿈 설명을 벡터로 변환하여 가장 관련 있는 해석 규칙 검색
    - 키워드 매칭 + 의미적 유사도 결합
    """

    def __init__(self, rules_dir: str = None):
        # 경로 설정
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "dream")

        self.rules_dir = rules_dir
        self.rules = {}  # rule_file -> {rule_id -> rule_data}
        self.rule_texts = []  # [{file, rule_id, text, weight, category, ...}]
        self.rule_embeds = None
        self.embed_cache_path = os.path.join(rules_dir, "dream_embeds.pt")

        # 모델 초기화 (lazy load)
        self._model = None

        # 로드
        self._load_rules()
        self._prepare_embeddings()

    @property
    def model(self):
        """Lazy load SentenceTransformer model"""
        if self._model is None:
            os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
            torch.set_default_device("cpu")
            print("[DreamEmbedRAG] Loading SentenceTransformer model...")
            self._model = SentenceTransformer(
                "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                device="cpu"
            )
            print("[DreamEmbedRAG] Model loaded successfully")
        return self._model

    def _load_rules(self):
        """Load all dream rule JSON files"""
        if not os.path.exists(self.rules_dir):
            print(f"[DreamEmbedRAG] Rules directory not found: {self.rules_dir}")
            return

        for filename in os.listdir(self.rules_dir):
            if not filename.endswith('.json'):
                continue

            path = os.path.join(self.rules_dir, filename)
            try:
                with open(path, encoding='utf-8') as f:
                    data = json.load(f)
                    file_key = os.path.splitext(filename)[0]
                    self.rules[file_key] = data

                    # Extract texts for embedding
                    for rule_id, rule in data.items():
                        if not isinstance(rule, dict):
                            continue
                        if rule_id.startswith('_'):
                            continue

                        text = rule.get('text', '')
                        korean = rule.get('korean', '')
                        advice = rule.get('advice', '')
                        weight = rule.get('weight', 5)
                        category = rule.get('category', '')

                        # Combine text for richer embedding
                        combined = f"{text} {korean} {advice}".strip()
                        if combined:
                            self.rule_texts.append({
                                'file': file_key,
                                'rule_id': rule_id,
                                'text': combined,
                                'weight': weight,
                                'category': category,
                                'korean': korean,
                                'advice': advice,
                                'original': text,
                                'when': rule.get('when', []),
                                'specifics': rule.get('specifics', {})
                            })

            except Exception as e:
                print(f"[DreamEmbedRAG] Failed to load {filename}: {e}")

        print(f"[DreamEmbedRAG] Loaded {len(self.rules)} rule files, {len(self.rule_texts)} rules")

    def _prepare_embeddings(self):
        """Prepare or load cached embeddings"""
        if not self.rule_texts:
            print("[DreamEmbedRAG] No rule texts to embed")
            return

        # Check cache
        if os.path.exists(self.embed_cache_path):
            try:
                cache_data = torch.load(self.embed_cache_path, map_location="cpu")
                # Verify cache matches current rules
                if cache_data.get('count') == len(self.rule_texts):
                    self.rule_embeds = cache_data['embeds']
                    print(f"[DreamEmbedRAG] Loaded cached embeddings: {self.rule_embeds.shape}")
                    return
            except Exception as e:
                print(f"[DreamEmbedRAG] Cache load failed: {e}")

        # Generate new embeddings
        print(f"[DreamEmbedRAG] Generating embeddings for {len(self.rule_texts)} rules...")
        texts = [r['text'] for r in self.rule_texts]
        self.rule_embeds = self.model.encode(
            texts,
            convert_to_tensor=True,
            normalize_embeddings=True,
            show_progress_bar=True,
            batch_size=32
        )

        # Save cache
        try:
            torch.save({
                'embeds': self.rule_embeds,
                'count': len(self.rule_texts)
            }, self.embed_cache_path)
            print(f"[DreamEmbedRAG] Saved embeddings cache: {self.embed_cache_path}")
        except Exception as e:
            print(f"[DreamEmbedRAG] Failed to save cache: {e}")

    def search(self, dream_text: str, top_k: int = 10) -> List[Dict]:
        """
        꿈 텍스트로 가장 관련 있는 해석 규칙 검색

        Args:
            dream_text: 사용자의 꿈 설명
            top_k: 반환할 최대 결과 수

        Returns:
            List of matched rules with similarity scores
        """
        if self.rule_embeds is None or len(self.rule_texts) == 0:
            return []

        # Encode query
        query_embed = self.model.encode(
            dream_text,
            convert_to_tensor=True,
            normalize_embeddings=True
        )

        # Calculate similarity
        scores = util.cos_sim(query_embed, self.rule_embeds)[0]

        # Get top-k results
        top_results = torch.topk(scores, k=min(top_k, len(self.rule_texts)))

        results = []
        for idx, score in zip(top_results.indices, top_results.values):
            rule_data = self.rule_texts[int(idx)].copy()
            rule_data['similarity'] = float(score)
            # Boost score by weight
            rule_data['final_score'] = float(score) * (rule_data['weight'] / 10)
            results.append(rule_data)

        # Sort by final score
        results.sort(key=lambda x: x['final_score'], reverse=True)
        return results

    def get_interpretation_context(self, dream_text: str, top_k: int = 8) -> Dict:
        """
        꿈 해석을 위한 컨텍스트 생성

        Returns:
            Dict with:
            - texts: 관련 해석 텍스트들
            - korean_notes: 한국 해몽
            - categories: 감지된 카테고리
            - specifics: 세부 상황 해석
            - advice: 조언들
        """
        results = self.search(dream_text, top_k=top_k)

        texts = []
        korean_notes = []
        categories = set()
        specifics = []
        advice_list = []
        sources = set()

        dream_lower = dream_text.lower()

        # Adaptive threshold: if no good matches, lower threshold
        high_threshold = 0.4
        low_threshold = 0.25

        high_matches = [r for r in results if r['similarity'] >= high_threshold]

        # Use high threshold matches if available, otherwise use lower threshold
        if high_matches:
            filtered_results = high_matches
        else:
            filtered_results = [r for r in results if r['similarity'] >= low_threshold]

        # If still no matches, use top 3 regardless of score (always provide something)
        if not filtered_results and results:
            filtered_results = results[:3]
            print(f"[DreamEmbedRAG] Using fallback: top 3 results regardless of threshold")

        for r in filtered_results:
            texts.append(r['original'])
            sources.add(r['file'])

            if r['korean']:
                korean_notes.append(r['korean'])

            if r['category']:
                categories.add(r['category'])

            if r['advice']:
                advice_list.append(r['advice'])

            # Check specifics
            for spec_key, spec_val in r.get('specifics', {}).items():
                if any(word in dream_lower for word in spec_key.lower().split()):
                    specifics.append(f"{spec_key}: {spec_val}")

        return {
            'texts': texts[:10],
            'korean_notes': korean_notes[:5],
            'categories': list(categories),
            'specifics': specifics[:8],
            'advice': advice_list[:5],
            'sources': list(sources),
            'match_quality': 'high' if high_matches else ('medium' if filtered_results else 'fallback')
        }


# Singleton instance
_dream_embed_rag = None


def get_dream_embed_rag() -> DreamEmbedRAG:
    """Get or create singleton DreamEmbedRAG instance"""
    global _dream_embed_rag
    if _dream_embed_rag is None:
        _dream_embed_rag = DreamEmbedRAG()
    return _dream_embed_rag


# Test
if __name__ == "__main__":
    rag = get_dream_embed_rag()

    test_dreams = [
        "높은 건물에서 떨어지는 꿈을 꿨어요",
        "큰 뱀이 집에 들어왔어요",
        "하늘을 나는 기분이었어요",
        "이빨이 빠지는 꿈",
        "돼지가 집에 들어오는 꿈을 꿨는데 로또 사도 될까요?"
    ]

    for dream in test_dreams:
        print(f"\n{'='*60}")
        print(f"꿈: {dream}")
        print(f"{'='*60}")
        results = rag.search(dream, top_k=3)
        for i, r in enumerate(results):
            print(f"\n[{i+1}] {r['rule_id']} (유사도: {r['similarity']:.3f})")
            print(f"    해석: {r['original'][:100]}...")
            if r['korean']:
                print(f"    한국해몽: {r['korean']}")
