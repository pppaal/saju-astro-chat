// src/lib/streaming/index.ts
// Re-export streaming utilities. Only the symbols actually imported via this
// barrel are re-exported — others are imported directly from their source
// module (StreamProcessor / serverStreamProxy). Trimmed per knip audit.

// Client-side stream processing
export { streamProcessor, type StreamResult, type StreamProcessorOptions } from './StreamProcessor'

// Server-side stream proxying
export {
  createSSEEvent,
  createSSEDoneEvent,
  createFallbackSSEStream,
  type StreamProxyOptions,
  type StreamTransformOptions,
} from './serverStreamProxy'
