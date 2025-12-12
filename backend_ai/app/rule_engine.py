import os
import json
from typing import Dict, Any, List, Tuple, Optional


class RuleEngine:
    """Simple JSON-based rule matcher with tokenized conditions and RLHF weight support."""

    def __init__(self, rules_dir: str):
        self.rules_dir = os.path.abspath(rules_dir)
        self.rules: Dict[str, Dict[str, Any]] = {}
        self._rlhf_weights: Dict[str, float] = {}  # RLHF-adjusted weights
        self._load_rules()

    def set_rlhf_weights(self, weights: Dict[str, float]):
        """
        Set RLHF-adjusted weights for rules.
        These weights are learned from user feedback.
        """
        self._rlhf_weights = weights or {}
        if weights:
            print(f"[RuleEngine] Loaded {len(weights)} RLHF weights")

    def _load_rules(self):
        print(f"[RuleEngine] DEBUG rules_dir = {self.rules_dir}")
        if not os.path.exists(self.rules_dir):
            raise FileNotFoundError(f"[RuleEngine] rules directory missing: {self.rules_dir}")
        if not os.path.isdir(self.rules_dir):
            raise FileNotFoundError(f"[RuleEngine] rules path is not a directory: {self.rules_dir}")

        for filename in os.listdir(self.rules_dir):
            if not filename.lower().endswith(".json"):
                continue
            path = os.path.join(self.rules_dir, filename)
            try:
                with open(path, encoding="utf-8") as f:
                    key = os.path.splitext(filename)[0]
                    self.rules[key] = json.load(f)
            except Exception as e:
                print(f"[RuleEngine] WARN failed to load {filename}: {e}")

        print(
            f"[RuleEngine] loaded {len(self.rules)} rule sets from {self.rules_dir} "
            f"({', '.join(self.rules.keys()) if self.rules else 'no rules'})"
        )

    def _flatten_tokens(self, obj: Any) -> List[str]:
        """Flatten facts into lowercase tokens."""
        tokens: List[str] = []

        def _recurse(x: Any):
            if x is None:
                return
            if isinstance(x, str):
                for part in x.replace(",", " ").replace("|", " ").replace("/", " ").split():
                    part = part.strip().lower()
                    if part:
                        tokens.append(part)
            elif isinstance(x, (int, float, bool)):
                tokens.append(str(x).lower())
            elif isinstance(x, dict):
                for k, v in x.items():
                    tokens.append(str(k).lower())
                    _recurse(v)
            elif isinstance(x, (list, tuple, set)):
                for v in x:
                    _recurse(v)

        _recurse(obj)
        seen = set()
        uniq: List[str] = []
        for t in tokens:
            if t not in seen:
                seen.add(t)
                uniq.append(t)
        return uniq

    def evaluate(self, facts: Dict[str, Any], search_all: bool = False) -> Dict[str, Any]:
        """
        facts:
        {
          "theme": "focus_overall",
          "saju": {...},
          "astro": {...},
          ...
        }
        search_all: If True, search across all rule sets (for persona rules)
        """
        theme = facts.get("theme", "daily")
        if search_all:
            # Combine all rule sets for cross-domain matching
            rule_set = {}
            for key, rules in self.rules.items():
                if key != "meta":
                    rule_set.update(rules)
        else:
            rule_set = self.rules.get(theme, {})

        tokens = set(self._flatten_tokens(facts))
        matches: List[Tuple[int, str]] = []  # (score, text)

        for key, rule in rule_set.items():
            text = None
            score = 0
            conditions: List[str] = []

            if isinstance(rule, dict):
                cond = rule.get("when")
                if isinstance(cond, list):
                    conditions = [str(c).lower() for c in cond]
                elif isinstance(cond, str):
                    conditions = [cond.lower()]
                text = rule.get("text") or key
                score = int(rule.get("weight", 1))
            elif isinstance(rule, str):
                conditions = [key.lower()]
                text = rule
                score = 1

            if not text or not conditions:
                continue

            if all(c in tokens for c in conditions):
                # Apply RLHF weight adjustment
                rlhf_multiplier = self._rlhf_weights.get(key, 1.0)
                final_score = (score + min(len(text), 200)) * rlhf_multiplier
                matches.append((final_score, text, key))  # Include rule key for tracking

        matches.sort(key=lambda x: x[0], reverse=True)
        matched_texts = [m[1] for m in matches[:10]]
        matched_rule_ids = [m[2] for m in matches[:10]]  # Rule IDs for RLHF tracking

        return {
          "theme": theme,
          "rules_loaded": list(self.rules.keys()),
          "matched_rules": matched_texts,
          "matched_rule_ids": matched_rule_ids,  # For RLHF feedback
          "matched_count": len(matches),
          "rlhf_weights_applied": len(self._rlhf_weights) > 0,
        }
