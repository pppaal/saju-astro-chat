# backend_ai/app/tarot/llm/client.py
"""
Tarot LLM Client
================
OpenAI 클라이언트 설정 및 관리
"""

import os
from typing import Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OpenAI = None
    OPENAI_AVAILABLE = False
    print("[TarotLLMClient] openai not installed. LLM features disabled.")


class TarotLLMClient:
    """
    OpenAI client wrapper for tarot readings
    Manages client initialization, model selection, and configuration
    """

    DEFAULT_MODEL = "gpt-4o"
    DEFAULT_TEMPERATURE = 0.85
    DEFAULT_TOP_P = 0.95
    DEFAULT_MAX_TOKENS = 6000
    DEFAULT_TIMEOUT = 60.0
    DEFAULT_CONNECT_TIMEOUT = 10.0

    def __init__(self, api_key: str = None, model_name: str = None):
        """
        Initialize the OpenAI client

        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model_name: Model to use (defaults to gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model_name = model_name or self.DEFAULT_MODEL
        self.client: Optional[OpenAI] = None

        self._initialize_client()

    def _initialize_client(self) -> None:
        """Initialize the OpenAI client with proper timeout settings"""
        if not OPENAI_AVAILABLE:
            print("[TarotLLMClient] openai not installed")
            return

        if not self.api_key:
            print("[TarotLLMClient] No OpenAI API key provided")
            return

        try:
            import httpx
            self.client = OpenAI(
                api_key=self.api_key,
                timeout=httpx.Timeout(
                    self.DEFAULT_TIMEOUT,
                    connect=self.DEFAULT_CONNECT_TIMEOUT
                )
            )
            print(f"[TarotLLMClient] OpenAI client initialized (model: {self.model_name})")
        except Exception as e:
            print(f"[TarotLLMClient] Failed to initialize OpenAI: {e}")

    @property
    def is_available(self) -> bool:
        """Check if the client is available and ready"""
        return self.client is not None

    def create_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        stream: bool = False,
        temperature: float = None,
        max_tokens: int = None
    ):
        """
        Create a chat completion

        Args:
            system_prompt: System message
            user_prompt: User message
            stream: Whether to stream the response
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Chat completion response or stream
        """
        if not self.client:
            return None

        return self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature or self.DEFAULT_TEMPERATURE,
            top_p=self.DEFAULT_TOP_P,
            max_tokens=max_tokens or self.DEFAULT_MAX_TOKENS,
            stream=stream
        )

    def create_simple_completion(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 500
    ):
        """
        Create a simple completion without system prompt

        Args:
            prompt: User prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens

        Returns:
            Chat completion response
        """
        if not self.client:
            return None

        return self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )


# Singleton instance
_tarot_llm_client: Optional[TarotLLMClient] = None


def get_tarot_llm_client(api_key: str = None) -> TarotLLMClient:
    """Get or create singleton TarotLLMClient instance"""
    global _tarot_llm_client
    if _tarot_llm_client is None:
        _tarot_llm_client = TarotLLMClient(api_key=api_key)
    return _tarot_llm_client
