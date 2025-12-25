"""
Script to remove duplicate routes from app.py that have been moved to routers/
More careful approach: find @app.route decorator and remove until next decorator or section
"""
import re

APP_PY_PATH = "backend_ai/app/app.py"

# Route prefixes that have been moved to routers/
ROUTE_PREFIXES_TO_REMOVE = [
    "/iching/",
    "/api/tarot/",
    "/api/counseling/",
    "/rlhf/",
    "/memory/",
    "/badges/",
    "/agentic/",
    "/api/prediction/",
    "/api/fortune/",
]

def should_remove_route(line):
    """Check if this @app.route should be removed."""
    if not '@app.route("' in line and "@app.route('" not in line:
        return False

    for prefix in ROUTE_PREFIXES_TO_REMOVE:
        if prefix in line:
            return True
    return False

def find_function_block_end(lines, start_idx):
    """
    Find the end of a function block starting from a @app.route decorator.
    Returns the index of the last line of the function.
    """
    # Skip decorator lines
    i = start_idx
    while i < len(lines) and lines[i].strip().startswith('@'):
        i += 1

    # Now we should be at 'def ...'
    if i >= len(lines) or not lines[i].strip().startswith('def '):
        return start_idx  # Something wrong, don't remove

    # Get the indentation of def
    def_line = lines[i]
    base_indent = len(def_line) - len(def_line.lstrip())

    i += 1  # Move past def line

    # Find end of function - next line at same or less indentation that's not empty
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Skip empty lines
        if not stripped:
            i += 1
            continue

        current_indent = len(line) - len(line.lstrip())

        # If we hit something at base indentation or less, function ended
        if current_indent <= base_indent:
            # Check if it's a decorator, def, class, or comment section
            if (stripped.startswith('@') or
                stripped.startswith('def ') or
                stripped.startswith('class ') or
                stripped.startswith('# ===')):
                return i - 1

        i += 1

    return len(lines) - 1

def main():
    with open(APP_PY_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Track which lines to keep
    lines_to_remove = set()

    i = 0
    while i < len(lines):
        line = lines[i]

        if should_remove_route(line):
            # Find the start (may have multiple decorators)
            start = i
            while start > 0 and lines[start-1].strip().startswith('@'):
                start -= 1

            # Find the end of this function
            end = find_function_block_end(lines, start)

            route_match = re.search(r'@app\.route\(["\']([^"\']+)["\']', line)
            route_path = route_match.group(1) if route_match else "unknown"
            print(f"Removing: {route_path} (lines {start+1}-{end+1})")

            for j in range(start, end + 1):
                lines_to_remove.add(j)

            i = end + 1
        else:
            i += 1

    print(f"\nTotal lines to remove: {len(lines_to_remove)}")

    # Create new content
    new_lines = []
    consecutive_blanks = 0

    for i, line in enumerate(lines):
        if i in lines_to_remove:
            continue

        # Limit consecutive blank lines to 2
        if not line.strip():
            consecutive_blanks += 1
            if consecutive_blanks > 2:
                continue
        else:
            consecutive_blanks = 0

        new_lines.append(line)

    # Write back
    with open(APP_PY_PATH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"\nOriginal: {len(lines)} lines")
    print(f"New: {len(new_lines)} lines")
    print(f"Removed: {len(lines) - len(new_lines)} lines")

if __name__ == "__main__":
    main()
