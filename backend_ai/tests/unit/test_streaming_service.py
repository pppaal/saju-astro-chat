"""
Streaming Service Tests

Tests for SSE streaming utilities.
"""

import pytest
import json
from unittest.mock import MagicMock, patch

from backend_ai.app.services.streaming_service import (
    StreamingService,
    stream_openai_response,
    stream_with_prefetch,
    sse_error_response,
    sse_stream_response,
    format_sse_chunk,
)


class TestFormatSseChunk:
    """Tests for format_sse_chunk method."""

    def test_formats_simple_dict(self):
        """Should format simple dict as SSE."""
        data = {"type": "test", "content": "hello"}
        result = StreamingService.format_sse_chunk(data)

        assert result.startswith("data: ")
        assert result.endswith("\n\n")
        # Parse JSON
        json_str = result[6:-2]  # Remove "data: " and "\n\n"
        parsed = json.loads(json_str)
        assert parsed == data

    def test_formats_complex_dict(self):
        """Should format complex dict."""
        data = {
            "type": "data",
            "content": "Hello",
            "metadata": {"step": 1, "total": 5}
        }
        result = StreamingService.format_sse_chunk(data)

        json_str = result[6:-2]
        parsed = json.loads(json_str)
        assert parsed["metadata"]["step"] == 1

    def test_handles_unicode(self):
        """Should handle unicode correctly."""
        data = {"content": "안녕하세요 🌟"}
        result = StreamingService.format_sse_chunk(data)

        # ensure_ascii=False preserves unicode
        assert "안녕하세요" in result
        assert "🌟" in result

    def test_handles_empty_dict(self):
        """Should handle empty dict."""
        result = StreamingService.format_sse_chunk({})
        assert result == "data: {}\n\n"

    def test_handles_nested_arrays(self):
        """Should handle nested arrays."""
        data = {"items": [1, 2, 3], "nested": [[1, 2], [3, 4]]}
        result = StreamingService.format_sse_chunk(data)

        json_str = result[6:-2]
        parsed = json.loads(json_str)
        assert parsed["items"] == [1, 2, 3]


class TestSseErrorResponse:
    """Tests for sse_error_response method."""

    def test_creates_error_response(self):
        """Should create error response."""
        response = StreamingService.sse_error_response("Something went wrong")

        assert response.mimetype == "text/event-stream"

    def test_includes_error_message(self):
        """Should include error message."""
        response = StreamingService.sse_error_response("Test error")

        # Get response data - may be str or bytes
        data = "".join(response.response)
        assert "Test error" in data

    def test_includes_error_code(self):
        """Should include error code when provided."""
        response = StreamingService.sse_error_response("Error", error_code="E001")

        data = "".join(response.response)
        assert "E001" in data

    def test_mimetype_is_event_stream(self):
        """Should have correct mimetype."""
        response = StreamingService.sse_error_response("Error")
        assert response.mimetype == "text/event-stream"


class TestSseStreamResponse:
    """Tests for sse_stream_response method."""

    def test_creates_stream_response(self):
        """Should create stream response."""
        def generator():
            yield "data: test\n\n"

        response = StreamingService.sse_stream_response(generator)
        assert response.mimetype == "text/event-stream"

    def test_wraps_generator(self):
        """Should wrap generator properly."""
        def generator():
            yield "data: chunk1\n\n"
            yield "data: chunk2\n\n"

        response = StreamingService.sse_stream_response(generator)
        data = "".join(response.response)

        assert "chunk1" in data
        assert "chunk2" in data


