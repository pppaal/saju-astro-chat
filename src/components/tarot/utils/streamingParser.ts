/**
 * SSE streaming parser utilities
 * Extracted from TarotChat.tsx lines 610-646
 */

/**
 * Parsed SSE data chunk
 */
export interface SSEChunk {
  /** Content chunk from the stream */
  content?: string;
  /** Whether streaming is complete */
  done?: boolean;
  /** Error message if any */
  error?: string;
}

/**
 * Parse SSE (Server-Sent Events) stream and accumulate content
 *
 * @param reader - ReadableStream reader
 * @param onChunk - Callback for each content chunk
 * @returns Final accumulated content
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (content: string) => void
): Promise<string> {
  const decoder = new TextDecoder();
  let accumulatedContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {break;}

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6)) as SSEChunk;
          if (data.content) {
            accumulatedContent += data.content;
            onChunk(accumulatedContent);
          }
          if (data.error) {
            throw new Error(data.error);
          }
        } catch (error) {
          // Ignore parse errors for incomplete chunks
          if (error instanceof Error && error.message !== "Unexpected end of JSON input") {
            throw error;
          }
        }
      }
    }
  }

  return accumulatedContent;
}

/**
 * Check if response is SSE stream
 *
 * @param response - Fetch response
 * @returns True if response is SSE stream
 */
export function isSSEStream(response: Response): boolean {
  const contentType = response.headers.get("content-type");
  return !!(contentType?.includes("text/event-stream") && response.body);
}
