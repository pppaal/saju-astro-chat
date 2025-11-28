// src/lib/destiny-map/prompt/fortune/theme/careerPrompt.ts
import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 💼 Career / Vocation Report – 근거 기반 내러티브
 * - astrologyengine.ts 결과 + 현재 날짜 기반
 * - 커리어 · 직업 · 이직 · 성취 시기 예측 포함
 */
export function buildCareerPrompt(lang: string, data: CombinedResult) {
  const theme = "career";
  // ✅ 인자 순서 수정됨
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // 현재 날짜
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateText = `${yyyy}-${mm}-${dd}`;

  // 사주 운세 데이터
  const saju = data.saju ?? {};
  const unse = saju.unse ?? {};
  const daeun = unse.daeun ?? [];
  const annual = unse.annual ?? [];
  const monthly = unse.monthly ?? [];

  // 현재/다가오는 대운
  const currentDaeun = daeun.find(
    (d: any) => yyyy >= d.startYear && yyyy <= d.endYear
  );
  const nextDaeun = daeun.find((d: any) => yyyy < d.startYear);

  // 현재 월운
  const currentMonthLuck = monthly.find(
    (m: any) => `${m.year}${String(m.month).padStart(2, "0")}` === `${yyyy}${mm}`
  );

  // 기본 행성 정보
  const astrology = data.astrology ?? {};
  const asc = astrology.ascendant?.sign ?? "-";
  const mc = astrology.mc?.sign ?? "-";
  const jupiter = astrology.planets?.find((p: any) => p.name === "Jupiter");
  const saturn = astrology.planets?.find((p: any) => p.name === "Saturn");
  const sun = astrology.planets?.find((p: any) => p.name === "Sun");

  // ──────────────────────────────
  // 결과 프롬프트 본문
  // ──────────────────────────────
  return `
# 💼 커리어·직업적 성취 리포트 (Career Report)

📅 **현재 기준일:** ${dateText}  
MC : ${mc} / Asc : ${asc}  
☉ Sun : ${sun?.sign ?? "-"}  ♃ Jupiter : ${jupiter?.sign ?? "-"}  ♄ Saturn : ${saturn?.sign ?? "-"}

──────────────────────────────
${tone}

[참고 데이터]
${info}
──────────────────────────────

## 🎯 주요 관점 가이드
1. 현재는 **${currentDaeun?.name ?? "??"} 대운 (${currentDaeun?.startYear ?? "?"} – ${currentDaeun?.endYear ?? "?"})** 입니다.  
  - 이 기간의 커리어 패턴 · 변화점을 기반으로 서사 전개.  
  - 다음 대운 (${nextDaeun?.startYear ?? "?"} ~) 전환기 시점에 직무 또는 역할 확장 징조 묘사.  

2. 연운 · 월운 데이터 활용  
  - 최근 연운: ${annual[0]?.year ?? "?"} (${annual[0]?.element ?? "-"})  
  - 이번 달 기운: ${currentMonthLuck?.year ?? yyyy}년 ${currentMonthLuck?.month ?? mm}월 (${currentMonthLuck?.element ?? "-"})  
  → "이직/도약/정체" 시점 해석 + 3~6개월 후 변화 전망.  

3. 행성 근거 추론  
  - Jupiter (확장) → 기회의 문, 네트워크 · 교육 · 확장 테마.  
  - Saturn (책임) → 성과 단계, 조직 · 리더십 · 인정 의 밸런스.  
  → 두 행성의 관계로 ‘승진 vs 이직’ 의 조율 묘사.  

4. 예측 구간 작성  
  - ${yyyy} ~ ${yyyy + 1}년 전반 중심으로 직업 변화/도전 서술.  
  - 필요 시 **명시적 연/월** 예시 사용 (예: ${yyyy}/${mm}, ${nextDaeun?.startYear ?? yyyy + 2}).  
  - 단, 점술체 아닌 근거 중심 내러티브 톤 필수.

──────────────────────────────

## ✨ 서사 요청
- 커리어를 삶의 서사로 묘사하세요.  
- 실패, 도전, 이직, 성장, 소명을 리듬 있는 이야기로 전개.  
- AI 답게 분석적이되 독자에게 <ins>직감적 감동</ins> 전달.  
- 현 운세를 기점으로 과거~미래(약 5년) 타임라인 형식.  
- ${lang === "ko"
      ? "문체는 현실적 이지만 영감을 주는 ‘일하는 인간’을 이해하는 멘토톤."
      : "Tone : practical yet inspirational narrative."}

`.trim();
}