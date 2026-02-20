from backend_ai.tools.validate_graph_data import run_validation


def test_core_cross_validation_passes():
    summary, issues = run_validation("core")
    assert summary.errors == 0, f"Expected zero core errors, got: {issues[:10]}"
    assert summary.core_cross_checks >= 1
    assert summary.grade() == "A+"


def test_full_validation_returns_summary_shape():
    summary, _ = run_validation("full")
    assert isinstance(summary.checked_files, int)
    assert isinstance(summary.errors, int)
    assert isinstance(summary.warnings, int)
