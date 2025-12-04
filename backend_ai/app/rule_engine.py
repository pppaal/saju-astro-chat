import os
import json
from typing import Dict, Any, List, Tuple


class RuleEngine:
    """Simple JSON-based rule matcher with tokenized conditions."""

    def __init__(self, rules_dir: str):
        self.rules_dir = os.path.abspath(rules_dir)
        self.rules: Dict[str, Dict[str, Any]] = {}
        self._load_rules()

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

    def evaluate(self, facts: Dict[str, Any]) -> Dict[str, Any]:
        """
        facts:
        {
          "theme": "focus_overall",
          "saju": {...},
          "astro": {...},
          ...
        }
        """
        theme = facts.get("theme", "daily")
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
                final_score = score + min(len(text), 200)
                matches.append((final_score, text))

        matches.sort(key=lambda x: x[0], reverse=True)
        matched_texts = [m[1] for m in matches[:10]]

        return {
          "theme": theme,
          "rules_loaded": list(self.rules.keys()),
          "matched_rules": matched_texts,
          "matched_count": len(matches),
        }
