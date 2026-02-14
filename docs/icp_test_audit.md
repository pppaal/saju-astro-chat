# ICP 테스트 품질 감사 (Audit)

작성일: 2026-02-12  
범위: ICP 단일 결과 + ICP/Persona 결합 결과 + 상담 프롬프트 연계 적합성

## 1) Rubric 점수 (1–5)

- A. 문항 품질: **2/5**
- B. 결과 품질: **2/5**
- C. 결합 결과 품질: **2/5**
- D. 운세 상담 적합성: **1/5**

요약: 현재 구현은 "작동하는 MVP" 수준이다. UI 플로우는 안정적이나, 심리측정 관점(척도/역채점/신뢰도), 결과 서술의 구체성, 결합 결과의 설명가능성, 상담 프롬프트로의 구조화 전달이 모두 부족하다.

## 2) 상세 평가

### A. 문항 품질

- 명확성: 일상 상황 기반이라 기본 이해는 쉽다.
- 단일 이슈성: 일부 문항은 행동 + 의도(갈등 회피 등)가 섞여 해석이 모호해질 수 있다.
- 균형 키잉/역문항: 역채점 구조가 사실상 없다.
- 척도 설계: 3지선다(A/B/C) 고정으로 변별력, 반응 일관성 측정력이 낮다.
- 유도/편향: 사회적 바람직성(친절/도움 행동) 유도 위험이 있다.
- 한국어 자연스러움: 전반적으로 무난하나 일부 번역투 톤이 남아 있다.
- 구성타당도: dominance/affiliation 2축은 있으나, 각 축 내 하위 행동 지표가 명시적으로 분리되지 않았다.
- 상태-특성 혼재: "그때 상황이면" 류 문항이 trait보다 state를 반영할 수 있다.

### B. 결과 품질

- 유형 구분도: 8옥탄트 구조는 있으나 결과 카피가 유사한 패턴으로 반복된다.
- 구체적 행동가이드: 존재하지만 페르소나/상황별 개인화 근거 연결이 약하다.
- 내부 일관성: 점수 계산식은 단순하며 low-confidence 처리 정책이 약하다.
- 톤/안전: 전반 톤은 무난하나 "치료적 질문" 용어가 비임상 맥락에서 오해될 소지가 있다.
- 법적/안전: 비임상/엔터테인먼트 명시가 홈에 1줄만 존재, 결과/상담 단계에는 충분히 반복되지 않는다.

### C. 결합 결과 (ICP + Persona)

- 현재 결합은 주로 규칙 기반 인사이트 카드 나열이며 하이브리드 타입 체계가 없다.
- 신규 신호 생성보다 "요약 결합"에 가까워 차별성이 약하다.
- tie/저신뢰 fallback, "왜 이 결과인가" 설명 payload가 없다.

### D. 운세 상담 적합성

- 상담 파이프라인은 사주/점성 + personaMemory 중심이며 ICP/Persona 테스트 결과를 구조 JSON으로 주입하지 않는다.
- 따라서 대화 중 스타일 맞춤(소통 방식, 제안 깊이, 블라인드스팟 경고)을 일관되게 재사용하기 어렵다.

## 3) 구체 이슈 (10+)

1. **척도 변별력 부족 (3지선다 고정)**  
   파일: `src/lib/icp/questions.ts:26`  
   근거: 각 문항 옵션이 `A/B/C` 3개 고정이며 Likert 5점 앵커가 없다. 미세한 정도 차이를 잃는다.

2. **역채점 정책 부재**  
   파일: `src/lib/icp/questions.ts:11`  
   근거: 질문 타입에 reverse 플래그/키잉 메타데이터가 없다. 균형키잉 검증이 어렵다.

3. **강제 중간값으로 점수 편향 가능**  
   파일: `src/lib/icp/analysis.ts:348`  
   근거: `A=1.0, B=0.5, C=0.0` 고정 매핑. 문항 난이도/분별도 차이를 반영하지 못한다.

4. **보조유형 임계값 하드코딩(0.3)**  
   파일: `src/lib/icp/analysis.ts:415`  
   근거: tie/근소차 처리 없이 단일 임계값으로 secondary 결정.

5. **일관성 점수 하한 30으로 신뢰도 과대 표시 위험**  
   파일: `src/lib/icp/analysis.ts:434`  
   근거: `Math.max(30, ...)`로 낮은 품질 응답도 최소 30 보장.

6. **요약 문구 과도하게 정형화**  
   파일: `src/lib/icp/analysis.ts:438`  
   근거: 요약이 "주요 특성 나열" 1문장 구조로 고정, 행동 맥락/주의점 연결 부족.

