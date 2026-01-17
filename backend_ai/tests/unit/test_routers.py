"""
Unit tests for Router Blueprints.

Tests:
- Blueprint registration
- Route existence
- Health check endpoints
- Core routes
- Saju routes
- Tarot routes
"""
import pytest
from unittest.mock import patch, MagicMock
from flask import Flask


class TestRouterPackage:
    """Tests for routers package."""

    def test_get_all_blueprints(self):
        """get_all_blueprints should return list of blueprints."""
        from app.routers import get_all_blueprints

        blueprints = get_all_blueprints()

        assert isinstance(blueprints, list)
        assert len(blueprints) > 0
        # Each item should be (blueprint, description) tuple
        for bp, desc in blueprints:
            assert bp is not None
            assert isinstance(desc, str)

    def test_register_all_blueprints(self):
        """register_all_blueprints should register to Flask app."""
        from app.routers import register_all_blueprints

        app = Flask(__name__)
        initial_count = len(app.blueprints)

        register_all_blueprints(app)

        assert len(app.blueprints) > initial_count


class TestHealthRoutes:
    """Tests for health routes blueprint."""

    @pytest.fixture
    def app(self):
        """Create test Flask app with health routes."""
        from app.routers.health_routes import health_bp

        app = Flask(__name__)
        app.register_blueprint(health_bp)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    def test_health_bp_exists(self):
        """Health blueprint should exist."""
        from app.routers.health_routes import health_bp

        assert health_bp is not None
        assert health_bp.name == 'health'
        assert health_bp.url_prefix == '/api/health'

    def test_health_check_basic(self, client):
        """GET /api/health/ should return healthy status."""
        response = client.get('/api/health/')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'backend_ai'
        assert 'version' in data

    def test_health_check_basic_endpoint(self, client):
        """GET /api/health/basic should return healthy status."""
        response = client.get('/api/health/basic')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'

    @patch('app.routers.health_routes._get_perf')
    def test_health_full_success(self, mock_get_perf, client):
        """GET /api/health/full should return full health info."""
        mock_perf = MagicMock()
        mock_perf.get_performance_stats.return_value = {
            'cpu_percent': 25.0,
            'memory_percent': 40.0,
            'timestamp': '2024-01-01T00:00:00'
        }
        mock_perf.get_cache_health.return_value = {'status': 'healthy'}
        mock_perf.suggest_optimizations.return_value = []
        mock_get_perf.return_value = mock_perf

        response = client.get('/api/health/full')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert 'performance' in data
        assert 'cache' in data

    @patch('app.routers.health_routes._get_perf')
    def test_health_full_error(self, mock_get_perf, client):
        """GET /api/health/full should handle errors."""
        mock_get_perf.side_effect = Exception("Performance module error")

        response = client.get('/api/health/full')

        assert response.status_code == 503
        data = response.get_json()
        assert data['status'] == 'degraded'
        assert 'error' in data


class TestCoreRoutes:
    """Tests for core routes blueprint."""

    @pytest.fixture
    def app(self):
        """Create test Flask app with core routes."""
        from app.routers.core_routes import core_bp

        app = Flask(__name__)
        app.register_blueprint(core_bp)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    def test_core_bp_exists(self):
        """Core blueprint should exist."""
        from app.routers.core_routes import core_bp

        assert core_bp is not None
        assert core_bp.name == 'core'

    def test_index_endpoint(self, client):
        """GET / should return ok status."""
        response = client.get('/')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert 'DestinyPal' in data['message']

    def test_health_endpoint(self, client):
        """GET /health should return healthy status."""
        response = client.get('/health')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'

    def test_ready_endpoint(self, client):
        """GET /ready should return ready status."""
        response = client.get('/ready')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ready'


