/**
 * Custom hooks for I Ching ResultDisplay component
 * @module hooks
 */

export { useAiStreaming } from "./useAiStreaming";
export type { AiStatus, AiStreamingState, UseAiStreamingReturn, UseAiStreamingParams } from "./useAiStreaming";

export { useHexagramData } from "./useHexagramData";
export type { HexagramData, UseHexagramDataParams } from "./useHexagramData";

export { useHexagramDataAsync } from "./useHexagramDataAsync";
export type { HexagramDataAsync, UseHexagramDataAsyncParams } from "./useHexagramDataAsync";

export { useAiCompletion } from "./useAiCompletion";
export type { AiTextSections, UseAiCompletionParams } from "./useAiCompletion";
