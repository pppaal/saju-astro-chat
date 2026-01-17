# backend_ai/app/tarot/spread_loader.py
"""
Tarot Spread Loader
===================
Load and manage tarot spread configurations.
Extracted from tarot_hybrid_rag.py for better modularity.
"""

import os
import json
from typing import Dict, List, Optional


class SpreadLoader:
    """Load and manage tarot spread configurations"""

    def __init__(self, spreads_dir: str = None):
        if spreads_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            spreads_dir = os.path.join(base_dir, "data", "graph", "rules", "tarot", "spreads")

        self.spreads_dir = spreads_dir
        self.spreads: Dict = {}
        self._load_all_spreads()

    def _load_all_spreads(self):
        """Load all spread JSON files"""
        if not os.path.exists(self.spreads_dir):
            return

        for filename in os.listdir(self.spreads_dir):
            if not filename.endswith('.json'):
                continue

            theme_name = filename.replace('_spreads.json', '')
            path = os.path.join(self.spreads_dir, filename)

            try:
                with open(path, encoding='utf-8') as f:
                    data = json.load(f)
                    self.spreads[theme_name] = data
            except Exception:
                pass

    def get_spread(self, theme: str, sub_topic: str) -> Optional[Dict]:
        """Get specific spread configuration"""
        if theme not in self.spreads:
            return None

        sub_topics = self.spreads[theme].get('sub_topics', {})
        return sub_topics.get(sub_topic)

    def get_sub_topics(self, theme: str) -> List[Dict]:
        """Get all sub-topics for a theme"""
        if theme not in self.spreads:
            return []

        sub_topics = self.spreads[theme].get('sub_topics', {})
        return [
            {
                'id': st_id,
                'title': st_data.get('title', st_id),
                'korean': st_data.get('korean', ''),
                'description': st_data.get('description', ''),
                'card_count': st_data.get('card_count', 3)
            }
            for st_id, st_data in sub_topics.items()
        ]

    def get_available_themes(self) -> List[str]:
        """Get list of available themes"""
        return list(self.spreads.keys())

    def get_spread_info(self, theme: str, sub_topic: str) -> Optional[Dict]:
        """Get full spread info with positions"""
        spread = self.get_spread(theme, sub_topic)
        if not spread:
            return None

        return {
            'theme': theme,
            'sub_topic': sub_topic,
            'spread_name': spread.get('spread_name', ''),
            'title': spread.get('title', ''),
            'korean': spread.get('korean', ''),
            'description': spread.get('description', ''),
            'card_count': spread.get('card_count', 3),
            'positions': spread.get('positions', [])
        }


# Singleton instance
_spread_loader: Optional[SpreadLoader] = None


def get_spread_loader() -> SpreadLoader:
    """Get or create singleton SpreadLoader instance"""
    global _spread_loader
    if _spread_loader is None:
        _spread_loader = SpreadLoader()
    return _spread_loader