7. **궁합 점수 규칙의 설명가능성/타당성 약함**  
   파일: `src/lib/icp/analysis.ts:482`  
   근거: 시작점 50 + 가감산 규칙으로 산출. 이론적/경험적 근거와 edge-case 처리가 제한적.

8. **ICP 저장 API 스키마-클라이언트 payload 불일치 가능성**  
   파일: `src/app/icp/result/useICPResult.ts:122`  
   파일: `src/lib/api/zodValidation/user.ts:342`  
   근거: 클라이언트 `analysisData` 구조(summary 중심)와 스키마 `icpAnalysisDataSchema`(description/strengths/challenges 필수 구조) 불일치.

9. **저장 시 핵심 원시 데이터 누락 가능성**  
   파일: `src/app/icp/result/useICPResult.ts:121`  
   파일: `src/app/api/icp/route.ts:80`  
   근거: 클라이언트가 top-level `octantScores`, `answers`를 보내지 않음. 서버는 없으면 `{}`/빈값 저장.

10. **중복 저장 엔드포인트로 계약 불일치 위험**  
    파일: `src/app/api/icp/route.ts:57`  
    파일: `src/app/api/personality/icp/save/route.ts:17`  
    근거: 유사 기능 API가 2개이며 유효성 스키마/응답 구조가 다르다.

11. **결합 결과가 localStorage 의존, 버전/신뢰도/재현성 부족**  
    파일: `src/app/personality/combined/components/useCombinedResult.ts:34`  
    파일: `src/app/personality/combined/components/useCombinedResult.ts:47`  
    근거: DB 원본이나 테스트 버전 없이 클라이언트 저장값만으로 결합 분석.

12. **하이브리드 타입(ICP×Persona) 체계 부재**  
    파일: `src/app/personality/combined/insightGenerators.ts:382`  
    근거: 카드형 인사이트 생성은 있으나 archetype ID/매트릭스/fallback 규칙이 없다.

13. **상담 프롬프트에 ICP/Persona 구조 데이터 직접 주입 없음**  
    파일: `src/app/api/destiny-map/chat-stream/route.ts:288`  
    파일: `src/app/api/destiny-map/chat-stream/route.ts:324`  
    근거: 프롬프트는 사주/점성/메모리 중심. ICP/Persona 결과를 `CounselingBrief`로 전달하지 않는다.

14. **DB 모델에 테스트 버전/신뢰도 필드 부재**  
    파일: `prisma/schema.prisma:656`  
    근거: `ICPResult`에 `testVersion`, `confidence`, `completionSeconds` 등의 진단 품질 메타가 없다.

15. **안전 고지 위치/반복 부족**  
    파일: `src/app/icp/page.tsx:117`  
    파일: `src/app/icp/result/page.tsx:181`  
    근거: 홈에는 간단 고지 1회, 결과 단계는 치료적 질문 섹션이 있으나 비임상/엔터테인먼트 고지가 부족.

## 4) Top 5 고임팩트 수정안

1. **단일 소스 모듈화 + 데이터 계약 통합**  
   `/lib/icpTest/*`로 질문/채점/결과/하이브리드/타입 분리, API는 단일 계약만 사용.

2. **척도 개편(5점 Likert) + 소수 역문항 도입 + confidence 산식 추가**  
   응답 품질/일관성/무응답/동점/속도 기반 confidence를 계산하고 UI/저장에 반영.

3. **결과 템플릿 재설계(비임상 안전문구 포함)**  
   핵심요약/강점/주의점/행동/관계/일·돈 + "왜 이런 결과"를 축 근거로 출력.

4. **Hybrid Archetype 매트릭스 도입(8~16종)**  
   ICP×Persona를 유형 ID로 매핑하고 저신뢰 시 `혼합형(탐색 중)` fallback 제공.

5. **상담 파이프라인에 CounselingBrief 주입**  
   `user_archetype`, `axes`, `hybrid_archetype`, `confidence`, `strengths/blindspots`를 prompt grounding 컨텍스트로 전달.

## 5) Risks & Quick Wins

### Risks

- 기존 저장 데이터와 신규 스키마 간 호환성 깨짐 위험.
- 결과 문구 대폭 변경 시 사용자 체감 연속성 저하 가능.
- 상담 프롬프트 길이 증가로 토큰 비용/지연 증가 가능.

### Quick Wins (1~2일)

- `/api/icp` payload-스키마 불일치 즉시 수정(저장 실패/누락 방지).
- 결과 페이지/상담 프롬프트에 비임상 고지 문구 추가.
- 결합 결과 화면에 간단 explainability 블록(`상위 축 + 근거 응답`) 추가.
- 질문 이탈 분석용 `question_id`, `index`, `answered` 이벤트 트래킹 훅 추가.
