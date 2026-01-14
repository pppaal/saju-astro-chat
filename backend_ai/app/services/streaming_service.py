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
from typing import Callable, Iterator, Dict, Any
import json
import logging

logger = logging.getLogger(__name__)


class StreamingService:
    """
    Server-Sent Events (SSE) streaming service.

    Provides utilities for creating SSE responses used in
    streaming endpoints like /ask-stream, /saju/ask-stream, etc.
    """

    @staticmethod
    def sse_error_response(message: str, error_code: str = None) -> Response:
        """
        Create an SSE error response.

        This sends a single error event and closes the stream.

        Args:
            message: Error message to send
            error_code: Optional error code

        Returns:
            Flask Response with SSE error

        Example:
            >>> return StreamingService.sse_error_response("Invalid input")
        """
        def generate():
            error_data = {"error": message}
            if error_code:
                error_data["code"] = error_code
            yield StreamingService.format_sse_chunk(error_data)

        return Response(generate(), mimetype="text/event-stream")

    @staticmethod
    def sse_stream_response(generator: Callable) -> Response:
        """
        Create an SSE stream response from a generator function.

        Args:
            generator: Generator function that yields data dicts

        Returns:
            Flask Response with SSE stream

        Example:
            >>> def my_generator():
            ...     yield {"type": "start"}
            ...     yield {"type": "data", "content": "Hello"}
            ...     yield {"type": "done"}
            >>> return StreamingService.sse_stream_response(my_generator)
        """
        return Response(generator(), mimetype="text/event-stream")

    @staticmethod
    def format_sse_chunk(data: Dict[str, Any]) -> str:
        """
        Format data as SSE chunk.

        Args:
            data: Data dictionary to send

        Returns:
            Formatted SSE chunk string

        Example:
            >>> StreamingService.format_sse_chunk({"type": "data", "content": "Hello"})
            'data: {"type": "data", "content": "Hello"}\\n\\n'
        """
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    @staticmethod
    def stream_with_error_handling(
        generator_fn: Callable,
        error_handler: Callable = None
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

        Example:
            >>> def risky_generator():
            ...     yield {"data": "Hello"}
            ...     raise ValueError("Oops!")
            >>> gen = StreamingService.stream_with_error_handling(risky_generator)
            >>> return StreamingService.sse_stream_response(lambda: gen)
        """
        try:
            for chunk in generator_fn():
                if isinstance(chunk, dict):
                    yield StreamingService.format_sse_chunk(chunk)
                else:
                    # Already formatted SSE chunk
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

            yield StreamingService.format_sse_chunk(error_data)

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

        Example:
            >>> def process_step(step):
            ...     # Do some work
            ...     return {"step": step, "status": "processing"}
            >>> gen = StreamingService.create_progress_stream(5, process_step)
            >>> return StreamingService.sse_stream_response(lambda: gen)
        """
        # Send start event
        yield StreamingService.format_sse_chunk({
            "type": "start",
            "total_steps": total_steps
        })

        # Process each step
        for step in range(1, total_steps + 1):
            try:
                step_data = step_generator(step)
                step_data["step"] = step
                step_data["total_steps"] = total_steps
                step_data["progress"] = round((step / total_steps) * 100, 1)

                yield StreamingService.format_sse_chunk(step_data)

            except Exception as e:
                logger.error(f"[StreamingService] Step {step} failed: {e}")
                yield StreamingService.format_sse_chunk({
                    "type": "error",
                    "step": step,
                    "error": str(e)
                })
                return

        # Send completion event
        yield StreamingService.format_sse_chunk({
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

    Example:
        >>> from openai import OpenAI
        >>> client = OpenAI()
        >>> stream = client.chat.completions.create(
        ...     model="gpt-4",
        ...     messages=[{"role": "user", "content": "Hello"}],
        ...     stream=True
        ... )
        >>> return StreamingService.sse_stream_response(
        ...     lambda: stream_openai_response(stream)
        ... )
    """
    try:
        for chunk in openai_stream:
            if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta

                if hasattr(delta, 'content') and delta.content:
                    data = {
                        "type": "content",
                        "content": delta.content
                    }

                    if include_metadata:
                        data["model"] = getattr(chunk, 'model', None)
                        data["finish_reason"] = getattr(chunk.choices[0], 'finish_reason', None)

                    yield StreamingService.format_sse_chunk(data)

        # Send completion
        yield StreamingService.format_sse_chunk({"type": "done"})

    except Exception as e:
        logger.exception(f"[stream_openai_response] Error: {e}")
        yield StreamingService.format_sse_chunk({
            "type": "error",
            "error": str(e)
        })


def stream_with_prefetch(
    prefetch_fn: Callable,
    stream_fn: Callable,
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

    Example:
        >>> def prefetch():
        ...     # Do RAG search, load data, etc.
        ...     return {"rag_results": [...]}
        >>> def stream():
        ...     # Return OpenAI stream
        ...     return openai_stream
        >>> gen = stream_with_prefetch(prefetch, stream)
        >>> return StreamingService.sse_stream_response(lambda: gen)
    """
    # Prefetch phase
    try:
        prefetch_result = prefetch_fn()

        if include_prefetch_in_stream:
            yield StreamingService.format_sse_chunk({
                "type": "prefetch",
                "data": prefetch_result
            })

    except Exception as e:
        logger.error(f"[stream_with_prefetch] Prefetch failed: {e}")
        yield StreamingService.format_sse_chunk({
            "type": "error",
            "phase": "prefetch",
            "error": str(e)
        })
        return

    # Streaming phase
    try:
        stream_iterator = stream_fn(prefetch_result)
        for chunk in stream_iterator:
            yield chunk

    except Exception as e:
        logger.error(f"[stream_with_prefetch] Stream failed: {e}")
        yield StreamingService.format_sse_chunk({
            "type": "error",
            "phase": "stream",
            "error": str(e)
        })


# ============================================================================
# Convenience functions
# ============================================================================

def sse_error_response(message: str, error_code: str = None) -> Response:
    """Convenience function for StreamingService.sse_error_response()"""
    return StreamingService.sse_error_response(message, error_code)


def sse_stream_response(generator: Callable) -> Response:
    """Convenience function for StreamingService.sse_stream_response()"""
    return StreamingService.sse_stream_response(generator)


def format_sse_chunk(data: Dict[str, Any]) -> str:
    """Convenience function for StreamingService.format_sse_chunk()"""
    return StreamingService.format_sse_chunk(data)
