// src/lib/streaming/StreamProcessor.ts
// Unified SSE stream processing utility

export interface StreamResult {
  /** Cleaned content without markers */
  content: string
  /** Extracted follow-up questions (if any) */
  followUps: string[]
  /** Whether stream completed successfully */
  success: boolean
  /**
   * Stream produced some content but did not reach the `||FOLLOWUP||` end
   * marker the LLM is instructed to always append. Signals the upstream
   * SSE stream was cut mid-response (mobile network drop, Claude
   * disconnect, server idle abort). Callers should surface a retry
   * affordance on the affected message.
   */
  truncated: boolean
  /** Error message if failed */
  error?: string
}

export interface StreamProcessorOptions {
  /** Callback for real-time content updates */
  onChunk?: (accumulated: string, cleaned: string) => void
  /** Callback when stream is done */
  onDone?: (result: StreamResult) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /**
   * Fires on every raw read that carries bytes — including server heartbeat
   * comment lines (`: hb …`) that never parse into content. Lets the caller
   * rearm an idle/abort timer on any network activity, so a long Claude
   * thinking pause (heartbeats only, no content) doesn't trip a false abort.
   */
  onActivity?: () => void
}

/**
 * SSE Stream Processor
 * Handles Server-Sent Events streams with follow-up question parsing
 */
export class StreamProcessor {
  private sseBuffer = ''

