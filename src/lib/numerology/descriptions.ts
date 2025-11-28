// src/lib/numerology/descriptions.ts
import { reduceToCore } from "./utils";

export type CoreKey = "lifePath" | "expression" | "soulUrge" | "personality";

const base: Record<number, { title: string; tagline: string; aura: string }> = {
  1: { title: "개척자", tagline: "스스로 길을 내는 선두의 힘.", aura: "강한 의지, 독립, 선명한 목표" },
  2: { title: "조율가", tagline: "사람과 사람 사이를 부드럽게 잇는다.", aura: "공감, 균형, 세심함" },
  3: { title: "스토리텔러", tagline: "아이디어에 숨을 불어넣는 표현자.", aura: "창의, 기쁨, 무드메이커" },
  4: { title: "건축가", tagline: "흔들리지 않는 기반 위의 성실.", aura: "체계, 신뢰, 루틴" },
  5: { title: "탐험가", tagline: "변화가 곧 산소.", aura: "자유, 전환, 속도감" },
  6: { title: "수호자", tagline: "돌봄과 책임으로 피어나는 따뜻함.", aura: "헌신, 미감, 조화" },
  7: { title: "현구자", tagline: "겉보다 속을 보는 통찰.", aura: "분석, 고독의 집중, 진리 탐구" },
  8: { title: "실행가", tagline: "비전을 성과로 전환한다.", aura: "리더십, 자원, 영향력" },
  9: { title: "완성자", tagline: "끝을 맺고, 다시 시작을 돕는다.", aura: "연민, 보편성, 봉사" },
  11:{ title: "비전너", tagline: "집단의 무의식을 비추는 등불.", aura: "직관, 영감, 카리스마" },
  22:{ title: "마스터 빌더", tagline: "아이디어를 세계의 구조로.", aura: "거대 구상, 조직, 실현력" },
  33:{ title: "마스터 힐러", tagline: "무조건적 사랑의 주파수.", aura: "치유, 교육, 헌신의 예술" },
};

function safeBase(n: unknown) {
  const r = reduceToCore(n);
  // base 키가 없을 일은 거의 없지만 방어
  return base[r] ?? base[1];
}

const templates: Record<CoreKey, (n: number) => string> = {
  lifePath: (n) => {
    const b = safeBase(n);
    return `당신의 여정은 ‘${b.title}’의 궤도입니다. ${b.tagline} 오늘의 선택이 장기적 구조를 만든다는 것을 기억하세요.`;
  },
  expression: (n) => {
    const b = safeBase(n);
    return `세상에 드러나는 재능은 ${b.title}의 언어를 사용합니다. 강점은 ${b.aura}. 협업에선 이 강점을 전면에 배치하세요.`;
  },
  soulUrge: (n) => {
    const b = safeBase(n);
    return `내면이 진짜로 원하는 건 ${b.tagline.toLowerCase()} 여기에 반응할 때 에너지 손실이 줄고, 일들이 자연스레 맞물립니다.`;
  },
  personality: (n) => {
    const b = safeBase(n);
    return `첫인상은 ${b.title}의 결을 띱니다. 사람들은 당신에게서 ${b.aura}를 감지합니다. 이 이미지를 전략적으로 활용해보세요.`;
  },
};

export function describe(core: CoreKey, n: number) {
  return templates[core](n);
}

export const luckyTag: Record<number, string> = {
  1: "시작·결단", 2: "조화·파트너십", 3: "표현·기쁨", 4: "구조·안정",
  5: "변화·이동", 6: "돌봄·책임", 7: "통찰·연구", 8: "성과·물질", 9: "완성·나눔",
  11:"영감·시그널", 22:"거대구현", 33:"치유·헌신",
};