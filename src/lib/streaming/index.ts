// src/lib/streaming/index.ts
// Re-export streaming utilities

// Client-side stream processing
export {
  StreamProcessor,
  streamProcessor,
  type StreamResult,
  type StreamProcessorOptions,
} from "./StreamProcessor";

// Server-side stream proxying
export {
  createSSEStreamProxy,
  isSSEResponse,
  createSSEEvent,
  createSSEDoneEvent,
  createSSEErrorEvent,
  createFallbackSSEStream,
  createTransformedSSEStream,
  type StreamProxyOptions,
  type StreamTransformOptions,
} from "./serverStreamProxy";
