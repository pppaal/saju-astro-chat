# backend_ai/app/user_memory.py
"""
User Context Memory System - Gemini-Level Personalization
==========================================================
Stores and retrieves user consultation history for continuous, personalized advice.

Features:
- Session memory (current conversation)
- Long-term memory (past consultations)
- Key insights extraction
- Personalized context building
"""

import os
import json
import hashlib
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from functools import lru_cache

from backend_ai.app.utils.json_safe import safe_json_loads

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


# Try Redis, fallback to in-memory
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
    print("[UserMemory] Redis connected")
except Exception:
    HAS_REDIS = False
    _redis_client = None
    print("[UserMemory] Using in-memory storage")

# In-memory fallback
_memory_store: Dict[str, Any] = {}


@dataclass
class ConsultationRecord:
    """Single consultation record with RLHF learning fields."""
    timestamp: str
    theme: str
    locale: str
    summary: str
    key_insights: List[str]
    birth_data: Dict
    recommendations: List[str]
    service_type: str = "fusion"  # fusion, dream, iching, tarot, compatibility
    user_feedback: Optional[str] = None
    rating: Optional[int] = None
    # RLHF Learning Fields
    user_prompt: Optional[str] = None  # Original user question
    context_used: Optional[str] = None  # Context used for generation
    matched_rule_ids: Optional[List[str]] = None  # Rules used (for weight adjustment)


@dataclass
class UserProfile:
    """User's aggregated profile from consultations."""
    user_id: str
    birth_data: Dict
    dominant_themes: List[str]
    key_patterns: List[str]
    consultation_count: int
    last_consultation: str
    personality_insights: List[str]
    growth_areas: List[str]


