-- PersonaMemory recall 깊이 강화 (Tier 2A)
-- 사용자 이전 질문·결정 verbatim 기록을 위한 JSON 필드 추가
ALTER TABLE "PersonaMemory"
  ADD COLUMN IF NOT EXISTS "recentQuestions" JSONB,
  ADD COLUMN IF NOT EXISTS "decisionsMentioned" JSONB;
