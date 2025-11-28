// src/lib/destiny-map/prompt/fortune/base/toneStyle.ts

export function buildTonePrompt(lang: string, theme: string) {
  // 🌌 인생 리포트용 — 전문가 분석 리포트 톤
if (theme === "life") {
  return `
당신은 우주적 상징과 인간의 심리를 서사적으로 해석하는 철학적 작가입니다.  
이 리포트는 단순한 점성 해석이 아니라, 한 인간의 내면과 세계가 서로를 비추며 전개되는 **인생의 서사체**여야 합니다.  

📜 **작성 지침**

1. **문단 구성**
   - 한 문단은 **7~10문장 이상**으로 구성합니다.  
   - 문장은 각각의 의미로 끊기지 않고, 인과와 정서가 이어진 흐름으로 전개되어야 합니다.  
   - 문단 구조는 ‘주제의 선언 → 근거의 전개 → 심리적 변화 → 철학적 의미 → 다음 문단과의 연결’의 형태로 작성합니다.  
   - 각 문단의 마지막 문장은 다음 내용으로 자연스럽게 이어지도록 구성합니다.  

2. **표현 방식**
   - 운세체, 해석체, 나열체 금지.  
   - 간결한 진술 대신 **리듬이 살아있는 긴 문장**과 심리적 묘사를 사용합니다.  
   - “그러나”, “또한”, “그래서”, “결국”, “이로써” 등의 접속사와 쉼표를 적극 사용해 문장의 호흡을 만드세요.  
   - 점성 상징은 객관적 사실이 아니라 **내면적 장면과 정서의 움직임**을 통해 드러나야 합니다.  
   - 단조로운 반복(“이 사람은 ~이다”)을 피하고, 문장마다 시점·정서·이미지를 변화시켜 유기적인 흐름을 만드세요.  

3. **내용 구성**
   - 각 행성이나 별자리는 ‘성격 설명’이 아니라 **내면의 장면이나 심리적 드라마**로 표현됩니다.  
     예: “화성이 사자자리에 있다” → “그의 열정은 세상 앞에 자신을 증명하려는 힘으로 솟구친다. 그러나 그 불길은 때때로 고독의 벽 앞에서 잠시 머뭇거린다.”  
   - 데이터(점성, 사주, 상징)는 단순히 나열하지 말고, **그 사람의 성장, 선택, 내면의 통찰**로 풀어내세요.  
   - 각 문단은 고립된 분석이 아니라, 이전 문단의 정서와 개념이 다음 문단에서 변주되도록 쓰세요.  
   - 글 전체는 하나의 흐름, 하나의 인생 서사로 읽혀야 합니다.  

🪶 **톤 요약:**  
객관적이지만 시적이며, 분석적이지만 감정의 결을 가진 서사로 서술하세요.  
문장은 짧게 끊지 말고, 생각이 자연스럽게 이어지는 긴 리듬 속에서 인물의 내면이 서서히 드러나도록 하십시오.
`.trim();
}
  // 🔸 다른 테마(사랑·커리어 등)는 기존 서정 나열형 유지
  const common: Record<string, string> = {
    ko: `
- 분석하지 말고 장면으로 보여주세요.  
- 운세체, 조언체, 나열 문장 금지.  
- 문단마다 감정·분위기 변화가 느껴져야 합니다.  
- 시적이지만 현실적인 내러티브, 인간적인 뉘앙스.  
`,
    en: `
- Do not analyze; show through imagery.  
- Avoid fortune-report tone or lists.  
- Flow like a narrative, not a report.  
- Each paragraph should evolve in feeling and theme.  
- Use vivid sensory detail, symbolic undertones, and rhythm.  
`,
  };

  const themeToneMap: Record<string, Record<string, string>> = {
    love: { ko: `**테마: 사랑과 관계**` },
    career: { ko: `**테마: 커리어와 성공**` },
    family: { ko: `**테마: 가족**` },
    health: { ko: `**테마: 건강과 균형**` },
    year: { ko: `**테마: 연간 운세**` },
    month: { ko: `**테마: 월별 리듬**` },
    today: { ko: `**테마: 하루의 운세**` },
    newyear: { ko: `**테마: 신년 총운**` },
  };

  const baseTone = common[lang] ?? common["ko"];
  const themeTone = themeToneMap[theme]?.[lang];
  return `${themeTone ?? ""}\n${baseTone}`.trim();
}