class TestStreamWithErrorHandling:
    """Tests for stream_with_error_handling method."""

    def test_yields_from_generator(self):
        """Should yield from generator."""
        def generator():
            yield {"type": "data", "content": "hello"}
            yield {"type": "done"}

        result = list(StreamingService.stream_with_error_handling(generator))

        assert len(result) == 2
        assert "hello" in result[0]
        assert "done" in result[1]

    def test_handles_exception(self):
        """Should handle exception gracefully."""
        def failing_generator():
            yield {"type": "start"}
            raise ValueError("Test error")

        result = list(StreamingService.stream_with_error_handling(failing_generator))

        # Should have start + error chunks
        assert len(result) == 2
        assert "error" in result[1]
        assert "Test error" in result[1]

    def test_uses_custom_error_handler(self):
        """Should use custom error handler."""
        def failing_generator():
            raise ValueError("Test")

        def custom_handler(e):
            return {"custom": "error", "msg": str(e)}

        result = list(StreamingService.stream_with_error_handling(
            failing_generator,
            error_handler=custom_handler
        ))

        assert len(result) == 1
        assert "custom" in result[0]

    def test_handles_pre_formatted_chunks(self):
        """Should pass through pre-formatted chunks."""
        def generator():
            yield "data: already formatted\n\n"
            yield {"type": "dict"}

        result = list(StreamingService.stream_with_error_handling(generator))

        assert result[0] == "data: already formatted\n\n"
        assert "dict" in result[1]


class TestCreateProgressStream:
    """Tests for create_progress_stream method."""

    def test_sends_start_event(self):
        """Should send start event."""
        def step_gen(step):
            return {"status": "processing"}

        result = list(StreamingService.create_progress_stream(3, step_gen))

        # First should be start
        assert "start" in result[0]
        assert "total_steps" in result[0]

    def test_sends_progress_events(self):
        """Should send progress for each step."""
        def step_gen(step):
            return {"status": f"step_{step}"}

        result = list(StreamingService.create_progress_stream(3, step_gen))

        # start + 3 steps + done = 5
        assert len(result) == 5

    def test_includes_progress_percentage(self):
        """Should include progress percentage."""
        def step_gen(step):
            return {"status": "ok"}

        result = list(StreamingService.create_progress_stream(2, step_gen))

        # Second chunk (step 1) should have 50% progress
        assert "50.0" in result[1] or "50" in result[1]

    def test_sends_done_event(self):
        """Should send done event at end."""
        def step_gen(step):
            return {"status": "ok"}

        result = list(StreamingService.create_progress_stream(2, step_gen))

        # Last should be done
        assert "done" in result[-1]

    def test_handles_step_error(self):
        """Should handle step error."""
        def failing_step_gen(step):
            if step == 2:
                raise ValueError("Step 2 failed")
            return {"status": "ok"}

        result = list(StreamingService.create_progress_stream(3, failing_step_gen))

        # Should have error in output
        error_chunks = [r for r in result if "error" in r]
        assert len(error_chunks) > 0


class TestStreamOpenaiResponse:
    """Tests for stream_openai_response function."""

    def test_extracts_content_from_chunks(self):
        """Should extract content from OpenAI chunks."""
        # Mock OpenAI chunk
        mock_chunk = MagicMock()
        mock_chunk.choices = [MagicMock()]
        mock_chunk.choices[0].delta = MagicMock()
        mock_chunk.choices[0].delta.content = "Hello"

        result = list(stream_openai_response([mock_chunk]))

        assert len(result) == 2  # content + done
        assert "Hello" in result[0]

    def test_sends_done_at_end(self):
        """Should send done event at end."""
        mock_chunk = MagicMock()
        mock_chunk.choices = [MagicMock()]
        mock_chunk.choices[0].delta = MagicMock()
        mock_chunk.choices[0].delta.content = "Test"

        result = list(stream_openai_response([mock_chunk]))

        assert "done" in result[-1]

    def test_handles_empty_stream(self):
        """Should handle empty stream."""
        result = list(stream_openai_response([]))
        assert len(result) == 1
        assert "done" in result[0]

    def test_includes_metadata_when_requested(self):
        """Should include metadata when requested."""
        mock_chunk = MagicMock()
        mock_chunk.choices = [MagicMock()]
        mock_chunk.choices[0].delta = MagicMock()
        mock_chunk.choices[0].delta.content = "Test"
        mock_chunk.model = "gpt-4"
        mock_chunk.choices[0].finish_reason = None

        result = list(stream_openai_response([mock_chunk], include_metadata=True))

        assert "model" in result[0]

    def test_handles_exception(self):
        """Should handle exception during streaming."""
        # Test with an iterator that raises after first iteration
        class FailingIterator:
            def __init__(self):
                self.count = 0

            def __iter__(self):
                return self

            def __next__(self):
                if self.count == 0:
                    self.count += 1
                    raise ValueError("API Error")
                raise StopIteration

        result = list(stream_openai_response(FailingIterator()))

        # Should have error in output
        assert len(result) >= 1
        assert "error" in result[-1]


