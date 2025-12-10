"""Entry point for Railway deployment."""
import sys
import os

# Add parent directory to Python path for backend_ai imports
# This allows imports like "from backend_ai.app.xxx import yyy" to work
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Also add current dir for relative imports
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.app import app

if __name__ == "__main__":
    app.run()
