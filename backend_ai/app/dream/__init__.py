# backend_ai/app/dream/__init__.py
"""
Dream Package
=============
Dream interpretation engine modules.

Modules:
- rule_engine: DreamRuleEngine with celestial context, combinations, taemong, lucky numbers
"""

from .rule_engine import DreamRuleEngine, get_dream_rule_engine

__all__ = [
    "DreamRuleEngine",
    "get_dream_rule_engine",
]
