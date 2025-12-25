"""
Backend AI Tests Package
Ensures proper module path for imports.
"""
import sys
import os

# Add project root to Python path
_test_dir = os.path.dirname(os.path.abspath(__file__))
_backend_ai_dir = os.path.dirname(_test_dir)
_project_root = os.path.dirname(_backend_ai_dir)

if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

if _backend_ai_dir not in sys.path:
    sys.path.insert(0, _backend_ai_dir)
