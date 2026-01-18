# backend_ai/app/tarot/llm/streaming.py
"""
Tarot Streaming Response Handler
=================================
스트리밍 응답 처리
"""

from typing import Generator, Optional
from .client import TarotLLMClient


def stream_tarot_response(
    client: TarotLLMClient,
    system_prompt: str,
    user_prompt: str,
    temperature: float = None,
    max_tokens: int = None
) -> Generator[str, None, None]:
    """
    Stream response from GPT

    Args:
        client: TarotLLMClient instance
        system_prompt: System message
        user_prompt: User message
        temperature: Sampling temperature
        max_tokens: Maximum tokens

    Yields:
        Response text chunks
    """
    if not client.is_available:
        yield "OpenAI API가 설정되지 않았습니다."
        return

    try:
        stream = client.create_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            stream=True,
            temperature=temperature,
            max_tokens=max_tokens
        )

        if stream is None:
            yield "응답을 생성할 수 없습니다."
            return

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        yield f"스트리밍 오류: {str(e)}"


def generate_non_streaming_response(
    client: TarotLLMClient,
    system_prompt: str,
    user_prompt: str,
    temperature: float = None,
    max_tokens: int = None
) -> Optional[str]:
    """
    Generate non-streaming response

    Args:
        client: TarotLLMClient instance
        system_prompt: System message
        user_prompt: User message
        temperature: Sampling temperature
        max_tokens: Maximum tokens

    Returns:
        Response text or error message
    """
    if not client.is_available:
        return "OpenAI API가 설정되지 않았습니다."

    try:
        response = client.create_completion(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            stream=False,
            temperature=temperature,
            max_tokens=max_tokens
        )

        if response is None:
            return "응답을 생성할 수 없습니다."

        return response.choices[0].message.content

    except Exception as e:
        return f"리딩 생성 중 오류 발생: {str(e)}"