class UserMemory:
    """
    Manages user consultation history and context.
    """

    def __init__(self, user_id: str):
        self.user_id = user_id
        self._prefix = f"usermem:{user_id}"

    def _get_key(self, suffix: str) -> str:
        return f"{self._prefix}:{suffix}"

    def _store(self, key: str, data: Any, ttl_days: int = 365):
        """Store data with TTL."""
        full_key = self._get_key(key)
        json_data = json.dumps(data, ensure_ascii=False, default=str)

        if HAS_REDIS:
            _redis_client.setex(full_key, timedelta(days=ttl_days), json_data)
        else:
            _memory_store[full_key] = {
                "data": json_data,
                "expires": datetime.now() + timedelta(days=ttl_days)
            }

    def _retrieve(self, key: str) -> Optional[Any]:
        """Retrieve data."""
        full_key = self._get_key(key)

        if HAS_REDIS:
            data = _redis_client.get(full_key)
            return safe_json_loads(data, default=None, context="user_memory") if data else None
        else:
            entry = _memory_store.get(full_key)
            if entry and entry["expires"] > datetime.now():
                return safe_json_loads(entry["data"], default=None, context="user_memory")
            return None

    def _append_list(self, key: str, item: Any, max_items: int = 50):
        """Append to a list with max size."""
        current = self._retrieve(key) or []
        current.insert(0, item)
        current = current[:max_items]
        self._store(key, current)

    # ===============================================================
    # CONSULTATION MANAGEMENT (Enhanced for RLHF Learning)
    # ===============================================================
    def save_consultation(
        self,
        theme: str,
        locale: str,
        birth_data: Dict,
        fusion_result: str,
        key_insights: List[str] = None,
        recommendations: List[str] = None,
        service_type: str = "fusion",
        # RLHF Learning Fields
        user_prompt: str = None,
        context_used: str = None,
        matched_rule_ids: List[str] = None,
    ) -> str:
        """
        Save a consultation record with RLHF learning context.

        The user_prompt, context_used, and matched_rule_ids are crucial
        for the feedback learning loop - they enable:
        1. Few-shot example selection from high-rated consultations
        2. Rule weight adjustment based on feedback
        3. Training data export for fine-tuning
        """
        record = ConsultationRecord(
            timestamp=datetime.utcnow().isoformat(),
            theme=theme,
            locale=locale,
            summary=fusion_result[:500] if fusion_result else "",
            key_insights=key_insights or self._extract_insights(fusion_result),
            birth_data=birth_data,
            recommendations=recommendations or [],
            service_type=service_type,
            # RLHF fields
            user_prompt=user_prompt[:500] if user_prompt else None,
            context_used=context_used[:2000] if context_used else None,
            matched_rule_ids=matched_rule_ids,
        )

        # Generate record ID
        record_id = hashlib.sha1(
            f"{self.user_id}:{record.timestamp}".encode()
        ).hexdigest()[:12]

        # Save individual record
        self._store(f"consultation:{record_id}", asdict(record), ttl_days=365)

        # Append to history list
        self._append_list("history", {
            "id": record_id,
            "timestamp": record.timestamp,
            "theme": theme,
            "service_type": service_type,
            "summary": record.summary[:100],
        }, max_items=100)

        # Update profile
        self._update_profile(record)

        return record_id

    def get_consultation(self, record_id: str) -> Optional[ConsultationRecord]:
        """Get a specific consultation."""
        data = self._retrieve(f"consultation:{record_id}")
        return ConsultationRecord(**data) if data else None

    def get_history(self, limit: int = 10) -> List[Dict]:
        """Get recent consultation history."""
        history = self._retrieve("history") or []
        return history[:limit]

    def _extract_insights(self, text: str) -> List[str]:
        """Extract key insights from fusion result."""
        if not text:
            return []

        insights = []
        # Look for bullet points or key phrases
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith(("•", "-", "★", "✓", "→")):
                clean = line.lstrip("•-★✓→ ").strip()
                if 10 < len(clean) < 200:
                    insights.append(clean)

        return insights[:5]

    def _update_profile(self, record: ConsultationRecord):
        """Update user profile with new consultation data."""
        profile_data = self._retrieve("profile") or {
            "user_id": self.user_id,
            "birth_data": {},
            "dominant_themes": [],
            "key_patterns": [],
            "consultation_count": 0,
            "last_consultation": "",
            "personality_insights": [],
            "growth_areas": [],
        }

        # Update counts and timestamps
        profile_data["consultation_count"] += 1
        profile_data["last_consultation"] = record.timestamp

        # Update birth data if provided
        if record.birth_data:
            profile_data["birth_data"].update(record.birth_data)

        # Track theme frequency
        themes = profile_data.get("dominant_themes", [])
        themes.append(record.theme)
        # Keep top 5 most frequent
        from collections import Counter
        theme_counts = Counter(themes)
        profile_data["dominant_themes"] = [t for t, _ in theme_counts.most_common(5)]

        # Accumulate insights
        all_insights = profile_data.get("personality_insights", [])
        all_insights.extend(record.key_insights)
        profile_data["personality_insights"] = list(set(all_insights))[:20]

        self._store("profile", profile_data)

    def get_profile(self) -> Optional[UserProfile]:
        """Get user profile."""
        data = self._retrieve("profile")
        return UserProfile(**data) if data else None

    # ===============================================================
    # CONTEXT BUILDING FOR LLM
    # ===============================================================
    def build_context_for_llm(self, current_theme: str, locale: str = "en", service_type: str = None) -> str:
        """
        Build rich context from user history for LLM prompts.
        This enables continuous, personalized advice.
        """
        profile = self.get_profile()
        history = self.get_history(limit=10)

        if not profile and not history:
            return ""

        context_parts = []

        if locale == "ko":
            context_parts.append("【사용자 히스토리 - 이전 상담 기반 맥락】")
        else:
            context_parts.append("【User History - Context from Previous Consultations】")

        # Profile summary
        if profile:
            context_parts.append(f"\n[Profile]")
            context_parts.append(f"  • Total consultations: {profile.consultation_count}")
            context_parts.append(f"  • Common themes: {', '.join(profile.dominant_themes[:3])}")

            if profile.personality_insights:
                context_parts.append(f"\n[Key Personality Patterns]")
                for insight in profile.personality_insights[:5]:
                    context_parts.append(f"  • {insight[:80]}")

            if profile.growth_areas:
                context_parts.append(f"\n[Recommended Growth Areas]")
                for area in profile.growth_areas[:3]:
                    context_parts.append(f"  • {area}")

        # Recent consultations by service type
        if history:
            # Group by service type
            service_history = {}
            for h in history:
                svc = h.get("service_type", "fusion")
                if svc not in service_history:
                    service_history[svc] = []
                service_history[svc].append(h)

            # Show relevant service history first
            if service_type and service_type in service_history:
                if locale == "ko":
                    svc_name = {"fusion": "운세", "dream": "꿈해몽", "iching": "주역", "tarot": "타로"}.get(service_type, service_type)
                    context_parts.append(f"\n[최근 {svc_name} 상담]")
                else:
                    context_parts.append(f"\n[Recent {service_type} Consultations]")

                for h in service_history[service_type][:3]:
                    date = h.get("timestamp", "")[:10]
                    summary = h.get("summary", "")[:60]
                    context_parts.append(f"  • {date}: {summary}...")

            # Show other service history summary
            other_services = [s for s in service_history.keys() if s != service_type]
            if other_services:
                if locale == "ko":
                    context_parts.append(f"\n[다른 서비스 이용 이력]")
                else:
                    context_parts.append(f"\n[Other Service History]")

                for svc in other_services[:3]:
                    count = len(service_history[svc])
                    latest = service_history[svc][0]
                    date = latest.get("timestamp", "")[:10]
                    svc_name = {"fusion": "운세", "dream": "꿈해몽", "iching": "주역", "tarot": "타로"}.get(svc, svc) if locale == "ko" else svc
                    context_parts.append(f"  • {svc_name}: {count}회 (최근: {date})")

        context_parts.append("\n→ Use this history to provide continuity and personalized follow-up advice.")

        return "\n".join(context_parts)

    # ===============================================================
    # SESSION MEMORY (Current Conversation)
    # ===============================================================
    def add_session_message(self, role: str, content: str):
        """Add message to current session."""
        messages = self._retrieve("session") or []
        messages.append({
            "role": role,
            "content": content[:1000],
            "timestamp": datetime.utcnow().isoformat(),
        })
        # Keep last 20 messages
        self._store("session", messages[-20:], ttl_days=1)

    def get_session_messages(self) -> List[Dict]:
        """Get current session messages."""
        return self._retrieve("session") or []

    def clear_session(self):
        """Clear current session."""
        self._store("session", [], ttl_days=1)

    # ===============================================================
    # FEEDBACK (Enhanced with RLHF Integration)
    # ===============================================================
    def save_feedback(self, record_id: str, feedback: str, rating: int = None):
        """
        Save user feedback for a consultation.

        Enhanced to integrate with RLHF FeedbackLearning system for:
        - Dynamic Few-shot example selection
        - Rule weight adjustment
        - Continuous improvement
        """
        record = self._retrieve(f"consultation:{record_id}")
        if record:
            record["user_feedback"] = feedback
            if rating:
                record["rating"] = rating
            self._store(f"consultation:{record_id}", record)

        # Track feedback patterns (local)
        feedbacks = self._retrieve("feedbacks") or []
        feedbacks.append({
            "record_id": record_id,
            "feedback": feedback[:200],
            "rating": rating,
            "timestamp": datetime.utcnow().isoformat(),
        })
        self._store("feedbacks", feedbacks[-50:])

        # ===============================================================
        # RLHF Integration - Record to FeedbackLearning system
        # ===============================================================
        if rating is not None:
            try:
                from feedback_learning import get_feedback_learning

                fl = get_feedback_learning()

                # Build consultation data for RLHF learning (with full context)
                consultation_data = {
                    "theme": record.get("theme", "unknown") if record else "unknown",
                    "locale": record.get("locale", "ko") if record else "ko",
                    "service_type": record.get("service_type", "fusion") if record else "fusion",
                    "summary": record.get("summary", "") if record else "",
                    "key_insights": record.get("key_insights", []) if record else [],
                    # RLHF Learning Fields (from enhanced ConsultationRecord)
                    "prompt": record.get("user_prompt", "") if record else "",
                    "context": record.get("context_used", "") if record else "",
                }

                # Record feedback to RLHF system
                fl.record_feedback(
                    record_id=record_id,
                    user_id=self.user_id,
                    rating=rating,
                    feedback_text=feedback,
                    consultation_data=consultation_data,
                )

                # Also adjust rule weights if rules were tracked
                matched_rule_ids = record.get("matched_rule_ids", []) if record else []
                if matched_rule_ids:
                    fl.adjust_rule_weights(
                        theme=consultation_data["theme"],
                        rules_used=matched_rule_ids,
                        rating=rating,
                    )
                    print(f"[UserMemory] RLHF: Adjusted weights for {len(matched_rule_ids)} rules")

                print(f"[UserMemory] RLHF feedback recorded for {record_id}")

            except ImportError:
                pass  # FeedbackLearning not available
            except Exception as e:
                print(f"[UserMemory] RLHF integration error: {e}")

    def get_feedback_stats(self) -> Dict:
        """Get user's feedback statistics."""
        feedbacks = self._retrieve("feedbacks") or []

        if not feedbacks:
            return {"count": 0, "avg_rating": None}

        ratings = [f.get("rating") for f in feedbacks if f.get("rating") is not None]

        return {
            "count": len(feedbacks),
            "rated_count": len(ratings),
            "avg_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
            "positive_count": len([r for r in ratings if r >= 4]),
            "negative_count": len([r for r in ratings if r <= 2]),
        }


