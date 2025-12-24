# backend_ai/app/persona_embeddings.py
"""
Persona (Jung/Stoic) Embedding System
Uses SentenceTransformer for semantic similarity matching
- V4 persona rules 벡터 검색
- 점성술 조건 + 의미 검색 결합
"""

import os
import json
import torch
from typing import List, Dict, Optional
from sentence_transformers import util

# Use shared model singleton from saju_astro_rag
try:
    from backend_ai.app.saju_astro_rag import get_model
except ImportError:
    from saju_astro_rag import get_model


class PersonaEmbedRAG:
    """
    임베딩 기반 페르소나 검색 엔진
    - Jung/Stoic 인용문과 점성술 해석을 벡터로 검색
    """

    def __init__(self, rules_dir: str = None):
        if rules_dir is None:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            rules_dir = os.path.join(base_dir, "data", "graph", "rules", "persona")

        self.rules_dir = rules_dir
        self.rules = {}
        self.rule_texts = []
        self.rule_embeds = None
        self.embed_cache_path = os.path.join(rules_dir, "persona_embeds.pt")

        self._model = None
        self._load_rules()
        self._prepare_embeddings()

    @property
    def model(self):
        """Get shared model singleton from saju_astro_rag"""
        if self._model is None:
            print("[PersonaEmbedRAG] Using shared model from saju_astro_rag...")
            self._model = get_model()
        return self._model

    def _load_rules(self):
        """Load V4 persona rule JSON files"""
        if not os.path.exists(self.rules_dir):
            print(f"[PersonaEmbedRAG] Rules directory not found: {self.rules_dir}")
            return

        for filename in os.listdir(self.rules_dir):
            if not filename.endswith('.json') or '_v4' not in filename:
                continue

            path = os.path.join(self.rules_dir, filename)
            try:
                with open(path, encoding='utf-8') as f:
                    data = json.load(f)
                    file_key = os.path.splitext(filename)[0]
                    self.rules[file_key] = data

                    persona = data.get('meta', {}).get('persona', 'Unknown')

                    for rule_id, rule in data.items():
                        if not isinstance(rule, dict) or rule_id == 'meta':
                            continue

                        text = rule.get('text', '')
                        when = rule.get('when', [])
                        weight = rule.get('weight', 4)

                        if text:
                            self.rule_texts.append({
                                'file': file_key,
                                'rule_id': rule_id,
                                'text': text,
                                'when': when,
                                'weight': weight,
                                'persona': persona
                            })

            except Exception as e:
                print(f"[PersonaEmbedRAG] Failed to load {filename}: {e}")

        print(f"[PersonaEmbedRAG] Loaded {len(self.rules)} rule files, {len(self.rule_texts)} rules")

    def _prepare_embeddings(self):
        """Prepare or load cached embeddings"""
        if not self.rule_texts:
            print("[PersonaEmbedRAG] No rule texts to embed")
            return

        if os.path.exists(self.embed_cache_path):
            try:
                cache_data = torch.load(self.embed_cache_path, map_location="cpu", weights_only=False)
                if cache_data.get('count') == len(self.rule_texts):
                    self.rule_embeds = cache_data['embeds']
                    print(f"[PersonaEmbedRAG] Loaded cached embeddings: {self.rule_embeds.shape}")
                    return
            except Exception as e:
                print(f"[PersonaEmbedRAG] Cache load failed: {e}")

        print(f"[PersonaEmbedRAG] Generating embeddings for {len(self.rule_texts)} rules...")
        texts = [r['text'] for r in self.rule_texts]

        # Batch processing to avoid memory issues
        batch_size = 64
        all_embeds = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            batch_embeds = self.model.encode(
                batch,
                convert_to_tensor=True,
                normalize_embeddings=True,
                show_progress_bar=False
            )
            all_embeds.append(batch_embeds)
            if (i // batch_size + 1) % 50 == 0:
                print(f"  {i + len(batch)}/{len(texts)} processed...")

        self.rule_embeds = torch.cat(all_embeds, dim=0)

        try:
            torch.save({
                'embeds': self.rule_embeds,
                'count': len(self.rule_texts)
            }, self.embed_cache_path)
            print(f"[PersonaEmbedRAG] Saved embeddings cache: {self.embed_cache_path}")
        except Exception as e:
            print(f"[PersonaEmbedRAG] Failed to save cache: {e}")

    def search(self, query: str, top_k: int = 10, persona_filter: str = None) -> List[Dict]:
        """
        쿼리로 가장 관련 있는 페르소나 규칙 검색

        Args:
            query: 검색 쿼리 (상황, 질문 등)
            top_k: 반환할 최대 결과 수
            persona_filter: 'Analyst' or 'Strategist' (optional)

        Returns:
            List of matched rules with similarity scores
        """
        if self.rule_embeds is None or len(self.rule_texts) == 0:
            return []

        query_embed = self.model.encode(
            query,
            convert_to_tensor=True,
            normalize_embeddings=True
        )

        scores = util.cos_sim(query_embed, self.rule_embeds)[0]

        # Apply persona filter if specified
        if persona_filter:
            for i, rule in enumerate(self.rule_texts):
                if rule['persona'] != persona_filter:
                    scores[i] = -1

        top_results = torch.topk(scores, k=min(top_k * 2, len(self.rule_texts)))

        results = []
        for idx, score in zip(top_results.indices, top_results.values):
            if float(score) < 0:
                continue
            rule_data = self.rule_texts[int(idx)].copy()
            rule_data['similarity'] = float(score)
            rule_data['final_score'] = float(score) * (rule_data['weight'] / 4)
            results.append(rule_data)

        results.sort(key=lambda x: x['final_score'], reverse=True)
        return results[:top_k]

    def get_persona_context(self, query: str, top_k: int = 5) -> Dict:
        """
        페르소나 상담을 위한 컨텍스트 생성

        Returns:
            Dict with Jung and Stoic insights
        """
        jung_results = self.search(query, top_k=top_k, persona_filter='Analyst')
        stoic_results = self.search(query, top_k=top_k, persona_filter='Strategist')

        return {
            'jung_insights': [r['text'] for r in jung_results],
            'stoic_insights': [r['text'] for r in stoic_results],
            'jung_scores': [r['similarity'] for r in jung_results],
            'stoic_scores': [r['similarity'] for r in stoic_results],
            'total_matched': len(jung_results) + len(stoic_results)
        }


# Singleton
_persona_embed_rag = None


def get_persona_embed_rag() -> PersonaEmbedRAG:
    """Get or create singleton PersonaEmbedRAG instance"""
    global _persona_embed_rag
    if _persona_embed_rag is None:
        _persona_embed_rag = PersonaEmbedRAG()
    return _persona_embed_rag


if __name__ == "__main__":
    import sys
    import io
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

    print("Testing Persona Embedding RAG...")
    rag = get_persona_embed_rag()

    test_queries = [
        "직장에서 리더십을 발휘하고 싶어요",
        "연인과의 관계가 힘들어요",
        "내면의 두려움을 극복하고 싶어요",
        "삶의 의미를 찾고 있어요"
    ]

    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"쿼리: {query}")
        print(f"{'='*60}")

        context = rag.get_persona_context(query, top_k=2)

        print("\n[Jung 분석가]")
        for i, insight in enumerate(context['jung_insights'][:2]):
            print(f"  {i+1}. {insight[:150]}...")

        print("\n[Stoic 전략가]")
        for i, insight in enumerate(context['stoic_insights'][:2]):
            print(f"  {i+1}. {insight[:150]}...")
