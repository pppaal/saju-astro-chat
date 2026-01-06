# backend_ai/app/feedback_learning.py
"""
RLHF Feedback Learning System
=============================
Implements feedback loop for continuous improvement:
1. Collects and analyzes user feedback (likes/dislikes)
2. Dynamically selects Few-shot examples from high-rated consultations
3. Adjusts rule weights based on feedback patterns
4. Generates training data for fine-tuning

This is the "secret sauce" that makes the Oracle better over time.
"""

import os
import json
import hashlib
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict
from functools import lru_cache

# Badge System Integration
try:
    from badge_system import get_badge_system, BadgeDefinition
    HAS_BADGES = True
except ImportError:
    HAS_BADGES = False
    print("[FeedbackLearning] Badge system not available")

def _ping_redis(client, timeout_sec: float) -> bool:
    result = {"ok": False}

    def _do_ping():
        try:
            client.ping()
            result["ok"] = True
        except Exception:
            result["ok"] = False

    thread = threading.Thread(target=_do_ping, daemon=True)
    thread.start()
    thread.join(timeout_sec)
    return result["ok"]


# Storage backend
try:
    import redis
    if os.getenv("REDIS_DISABLE") == "1":
        raise RuntimeError("Redis disabled by REDIS_DISABLE")
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    _redis_client = redis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_timeout=2,
        socket_connect_timeout=2,
        retry_on_timeout=True,
    )
    ping_timeout = float(os.getenv("REDIS_PING_TIMEOUT", "2"))
    if not _ping_redis(_redis_client, ping_timeout):
        raise TimeoutError("Redis ping timed out")
    HAS_REDIS = True
except Exception:
    HAS_REDIS = False
    _redis_client = None

# In-memory fallback
_feedback_store: Dict[str, Any] = {}


@dataclass
class FeedbackRecord:
    """Single feedback record with full context."""
    record_id: str
    user_id: str
    timestamp: str
    theme: str
    locale: str
    service_type: str
    rating: int  # 1-5 stars or 1/5 for thumbs
    feedback_text: str
    consultation_summary: str
    key_insights: List[str]
    prompt_used: str
    context_used: str


@dataclass
class FewShotExample:
    """A high-quality example for Few-shot prompting."""
    theme: str
    locale: str
    user_question: str
    consultation_summary: str
    rating: float
    key_insights: List[str]
    created_at: str


