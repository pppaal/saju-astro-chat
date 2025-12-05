// src/lib/numerology/descriptions.ts
// Human-readable texts for numerology readings. Logic untouched; only cleaned strings.
import { reduceToCore } from "./utils";

export type CoreKey = "lifePath" | "expression" | "soulUrge" | "personality";

const base: Record<number, { title: string; tagline: string; aura: string }> = {
  1: { title: "선도자", tagline: "앞장서서 개척하며 주도권을 쥡니다.", aura: "독립적, 결단력, 추진력" },
  2: { title: "조율가", tagline: "협력과 조화를 중시하며 관계를 다룹니다.", aura: "배려, 조화, 섬세함" },
  3: { title: "창조자", tagline: "표현력과 창의성을 통해 메시지를 전합니다.", aura: "창의, 낙천, 소통" },
  4: { title: "안정가", tagline: "구조와 시스템을 만들며 신뢰를 줍니다.", aura: "근면, 실용, 책임" },
  5: { title: "모험가", tagline: "변화와 자유를 추구하며 경험으로 성장합니다.", aura: "자유, 적응, 호기심" },
  6: { title: "보호자", tagline: "돌봄과 조화를 추구하며 공동체를 챙깁니다.", aura: "헌신, 조화, 따뜻함" },
  7: { title: "탐구자", tagline: "깊이 있는 분석과 통찰로 본질을 찾습니다.", aura: "분석, 직관, 사색" },
  8: { title: "실행가", tagline: "목표 달성과 성취에 집중합니다.", aura: "야망, 조직, 영향력" },
  9: { title: "인도자", tagline: "포용과 봉사로 큰 그림을 봅니다.", aura: "이타, 포용, 비전" },
  11:{ title: "영감가", tagline: "직관과 영감을 통해 비전을 제시합니다.", aura: "직관, 영감, 카리스마" },
  22:{ title: "마스터 빌더", tagline: "큰 비전을 현실로 구축합니다.", aura: "실행, 구조, 영향력" },
  33:{ title: "마스터 치유자", tagline: "헌신과 치유로 큰 울림을 만듭니다.", aura: "헌신, 치유, 자비" },
};

function safeBase(n: unknown) {
  const r = reduceToCore(n);
  return base[r] ?? base[1];
}

const templates: Record<CoreKey, (n: number) => string> = {
  lifePath: (n) => {
    const b = safeBase(n);
    return `당신의 라이프 패스는 ${b.title}입니다. ${b.tagline} ${b.aura} 에너지가 두드러집니다.`;
  },
  expression: (n) => {
    const b = safeBase(n);
    return `표현/데스티니 넘버는 ${b.title}입니다. 타고난 재능과 잠재력이 ${b.aura} 성향으로 드러납니다.`;
  },
  soulUrge: (n) => {
    const b = safeBase(n);
    return `소울 어지(Heart's Desire)는 ${b.title}입니다. 내면의 동기와 욕구가 ${b.tagline.toLowerCase()} 방향으로 흐릅니다.`;
  },
  personality: (n) => {
    const b = safeBase(n);
    return `퍼스낼리티 넘버는 ${b.title}입니다. 외부에 비치는 인상은 ${b.aura} 성향이 강합니다.`;
  },
};

export function describe(core: CoreKey, n: number) {
  return templates[core](n);
}

export const luckyTag: Record<number, string> = {
  1: "주도·새로운 시작", 2: "협력·균형", 3: "창의·소통", 4: "안정·성실",
  5: "변화·자유", 6: "돌봄·책임", 7: "통찰·연구", 8: "성취·권위",
  9: "포용·완성", 11:"영감·직관", 22:"구축·리더십", 33:"헌신·치유",
};
