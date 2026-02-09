"""
Request parsing utilities.
"""

import logging
from typing import Any, Tuple, Optional

from flask import Request, jsonify
from werkzeug.exceptions import BadRequest

logger = logging.getLogger("backend_ai")


def get_json_or_400(
    request: Request,
    *,
    force: bool = False
) -> Tuple[Optional[dict], Optional[Tuple[Any, int]]]:
    """
    Parse JSON body safely.

    Returns:
        (data, error_response)
        - data: parsed dict when valid
        - error_response: (jsonify(...), status_code) when invalid
    """
    try:
        data = request.get_json(force=force, silent=False)
    except BadRequest as exc:
        logger.warning(f"[JSON] Invalid JSON body: {exc}")
        return None, (jsonify({"status": "error", "message": "Invalid JSON body"}), 400)

    if data is None:
        return None, (jsonify({"status": "error", "message": "Missing JSON body"}), 400)

    if not isinstance(data, dict):
        return None, (jsonify({"status": "error", "message": "JSON body must be an object"}), 400)

    return data, None
