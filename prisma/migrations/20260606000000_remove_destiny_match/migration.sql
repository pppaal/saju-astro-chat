-- destiny-match (틴더 스타일 매칭) 영구 제거 — 운세 사이트 정체성과 맞지
-- 않아 폐기. 코드 (src/app/destiny-match, src/app/api/destiny-match,
-- src/components/destiny-match, src/lib/destiny-match) 는 같은 PR 에서
-- 같이 삭제. `/destiny-match` 는 옛 REMOVED_PUBLIC_SERVICE_PREFIXES
-- 에서 메뉴 노출은 이미 차단된 상태였음.
--
-- 영향:
--   1. TarotReading.matchConnectionId 컬럼 + 관련 index 제거 (커플 타로
--      가 매칭 연결을 참조하던 옵셔널 채널 — 매칭 자체가 없어졌으니 무효)
--   2. MatchMessage / MatchConnection / MatchSwipe / MatchProfile 4 테이블
--      통째로 DROP (FK 의존성 역순)
--
-- ⚠️ destructive: 위 4 테이블의 모든 row 가 영구 손실됨. 머지 전 production
-- DB count 수동 확인 필수.

-- 1. TarotReading 의 매칭 연결 컬럼 + index 제거 (가벼운 first step)
DROP INDEX IF EXISTS "TarotReading_matchConnectionId_createdAt_idx";
ALTER TABLE "TarotReading" DROP COLUMN IF EXISTS "matchConnectionId";

-- 2. Match 4 테이블 — FK 의존성 역순 (의존 후 → 의존 전)
DROP TABLE IF EXISTS "MatchMessage";
DROP TABLE IF EXISTS "MatchConnection";
DROP TABLE IF EXISTS "MatchSwipe";
DROP TABLE IF EXISTS "MatchProfile";
