"""
Streaming Service

SSE (Server-Sent Events) streaming utilities for real-time responses.

This service provides:
- SSE error responses
- SSE stream wrappers
- SSE chunk formatting
- Common streaming patterns
"""
from flask import Response
from typing import Callable, Iterator, Dict, Any, Optional
import json
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================
_SSE_CONTENT_TYPE = "text/event-stream"
_SSE_DATA_PREFIX = "data: "
_SSE_CHUNK_SUFFIX = "\n\n"


def _format_sse(data: Dict[str, Any]) -> str:
    """Format data as SSE chunk."""
    return f"{_SSE_DATA_PREFIX}{json.dumps(data, ensure_ascii=False)}{_SSE_CHUNK_SUFFIX}"


# ============================================================================
# StreamingService Class
# ============================================================================
class StreamingService:
    """
    Server-Sent Events (SSE) streaming service.

    Provides utilities for creating SSE responses used in
    streaming endpoints like /ask-stream, /saju/ask-stream, etc.
    """

    @staticmethod
    def sse_error_response(message: str, error_code: Optional[str] = None) -> Response:
        """
        Create an SSE error response.

        This sends a single error event and closes the stream.

        Args:
            message: Error message to send
            error_code: Optional error code

        Returns:
            Flask Response with SSE error
        """
        def generate():
            error_data = {"error": message}
            if error_code:
                error_data["code"] = error_code
            yield _format_sse(error_data)

        return Response(generate(), mimetype=_SSE_CONTENT_TYPE)

    @staticmethod
    def sse_stream_response(generator: Callable[[], Iterator]) -> Response:
        """
        Create an SSE stream response from a generator function.

        Args:
            generator: Generator function that yields data dicts

        Returns:
            Flask Response with SSE stream
        """
        return Response(generator(), mimetype=_SSE_CONTENT_TYPE)

    @staticmethod
    def format_sse_chunk(data: Dict[str, Any]) -> str:
        """
        Format data as SSE chunk.

        Args:
            data: Data dictionary to send

        Returns:
            Formatted SSE chunk string
        """
        return _format_sse(data)

    @staticmethod
    def stream_with_error_handling(
        generator_fn: Callable[[], Iterator],
        error_handler: Optional[Callable[[Exception], Dict[str, Any]]] = None
    ) -> Iterator[str]:
        """
        Wrap a generator with error handling.

        If the generator raises an exception, sends an error event
        and closes the stream gracefully.

        Args:
            generator_fn: Generator function to wrap
            error_handler: Optional custom error handler

        Yields:
            SSE formatted chunks
        """
        try:
            for chunk in generator_fn():
                if isinstance(chunk, dict):
                    yield _format_sse(chunk)
                else:
                    yield chunk

        except Exception as e:
            logger.exception(f"[StreamingService] Generator error: {e}")

            if error_handler:
                error_data = error_handler(e)
            else:
                error_data = {
                    "type": "error",
                    "error": str(e),
                    "message": "An error occurred during streaming"
                }

            yield _format_sse(error_data)

    @staticmethod
    def create_progress_stream(
        total_steps: int,
        step_generator: Callable[[int], Dict[str, Any]]
    ) -> Iterator[str]:
        """
        Create a progress-tracking stream.

        Useful for multi-step operations where you want to show progress.

        Args:
            total_steps: Total number of steps
            step_generator: Function that takes step number and returns data

        Yields:
            SSE formatted progress chunks
        """
        yield _format_sse({
            "type": "start",
            "total_steps": total_steps
        })

        for step in range(1, total_steps + 1):
            try:
                step_data = step_generator(step)
                step_data["step"] = step
                step_data["total_steps"] = total_steps
                step_data["progress"] = round((step / total_steps) * 100, 1)

                yield _format_sse(step_data)

            except Exception as e:
                logger.error(f"[StreamingService] Step {step} failed: {e}")
                yield _format_sse({
                    "type": "error",
                    "step": step,
                    "error": str(e)
                })
                return

        yield _format_sse({
            "type": "done",
            "completed": total_steps
        })


# ============================================================================
# Common Streaming Patterns
# ============================================================================
def stream_openai_response(
    openai_stream: Iterator,
    include_metadata: bool = False
) -> Iterator[str]:
    """
    Stream OpenAI API responses as SSE.

    Args:
        openai_stream: OpenAI streaming response iterator
        include_metadata: Whether to include metadata in chunks

    Yields:
        SSE formatted chunks
    """
    try:
        for chunk in openai_stream:
            if hasattr(chunk, 'choices') and chunk.choices:
                delta = chunk.choices[0].delta

                if hasattr(delta, 'content') and delta.content:
                    data: Dict[str, Any] = {
                        "type": "content",
                        "content": delta.content
                    }

                    if include_metadata:
                        data["model"] = getattr(chunk, 'model', None)
                        data["finish_reason"] = getattr(chunk.choices[0], 'finish_reason', None)

                    yield _format_sse(data)

        yield _format_sse({"type": "done"})

    except Exception as e:
        logger.exception(f"[stream_openai_response] Error: {e}")
        yield _format_sse({
            "type": "error",
            "error": str(e)
        })


def stream_with_prefetch(
    prefetch_fn: Callable[[], Any],
    stream_fn: Callable[[Any], Iterator],
    include_prefetch_in_stream: bool = False
) -> Iterator[str]:
    """
    Stream with prefetch phase (common pattern in ask-stream).

    Args:
        prefetch_fn: Function to run before streaming (e.g., RAG search)
        stream_fn: Function that returns streaming iterator
        include_prefetch_in_stream: Whether to send prefetch results

    Yields:
        SSE formatted chunks
    """
    # Prefetch phase
    try:
        prefetch_result = prefetch_fn()

        if include_prefetch_in_stream:
            yield _format_sse({
                "type": "prefetch",
                "data": prefetch_result
            })

    except Exception as e:
        logger.error(f"[stream_with_prefetch] Prefetch failed: {e}")
        yield _format_sse({
            "type": "error",
            "phase": "prefetch",
            "error": str(e)
        })
        return

    # Streaming phase
    try:
        stream_iterator = stream_fn(prefetch_result)
        yield from stream_iterator

    except Exception as e:
        logger.error(f"[stream_with_prefetch] Stream failed: {e}")
        yield _format_sse({
            "type": "error",
            "phase": "stream",
            "error": str(e)
        })


# ============================================================================
# Convenience functions
# ============================================================================
def sse_error_response(message: str, error_code: Optional[str] = None) -> Response:
    """Convenience function for StreamingService.sse_error_response()"""
    return StreamingService.sse_error_response(message, error_code)


def sse_stream_response(generator: Callable[[], Iterator]) -> Response:
    """Convenience function for StreamingService.sse_stream_response()"""
    return StreamingService.sse_stream_response(generator)


def format_sse_chunk(data: Dict[str, Any]) -> str:
    """Convenience function for StreamingService.format_sse_chunk()"""
    return _format_sse(data)
