-- PersonaMemory 제거
-- 실 사용자 응답에 반영되는 필드가 3개뿐이었고, 그마저도 채팅 흐름에서
-- 제거되었다. 클라이언트가 부르던 /api/persona-memory/update-from-chat
-- 라우트는 처음부터 미구현이라 프로덕션에서 404만 발생하고 있었다.
-- 함께 추가됐던 recall 컬럼은 일부 환경에 적용되지 않아 chat-history
-- 핸들러에서 "column not available" Prisma 에러를 일으키고 있었다.
DROP TABLE IF EXISTS "PersonaMemory";
