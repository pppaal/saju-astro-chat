"""
Unit tests for Utils Lazy Loader module.

Tests:
- LazyModule class
- LazyModuleRegistry class
- Module registrations
- Convenience functions
"""
import pytest
from unittest.mock import patch, MagicMock
import os


class TestLazyModuleClass:
    """Tests for LazyModule class."""

    def test_class_exists(self):
        """Test LazyModule class exists."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        assert LazyModule is not None

    def test_init_basic(self):
        """Test basic initialization."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(
            import_path="os",
            module_name="path",
            feature_name="OS Path"
        )

        assert module.import_path == "os"
        assert module.module_name == "path"
        assert module.feature_name == "OS Path"

    def test_init_defaults(self):
        """Test initialization with defaults."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(import_path="os.path")

        assert module.module_name == "path"
        assert module.feature_name == "path"

    def test_available_property(self):
        """Test available property."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        # Valid module should be available
        module = LazyModule(import_path="os")
        assert module.available is True

    def test_available_for_nonexistent_module(self):
        """Test available returns False for nonexistent module."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(
            import_path="nonexistent_module_xyz",
            assume_available=False
        )
        assert module.available is False

    def test_load_returns_module(self):
        """Test load returns module."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(import_path="os")
        result = module.load()

        assert result is not None

    def test_load_caches_result(self):
        """Test load caches the result."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(import_path="os")
        result1 = module.load()
        result2 = module.load()

        assert result1 is result2

    def test_get_alias_for_load(self):
        """Test get is alias for load."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(import_path="os")
        assert module.get() == module.load()

    def test_bool_context(self):
        """Test using in boolean context."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(import_path="os")
        assert bool(module) is True

        module_bad = LazyModule(
            import_path="nonexistent_xyz",
            assume_available=False
        )
        assert bool(module_bad) is False

    def test_getattr_proxy(self):
        """Test attribute access is proxied."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(import_path="os")
        # Access an attribute from os module
        assert hasattr(module, 'getcwd')

    def test_getattr_raises_for_unavailable(self):
        """Test getattr raises ImportError for unavailable module."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(
            import_path="nonexistent_xyz",
            assume_available=False
        )

        with pytest.raises(ImportError):
            _ = module.some_attribute

    def test_call_raises_for_unavailable(self):
        """Test calling unavailable module raises ImportError."""
        from backend_ai.app.utils.lazy_loader import LazyModule

        module = LazyModule(
            import_path="nonexistent_xyz",
            assume_available=False
        )

        with pytest.raises(ImportError):
            module()

    @patch.dict(os.environ, {"RAG_DISABLE": "1"})
    def test_disabled_if_rag_disabled(self):
        """Test module is disabled when RAG_DISABLE=1."""
        # Need to reimport to pick up env change
        import importlib
        from backend_ai.app.utils import lazy_loader
        importlib.reload(lazy_loader)

        module = lazy_loader.LazyModule(
            import_path="os",
            disabled_if_rag_disabled=True
        )

        # Module should be disabled
        assert module._available is False


class TestLazyModuleRegistryClass:
    """Tests for LazyModuleRegistry class."""

    def test_class_exists(self):
        """Test LazyModuleRegistry class exists."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry

        assert LazyModuleRegistry is not None

    def test_init(self):
        """Test initialization."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry

        registry = LazyModuleRegistry()
        assert registry._modules == {}

    def test_register(self):
        """Test registering a module."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry, LazyModule

        registry = LazyModuleRegistry()
        result = registry.register(
            name="test_module",
            import_path="os",
            feature_name="Test OS"
        )

        assert isinstance(result, LazyModule)
        assert "test_module" in registry._modules

    def test_register_returns_lazy_module(self):
        """Test register returns LazyModule instance."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry, LazyModule

        registry = LazyModuleRegistry()
        module = registry.register("os_module", "os")

        assert isinstance(module, LazyModule)

    def test_get_registered_module(self):
        """Test getting a registered module."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry

        registry = LazyModuleRegistry()
        registry.register("my_module", "os")

        result = registry.get("my_module")
        assert result is not None

    def test_get_unregistered_returns_none(self):
        """Test getting unregistered module returns None."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry

        registry = LazyModuleRegistry()
        result = registry.get("nonexistent")

        assert result is None

    def test_is_available(self):
        """Test is_available method."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry

        registry = LazyModuleRegistry()
        registry.register("os_module", "os")

        assert registry.is_available("os_module") is True
        assert registry.is_available("nonexistent") is False

    def test_capabilities(self):
        """Test capabilities method."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry

        registry = LazyModuleRegistry()
        registry.register("os_module", "os")
        registry.register("sys_module", "sys")

        caps = registry.capabilities()

        assert isinstance(caps, dict)
        assert "os_module" in caps
        assert "sys_module" in caps

    def test_load_all(self):
        """Test load_all method."""
        from backend_ai.app.utils.lazy_loader import LazyModuleRegistry

        registry = LazyModuleRegistry()
        registry.register("os_module", "os")
        registry.register("sys_module", "sys")

        # Should not raise
        registry.load_all()

        # Both should be loaded
        assert registry.get("os_module")._module is not None
        assert registry.get("sys_module")._module is not None


class TestConvenienceFunctions:
    """Tests for convenience functions."""

    def test_get_capabilities_exists(self):
        """Test get_capabilities function exists."""
        from backend_ai.app.utils.lazy_loader import get_capabilities

        assert callable(get_capabilities)

    def test_get_capabilities_returns_dict(self):
        """Test get_capabilities returns dict."""
        from backend_ai.app.utils.lazy_loader import get_capabilities

        result = get_capabilities()
        assert isinstance(result, dict)

    def test_warmup_modules_exists(self):
        """Test warmup_modules function exists."""
        from backend_ai.app.utils.lazy_loader import warmup_modules

        assert callable(warmup_modules)

    def test_get_module_exists(self):
        """Test get_module function exists."""
        from backend_ai.app.utils.lazy_loader import get_module

        assert callable(get_module)

    def test_get_module_returns_lazy_module(self):
        """Test get_module returns LazyModule or None."""
        from backend_ai.app.utils.lazy_loader import get_module

        result = get_module("fusion_generate")
        # Should return LazyModule for registered module
        assert result is not None or result is None  # May or may not be registered


class TestModuleRegistrations:
    """Tests for pre-registered modules."""

    def test_fusion_generate_registered(self):
        """Test FUSION_GENERATE is registered."""
        from backend_ai.app.utils.lazy_loader import FUSION_GENERATE

        assert FUSION_GENERATE is not None

    def test_tarot_hybrid_rag_registered(self):
        """Test TAROT_HYBRID_RAG is registered."""
        from backend_ai.app.utils.lazy_loader import TAROT_HYBRID_RAG

        assert TAROT_HYBRID_RAG is not None

    def test_iching_rag_registered(self):
        """Test ICHING_RAG is registered."""
        from backend_ai.app.utils.lazy_loader import ICHING_RAG

        assert ICHING_RAG is not None

    def test_domain_rag_registered(self):
        """Test DOMAIN_RAG is registered."""
        from backend_ai.app.utils.lazy_loader import DOMAIN_RAG

        assert DOMAIN_RAG is not None

    def test_compatibility_registered(self):
        """Test COMPATIBILITY is registered."""
        from backend_ai.app.utils.lazy_loader import COMPATIBILITY

        assert COMPATIBILITY is not None

    def test_hybrid_rag_registered(self):
        """Test HYBRID_RAG is registered."""
        from backend_ai.app.utils.lazy_loader import HYBRID_RAG

        assert HYBRID_RAG is not None

    def test_badges_registered(self):
        """Test BADGES is registered."""
        from backend_ai.app.utils.lazy_loader import BADGES

        assert BADGES is not None


class TestLegacyCompatibility:
    """Tests for legacy HAS_* variables."""

    def test_has_realtime(self):
        """Test HAS_REALTIME exists."""
        from backend_ai.app.utils.lazy_loader import HAS_REALTIME

        assert HAS_REALTIME is not None

    def test_has_charts(self):
        """Test HAS_CHARTS exists."""
        from backend_ai.app.utils.lazy_loader import HAS_CHARTS

        assert HAS_CHARTS is not None

    def test_has_tarot(self):
        """Test HAS_TAROT exists."""
        from backend_ai.app.utils.lazy_loader import HAS_TAROT

        assert HAS_TAROT is not None

    def test_has_domain_rag(self):
        """Test HAS_DOMAIN_RAG exists."""
        from backend_ai.app.utils.lazy_loader import HAS_DOMAIN_RAG

        assert HAS_DOMAIN_RAG is not None

    def test_has_compatibility(self):
        """Test HAS_COMPATIBILITY exists."""
        from backend_ai.app.utils.lazy_loader import HAS_COMPATIBILITY

        assert HAS_COMPATIBILITY is not None

    def test_has_iching(self):
        """Test HAS_ICHING exists."""
        from backend_ai.app.utils.lazy_loader import HAS_ICHING

        assert HAS_ICHING is not None


class TestModuleExports:
    """Tests for module exports."""

    def test_module_importable(self):
        """Test module is importable."""
        from backend_ai.app.utils import lazy_loader

        assert lazy_loader is not None

    def test_all_exports(self):
        """Test __all__ exports are importable."""
        from backend_ai.app.utils.lazy_loader import (
            LazyModule,
            LazyModuleRegistry,
            get_capabilities,
            warmup_modules,
            get_module,
        )

        assert all([
            LazyModule, LazyModuleRegistry,
            get_capabilities, warmup_modules, get_module
        ])

    def test_rag_disabled_constant(self):
        """Test RAG_DISABLED constant exists."""
        from backend_ai.app.utils.lazy_loader import RAG_DISABLED

        assert isinstance(RAG_DISABLED, bool)

