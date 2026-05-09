# `src/lib/` — Library structure

## 점쾌 핵심 엔진 (4개)

```
Saju/                  사주명리 (격국·용신·신살·12운성·대운)  → README in folder
astrology/             점성학 (행성·하우스·트랜짓·dignity)     → README in folder
fortune/cross-rules/   사주 × 점성 정통 패턴 (5106라인)
destiny-matrix/        매트릭스 엔진 — 위 3개를 합쳐서
                       서비스에 줄 점수·문장 만듦
```

## 점쾌 보조 (서비스별 wrapper)

```
Tarot/                 타로 카드 엔진
prediction/            대운-트랜짓 동기화 + 인생 예측
destiny-map/           캘린더 엔진 + prompt builder
                       (destiny-matrix와 다름! 이름만 비슷)
premium-reports/       프리미엄 리포트 빌더
```

## 매칭/궁합 — 3폴더 boundary

```
compatibility/         🔥 심화 커플 분석 (사주 deep + 점성 deep + fusion AI)
                       두 사람 birth chart 모두 받음, 무거운 계산
                       → 컴포넌트: 궁합 카운슬러, 궁합 free report

destiny-match/         🪶 quick 매칭 (personality + quickCompatibility)
                       persona 분석 기반 빠른 매칭
                       → 컴포넌트: destiny-match 페이지

match/                 📇 matching profile (matchProfile, tier1/tier2)
                       DB 매칭용 user profile
                       → 컴포넌트: 매칭 서비스 백엔드
```

## 사용자 프로필 — 3폴더 boundary

```
icpTest/              ICP 검사 질문·채점·결과
icp/                  ICP analysis (ICP 결과 narrative)
persona/              persona 분석 (텍스트 기반)
```

## AI / LLM — 4폴더 boundary

```
llm/                  Claude API 호출 (askClaude, claudeSSE)
                      가장 low-level, 모든 LLM 호출 여기 통과

counselor/            카운슬러 response contract (4-section validator,
                      brand voice 후처리). LLM 답변 후처리 룰.

prompts/              공유 prompt builder (fortune+ICP)
                      여러 서비스가 공통으로 쓰는 prompt 조각

ai/                   AI 헬퍼 (cvSajuCross, decisionTracker, summarize,
                      personaMemoryRecall) — 작은 ad-hoc 기능들
```

## 비즈니스

```
stripe/, payments/, credits/  결제·크레딧
referral/                     리퍼럴
notifications/, pushNotifications.ts, email/  알림
```

## 인프라 — 도구

```
api/             API middleware (요청·응답·인증·rate-limit)
auth/            인증 + Firebase
cache/           Redis cache
db/              Prisma DB
infrastructure/  환경 추상화
streaming/       SSE
security/        보안
errors/          에러 핸들러
logger.ts, logger/, metrics.ts, metrics/, telemetry.ts
http.ts, request-ip.ts, rateLimit.ts, circuitBreaker.ts
```

## 유틸 — 잡

```
config/, constants/, env.ts        설정·상수
datetime/, calendar/(deprecated)   날짜
i18n/                              번역
text/, textGuards.ts               텍스트 헬퍼
ui/, og-image.tsx                  UI 헬퍼
utils/, utils.ts                   잡 유틸
validation/                        검증
cities/                            도시 데이터
performance/, ops/                 성능·운영
replicate.ts                       Replicate API
firebase/                          Firebase
coreServices.ts                    서비스 리스트
userProfile.ts                     유저 프로필 헬퍼
assessment/, consultation/         상담 history
```

## 룰

1. **새 사주/점성 함수 추가** → `Saju/README.md` 또는 `astrology/README.md` 먼저 봄
2. **새 폴더 만들지 말 것** — 위에 분류 안 되는 게 나오면 README 갱신
3. **이름 충돌 금지** — `compatibility/advancedSajuAnalysis.ts`처럼 다른 폴더와 같은 이름 X
4. **점쾌 로직은 4개 핵심 엔진에만** — 서비스 wrapper에서 자체 계산 X (canonical 호출)