class TestStreamWithPrefetch:
    """Tests for stream_with_prefetch function."""

    def test_runs_prefetch_then_stream(self):
        """Should run prefetch before stream."""
        prefetch_called = []
        stream_called = []

        def prefetch():
            prefetch_called.append(1)
            return {"data": "prefetched"}

        def stream(prefetch_result):
            stream_called.append(1)
            yield "data: test\n\n"

        result = list(stream_with_prefetch(prefetch, stream))

        assert len(prefetch_called) == 1
        assert len(stream_called) == 1

    def test_includes_prefetch_in_stream_when_requested(self):
        """Should include prefetch result in stream."""
        def prefetch():
            return {"rag_results": ["a", "b"]}

        def stream(prefetch_result):
            yield "data: test\n\n"

        result = list(stream_with_prefetch(
            prefetch,
            stream,
            include_prefetch_in_stream=True
        ))

        assert len(result) == 2
        assert "prefetch" in result[0]

    def test_handles_prefetch_error(self):
        """Should handle prefetch error."""
        def failing_prefetch():
            raise ValueError("Prefetch failed")

        def stream(prefetch_result):
            yield "data: test\n\n"

        result = list(stream_with_prefetch(failing_prefetch, stream))

        assert len(result) == 1
        assert "error" in result[0]
        assert "prefetch" in result[0]

    def test_handles_stream_error(self):
        """Should handle stream error."""
        def prefetch():
            return {}

        def failing_stream(prefetch_result):
            raise ValueError("Stream failed")

        result = list(stream_with_prefetch(prefetch, failing_stream))

        # Should have error
        assert any("error" in r for r in result)


class TestConvenienceFunctions:
    """Tests for module-level convenience functions."""

    def test_sse_error_response_convenience(self):
        """Convenience function should work."""
        response = sse_error_response("Error message")
        assert response.mimetype == "text/event-stream"

    def test_sse_stream_response_convenience(self):
        """Convenience function should work."""
        def gen():
            yield "data: test\n\n"

        response = sse_stream_response(gen)
        assert response.mimetype == "text/event-stream"

    def test_format_sse_chunk_convenience(self):
        """Convenience function should work."""
        result = format_sse_chunk({"type": "test"})
        assert result.startswith("data: ")


class TestEdgeCases:
    """Edge case tests."""

    def test_format_chunk_with_special_characters(self):
        """Should handle special characters."""
        data = {"content": "Hello \"world\" \n\t test"}
        result = StreamingService.format_sse_chunk(data)

        # Should be valid JSON
        json_str = result[6:-2]
        parsed = json.loads(json_str)
        assert "Hello" in parsed["content"]

    def test_format_chunk_with_null_value(self):
        """Should handle null values."""
        data = {"content": None, "type": "test"}
        result = StreamingService.format_sse_chunk(data)

        json_str = result[6:-2]
        parsed = json.loads(json_str)
        assert parsed["content"] is None

    def test_format_chunk_with_boolean(self):
        """Should handle boolean values."""
        data = {"success": True, "error": False}
        result = StreamingService.format_sse_chunk(data)

        json_str = result[6:-2]
        parsed = json.loads(json_str)
        assert parsed["success"] is True
        assert parsed["error"] is False

    def test_progress_stream_with_zero_steps(self):
        """Should handle zero steps gracefully."""
        def step_gen(step):
            return {}

        result = list(StreamingService.create_progress_stream(0, step_gen))

        # Should have start and done
        assert len(result) == 2

    def test_progress_stream_with_one_step(self):
        """Should handle single step."""
        def step_gen(step):
            return {"status": "ok"}

        result = list(StreamingService.create_progress_stream(1, step_gen))

        # start + 1 step + done = 3
        assert len(result) == 3
        assert "100" in result[1]  # 100% progress
