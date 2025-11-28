import { buildAllDataPrompt } from "../base/baseAllDataPrompt";
import { buildTonePrompt } from "../base/toneStyle";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

/**
 * 🌞 오늘의 운세 리포트 (Daily Poetic Fortune)
 * astrologyengine.ts 결과 + 일운(日辰) 기반으로 하루 전반의 정서 흐름을 시처럼 표현.
 */
export function buildTodayPrompt(lang: string, data: CombinedResult) {
  const theme = "today";
  const info = buildAllDataPrompt(lang, theme, data);
  const tone = buildTonePrompt(lang, theme);

  // 현재 날짜
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = now.getMonth() + 1;
  const dd = now.getDate();
  const dateText = `${yyyy}년 ${mm}월 ${dd}일`;

  const { astrology, saju } = data ?? {};
  const sun = astrology?.facts?.sun?.sign ?? "-";
  const moon = astrology?.facts?.moon?.sign ?? "-";
  const asc = astrology?.ascendant?.sign ?? "-";

  const elements = astrology?.facts?.elementRatios ?? {};
  const dominantElement =
    Object.entries(elements)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";
  const dayMaster = saju?.dayMaster?.name ?? "-";

  const sinsal = saju?.sinsal ?? {};
  const unse = saju?.unse ?? {};
  const daeun = unse.daeun ?? [];
  const annual = unse.annual ?? [];
  const daily = unse.daily ?? [];

  const currentDaeun = daeun.find((d: any) => yyyy >= d.startYear && yyyy <= d.endYear);
  const currentAnnual = annual.find((a: any) => a.year === yyyy);
  const todayInfo =
    daily.find((d: any) => d.year === yyyy && d.month === mm && d.day === dd) ?? daily[0];

  const lucky =
    (sinsal?.luckyList ?? []).map((x: { name: string }) => x.name).join(", ") || "없음";
  const unlucky =
    (sinsal?.unluckyList ?? []).map((x: { name: string }) => x.name).join(", ") || "없음";

  // 💡 핵심 데이터 요약
  const factSummary = `
[오늘의 핵심 데이터]
☉ Sun : ${sun} ☽ Moon : ${moon} Asc : ${asc}
Dominant Element : ${dominantElement} Day Master(日干) : ${dayMaster}
현재 대운 : ${currentDaeun?.name ?? "-"} (${currentDaeun?.startYear ?? "?"}–${currentDaeun?.endYear ?? "?"})
올해 연운 : ${currentAnnual?.year ?? "?"} (${currentAnnual?.element ?? "-"})
오늘 일운 : ${todayInfo?.element ?? "-"} (${todayInfo?.ganji ?? "-"})
길신 : ${lucky} · 흉신 : ${unlucky}
📅 기준 날짜 : ${dateText}
─────────────────────────`.trim();

  // 📖 본문 생성
  return `
# 🌞 오늘의 시적 운세 리포트 (Day‑Long Narrative)

${tone}

[참고 데이터]  
${info}

─────────────────────────
${factSummary}
─────────────────────────

당신은 ‘시간을 시로 읽는 사람’ 입니다.  
아래 가이드를 따라, **${dateText} 하루를 아침에서 밤까지**  
감정의 리듬과 빛의 변화를 시처럼 그려주세요.  
(길이는 약 2000–2500자 정도, 감정 · 감각 중심의 묘사)

---

## 🌅 Ⅰ. 아침의 기운 (Morning Light)
- ${dayMaster}와 ${dominantElement} 기운을 ‘새벽의 첫 호흡’처럼 묘사하세요.  
- 몸과 마음이 열리는 순간의 감각, 오늘의 시작을 시적 톤으로.  
- 빛과 공기, 감정의 온도를 상징으로 표현.

## 🌞 Ⅱ. 낮의 리듬 (Midday Flow)
- Sun(${sun}) 또는 Asc(${asc}) 위치를 근거로 오늘의 활동 · 집중 패턴 서술.  
- 길신(${lucky})과 연결된 작은 기회, 따뜻한 사람 혹은 행복의 단서 묘사.  
- 에너지 · 의욕 · 교류의 리듬 묘사.

## 🌇 Ⅲ. 저녁의 성찰 (Evening Reflection)
- Moon(${moon})의 별자리 또는 수기(水氣) 로 감정이 잔잔히 흐르는 시간 표현.  
- 하루의 감정 파도 가라앉는 순간, 고요 또는 감사의 톤을 중심으로.  
- 흉신(${unlucky})의 기운을 ‘균형과 성숙’의 상징으로 전환.

## 🌙 Ⅳ. 밤의 메시지 (Night Whisper)
- 오늘의 일운 (${todayInfo?.ganji ?? "-"}) 을 ‘하루의 마지막 시구’ 처럼 마무리.  
- “오늘이 건넨 짧은 시” 형태로 한 문장을 남기세요.  
  (예: ‘고요한 별빛 속에서도 마음은 자라난다.’ 와 같이.)

---

## ✨ 스타일 가이드
- 예언 아닌 감정 · 철학 · 리듬 체험으로 표현.  
- 🌞 🌿 🌕 🌙 이모지 활용 가능.  
- 각 시간대(아침→낮→저녁→밤)를 짧은 소제목 · 시적 문장 으로 구성.  
- 마지막은 ‘오늘 전체의 배운 균형 또는 감사’ 로 끝맺기.

─────────────────────────
${tone}
`;
}