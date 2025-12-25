// src/lib/streaming/StreamProcessor.ts
// Unified SSE stream processing utility

export interface StreamResult {
  /** Cleaned content without markers */
  content: string;
  /** Extracted follow-up questions (if any) */
  followUps: string[];
  /** Whether stream completed successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

export interface StreamProcessorOptions {
  /** Callback for real-time content updates */
  onChunk?: (accumulated: string, cleaned: string) => void;
  /** Callback when stream is done */
  onDone?: (result: StreamResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * SSE Stream Processor
 * Handles Server-Sent Events streams with follow-up question parsing
 */
export class StreamProcessor {
  private decoder = new TextDecoder();

  /**
   * Process a fetch Response with SSE stream
   */
  async process(
    response: Response,
    options: StreamProcessorOptions = {}
  ): Promise<StreamResult> {
    const { onChunk, onDone, onError } = options;

    if (!response.body) {
      const error = new Error("No response body");
      onError?.(error);
      return {
        content: "",
        followUps: [],
        success: false,
        error: error.message,
      };
    }

    const reader = response.body.getReader();
    let accumulated = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = this.decoder.decode(value, { stream: true });
        const parsed = this.parseSSEChunk(chunk);

        for (const data of parsed) {
          if (data === "[DONE]") {
            break;
          } else if (data.startsWith("[ERROR]")) {
            const errorMsg = data.slice(7).trim() || "Stream error";
            throw new Error(errorMsg);
          } else {
            accumulated += data;
            const cleaned = this.cleanFollowupMarkers(accumulated);
            onChunk?.(accumulated, cleaned);
          }
        }
      }

      // Parse final result
      const result = this.parseResult(accumulated);
      onDone?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      return {
        content: this.cleanFollowupMarkers(accumulated),
        followUps: [],
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse SSE chunk into data segments
   * Format: "data: content\n"
   */
  private parseSSEChunk(chunk: string): string[] {
    const results: string[] = [];
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        results.push(line.slice(6));
      }
    }

    return results;
  }

  /**
   * Clean follow-up markers from text during streaming
   * Handles: ||FOLLOWUP||[...], partial ||FO, ||FOLLOW, ||FOLLOWUP|, etc.
   */
  cleanFollowupMarkers(text: string): string {
    return text
      .replace(/\|\|FOLLOWUP\|\|.*/s, "") // Full marker with content
      .replace(
        /\|\|F(?:O(?:L(?:L(?:O(?:W(?:U(?:P(?:\|(?:\|)?)?)?)?)?)?)?)?)?$/s,
        ""
      ) // Any partial state
      .replace(/\|$/s, "") // Single pipe at end
      .trim();
  }

  /**
   * Parse accumulated content into final result
   */
  private parseResult(accumulated: string): StreamResult {
    if (!accumulated) {
      return {
        content: "",
        followUps: [],
        success: true,
      };
    }

    const { cleanContent, followUps } =
      this.extractFollowUpQuestions(accumulated);

    return {
      content: cleanContent,
      followUps,
      success: true,
    };
  }

  /**
   * Extract follow-up questions from response
   * Format: ||FOLLOWUP||["q1", "q2", "q3"]
   */
  extractFollowUpQuestions(text: string): {
    cleanContent: string;
    followUps: string[];
  } {
    const followUpMatch = text.match(/\|\|FOLLOWUP\|\|\s*\[([^\]]+)\]/s);

    if (!followUpMatch) {
      return {
        cleanContent: this.cleanFollowupMarkers(text),
        followUps: [],
      };
    }

    try {
      // Fix common AI mistakes: curly quotes → straight quotes
      let jsonStr = "[" + followUpMatch[1] + "]";
      jsonStr = this.normalizeJsonQuotes(jsonStr);

      const followUps = JSON.parse(jsonStr) as string[];
      const cleanContent = text
        .replace(/\|\|FOLLOWUP\|\|\s*\[[^\]]+\]/s, "")
        .trim();

      return { cleanContent, followUps };
    } catch {
      // If JSON parsing fails, just remove the marker
      return {
        cleanContent: text.replace(/\|\|FOLLOWUP\|\|.*/s, "").trim(),
        followUps: [],
      };
    }
  }

  /**
   * Normalize JSON quotes (fix curly quotes from AI)
   */
  private normalizeJsonQuotes(str: string): string {
    return str
      .replace(/[""]/g, '"') // Fix curly double quotes
      .replace(/['']/g, "'") // Fix curly single quotes
      .replace(/,\s*]/g, "]"); // Fix trailing comma
  }
}

// Singleton instance for convenience
export const streamProcessor = new StreamProcessor();
