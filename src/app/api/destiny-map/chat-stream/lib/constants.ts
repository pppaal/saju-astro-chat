// src/app/api/destiny-map/chat-stream/lib/constants.ts
// Constants and configurations for chat-stream API

import type { FiveElement } from "@/lib/timing/timingScore";

export const ALLOWED_LANG = new Set(["ko", "en"]);
export const ALLOWED_ROLE = new Set(["system", "user", "assistant"]);
export const ALLOWED_GENDER = new Set(["male", "female", "other", "prefer_not"]);
export const MAX_MESSAGES = 10;

// 천간 → 오행 매핑
export const STEMS_MAP: Record<string, FiveElement> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
};