class FeedbackLearning:
    """
    Core RLHF learning system.

    Workflow:
    1. User receives consultation -> save_consultation()
    2. User gives feedback (like/dislike) -> record_feedback()
    3. System analyzes feedback patterns -> analyze_feedback()
    4. System selects best examples -> get_fewshot_examples()
    5. System adjusts rule weights -> adjust_rule_weights()
    6. Next consultation uses improved prompts/rules
    """

    def __init__(self):
        self._prefix = "rlhf"
        self._rule_weights_cache = {}
        self._fewshot_cache = {}

    # ===============================================================
    # STORAGE HELPERS
    # ===============================================================
    def _store(self, key: str, data: Any, ttl_days: int = 365):
        """Store data with TTL."""
        full_key = f"{self._prefix}:{key}"
        json_data = json.dumps(data, ensure_ascii=False, default=str)

        if HAS_REDIS:
            _redis_client.setex(full_key, timedelta(days=ttl_days), json_data)
        else:
            _feedback_store[full_key] = {
                "data": json_data,
                "expires": datetime.now() + timedelta(days=ttl_days)
            }

    def _retrieve(self, key: str) -> Optional[Any]:
        """Retrieve data."""
        full_key = f"{self._prefix}:{key}"

        if HAS_REDIS:
            data = _redis_client.get(full_key)
            return json.loads(data) if data else None
        else:
            entry = _feedback_store.get(full_key)
            if entry and entry["expires"] > datetime.now():
                return json.loads(entry["data"])
            return None

    def _append_list(self, key: str, item: Any, max_items: int = 1000):
        """Append to a list with max size."""
        current = self._retrieve(key) or []
        current.insert(0, item)
        current = current[:max_items]
        self._store(key, current)
        return current

    def _get_all_keys(self, pattern: str) -> List[str]:
        """Get all keys matching pattern."""
        full_pattern = f"{self._prefix}:{pattern}"

        if HAS_REDIS:
            return [k.replace(f"{self._prefix}:", "") for k in _redis_client.keys(full_pattern)]
        else:
            matching = []
            for k in _feedback_store.keys():
                if k.startswith(self._prefix):
                    short_key = k.replace(f"{self._prefix}:", "")
                    # Simple pattern matching
                    if "*" in pattern:
                        prefix = pattern.replace("*", "")
                        if short_key.startswith(prefix):
                            matching.append(short_key)
                    elif short_key == pattern:
                        matching.append(short_key)
            return matching

    # ===============================================================
    # FEEDBACK RECORDING
    # ===============================================================
    def record_feedback(
        self,
        record_id: str,
        user_id: str,
        rating: int,
        feedback_text: str = "",
        consultation_data: Dict = None,
    ) -> str:
        """
        Record user feedback for a consultation.

        Args:
            record_id: The consultation record ID
            user_id: User identifier
            rating: 1-5 stars (or 1=dislike, 5=like for binary)
            feedback_text: Optional text feedback
            consultation_data: Full consultation context for learning

        Returns:
            feedback_id
        """
        consultation_data = consultation_data or {}

        feedback = FeedbackRecord(
            record_id=record_id,
            user_id=user_id,
            timestamp=datetime.utcnow().isoformat(),
            theme=consultation_data.get("theme", "unknown"),
            locale=consultation_data.get("locale", "ko"),
            service_type=consultation_data.get("service_type", "fusion"),
            rating=rating,
            feedback_text=feedback_text,
            consultation_summary=consultation_data.get("summary", "")[:1000],
            key_insights=consultation_data.get("key_insights", [])[:10],
            prompt_used=consultation_data.get("prompt", "")[:500],
            context_used=consultation_data.get("context", "")[:2000],
        )

        # Generate feedback ID
        feedback_id = hashlib.sha1(
            f"{record_id}:{feedback.timestamp}".encode()
        ).hexdigest()[:12]

        # Store individual feedback
        self._store(f"feedback:{feedback_id}", asdict(feedback))

        # Append to theme-specific list (for pattern analysis)
        theme_key = f"theme_feedbacks:{feedback.theme}"
        self._append_list(theme_key, {
            "feedback_id": feedback_id,
            "rating": rating,
            "timestamp": feedback.timestamp,
            "record_id": record_id,
        }, max_items=500)

        # Append to global feedback list
        self._append_list("all_feedbacks", {
            "feedback_id": feedback_id,
            "rating": rating,
            "theme": feedback.theme,
            "service_type": feedback.service_type,
            "timestamp": feedback.timestamp,
        }, max_items=2000)

        # If high rating, add to fewshot candidates
        if rating >= 4:
            self._add_fewshot_candidate(feedback)

        # Update aggregate stats
        self._update_stats(feedback)

        # ===============================================================
        # BADGE SYSTEM - Award badges for feedback participation
        # ===============================================================
        new_badges = []
        if HAS_BADGES:
            try:
                badge_system = get_badge_system()
                new_badges = badge_system.process_feedback(
                    user_id=user_id,
                    rating=rating,
                    theme=feedback.theme,
                    service_type=feedback.service_type,
                    feedback_text=feedback_text,
                )
                if new_badges:
                    badge_names = [b.name_en for b in new_badges]
                    print(f"[RLHF] User earned badges: {badge_names}")
            except Exception as e:
                print(f"[RLHF] Badge processing error: {e}")

        print(f"[RLHF] Recorded feedback {feedback_id}: rating={rating}, theme={feedback.theme}")

        # Return feedback_id and any new badges
        return feedback_id, new_badges if HAS_BADGES else feedback_id

    def _add_fewshot_candidate(self, feedback: FeedbackRecord):
        """Add high-rated consultation to Few-shot candidate pool."""
        if not feedback.consultation_summary:
            return

        example = FewShotExample(
            theme=feedback.theme,
            locale=feedback.locale,
            user_question=feedback.prompt_used,
            consultation_summary=feedback.consultation_summary,
            rating=float(feedback.rating),
            key_insights=feedback.key_insights,
            created_at=feedback.timestamp,
        )

        # Store by theme for easy retrieval
        theme_key = f"fewshot:{feedback.theme}:{feedback.locale}"
        examples = self._retrieve(theme_key) or []
        examples.insert(0, asdict(example))

        # Keep top 20 examples per theme/locale, sorted by rating
        examples = sorted(examples, key=lambda x: x.get("rating", 0), reverse=True)[:20]
        self._store(theme_key, examples)

        # Invalidate cache
        cache_key = f"{feedback.theme}:{feedback.locale}"
        if cache_key in self._fewshot_cache:
            del self._fewshot_cache[cache_key]

    def _update_stats(self, feedback: FeedbackRecord):
        """Update aggregate statistics."""
        stats = self._retrieve("stats") or {
            "total_feedbacks": 0,
            "avg_rating": 0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "theme_stats": {},
            "service_stats": {},
            "last_updated": "",
        }

        # Update totals
        total = stats["total_feedbacks"]
        current_avg = stats["avg_rating"]
        new_total = total + 1
        stats["avg_rating"] = (current_avg * total + feedback.rating) / new_total
        stats["total_feedbacks"] = new_total

        # Update distribution
        rating_key = str(feedback.rating)
        stats["rating_distribution"][rating_key] = stats["rating_distribution"].get(rating_key, 0) + 1

        # Update theme stats
        theme = feedback.theme
        if theme not in stats["theme_stats"]:
            stats["theme_stats"][theme] = {"count": 0, "avg_rating": 0, "positive_rate": 0}

        theme_stat = stats["theme_stats"][theme]
        theme_count = theme_stat["count"]
        theme_avg = theme_stat["avg_rating"]
        theme_stat["count"] = theme_count + 1
        theme_stat["avg_rating"] = (theme_avg * theme_count + feedback.rating) / (theme_count + 1)
        theme_stat["positive_rate"] = (
            (theme_stat.get("positive_count", 0) + (1 if feedback.rating >= 4 else 0)) /
            theme_stat["count"]
        )
        if feedback.rating >= 4:
            theme_stat["positive_count"] = theme_stat.get("positive_count", 0) + 1

        # Update service stats
        service = feedback.service_type
        if service not in stats["service_stats"]:
            stats["service_stats"][service] = {"count": 0, "avg_rating": 0}

        svc_stat = stats["service_stats"][service]
        svc_count = svc_stat["count"]
        svc_avg = svc_stat["avg_rating"]
        svc_stat["count"] = svc_count + 1
        svc_stat["avg_rating"] = (svc_avg * svc_count + feedback.rating) / (svc_count + 1)

        stats["last_updated"] = datetime.utcnow().isoformat()
        self._store("stats", stats)

    # ===============================================================
    # FEWSHOT EXAMPLE SELECTION (Dynamic Prompting)
    # ===============================================================
    def get_fewshot_examples(
        self,
        theme: str,
        locale: str = "ko",
        top_k: int = 3,
        min_rating: float = 4.0,
    ) -> List[Dict]:
        """
        Get best Few-shot examples for a theme.

        This is the KEY RLHF feature - using high-rated consultations
        as examples for new consultations.

        Args:
            theme: Consultation theme (love, career, etc.)
            locale: Language locale
            top_k: Number of examples to return
            min_rating: Minimum rating threshold

        Returns:
            List of high-quality examples formatted for prompts
        """
        cache_key = f"{theme}:{locale}"

        # Check cache
        if cache_key in self._fewshot_cache:
            cached = self._fewshot_cache[cache_key]
            if datetime.fromisoformat(cached["expires"]) > datetime.now():
                return cached["examples"][:top_k]

        # Retrieve from storage
        theme_key = f"fewshot:{theme}:{locale}"
        examples = self._retrieve(theme_key) or []

        # Filter by rating
        filtered = [e for e in examples if e.get("rating", 0) >= min_rating]

        # Format for prompt injection
        formatted = []
        for ex in filtered[:top_k]:
            formatted.append({
                "question": ex.get("user_question", ""),
                "response_summary": ex.get("consultation_summary", ""),
                "key_insights": ex.get("key_insights", []),
                "rating": ex.get("rating", 0),
            })

        # Cache for 1 hour
        self._fewshot_cache[cache_key] = {
            "examples": formatted,
            "expires": (datetime.now() + timedelta(hours=1)).isoformat(),
        }

        return formatted

    def format_fewshot_prompt(
        self,
        theme: str,
        locale: str = "ko",
        top_k: int = 2,
    ) -> str:
        """
        Format Few-shot examples as a prompt section.

        Returns a ready-to-use prompt section with high-rated examples.
        """
        examples = self.get_fewshot_examples(theme, locale, top_k)

        if not examples:
            return ""

        if locale == "ko":
            header = "[고객 만족도 높은 상담 예시 - 이 스타일을 참고하세요]"
        else:
            header = "[High-Rated Consultation Examples - Reference this style]"

        parts = [header]

        for i, ex in enumerate(examples, 1):
            question = ex.get("question", "").strip()
            response = ex.get("response_summary", "").strip()
            insights = ex.get("key_insights", [])

            if not response:
                continue

            if locale == "ko":
                parts.append(f"\n예시 {i}:")
                if question:
                    parts.append(f"  질문: {question[:100]}")
                parts.append(f"  답변: {response[:300]}...")
                if insights:
                    parts.append(f"  핵심 인사이트: {', '.join(insights[:3])}")
            else:
                parts.append(f"\nExample {i}:")
                if question:
                    parts.append(f"  Q: {question[:100]}")
                parts.append(f"  A: {response[:300]}...")
                if insights:
                    parts.append(f"  Key Insights: {', '.join(insights[:3])}")

        return "\n".join(parts)

    # ===============================================================
    # RULE WEIGHT ADJUSTMENT
    # ===============================================================
    def get_rule_weights(self, theme: str = None) -> Dict[str, float]:
        """
        Get adjusted rule weights based on feedback patterns.

        Rules that lead to high-rated consultations get higher weights.
        """
        weights_key = f"rule_weights:{theme}" if theme else "rule_weights:global"

        # Check cache
        if weights_key in self._rule_weights_cache:
            cached = self._rule_weights_cache[weights_key]
            if datetime.fromisoformat(cached["expires"]) > datetime.now():
                return cached["weights"]

        # Retrieve from storage
        weights = self._retrieve(weights_key)

        if not weights:
            weights = {"_default": 1.0}

        # Cache for 30 minutes
        self._rule_weights_cache[weights_key] = {
            "weights": weights,
            "expires": (datetime.now() + timedelta(minutes=30)).isoformat(),
        }

        return weights

    def adjust_rule_weights(
        self,
        theme: str,
        rules_used: List[str],
        rating: int,
        learning_rate: float = 0.1,
    ):
        """
        Adjust rule weights based on feedback.

        High ratings -> increase weight
        Low ratings -> decrease weight

        Args:
            theme: Consultation theme
            rules_used: List of rule IDs that were used
            rating: User rating (1-5)
            learning_rate: How much to adjust (0.0-1.0)
        """
        weights_key = f"rule_weights:{theme}"
        weights = self._retrieve(weights_key) or {"_default": 1.0}

        # Calculate adjustment: positive for high ratings, negative for low
        # rating 5 -> +0.1, rating 1 -> -0.1
        adjustment = (rating - 3) * learning_rate / 2

        for rule_id in rules_used:
            current = weights.get(rule_id, 1.0)
            # Apply adjustment with bounds [0.1, 3.0]
            new_weight = max(0.1, min(3.0, current + adjustment))
            weights[rule_id] = round(new_weight, 3)

        # Store updated weights
        self._store(weights_key, weights)

        # Invalidate cache
        if weights_key in self._rule_weights_cache:
            del self._rule_weights_cache[weights_key]

        print(f"[RLHF] Adjusted {len(rules_used)} rule weights for {theme}: adjustment={adjustment:.3f}")

    # ===============================================================
    # ANALYTICS & REPORTING
    # ===============================================================
    def get_stats(self) -> Dict:
        """Get aggregate feedback statistics."""
        return self._retrieve("stats") or {
            "total_feedbacks": 0,
            "avg_rating": 0,
            "rating_distribution": {},
            "theme_stats": {},
            "service_stats": {},
        }

    def analyze_feedback_patterns(self, theme: str = None, days: int = 30) -> Dict:
        """
        Analyze feedback patterns to identify improvement areas.

        Returns insights like:
        - Which themes have lowest satisfaction
        - Common negative feedback patterns
        - Time-based trends
        """
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        if theme:
            feedbacks = self._retrieve(f"theme_feedbacks:{theme}") or []
        else:
            feedbacks = self._retrieve("all_feedbacks") or []

        # Filter by time
        recent = [f for f in feedbacks if f.get("timestamp", "") >= cutoff]

        if not recent:
            return {
                "period_days": days,
                "total_feedbacks": 0,
                "insights": ["데이터가 부족합니다. 더 많은 피드백을 수집하세요."],
            }

        # Calculate metrics
        ratings = [f.get("rating", 3) for f in recent]
        avg_rating = sum(ratings) / len(ratings)
        positive_count = len([r for r in ratings if r >= 4])
        negative_count = len([r for r in ratings if r <= 2])

        # Theme breakdown (if global)
        theme_breakdown = defaultdict(lambda: {"count": 0, "total_rating": 0})
        for f in recent:
            t = f.get("theme", "unknown")
            theme_breakdown[t]["count"] += 1
            theme_breakdown[t]["total_rating"] += f.get("rating", 3)

        # Find problem areas
        insights = []

        if avg_rating < 3.5:
            insights.append(f"평균 평점 {avg_rating:.1f}점 - 전반적인 개선이 필요합니다.")
        elif avg_rating >= 4.5:
            insights.append(f"평균 평점 {avg_rating:.1f}점 - 우수한 성과입니다!")

        # Find lowest-rated theme
        if theme_breakdown:
            sorted_themes = sorted(
                theme_breakdown.items(),
                key=lambda x: x[1]["total_rating"] / max(x[1]["count"], 1)
            )
            if sorted_themes:
                worst_theme = sorted_themes[0][0]
                worst_avg = sorted_themes[0][1]["total_rating"] / max(sorted_themes[0][1]["count"], 1)
                if worst_avg < 3.5:
                    insights.append(f"'{worst_theme}' 테마의 만족도가 낮습니다 ({worst_avg:.1f}점). 개선이 필요합니다.")

        # Trend analysis
        if len(recent) >= 10:
            first_half = recent[len(recent)//2:]
            second_half = recent[:len(recent)//2]

            first_avg = sum(f.get("rating", 3) for f in first_half) / len(first_half)
            second_avg = sum(f.get("rating", 3) for f in second_half) / len(second_half)

            if second_avg > first_avg + 0.3:
                insights.append("최근 만족도가 상승 추세입니다. 좋은 방향입니다!")
            elif second_avg < first_avg - 0.3:
                insights.append("최근 만족도가 하락 추세입니다. 점검이 필요합니다.")

        return {
            "period_days": days,
            "total_feedbacks": len(recent),
            "avg_rating": round(avg_rating, 2),
            "positive_count": positive_count,
            "negative_count": negative_count,
            "positive_rate": round(positive_count / len(recent) * 100, 1),
            "theme_breakdown": dict(theme_breakdown),
            "insights": insights,
        }

    # ===============================================================
    # TRAINING DATA EXPORT (For Fine-tuning)
    # ===============================================================
    def export_training_data(
        self,
        min_rating: int = 4,
        format: str = "jsonl",
        limit: int = 1000,
    ) -> List[Dict]:
        """
        Export high-rated consultations as training data for fine-tuning.

        Args:
            min_rating: Minimum rating to include
            format: Output format (jsonl, csv)
            limit: Maximum records to export

        Returns:
            List of training examples in specified format
        """
        all_feedbacks = self._retrieve("all_feedbacks") or []

        training_data = []

        for fb_meta in all_feedbacks[:limit * 2]:  # Fetch more to filter
            if fb_meta.get("rating", 0) < min_rating:
                continue

            feedback_id = fb_meta.get("feedback_id")
            if not feedback_id:
                continue

            feedback = self._retrieve(f"feedback:{feedback_id}")
            if not feedback:
                continue

            # Format as instruction-following pair
            training_example = {
                "instruction": f"주제: {feedback.get('theme', 'general')}\n질문: {feedback.get('prompt_used', '')}",
                "input": feedback.get("context_used", "")[:2000],
                "output": feedback.get("consultation_summary", ""),
                "metadata": {
                    "rating": feedback.get("rating"),
                    "theme": feedback.get("theme"),
                    "locale": feedback.get("locale"),
                    "timestamp": feedback.get("timestamp"),
                }
            }

            training_data.append(training_example)

            if len(training_data) >= limit:
                break

        print(f"[RLHF] Exported {len(training_data)} training examples (min_rating={min_rating})")
        return training_data

    def get_improvement_suggestions(self) -> List[Dict]:
        """
        Get actionable improvement suggestions based on feedback analysis.
        """
        stats = self.get_stats()
        analysis = self.analyze_feedback_patterns(days=30)

        suggestions = []

        # Check overall performance
        if stats.get("avg_rating", 3) < 3.5:
            suggestions.append({
                "priority": "high",
                "area": "overall",
                "suggestion": "전체 만족도가 낮습니다. Few-shot 예시를 업데이트하고 프롬프트를 개선하세요.",
                "action": "update_prompts",
            })

        # Check theme-specific issues
        theme_stats = stats.get("theme_stats", {})
        for theme, t_stats in theme_stats.items():
            if t_stats.get("avg_rating", 3) < 3.0:
                suggestions.append({
                    "priority": "high",
                    "area": theme,
                    "suggestion": f"'{theme}' 테마의 만족도가 매우 낮습니다 ({t_stats.get('avg_rating', 0):.1f}점). 해당 규칙과 데이터를 점검하세요.",
                    "action": f"review_theme:{theme}",
                })
            elif t_stats.get("avg_rating", 3) < 3.5:
                suggestions.append({
                    "priority": "medium",
                    "area": theme,
                    "suggestion": f"'{theme}' 테마 개선이 필요합니다. 더 많은 고품질 예시를 추가하세요.",
                    "action": f"add_examples:{theme}",
                })

        # Check if we have enough training data
        total = stats.get("total_feedbacks", 0)
        if total < 100:
            suggestions.append({
                "priority": "medium",
                "area": "data",
                "suggestion": f"피드백 데이터가 부족합니다 ({total}개). 더 많은 사용자 피드백을 수집하세요.",
                "action": "collect_feedback",
            })
        elif total >= 500:
            suggestions.append({
                "priority": "low",
                "area": "training",
                "suggestion": f"충분한 피드백 데이터({total}개)가 있습니다. 모델 파인튜닝을 고려하세요.",
                "action": "finetune_model",
            })

        return sorted(suggestions, key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x["priority"], 3))


# ===============================================================
# SINGLETON & FACTORY
# ===============================================================
_feedback_learning_instance: Optional[FeedbackLearning] = None


def get_feedback_learning() -> FeedbackLearning:
    """Get singleton FeedbackLearning instance."""
    global _feedback_learning_instance
    if _feedback_learning_instance is None:
        _feedback_learning_instance = FeedbackLearning()
    return _feedback_learning_instance


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    print("Testing Feedback Learning System...")

    fl = get_feedback_learning()

    # Simulate some feedback
    for i in range(5):
        rating = 5 if i < 3 else 2
        fb_id = fl.record_feedback(
            record_id=f"test_record_{i}",
            user_id="test_user",
            rating=rating,
            feedback_text="좋아요!" if rating >= 4 else "아쉬워요",
            consultation_data={
                "theme": "love" if i % 2 == 0 else "career",
                "locale": "ko",
                "service_type": "fusion",
                "summary": f"테스트 상담 결과 {i}. 당신의 사주를 분석한 결과...",
                "key_insights": ["인사이트1", "인사이트2"],
                "prompt": "연애운이 궁금해요",
                "context": "사주: 갑자일주, 점성: 사자자리",
            }
        )
        print(f"  Created feedback: {fb_id}")

    # Get stats
    stats = fl.get_stats()
    print(f"\nStats: {json.dumps(stats, indent=2, ensure_ascii=False)}")

    # Get few-shot examples
    examples = fl.get_fewshot_examples("love", "ko", top_k=2)
    print(f"\nFew-shot examples: {len(examples)}")

    # Get formatted prompt
    prompt_section = fl.format_fewshot_prompt("love", "ko", top_k=2)
    print(f"\nFormatted prompt:\n{prompt_section}")

    # Analyze patterns
    analysis = fl.analyze_feedback_patterns(days=30)
    print(f"\nAnalysis: {json.dumps(analysis, indent=2, ensure_ascii=False)}")

    # Get suggestions
    suggestions = fl.get_improvement_suggestions()
    print(f"\nSuggestions: {json.dumps(suggestions, indent=2, ensure_ascii=False)}")