  /**
   * Process a fetch Response with SSE stream
   */
  async process(response: Response, options: StreamProcessorOptions = {}): Promise<StreamResult> {
    const { onChunk, onDone, onError, onActivity } = options

    if (!response.body) {
      const error = new Error('No response body')
      onError?.(error)
      return {
        content: '',
        followUps: [],
        success: false,
        truncated: false,
        error: error.message,
      }
    }

    // Create a fresh decoder per stream — sharing one across calls leaks
    // partial multi-byte state between streams, producing replacement chars
    // and lone surrogates at the head of subsequent decodes.
    const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true })
    const reader = response.body.getReader()
    let accumulated = ''
    this.sseBuffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        // Any bytes — content OR heartbeat comment — count as liveness so the
        // caller's idle timer doesn't fire during a long content-less pause.
        if (value && value.length > 0) onActivity?.()
        if (done) {
          // Flush any remaining bytes held inside the decoder so a final
          // multi-byte char isn't dropped or surfaced as a lone surrogate.
          const flushed = decoder.decode()
          if (flushed) {
            const parsedFlushed = this.parseSSEChunk(flushed)
            for (const data of parsedFlushed) {
              if (data === '[DONE]') {
                break
              } else if (data.startsWith('[ERROR]')) {
                const errorMsg = data.slice(7).trim() || 'Stream error'
                throw new Error(errorMsg)
              } else {
                accumulated += data
                const cleaned = this.cleanFollowupMarkers(accumulated)
                onChunk?.(accumulated, cleaned)
              }
            }
          }
          const tail = this.flushSSEBuffer()
          for (const data of tail) {
            if (data === '[DONE]') {
              break
            } else if (data.startsWith('[ERROR]')) {
              const errorMsg = data.slice(7).trim() || 'Stream error'
              throw new Error(errorMsg)
            } else {
              accumulated += data
              const cleaned = this.cleanFollowupMarkers(accumulated)
              onChunk?.(accumulated, cleaned)
            }
          }
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const parsed = this.parseSSEChunk(chunk)

        for (const data of parsed) {
          if (data === '[DONE]') {
            break
          } else if (data.startsWith('[ERROR]')) {
            const errorMsg = data.slice(7).trim() || 'Stream error'
            throw new Error(errorMsg)
          } else {
            accumulated += data
            const cleaned = this.cleanFollowupMarkers(accumulated)
            onChunk?.(accumulated, cleaned)
          }
        }
      }

      // Parse final result
      const result = this.parseResult(accumulated)
      onDone?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(error)
      return {
        content: this.cleanFollowupMarkers(accumulated),
        followUps: [],
        success: false,
        truncated: accumulated.length > 0,
        error: error.message,
      }
    } finally {
      // 정상/에러 어느 경로로 나가든 reader 를 풀어 body 스트림이 잠긴 채(미취소)
      // 남지 않게 한다. 직전엔 에러 경로에서 cancel/releaseLock 을 안 해 reader 가
      // 누수되고 업스트림 연결이 끊기지 않았다. 이미 done 인 스트림엔 무해.
      try {
        await reader.cancel()
      } catch {
        /* 이미 닫힘/취소됨 — 무시 */
      }
    }
  }

  /**
   * Parse SSE chunk into data segments
   * Supports multi-line SSE events and chunk boundaries.
   */
  private parseSSEChunk(chunk: string): string[] {
    const normalized = (this.sseBuffer + chunk).replace(/\r\n/g, '\n')
    const events = normalized.split('\n\n')
    this.sseBuffer = events.pop() ?? ''

    const results: string[] = []

    for (const eventBlock of events) {
      const lines = eventBlock.split('\n')
      const dataLines = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())

      if (dataLines.length === 0) {
        continue
      }

      const hasControlToken = dataLines.some(
        (line) => line === '[DONE]' || line.startsWith('[ERROR]')
      )
      if (dataLines.length > 1 && hasControlToken) {
        // Be tolerant for malformed streams where control tokens are sent
        // without proper event separators.
        for (const line of dataLines) {
          results.push(this.normalizeSSEData(line))
        }
        continue
      }

      // Per SSE spec, multi-line `data:` fields are joined with newline.
      const payload = dataLines.join('\n')
      results.push(this.normalizeSSEData(payload))
    }

    return results
  }

  private flushSSEBuffer(): string[] {
    if (!this.sseBuffer.trim()) {
      return []
    }
    const tail = this.sseBuffer
    this.sseBuffer = ''
    return this.parseSSEChunk(tail + '\n\n')
  }

  /**
   * Normalize SSE payload:
   * - keep control tokens ([DONE], [ERROR]) as-is
   * - if JSON payload has "content", return that text only
   */
  private normalizeSSEData(payload: string): string {
    const normalized = payload.replace(/\r/g, '')
    const trimmed = normalized.trim()
    if (!trimmed) {
      return ''
    }
    if (trimmed === '[DONE]' || trimmed.startsWith('[ERROR]')) {
      return trimmed
    }

    try {
      const parsed = JSON.parse(trimmed) as { content?: unknown }
      if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
        return parsed.content
      }
    } catch {
      // Non-JSON payload: return original text.
    }
    return normalized
  }

  /**
   * Clean follow-up markers from text during streaming
   * Handles: ||FOLLOWUP||[...], partial ||FO, ||FOLLOW, ||FOLLOWUP|, etc.
   */
  cleanFollowupMarkers(text: string): string {
    return text
      .replace(/\|\|FOLLOWUP\|\|.*/s, '') // Full marker with content
      .replace(/\|\|F(?:O(?:L(?:L(?:O(?:W(?:U(?:P(?:\|(?:\|)?)?)?)?)?)?)?)?)?$/s, '') // Any partial state
      .replace(/\s*\|{1,}\s*$/s, '') // Stray trailing pipe(s) — e.g. a false-start "||" the model emitted before the real marker
      .trim()
  }

  /**
   * Parse accumulated content into final result
   */
  private parseResult(accumulated: string): StreamResult {
    if (!accumulated) {
      return {
        content: '',
        followUps: [],
        success: true,
        truncated: false,
      }
    }

    const { cleanContent, followUps } = this.extractFollowUpQuestions(accumulated)
    // The counselor prompts instruct Claude to always append `||FOLLOWUP||`
    // at the very end. Absence of the marker on a non-empty stream means
    // the upstream cut us off mid-response (network drop, server idle
    // abort, Claude disconnect).
    const truncated = !accumulated.includes('||FOLLOWUP||')

    return {
      content: cleanContent,
      followUps,
      success: true,
      truncated,
    }
  }

  /**
   * Extract follow-up questions from response
   * Format: ||FOLLOWUP||["q1", "q2", "q3"]
   */
  extractFollowUpQuestions(text: string): {
    cleanContent: string
    followUps: string[]
  } {
    const followUpMatch = text.match(/\|\|FOLLOWUP\|\|\s*\[([^\]]+)\]/s)

    if (!followUpMatch) {
      return {
        cleanContent: this.cleanFollowupMarkers(text),
        followUps: [],
      }
    }

    try {
      // Fix common AI mistakes: curly quotes → straight quotes
      let jsonStr = '[' + followUpMatch[1] + ']'
      jsonStr = this.normalizeJsonQuotes(jsonStr)

      const followUps = JSON.parse(jsonStr) as string[]
      // Strip the marker, then run the marker cleaner again so any stray
      // pipes the model emitted around it (false-start "||") don't survive.
      const cleanContent = this.cleanFollowupMarkers(
        text.replace(/\|\|FOLLOWUP\|\|\s*\[[^\]]+\]/s, '')
      )

      return { cleanContent, followUps }
    } catch {
      // If JSON parsing fails, just remove the marker
      return {
        cleanContent: text.replace(/\|\|FOLLOWUP\|\|.*/s, '').trim(),
        followUps: [],
      }
    }
  }

  /**
   * Normalize JSON quotes (fix curly quotes from AI)
   */
  private normalizeJsonQuotes(str: string): string {
    return str
      .replace(/[""]/g, '"') // Fix curly double quotes
      .replace(/['']/g, "'") // Fix curly single quotes
      .replace(/,\s*]/g, ']') // Fix trailing comma
  }
}

// 옛 코드: `new StreamProcessor()` singleton 을 모든 호출이 공유 → `sseBuffer`
// 인스턴스 state 가 동시 stream (다른 탭에서 동시 채팅, 재시도 중 새 send, 등) 끼리
// 덮어써져 SSE 파서 buffer 가 깨졌다. 매 호출마다 새 인스턴스로 격리.
export const streamProcessor = {
  process: (response: Response, options?: StreamProcessorOptions): Promise<StreamResult> =>
    new StreamProcessor().process(response, options),
  // 순수 helper (인스턴스 state 미사용) — 인스턴스 한 번 만들어 호출.
  extractFollowUpQuestions: (text: string) => new StreamProcessor().extractFollowUpQuestions(text),
}