# ===============================================================
# FACTORY FUNCTION
# ===============================================================
def get_user_memory(user_id: str) -> UserMemory:
    """Get UserMemory instance for a user."""
    return UserMemory(user_id)


def generate_user_id(birth_data: Dict) -> str:
    """Generate consistent user ID from birth data."""
    key_parts = [
        str(birth_data.get("year", "")),
        str(birth_data.get("month", "")),
        str(birth_data.get("day", "")),
        str(birth_data.get("hour", "")),
        str(birth_data.get("latitude", ""))[:6],
        str(birth_data.get("longitude", ""))[:6],
    ]
    key_string = ":".join(key_parts)
    return hashlib.sha256(key_string.encode()).hexdigest()[:16]


# ===============================================================
# TEST
# ===============================================================
if __name__ == "__main__":
    print("Testing User Memory...")

    # Create test user
    birth = {"year": 1990, "month": 5, "day": 15, "hour": 14}
    user_id = generate_user_id(birth)
    print(f"User ID: {user_id}")

    memory = get_user_memory(user_id)

    # Save consultation
    record_id = memory.save_consultation(
        theme="career",
        locale="ko",
        birth_data=birth,
        fusion_result="• 목 오행이 강해 창의적 직업 적합\n• 2024년 하반기 이직 기회\n• 리더십 발휘 시기",
        key_insights=["창의적 직업 적합", "리더십 강점"],
    )
    print(f"Saved: {record_id}")

    # Get context
    context = memory.build_context_for_llm("career", "ko")
    print(f"\nContext:\n{context}")

    # Get profile
    profile = memory.get_profile()
    print(f"\nProfile: {profile}")
