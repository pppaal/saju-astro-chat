/**
 * 로컬 Ollama 서버에 프롬프트를 보내고 해석 결과를 받아오는 함수
 * @param prompt - createDestinyMapPrompt 함수로 생성된 최종 프롬프트 문자열
 * @returns LLM이 생성한 해석 텍스트
 */
export async function callOllamaAPI(prompt: string): Promise<string> {
  const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat';
  const modelName = process.env.OLLAMA_MODEL_NAME || 'llama3.1:8b-instruct-q4_k_m';

  if (!apiUrl || !modelName) {
    throw new Error("Server Configuration Error: Ollama settings are missing from .env.local.");
  }

  const requestBody = {
    model: modelName,
    messages: [{ role: "user", content: prompt }],
    stream: false,
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.message?.content;

  if (typeof content !== "string" || !content) {
    throw new Error(`Ollama returned an invalid response structure. Raw: ${JSON.stringify(data)}`);
  }

  return content.trim();
}