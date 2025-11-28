# backend_ai/app/rule_engine.py

import os, json
from typing import Dict, Any

class RuleEngine:
    """JSON 룰 파일을 로드하여 theme별 매칭 수행"""
    def __init__(self, rules_dir: str):
        self.rules_dir = os.path.abspath(rules_dir)
        self.rules: Dict[str, Dict[str, Any]] = {}
        self._load_rules()

    def _load_rules(self):
        if not os.path.isdir(self.rules_dir):
            raise FileNotFoundError(f"[RuleEngine] 잘못된 경로: {self.rules_dir}")

        for filename in os.listdir(self.rules_dir):
            if filename.endswith(".json"):
                path = os.path.join(self.rules_dir, filename)
                try:
                    with open(path, encoding="utf-8") as f:
                        self.rules[filename.replace(".json", "")] = json.load(f)
                except Exception as e:
                    print(f"[RuleEngine] ⚠️ {filename} 로드 실패: {e}")

        print(f"[RuleEngine] ✅ {len(self.rules)}개 룰 로드 완료 → {self.rules_dir}")

    def evaluate(self, facts: Dict[str, Any]) -> Dict[str, Any]:
        theme = facts.get("theme", "daily")
        rule_set = self.rules.get(theme, {})
        return {
            "theme": theme,
            "rules_loaded": list(self.rules.keys()),
            "matched_rule_count": len(rule_set),
            "facts_sample": facts
        }