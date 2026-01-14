#!/usr/bin/env python3
"""
Remove migrated routes from app.py

This script removes route definitions that have been migrated to routers/.
It keeps the route functions (they're used by proxy pattern) but removes the @app.route decorators.
"""

import re
from pathlib import Path

# Routes that have been migrated to routers/
MIGRATED_ROUTES = {
    # core_routes.py (4)
    "/": "index",
    "/health": "health_check",
    "/ready": "readiness_check",
    "/capabilities": "get_capabilities",

    # chart_routes.py (6)
    "/calc_saju": "calc_saju",
    "/calc_astro": "calc_astro",
    "/transits": "get_transits",
    "/charts/saju": "generate_saju_chart",
    "/charts/natal": "generate_natal_chart",
    "/charts/full": "generate_full_charts",

    # cache_routes.py (5)
    "/cache/stats": "cache_stats",
    "/cache/clear": "cache_clear",
    "/performance/stats": "performance_stats",
    "/metrics": "prometheus_metrics",
    "/health/full": "full_health_check",

    # search_routes.py (2)
    "/api/search/domain": "domain_rag_search",
    "/api/search/hybrid": "hybrid_rag_search",

    # stream_routes.py (3)
    "/ask": "ask",
    "/ask-stream": "ask_stream",
    "/counselor/init": "counselor_init",

    # saju_routes.py (2)
    "/saju/counselor/init": "saju_counselor_init",
    "/saju/ask-stream": "saju_ask_stream",

    # astrology_routes.py (2)
    "/astrology/counselor/init": "astrology_counselor_init",
    "/astrology/ask-stream": "astrology_ask_stream",
}

def find_route_blocks(content: str):
    """
    Find all route decorator + function definition blocks.
    Returns list of (start_line, end_line, route_path, function_name)
    """
    lines = content.split('\n')
    blocks = []

    i = 0
    while i < len(lines):
        line = lines[i]

        # Check for @app.route decorator
        if line.strip().startswith('@app.route('):
            # Extract route path
            match = re.search(r'@app\.route\(["\']([^"\']+)["\']', line)
            if match:
                route_path = match.group(1)

                # Look for function definition (might be multiple decorators)
                j = i + 1
                func_name = None
                while j < len(lines):
                    if lines[j].strip().startswith('def '):
                        # Extract function name
                        func_match = re.search(r'def\s+(\w+)\s*\(', lines[j])
                        if func_match:
                            func_name = func_match.group(1)
                            break
                    elif lines[j].strip().startswith('@'):
                        # Another decorator, keep looking
                        j += 1
                    else:
                        break

                if func_name:
                    blocks.append({
                        'decorator_line': i,
                        'function_line': j,
                        'route_path': route_path,
                        'function_name': func_name
                    })

        i += 1

    return blocks

def remove_route_decorators(app_py_path: Path, dry_run=False):
    """
    Remove @app.route decorators for migrated routes.
    Keeps the function definitions (used by proxy pattern).
    """
    print(f"Reading {app_py_path}...")
    content = app_py_path.read_text(encoding='utf-8')
    lines = content.split('\n')

    # Find all route blocks
    blocks = find_route_blocks(content)

    print(f"\nFound {len(blocks)} total routes")
    print(f"Will remove {len(MIGRATED_ROUTES)} migrated routes\n")

    # Mark lines to remove
    lines_to_remove = set()
    removed_routes = []

    for block in blocks:
        route_path = block['route_path']
        func_name = block['function_name']

        if route_path in MIGRATED_ROUTES:
            expected_func = MIGRATED_ROUTES[route_path]
            if func_name == expected_func:
                # Remove the @app.route decorator line(s)
                # Look backwards from function line to find all decorators
                dec_line = block['decorator_line']
                func_line = block['function_line']

                # Remove all lines from decorator to just before function
                for line_num in range(dec_line, func_line):
                    if lines[line_num].strip().startswith('@app.route'):
                        lines_to_remove.add(line_num)
                        removed_routes.append(f"{route_path} -> {func_name}")

    if dry_run:
        print("DRY RUN - Would remove these routes:")
        for route in sorted(removed_routes):
            print(f"  - {route}")
        print(f"\nTotal: {len(removed_routes)} route decorators")
        return

    # Remove marked lines
    new_lines = [line for i, line in enumerate(lines) if i not in lines_to_remove]
    new_content = '\n'.join(new_lines)

    # Write back
    print(f"Writing updated {app_py_path}...")
    app_py_path.write_text(new_content, encoding='utf-8')

    print(f"\n✅ Removed {len(removed_routes)} route decorators:")
    for route in sorted(removed_routes):
        print(f"  - {route}")

    # Calculate line reduction
    old_lines = len(lines)
    new_lines_count = len(new_lines)
    reduction = old_lines - new_lines_count

    print(f"\n📊 Line count:")
    print(f"  Before: {old_lines:,} lines")
    print(f"  After:  {new_lines_count:,} lines")
    print(f"  Reduced: {reduction} lines ({reduction/old_lines*100:.1f}%)")

def main():
    import sys

    # Path to app.py
    app_py = Path(__file__).parent.parent / "app" / "app.py"

    if not app_py.exists():
        print(f"Error: {app_py} not found")
        sys.exit(1)

    # Check for --yes flag
    auto_yes = '--yes' in sys.argv

    # Dry run first
    print("=" * 60)
    print("DRY RUN - Checking what will be removed")
    print("=" * 60)
    remove_route_decorators(app_py, dry_run=True)

    if not auto_yes:
        print("\n" + "=" * 60)
        response = input("\nProceed with actual removal? (yes/no): ").strip().lower()
        if response != 'yes':
            print("Aborted.")
            sys.exit(0)

    print("\n" + "=" * 60)
    print("ACTUAL RUN - Removing route decorators")
    print("=" * 60)
    remove_route_decorators(app_py, dry_run=False)

if __name__ == "__main__":
    main()
