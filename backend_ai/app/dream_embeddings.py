# backend_ai/app/dream_embeddings.py
"""
Dream Interpretation Embedding System (Standalone)
Uses SentenceTransformer for semantic similarity matching
- 독립적인 드림 전용 임베딩 시스템
- 사주/점성 GraphRAG와 분리된 캐시 사용
- 융 심리학 치료적 질문 및 위기 감지 통합
"""

import os
import json
import torch
from typing import List, Dict, Optional, Tuple
from sentence_transformers import util

# Use shared model singleton from saju_astro_rag
try:
    from backend_ai.app.saju_astro_rag import get_model
except ImportError:
    from saju_astro_rag import get_model


# ============================================================
# CRISIS DETECTION MODULE
# ============================================================
class CrisisDetector:
    """위기 상황 감지 - jung_crisis_intervention.json 기반"""

    HIGH_RISK_KEYWORDS = {
        "suicidal": {
            "keywords": ["죽고 싶", "자살", "끝내고 싶", "사라지고 싶", "없어지고 싶",
                        "더 이상 못 살", "삶을 끝", "죽는 게 나을", "죽어버릴", "자해"],
            "severity": "critical",
            "response": "지금 많이 힘드시네요. 혹시 스스로를 해치고 싶은 생각이 드시나요? "
                       "그런 생각이 들 정도로 힘드셨다면, 전문 상담이 꼭 필요합니다. "
                       "자살예방상담전화 1393, 정신건강위기상담전화 1577-0199로 연락해주세요."
        },
        "severe_distress": {
            "keywords": ["희망이 없", "아무 의미 없", "살고 싶지 않", "모든 게 끝났",
                        "아무도 나를 원하지 않", "차라리 없는 게", "견딜 수 없"],
            "severity": "high",
            "response": "정말 힘든 시간을 보내고 계시는군요. 이런 감정은 혼자 감당하기 어렵습니다. "
                       "전문 상담사와 이야기하시는 것이 도움이 될 수 있어요. "
                       "정신건강위기상담전화 1577-0199로 편하게 연락해주세요."
        }
    }

    RESOURCES_KOREA = {
        "emergency": "119 (응급)",
        "suicide_prevention": "1393 (자살예방상담전화)",
        "mental_health_crisis": "1577-0199 (정신건강위기상담전화)",
        "youth": "1388 (청소년전화)"
    }

    @classmethod
    def check_crisis(cls, text: str) -> Optional[Dict]:
        """위기 상황 감지. 감지되면 Dict 반환, 아니면 None"""
        if not text:
            return None

        text_lower = text.lower()

        for crisis_type, config in cls.HIGH_RISK_KEYWORDS.items():
            for keyword in config["keywords"]:
                if keyword in text_lower:
                    return {
                        "detected": True,
                        "type": crisis_type,
                        "severity": config["severity"],
                        "response": config["response"],
                        "resources": cls.RESOURCES_KOREA
                    }
        return None


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
        self.base_rules_dir = os.path.dirname(rules_dir)  # Parent: rules/
        self.rules = {}  # rule_file -> {rule_id -> rule_data}
        self.rule_texts = []  # [{file, rule_id, text, weight, category, ...}]
        self.rule_embeds = None
        self.embed_cache_path = os.path.join(rules_dir, "dream_embeds_v3_full_corpus.pt")  # v3: Jung+Stoic corpus

        # 치료적 질문 데이터 (jung_therapeutic.json)
        self.therapeutic_questions = {}
        # 상담 시나리오 (jung_counseling_scenarios.json)
        self.counseling_scenarios = {}

        # 모델 초기화 (lazy load)
        self._model = None

        # 로드
        self._load_rules()
        self._load_jung_extensions()
        self._load_jung_corpus()  # NEW: Load 23 Jung quote files
        self._load_stoic_corpus()  # NEW: Load 3 Stoic philosophy files
        self._prepare_embeddings()

    @property
    def model(self):
        """Get shared model singleton from saju_astro_rag"""
        if self._model is None:
            print("[DreamEmbedRAG] Using shared model from saju_astro_rag...")
            self._model = get_model()
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

    def _load_jung_extensions(self):
        """Load Jung therapeutic questions and counseling scenarios for enriched responses"""
        jung_dir = os.path.join(self.base_rules_dir, "jung")

        # Load therapeutic questions
        therapeutic_path = os.path.join(jung_dir, "jung_therapeutic.json")
        if os.path.exists(therapeutic_path):
            try:
                with open(therapeutic_path, encoding='utf-8') as f:
                    data = json.load(f)
                    self.therapeutic_questions = data.get("therapeutic_questions", {})
                    self.dream_symbols = data.get("dream_interpretation", {}).get("common_symbols", {})
                    print(f"[DreamEmbedRAG] Loaded therapeutic questions: {len(self.therapeutic_questions)} categories")

                    # Also add dream symbols from therapeutic to rule_texts
                    for symbol, symbol_data in self.dream_symbols.items():
                        meaning = symbol_data.get("meaning", "")
                        therapeutic = symbol_data.get("therapeutic", "")
                        variations = symbol_data.get("variations", {})

                        text = f"꿈에서 {symbol}: {meaning}. {therapeutic}"
                        for var_key, var_val in variations.items():
                            text += f" {var_key}: {var_val}."

                        if text.strip():
                            self.rule_texts.append({
                                'file': 'jung_therapeutic',
                                'rule_id': f'symbol_{symbol}',
                                'text': text,
                                'weight': 8,  # High weight for therapeutic content
                                'category': 'jungian',
                                'korean': '',
                                'advice': therapeutic,
                                'original': meaning,
                                'when': [symbol],
                                'specifics': variations
                            })
            except Exception as e:
                print(f"[DreamEmbedRAG] Failed to load therapeutic questions: {e}")

        # Load counseling scenarios
        scenarios_path = os.path.join(jung_dir, "jung_counseling_scenarios.json")
        if os.path.exists(scenarios_path):
            try:
                with open(scenarios_path, encoding='utf-8') as f:
                    data = json.load(f)
                    self.counseling_scenarios = data.get("concern_categories", {})
                    print(f"[DreamEmbedRAG] Loaded counseling scenarios: {len(self.counseling_scenarios)} categories")

                    # Add counseling scenario keywords to rule_texts for RAG matching
                    for category, cat_data in self.counseling_scenarios.items():
                        for subcat, subcat_data in cat_data.get("subcategories", {}).items():
                            jungian_lens = subcat_data.get("jungian_lens", {})
                            key_questions = subcat_data.get("key_questions", [])

                            primary_concept = jungian_lens.get("primary_concept", "")
                            interpretation = jungian_lens.get("interpretation", "")
                            therapeutic_direction = jungian_lens.get("therapeutic_direction", "")

                            text = f"{primary_concept}: {interpretation} {therapeutic_direction}"
                            advice = " ".join(key_questions[:2]) if key_questions else ""

                            if text.strip():
                                self.rule_texts.append({
                                    'file': 'jung_counseling',
                                    'rule_id': f'scenario_{category}_{subcat}',
                                    'text': text,
                                    'weight': 7,
                                    'category': 'counseling',
                                    'korean': subcat_data.get("name_ko", ""),
                                    'advice': advice,
                                    'original': interpretation,
                                    'when': subcat_data.get("common_complaints", [])[:3],
                                    'specifics': {}
                                })
            except Exception as e:
                print(f"[DreamEmbedRAG] Failed to load counseling scenarios: {e}")

    def _load_jung_corpus(self):
        """Load Jung quote corpus (23 files with 2,456+ lines of authentic Jung quotes)"""
        # base_rules_dir is 'data/graph/rules', so go up to 'data' then to 'corpus/jung'
        data_dir = os.path.dirname(os.path.dirname(self.base_rules_dir))  # Go up to 'data'
        corpus_dir = os.path.join(data_dir, "corpus", "jung")

        if not os.path.exists(corpus_dir):
            print(f"[DreamEmbedRAG] Jung corpus directory not found: {corpus_dir}")
            return

        loaded_count = 0
        quotes_count = 0

        for filename in os.listdir(corpus_dir):
            if not filename.endswith('.json'):
                continue

            filepath = os.path.join(corpus_dir, filename)
            try:
                with open(filepath, encoding='utf-8') as f:
                    data = json.load(f)

                    concept = data.get('concept', '')
                    concept_kr = data.get('concept_kr', '')
                    quotes = data.get('quotes', [])

                    for quote in quotes:
                        en = quote.get('en', '')
                        kr = quote.get('kr', '')
                        tags = quote.get('tags', [])
                        context = quote.get('context', '')

                        # Combine English and Korean for richer embedding
                        text = f"{en} {kr}"
                        if context:
                            text += f" Context: {context}"

                        if text.strip():
                            self.rule_texts.append({
                                'file': f'jung_corpus_{concept}',
                                'rule_id': quote.get('id', f'quote_{quotes_count}'),
                                'text': text,
                                'weight': 9,  # High weight for authentic Jung quotes
                                'category': 'jung_wisdom',
                                'korean': kr,
                                'advice': en,  # English quote as advice
                                'original': en,
                                'when': tags,
                                'specifics': {
                                    'concept_kr': concept_kr,
                                    'source': quote.get('source', ''),
                                    'year': quote.get('year', '')
                                }
                            })
                            quotes_count += 1

                    loaded_count += 1

            except Exception as e:
                print(f"[DreamEmbedRAG] Failed to load Jung corpus file {filename}: {e}")

        print(f"[DreamEmbedRAG] Loaded Jung corpus: {loaded_count} files, {quotes_count} quotes")

    def _load_stoic_corpus(self):
        """Load Stoic philosophy corpus (3 files: Epictetus, Marcus Aurelius, Seneca)"""
        # base_rules_dir is 'data/graph/rules', so go up to 'data' then to 'corpus/stoic'
        data_dir = os.path.dirname(os.path.dirname(self.base_rules_dir))  # Go up to 'data'
        corpus_dir = os.path.join(data_dir, "corpus", "stoic")

        if not os.path.exists(corpus_dir):
            print(f"[DreamEmbedRAG] Stoic corpus directory not found: {corpus_dir}")
            return

        loaded_count = 0
        quotes_count = 0

        for filename in os.listdir(corpus_dir):
            if not filename.endswith('.json'):
                continue

            filepath = os.path.join(corpus_dir, filename)
            try:
                with open(filepath, encoding='utf-8') as f:
                    data = json.load(f)

                    philosopher = data.get('philosopher', '')
                    philosopher_kr = data.get('philosopher_kr', '')
                    quotes = data.get('quotes', [])

                    for quote in quotes:
                        en = quote.get('en', '')
                        kr = quote.get('kr', '')
                        tags = quote.get('tags', [])

                        # Combine English and Korean for richer embedding
                        text = f"{en} {kr}"

                        if text.strip():
                            self.rule_texts.append({
                                'file': f'stoic_{philosopher}',
                                'rule_id': quote.get('id', f'stoic_{quotes_count}'),
                                'text': text,
                                'weight': 8,  # High weight for Stoic wisdom
                                'category': 'stoic_wisdom',
                                'korean': kr,
                                'advice': en,  # English quote as advice
                                'original': en,
                                'when': tags,
                                'specifics': {
                                    'philosopher_kr': philosopher_kr,
                                    'source': quote.get('source', '')
                                }
                            })
                            quotes_count += 1

                    loaded_count += 1

            except Exception as e:
                print(f"[DreamEmbedRAG] Failed to load Stoic corpus file {filename}: {e}")

        print(f"[DreamEmbedRAG] Loaded Stoic corpus: {loaded_count} files, {quotes_count} quotes")

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

    def get_therapeutic_questions(self, dream_text: str, themes: List[str] = None) -> Dict:
        """
        꿈 내용에 맞는 융 심리학 치료적 질문 반환

        Args:
            dream_text: 꿈 설명
            themes: 감지된 테마들 (예: ['shadow', 'relationship', 'fear'])

        Returns:
            Dict with therapeutic questions and insights
        """
        if not self.therapeutic_questions:
            return {}

        dream_lower = dream_text.lower()
        matched_questions = []
        matched_categories = []

        # Keywords to category mapping
        category_keywords = {
            "shadow_work": ["그림자", "shadow", "어둠", "무서운", "쫓기", "chase", "괴물", "monster", "숨김"],
            "anima_animus": ["이성", "연인", "사랑", "relationship", "남자", "여자", "결혼"],
            "persona_work": ["가면", "페르소나", "진짜 나", "연기", "숨기", "역할"],
            "inner_child": ["어린 시절", "아이", "child", "순수", "놀이", "보호받지 못한"],
            "meaning_crisis": ["의미", "목적", "죽음", "death", "끝", "공허", "무의미"]
        }

        # Match themes and keywords to categories
        for category, keywords in category_keywords.items():
            if category in self.therapeutic_questions:
                for keyword in keywords:
                    if keyword in dream_lower:
                        cat_data = self.therapeutic_questions[category]
                        questions = cat_data.get("questions", []) or \
                                   cat_data.get("for_men", []) + cat_data.get("for_women", [])
                        if questions:
                            matched_questions.extend(questions[:2])
                            matched_categories.append(cat_data.get("category", category))
                        break

        # Deduplicate
        matched_questions = list(dict.fromkeys(matched_questions))[:4]

        return {
            "therapeutic_questions": matched_questions,
            "categories": list(set(matched_categories)),
            "insight": self._generate_therapeutic_insight(matched_categories)
        }

    def _generate_therapeutic_insight(self, categories: List[str]) -> str:
        """Generate brief therapeutic insight based on matched categories"""
        insights = {
            "그림자 작업": "이 꿈은 당신이 억압하거나 거부하는 자신의 일부를 보여줄 수 있습니다.",
            "아니마/아니무스 작업": "이 꿈은 내면의 이성적 에너지와 관계를 맺으라는 메시지일 수 있습니다.",
            "페르소나 작업": "이 꿈은 '진짜 나'와 '보여주는 나' 사이의 간극을 탐색하라고 합니다.",
            "내면 아이 작업": "이 꿈은 돌봄이 필요한 내면 아이의 목소리일 수 있습니다.",
            "의미 위기/영혼의 어두운 밤": "이 꿈은 삶의 의미와 방향을 재고하라는 심층적 메시지입니다."
        }

        for cat in categories:
            if cat in insights:
                return insights[cat]
        return ""

    def get_counseling_context(self, user_question: str) -> Dict:
        """
        사용자 질문에 맞는 상담 시나리오 컨텍스트 반환

        Args:
            user_question: 사용자의 질문/고민

        Returns:
            Dict with counseling insights and reframes
        """
        if not self.counseling_scenarios:
            return {}

        question_lower = user_question.lower()

        # Check each scenario
        for category, cat_data in self.counseling_scenarios.items():
            for subcat, subcat_data in cat_data.get("subcategories", {}).items():
                complaints = subcat_data.get("common_complaints", [])
                for complaint in complaints:
                    if any(word in question_lower for word in complaint.split()[:3]):
                        jungian_lens = subcat_data.get("jungian_lens", {})
                        return {
                            "category": category,
                            "subcategory": subcat_data.get("name_ko", subcat),
                            "jungian_concept": jungian_lens.get("primary_concept", ""),
                            "interpretation": jungian_lens.get("interpretation", ""),
                            "therapeutic_direction": jungian_lens.get("therapeutic_direction", ""),
                            "key_questions": subcat_data.get("key_questions", [])[:3],
                            "reframes": subcat_data.get("reframe_examples", [])[:2]
                        }

        return {}


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
