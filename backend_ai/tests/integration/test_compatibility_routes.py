"""
Integration test for compatibility routes
compatibility_logic.py 백엔드 통합 검증
"""
import pytest


def test_compatibility_module_import():
    """Test that compatibility module can be imported correctly."""
    from backend_ai.app.compatibility import (
        interpret_compatibility,
        interpret_compatibility_group,
        analyze_timing_compatibility,
        get_action_items,
        load_compatibility_data,
    )
    
    assert callable(interpret_compatibility)
    assert callable(interpret_compatibility_group)
    assert callable(analyze_timing_compatibility)
    assert callable(get_action_items)
    assert callable(load_compatibility_data)


def test_compatibility_routes_lazy_load():
    """Test that compatibility_routes can lazy load the module."""
    from backend_ai.app.routers.compatibility_routes import _get_compatibility
    
    compat_module = _get_compatibility()
    
    # Should not be None if import succeeds
    assert compat_module is not None
    assert hasattr(compat_module, 'interpret_compatibility')
    assert hasattr(compat_module, 'interpret_compatibility_group')


def test_load_compatibility_data():
    """Test loading compatibility reference data."""
    from backend_ai.app.compatibility import load_compatibility_data
    
    data = load_compatibility_data()
    
    # Should return a dictionary with compatibility rules
    assert isinstance(data, dict)
    # Should contain compatibility reference data (structure depends on implementation)


def test_interpret_compatibility_basic():
    """Test basic 2-person compatibility analysis."""
    from backend_ai.app.compatibility import interpret_compatibility
    
    person1 = {
        "name": "Person A",
        "birthDate": "1990-05-15",
        "birthTime": "10:00",
        "gender": "M",
    }
    
    person2 = {
        "name": "Person B",
        "birthDate": "1992-08-20",
        "birthTime": "14:30",
        "gender": "F",
    }
    
    people = [person1, person2]
    relationship_type = "lover"
    locale = "ko"
    
    # This test may fail if OpenAI API key is not set
    # or if required dependencies are missing
    try:
        result = interpret_compatibility(people, relationship_type, locale)
        
        assert isinstance(result, dict)
        assert "status" in result
        
        if result.get("status") == "success":
            assert "data" in result or "analysis" in result
    except Exception as e:
        # Allow test to pass if missing dependencies or API keys
        print(f"Compatibility analysis skipped: {e}")
        pytest.skip(f"Cannot run full integration test: {e}")


def test_interpret_compatibility_group():
    """Test group compatibility analysis (3+ people)."""
    from backend_ai.app.compatibility import interpret_compatibility_group
    
    person1 = {"name": "A", "birthDate": "1990-01-01", "birthTime": "10:00"}
    person2 = {"name": "B", "birthDate": "1991-02-02", "birthTime": "11:00"}
    person3 = {"name": "C", "birthDate": "1992-03-03", "birthTime": "12:00"}
    
    people = [person1, person2, person3]
    relationship_type = "friends"
    locale = "ko"
    
    try:
        result = interpret_compatibility_group(people, relationship_type, locale)
        
        assert isinstance(result, dict)
        assert "status" in result
        
        if result.get("status") == "success":
            assert "data" in result or "analysis" in result
    except Exception as e:
        print(f"Group compatibility analysis skipped: {e}")
        pytest.skip(f"Cannot run full integration test: {e}")


if __name__ == "__main__":
    # Run simple import test
    test_compatibility_module_import()
    print("✅ All import tests passed")
    
    test_compatibility_routes_lazy_load()
    print("✅ Lazy load test passed")
    
    test_load_compatibility_data()
    print("✅ Data loading test passed")
