/**
 * 무료 궁합 리포트 — 뷰모델 + 콘텐츠 스키마 타입.
 *
 * 서버(compatReport)가 만든 결정적 facts(CompatReport)를 buildFreeCompatNarrative
 * 가 "사주·점성을 모르는 사람도 읽히는" 섹션 산문으로 바꾼다. 런타임 LLM 호출은
 * 없다 — 풍부한 해석 문장은 freeReportContent.ts(ko/en 사전)에서 끌어온다.
 *
 * 통합 무료 리포트(reportGlossary/integratedReportLabels)와 같은 결: *서술*은
 * 풍부하게, *처방·시기·1:1 상담*은 유료 상담사로. 그래서 여기엔 조언/타이밍
 * 카피가 없다(맺음말 CTA 만 유료로 안내).
 */

/** ko/en 한 쌍. 편집 시 한쪽만 고치면 다른 쪽이 바로 옆에 보이게. */
export interface Bi {
  ko: string
  en: string
}

/** 리포트 한 섹션 — 제목 + 도입 + 본문 단락들. */
export interface FreeReportSection {
  /** 안정 식별자 (렌더 key + 디버그). */
  id: string
  /** 아이콘 이모지(렌더 장식용 — 없으면 빈 문자열). */
  icon: string
  /** 섹션 제목 (lang 해석 완료). */
  title: string
  /** 한 줄 도입 — 이 섹션이 무엇을 보는지(초보자 안내). */
  lead?: string
  /** 본문 단락 — 결정적 신호를 일상어로 풀이. */
  paragraphs: string[]
}

/**
 * 테마 카드 — "사람들이 실제로 궁금해하는 질문"별로 신호를 재배치한 묶음.
 * 신호별(밴드/일간/십성/어스펙트/하우스/기둥)을 출처가 아니라 *주제*로 묶어,
 * 읽고 싶은 것부터 골라 보게 한다. paragraphs 는 weight 내림차순.
 */
export interface FreeReportTheme {
  id: string
  icon: string
  /** 질문형 제목 (lang 해석 완료) — 예: "처음에 확 끌려?". */
  title: string
  /** 한 줄 단정 훅 — 질문에 바로 답하는 punchy 한 줄(신호 종합 polarity 로 선택). */
  hook?: string
  /** 0~100 점수 — 점신·포스텔러식 스캔용. (테마 차원의 강도/조화) */
  score?: number
  /** 점수 옆 차원 라벨 — 예: "끌림", "소통", "마찰". */
  scoreCaption?: string
  paragraphs: string[]
}

/** 용어 풀이 한 항목 — "그 용어 자체가 무엇인가". */
export interface FreeReportGlossaryEntry {
  term: string
  body: string
}

/** 빌더가 내보내는 완성 뷰모델 — UI 는 이걸 그대로 그린다. */
export interface FreeReportView {
  /** 리포트 도입 — 어떻게 읽는지 한 문단. */
  intro: string
  /** 한눈에 — 동·서 교차 종합 + 초보자용 풀이. */
  verdict: {
    text: string
    tone: 'aligned' | 'mixed' | 'tension' | 'neutral'
    expansion: string
  } | null
  /** 본문 섹션들 (신호 출처별 — 빈 섹션은 빌더가 생략). */
  sections: FreeReportSection[]
  /** 테마 카드들 (질문 주제별 재배치 — 빈 테마는 빌더가 생략). */
  themes: FreeReportTheme[]
  /** 용어 풀이. */
  glossary: FreeReportGlossaryEntry[]
  /** 맺음말 — 유료 상담사로 무엇을 더 풀 수 있는지. */
  closing: string
}

// ── 콘텐츠 사전 스키마 ──────────────────────────────────────────────
// freeReportContent.ts 가 이 모양으로 ko/en 카피를 채운다. 40-에이전트
// 워크플로의 산출 타깃이기도 하다 — 키 집합이 엔진과 1:1 로 맞물려야 한다.

/** 신호 한 줄 카피 — 짧은 느낌어(feel) + 풍부한 풀이(blurb). */
export interface SignalCopy {
  /** 한 단어~짧은 구의 느낌어 (예: "다듬어주는 끌림"). */
  feel: Bi
  /** 2~3 문장의 초보자용 풀이 — 왜 그런 결인지. */
  blurb: Bi
}

/** 밴드(끌림/마찰 막대) 한 줄 풀이 — 무엇을 보는지 + 높을 때/낮을 때. */
export interface BandCopy {
  what: Bi
  high: Bi
  low: Bi
}

/** 섹션 메타 — 제목·아이콘·도입. */
export interface SectionMeta {
  title: Bi
  icon: string
  lead: Bi
}
