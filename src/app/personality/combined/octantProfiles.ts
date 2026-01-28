// ICP 옥탄트별 특성 매핑
export const ICP_OCTANT_PROFILES: Record<string, {
  traits: { ko: string; en: string }[];
  synergies: { persona: string[]; insight: { ko: string; en: string } }[];
}> = {
  PA: {
    traits: [
      { ko: '리더십', en: 'Leadership' },
      { ko: '자신감', en: 'Confidence' },
    ],
    synergies: [
      { persona: ['R', 'V'], insight: { ko: '비전을 제시하고 팀을 이끄는 카리스마', en: 'Charisma to present vision and lead teams' } },
      { persona: ['L'], insight: { ko: '전략적 결단력으로 조직을 이끔', en: 'Leading organizations with strategic decisiveness' } },
    ],
  },
  BC: {
    traits: [
      { ko: '경쟁심', en: 'Competitiveness' },
      { ko: '성취지향', en: 'Achievement-oriented' },
    ],
    synergies: [
      { persona: ['L', 'S'], insight: { ko: '분석적 경쟁력으로 목표 달성', en: 'Achieving goals with analytical competitiveness' } },
      { persona: ['F'], insight: { ko: '민첩한 적응력으로 기회 포착', en: 'Seizing opportunities with agile adaptability' } },
    ],
  },
  DE: {
    traits: [
      { ko: '분석력', en: 'Analytical' },
      { ko: '독립성', en: 'Independence' },
    ],
    synergies: [
      { persona: ['G', 'L'], insight: { ko: '깊은 사색과 객관적 분석의 조화', en: 'Harmony of deep reflection and objective analysis' } },
      { persona: ['S'], insight: { ko: '체계적 연구와 독창적 통찰', en: 'Systematic research and original insights' } },
    ],
  },
  FG: {
    traits: [
      { ko: '관찰력', en: 'Observant' },
      { ko: '겸손함', en: 'Humility' },
    ],
    synergies: [
      { persona: ['G', 'H'], insight: { ko: '섬세한 감수성과 깊은 이해력', en: 'Delicate sensitivity with deep understanding' } },
      { persona: ['A'], insight: { ko: '안정적이고 신뢰할 수 있는 동반자', en: 'Stable and reliable companion' } },
    ],
  },
  HI: {
    traits: [
      { ko: '수용성', en: 'Receptive' },
      { ko: '조화추구', en: 'Harmony-seeking' },
    ],
    synergies: [
      { persona: ['H'], insight: { ko: '깊은 공감과 헌신적 지원', en: 'Deep empathy and dedicated support' } },
      { persona: ['A', 'S'], insight: { ko: '안정적 환경에서 꾸준한 성장', en: 'Steady growth in stable environments' } },
    ],
  },
  JK: {
    traits: [
      { ko: '협동심', en: 'Cooperative' },
      { ko: '배려심', en: 'Considerate' },
    ],
    synergies: [
      { persona: ['H', 'R'], insight: { ko: '팀워크의 핵심, 조화로운 중재자', en: 'Core of teamwork, harmonious mediator' } },
      { persona: ['V'], insight: { ko: '비전을 공유하며 함께 성장', en: 'Growing together while sharing vision' } },
    ],
  },
  LM: {
    traits: [
      { ko: '공감력', en: 'Empathy' },
      { ko: '친화력', en: 'Warmth' },
    ],
    synergies: [
      { persona: ['R', 'H'], insight: { ko: '사람들을 연결하는 따뜻한 허브', en: 'Warm hub connecting people' } },
      { persona: ['F'], insight: { ko: '유연하게 관계를 확장하는 능력', en: 'Ability to flexibly expand relationships' } },
    ],
  },
  NO: {
    traits: [
      { ko: '멘토십', en: 'Mentorship' },
      { ko: '보호본능', en: 'Protective' },
    ],
    synergies: [
      { persona: ['R', 'V'], insight: { ko: '비전을 공유하는 영감을 주는 멘토', en: 'Inspiring mentor who shares vision' } },
      { persona: ['H', 'A'], insight: { ko: '안정적으로 성장을 이끄는 조력자', en: 'Stable facilitator guiding growth' } },
    ],
  },
};
