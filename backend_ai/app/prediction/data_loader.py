# backend_ai/app/prediction/data_loader.py
"""
Prediction Engine Data Loader
=============================
Load and cache prediction-related JSON data files.
"""

import os
import json
from typing import Dict, Any


class DataLoader:
    """데이터 로더"""

    def __init__(self, base_path: str = None):
        if base_path is None:
            base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.base_path = base_path
        self._cache: Dict[str, Any] = {}

    def load_json(self, relative_path: str) -> Dict:
        """JSON 파일 로드 (캐싱)"""
        if relative_path in self._cache:
            return self._cache[relative_path]

        full_path = os.path.join(self.base_path, relative_path)
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self._cache[relative_path] = data
                return data
        except Exception:
            return {}

    def get_daeun_data(self) -> Dict:
        """대운 상세 데이터"""
        return self.load_json("data/graph/rules/saju/daeun_detailed.json")

    def get_electional_rules(self) -> Dict:
        """택일 규칙"""
        return self.load_json("data/graph/astro/electional/electional_rules.json")

    def get_cross_luck_data(self) -> Dict:
        """대운-트랜짓 크로스 데이터"""
        return self.load_json("data/graph/fusion/cross_luck_progression.json")

    def get_transit_data(self) -> Dict:
        """트랜짓 데이터"""
        return self.load_json("data/graph/astro/progressions/advanced_progressions.json")