class TestSajuRoutes:
    """Tests for saju routes blueprint."""

    def test_saju_bp_exists(self):
        """Saju blueprint should exist."""
        from app.routers.saju_routes import saju_bp

        assert saju_bp is not None
        assert saju_bp.name == 'saju'
        assert saju_bp.url_prefix == '/saju'

    def test_saju_bp_has_routes(self):
        """Saju blueprint should have expected routes."""
        from app.routers.saju_routes import saju_bp

        # Get route rules
        rules = list(saju_bp.deferred_functions)
        assert len(rules) > 0

    @pytest.fixture
    def app(self):
        """Create test Flask app with saju routes."""
        from app.routers.saju_routes import saju_bp

        app = Flask(__name__)
        app.register_blueprint(saju_bp)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    @patch('app.routers.saju_routes._get_saju_counselor_service')
    @patch('app.routers.saju_routes._normalize_birth_payload')
    def test_saju_counselor_init(self, mock_normalize, mock_service, client):
        """POST /saju/counselor/init should initialize session."""
        mock_normalize.return_value = {'year': 1990, 'month': 1, 'day': 1}
        mock_svc = MagicMock()
        mock_svc.initialize_session.return_value = (
            {'status': 'success', 'session_id': 'test-123'},
            200
        )
        mock_service.return_value = mock_svc

        response = client.post(
            '/saju/counselor/init',
            json={
                'saju': {'day_master': '甲'},
                'theme': 'life',
                'locale': 'ko'
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'


class TestTarotRoutes:
    """Tests for tarot routes blueprint."""

    def test_tarot_bp_exists(self):
        """Tarot blueprint should exist."""
        from app.routers.tarot_routes import tarot_bp

        assert tarot_bp is not None
        assert tarot_bp.name == 'tarot'
        assert tarot_bp.url_prefix == '/api/tarot'

    def test_theme_mapping_constants(self):
        """Theme mapping constants should be defined."""
        from app.routers.tarot_routes import TAROT_THEME_MAPPING, TAROT_SUBTOPIC_MAPPING

        assert isinstance(TAROT_THEME_MAPPING, dict)
        assert 'love' in TAROT_THEME_MAPPING
        assert 'career' in TAROT_THEME_MAPPING
        assert isinstance(TAROT_SUBTOPIC_MAPPING, dict)

    def test_map_tarot_theme(self):
        """_map_tarot_theme should map frontend themes to backend."""
        from app.routers.tarot_routes import _map_tarot_theme

        # Direct mapping
        theme, spread = _map_tarot_theme('love', 'three_card', '')
        assert theme == 'love'

        # Hyphenated mapping
        theme, spread = _map_tarot_theme('love-relationships', 'three_card', '')
        assert theme == 'love'

        # Career with keyword detection
        theme, spread = _map_tarot_theme('career', 'general', '취업하고 싶어요')
        assert theme == 'career'
        assert spread == 'job_search'

    def test_clean_ai_phrases(self):
        """_clean_ai_phrases should remove AI-sounding text."""
        from app.routers.tarot_routes import _clean_ai_phrases

        # Test patterns that are in the ai_patterns_ko list
        text = "긍정적인 에너지가 느껴지네요. 좋은 결과가 있을 거예요. 응원합니다."
        cleaned = _clean_ai_phrases(text)

        assert '응원합니다' not in cleaned
        assert '긍정적인 에너지가 느껴지네요' not in cleaned
        assert '좋은 결과가 있을 거예요' not in cleaned

    @pytest.fixture
    def app(self):
        """Create test Flask app with tarot routes."""
        from app.routers.tarot_routes import tarot_bp

        app = Flask(__name__)
        app.register_blueprint(tarot_bp)
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client."""
        return app.test_client()

    @patch('app.routers.tarot_routes._has_tarot')
    def test_tarot_interpret_no_module(self, mock_has_tarot, client):
        """POST /api/tarot/interpret should handle missing module."""
        mock_has_tarot.return_value = False

        response = client.post(
            '/api/tarot/interpret',
            json={'cards': [{'name': 'The Fool'}]}
        )

        assert response.status_code == 501
        data = response.get_json()
        assert 'not available' in data['message']

    @patch('app.routers.tarot_routes._has_tarot')
    def test_tarot_interpret_no_cards(self, mock_has_tarot, client):
        """POST /api/tarot/interpret should require cards."""
        mock_has_tarot.return_value = True

        response = client.post(
            '/api/tarot/interpret',
            json={'cards': []}
        )

        assert response.status_code == 400
        data = response.get_json()
        assert 'No cards' in data['message']

    @patch('app.routers.tarot_routes.detect_tarot_topic')
    def test_tarot_detect_topic(self, mock_detect, client):
        """POST /api/tarot/detect-topic should detect theme."""
        mock_detect.return_value = {
            'theme': 'love',
            'sub_topic': 'relationship',
            'confidence': 0.85
        }

        response = client.post(
            '/api/tarot/detect-topic',
            json={'text': '연애운이 궁금해요'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['detected']['theme'] == 'love'

    def test_tarot_detect_topic_no_text(self, client):
        """POST /api/tarot/detect-topic should require text."""
        response = client.post(
            '/api/tarot/detect-topic',
            json={'text': ''}
        )

        assert response.status_code == 400


class TestDreamRoutes:
    """Tests for dream routes blueprint."""

    def test_dream_bp_exists(self):
        """Dream blueprint should exist."""
        from app.routers.dream_routes import dream_bp

        assert dream_bp is not None
        assert dream_bp.name == 'dream'


class TestIchingRoutes:
    """Tests for I-Ching routes blueprint."""

    def test_iching_bp_exists(self):
        """I-Ching blueprint should exist."""
        from app.routers.iching_routes import iching_bp

        assert iching_bp is not None
        assert iching_bp.name == 'iching'


class TestCompatibilityRoutes:
    """Tests for compatibility routes blueprint."""

    def test_compatibility_bp_exists(self):
        """Compatibility blueprint should exist."""
        from app.routers.compatibility_routes import compatibility_bp

        assert compatibility_bp is not None
        assert compatibility_bp.name == 'compatibility'


class TestNumerologyRoutes:
    """Tests for numerology routes blueprint."""

    def test_numerology_bp_exists(self):
        """Numerology blueprint should exist."""
        from app.routers.numerology_routes import numerology_bp

        assert numerology_bp is not None
        assert numerology_bp.name == 'numerology'


class TestPredictionRoutes:
    """Tests for prediction routes blueprint."""

    def test_prediction_bp_exists(self):
        """Prediction blueprint should exist."""
        from app.routers.prediction_routes import prediction_bp

        assert prediction_bp is not None
        assert prediction_bp.name == 'prediction'


class TestCounselingRoutes:
    """Tests for counseling routes blueprint."""

    def test_counseling_bp_exists(self):
        """Counseling blueprint should exist."""
        from app.routers.counseling_routes import counseling_bp

        assert counseling_bp is not None
        assert counseling_bp.name == 'counseling'


class TestFortuneRoutes:
    """Tests for fortune routes blueprint."""

    def test_fortune_bp_exists(self):
        """Fortune blueprint should exist."""
        from app.routers.fortune_routes import fortune_bp

        assert fortune_bp is not None
        assert fortune_bp.name == 'fortune'


class TestThemeRoutes:
    """Tests for theme routes blueprint."""

    def test_theme_bp_exists(self):
        """Theme blueprint should exist."""
        from app.routers.theme_routes import theme_bp

        assert theme_bp is not None
        assert theme_bp.name == 'theme'


class TestStreamRoutes:
    """Tests for stream routes blueprint."""

    def test_stream_bp_exists(self):
        """Stream blueprint should exist."""
        from app.routers.stream_routes import stream_bp

        assert stream_bp is not None
        assert stream_bp.name == 'stream'


class TestSearchRoutes:
    """Tests for search routes blueprint."""

    def test_search_bp_exists(self):
        """Search blueprint should exist."""
        from app.routers.search_routes import search_bp

        assert search_bp is not None
        assert search_bp.name == 'search'


class TestChartRoutes:
    """Tests for chart routes blueprint."""

    def test_chart_bp_exists(self):
        """Chart blueprint should exist."""
        from app.routers.chart_routes import chart_bp

        assert chart_bp is not None
        assert chart_bp.name == 'chart'


class TestCacheRoutes:
    """Tests for cache routes blueprint."""

    def test_cache_bp_exists(self):
        """Cache blueprint should exist."""
        from app.routers.cache_routes import cache_bp

        assert cache_bp is not None
        assert cache_bp.name == 'cache'


class TestRlhfRoutes:
    """Tests for RLHF routes blueprint."""

    def test_rlhf_bp_exists(self):
        """RLHF blueprint should exist."""
        from app.routers.rlhf_routes import rlhf_bp

        assert rlhf_bp is not None
        assert rlhf_bp.name == 'rlhf'


class TestStoryRoutes:
    """Tests for story routes blueprint."""

    def test_story_bp_exists(self):
        """Story blueprint should exist."""
        from app.routers.story_routes import story_bp

        assert story_bp is not None
        assert story_bp.name == 'story'


class TestAstrologyRoutes:
    """Tests for astrology routes blueprint."""

    def test_astrology_bp_exists(self):
        """Astrology blueprint should exist."""
        from app.routers.astrology_routes import astrology_bp

        assert astrology_bp is not None
        assert astrology_bp.name == 'astrology'


class TestIcpRoutes:
    """Tests for ICP routes blueprint."""

    def test_icp_bp_exists(self):
        """ICP blueprint should exist."""
        from app.routers.icp_routes import icp_bp

        assert icp_bp is not None
        assert icp_bp.name == 'icp'
