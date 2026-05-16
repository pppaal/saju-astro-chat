/**
 * 12운성(十二運星) 해석.
 * 일간이 각 지지에서 거치는 생장-쇠퇴 12단계 — 장생·목욕·관대·건록·제왕·쇠·병·사·묘·절·태·양.
 *
 * personalityAnalyzer.ts 에 인라인된 `twelveStagePersonality` 는 한 줄짜리이며,
 * 본 파일은 같은 12단계에 대해 도메인별(성격·연애·직업·재물·건강·타이밍) 해석을 모두 제공한다.
 */

import type { BilingualText, TwelveStage } from '../../types/core';

export interface TwelveStageEntry {
  meaning: BilingualText;
  personality: BilingualText;
  love: BilingualText;
  career: BilingualText;
  wealth: BilingualText;
  health: BilingualText;
  timing: BilingualText;
}

export const TWELVE_STAGES: Record<TwelveStage, TwelveStageEntry> = {
  장생: {
    meaning: { ko: '새 생명이 태어나는 단계 — 신선·순수·시작', en: 'Birth stage — fresh, pure, beginning' },
    personality: {
      ko: '맑고 호기심 많으며 어디서나 사랑받는 순수한 에너지를 가졌어요.',
      en: 'Clear, curious, naturally lovable — a pure beginning energy.',
    },
    love: {
      ko: '연애에서도 새로움과 설렘을 추구하며 첫 만남이 잘 풀려요.',
      en: 'Pursues newness in love — first meetings flow well.',
    },
    career: {
      ko: '새 분야 학습·신사업·신규 프로젝트에 운이 강해요.',
      en: 'Strong luck in new fields, startups, and fresh projects.',
    },
    wealth: {
      ko: '씨앗을 심는 단계의 부 — 지금 시작이 중요해요.',
      en: 'Wealth at the seed stage — what you start now matters.',
    },
    health: {
      ko: '활력 좋지만 면역력 단련이 필요해요.',
      en: 'Strong vitality; train immunity.',
    },
    timing: {
      ko: '새 출발에 최적의 시기예요.',
      en: 'Optimal time for fresh starts.',
    },
  },
  목욕: {
    meaning: { ko: '아기를 씻기는 단계 — 변화·정화·시행착오', en: 'Bathing stage — change, purification, trial and error' },
    personality: {
      ko: '감수성이 풍부하고 변화에 민감하며, 자기 탐색의 시기를 자주 가져요.',
      en: 'Rich sensibility, sensitive to change — often in self-exploration.',
    },
    love: {
      ko: '감정 기복이 있고 변화가 많은 연애를 경험해요.',
      en: 'Mood swings and many shifts in love experiences.',
    },
    career: {
      ko: '직업 전환·이직·새 환경 적응의 변동기예요.',
      en: 'Time of career switches, job changes, adapting to new environments.',
    },
    wealth: {
      ko: '수입 변동성 큰 단계 — 비상금 확보가 우선이에요.',
      en: 'High income volatility — emergency fund first.',
    },
    health: {
      ko: '면역·피부·호르몬 변화에 주의해요.',
      en: 'Watch immunity, skin, and hormonal shifts.',
    },
    timing: {
      ko: '큰 결단보다 정리·재설계의 시기예요.',
      en: 'Time for tidying and redesign rather than big decisions.',
    },
  },
  관대: {
    meaning: { ko: '청년이 의관을 갖추는 단계 — 도전·확장·자립', en: 'Coming-of-age stage — challenge, expansion, independence' },
    personality: {
      ko: '자기 색이 분명해지고 사회에 자기 자리를 만들기 시작해요.',
      en: 'Self-color sharpens — begins carving own place in society.',
    },
    love: {
      ko: '진지한 관계와 결혼을 고민하는 시기예요.',
      en: 'Time to consider serious relationships and marriage.',
    },
    career: {
      ko: '실력이 인정받기 시작하고 책임 영역이 넓어져요.',
      en: 'Skills get recognized; responsibility broadens.',
    },
    wealth: {
      ko: '월급·고정 수익 외의 자기 수입원을 시도할 적기예요.',
      en: 'Right time to test income streams beyond salary.',
    },
    health: {
      ko: '체력 좋으나 무리한 야망 추구는 조심해요.',
      en: 'Vitality strong; beware overextending ambition.',
    },
    timing: {
      ko: '독립·이사·사업 시작에 유리한 흐름이에요.',
      en: 'Favorable flow for independence, moving, starting business.',
    },
  },
  건록: {
    meaning: { ko: '관직에 올라 녹을 받는 단계 — 실력 정점', en: 'Receiving stipend stage — peak of capability' },
    personality: {
      ko: '실력과 자존감이 단단해지고 자기 일에 자부심을 갖는 시기예요.',
      en: 'Skill and self-worth solid — pride in own work.',
    },
    love: {
      ko: '주도적이고 안정적인 관계를 끌어가는 힘이 있어요.',
      en: 'Drives stable, leading relationships.',
    },
    career: {
      ko: '본업 실적이 가장 잘 나오는 시기예요.',
      en: 'Period of strongest main-job performance.',
    },
    wealth: {
      ko: '본격 수입 확대와 자산 형성의 핵심 시기예요.',
      en: 'Core period for income growth and asset formation.',
    },
    health: {
      ko: '강한 체력이지만 과로·자만은 경계해요.',
      en: 'Strong physique; guard against overwork and complacency.',
    },
    timing: {
      ko: '큰 의사결정·승부수에 유리한 시기예요.',
      en: 'Favorable for big decisions and decisive moves.',
    },
  },
  제왕: {
    meaning: { ko: '왕의 자리에 오른 단계 — 권위·리더십·정점', en: 'Reaching the throne — authority, leadership, peak' },
    personality: {
      ko: '리더십이 최고조에 달하며 사람을 이끄는 무게감을 가져요.',
      en: 'Peak leadership — carries weight that moves people.',
    },
    love: {
      ko: '강한 주도력으로 관계를 끌어가지만, 자기 주장이 셀 수 있어요.',
      en: 'Leads relationships strongly; may dominate.',
    },
    career: {
      ko: '리더십과 영향력이 최고조 — 대표·임원·총괄 역할에 어울려요.',
      en: 'Leadership at peak — fits CEO, executive, head roles.',
    },
    wealth: {
      ko: '큰 자산과 큰 책임이 동시에 따라오는 단계예요.',
      en: 'Big assets and big responsibilities arrive together.',
    },
    health: {
      ko: '심혈관·고혈압·과로 누적 주의가 필요해요.',
      en: 'Watch cardiovascular, hypertension, accumulated overwork.',
    },
    timing: {
      ko: '내릴 결정의 무게가 가장 큰 시기예요.',
      en: 'Decisions carry their heaviest weight here.',
    },
  },
  쇠: {
    meaning: { ko: '정점에서 내려오는 단계 — 성숙·완숙·전환', en: 'Descending from peak — maturity, ripening, transition' },
    personality: {
      ko: '성숙해진 시야로 인생의 본질을 보는 안정형 단계예요.',
      en: 'Mature view — sees essence of life with calm.',
    },
    love: {
      ko: '깊고 안정된 관계를 맺으며 정서적 깊이가 늘어요.',
      en: 'Deep, stable bonds — emotional depth grows.',
    },
    career: {
      ko: '경험이 자산이 되고 후배 육성·자문 영역으로 확장돼요.',
      en: 'Experience becomes the asset — extends to mentoring and advising.',
    },
    wealth: {
      ko: '안정 자산 중심으로 재편하는 시기예요.',
      en: 'Time to rebalance toward stable assets.',
    },
    health: {
      ko: '체력 감소를 인지하고 운동·식단을 정비해요.',
      en: 'Acknowledge declining vitality — refit exercise and diet.',
    },
    timing: {
      ko: '확장보다 정리·심화에 유리한 시기예요.',
      en: 'Favors consolidation and deepening over expansion.',
    },
  },
  병: {
    meaning: { ko: '몸이 약해지는 단계 — 성찰·내면 전환', en: 'Body weakens — reflection, inner turn' },
    personality: {
      ko: '내면 탐구와 정서적 깊이가 깊어지는 사색 단계예요.',
      en: 'Inner inquiry deepens — contemplative stage.',
    },
    love: {
      ko: '관계 속 결핍과 욕망을 직시하며 정서적 재정비가 필요해요.',
      en: 'Faces gaps and desires within relationships — needs realignment.',
    },
    career: {
      ko: '본업의 한계를 느끼며 부업·연구·창작이 끌리는 시기예요.',
      en: 'Sense main-job limits — drawn to side work, research, creation.',
    },
    wealth: {
      ko: '큰 결정보다 안전 자산 보존이 우선이에요.',
      en: 'Safe-asset preservation over big bets.',
    },
    health: {
      ko: '면역·만성 피로·정신 건강 관리가 핵심이에요.',
      en: 'Immunity, chronic fatigue, mental health are key.',
    },
    timing: {
      ko: '쉼과 회복의 시간을 의도적으로 만들 시기예요.',
      en: 'Time to intentionally build rest and recovery.',
    },
  },
  사: {
    meaning: { ko: '에너지가 끝나는 단계 — 종료·해방·재탄생 준비', en: 'Energy ends — closure, release, preparing rebirth' },
    personality: {
      ko: '낡은 자아를 내려놓고 본질만 남기려는 정리형 단계예요.',
      en: 'Lays down old self — keeps only essence.',
    },
    love: {
      ko: '관계의 종결과 새로운 시작 사이를 통과하는 시기예요.',
      en: 'Passing through endings and new beginnings in love.',
    },
    career: {
      ko: '커리어 마무리·전환·새 길 모색의 시기예요.',
      en: 'Career wrap-up, transition, seeking new paths.',
    },
    wealth: {
      ko: '오랜 자산 구조를 점검하고 정리하는 시기예요.',
      en: 'Time to audit and clean up long-held asset structures.',
    },
    health: {
      ko: '깊은 휴식과 회복 처방이 필요해요.',
      en: 'Deep rest and recovery prescriptions needed.',
    },
    timing: {
      ko: '버려야 할 것을 정확히 버릴 때예요.',
      en: 'Time to release precisely what must go.',
    },
  },
  묘: {
    meaning: { ko: '에너지가 묻히는 단계 — 잠재·축적·재정비', en: 'Energy buried — latent potential, storing, regrouping' },
    personality: {
      ko: '겉으론 조용해도 내면에 큰 힘을 비축하는 침잠형 단계예요.',
      en: 'Quiet outside, storing great force within.',
    },
    love: {
      ko: '겉으로 드러나지 않는 비밀스러운 인연이 만들어져요.',
      en: 'Subtle, undisclosed bonds form.',
    },
    career: {
      ko: '드러나는 성과보다 내실 다지기·연구·기반 작업이 맞아요.',
      en: 'Inner-build, research, foundation work over visible output.',
    },
    wealth: {
      ko: '눈에 보이지 않는 자산(저축·지분·지식)을 모으는 시기예요.',
      en: 'Time to accumulate invisible assets — savings, equity, knowledge.',
    },
    health: {
      ko: '저장된 피로가 한 번에 터지지 않게 분산 관리해요.',
      en: 'Disperse stored fatigue so it does not burst at once.',
    },
    timing: {
      ko: '준비와 잠복의 시기 — 드러내지 말고 비축해요.',
      en: 'Preparation and dormancy — stockpile, do not display.',
    },
  },
  절: {
    meaning: { ko: '완전히 끊어진 단계 — 단절·재정의·잠재 폭발 직전', en: 'Severed completely — disconnection, redefinition, latent breakthrough' },
    personality: {
      ko: '경계 사이에 있어 변화에 가장 민감한 단계예요.',
      en: 'On the threshold — most sensitive to change.',
    },
    love: {
      ko: '오래된 관계가 끊기거나 운명적 만남이 갈리는 시기예요.',
      en: 'Old bonds break; fated meetings diverge.',
    },
    career: {
      ko: '직업·환경·역할이 단절되며 새로운 정체성을 찾는 시기예요.',
      en: 'Jobs, settings, roles sever — searching new identity.',
    },
    wealth: {
      ko: '낡은 수익 구조가 끊기고 새 모델을 설계할 때예요.',
      en: 'Old income models break — time to design new ones.',
    },
    health: {
      ko: '큰 변화 스트레스로 인한 자율신경 부담 주의가 필요해요.',
      en: 'Stress from big change strains the autonomic system.',
    },
    timing: {
      ko: '리셋의 시기 — 끝나야 새로 시작돼요.',
      en: 'Reset time — beginnings need this ending.',
    },
  },
  태: {
    meaning: { ko: '새 생명이 잉태되는 단계 — 씨앗·가능성·잠재력', en: 'New life conceived — seed, possibility, latency' },
    personality: {
      ko: '아직 형태는 없지만 잠재력이 가득한 새 시작점이에요.',
      en: 'No shape yet — but full of latent potential, a new starting point.',
    },
    love: {
      ko: '운명적 만남의 씨앗이 심어지는 시기예요.',
      en: 'Seeds of fated meetings are sown.',
    },
    career: {
      ko: '새로운 아이디어와 기획의 씨앗이 자라는 시기예요.',
      en: 'Seeds of new ideas and plans take root.',
    },
    wealth: {
      ko: '직접 수익보다 미래 자산이 될 종잣돈·관계·지식을 모아요.',
      en: 'Less immediate cash — gather seeds: capital, networks, knowledge.',
    },
    health: {
      ko: '면역·기초 체력 다지기에 집중해요.',
      en: 'Focus on immunity and base fitness.',
    },
    timing: {
      ko: '눈에 보이지 않는 시작이 만들어지는 잉태기예요.',
      en: 'Invisible beginnings are being conceived.',
    },
  },
  양: {
    meaning: { ko: '태아가 자라는 단계 — 양육·준비·임박', en: 'Fetus growing — nurturing, preparation, imminence' },
    personality: {
      ko: '안에서 무언가가 자라나는 기대 단계, 차분히 준비해요.',
      en: 'Something grows within — calm preparation stage.',
    },
    love: {
      ko: '곧 새로운 인연이 가시화될 준비 단계예요.',
      en: 'New bonds preparing to surface.',
    },
    career: {
      ko: '새 프로젝트·이직·창업의 준비가 무르익는 시기예요.',
      en: 'New projects, job moves, ventures ripening in preparation.',
    },
    wealth: {
      ko: '곧 수익화될 자산·인맥·계약의 준비기예요.',
      en: 'Preparation for assets, networks, contracts about to monetize.',
    },
    health: {
      ko: '체력 관리와 좋은 습관 정착이 가장 중요한 시기예요.',
      en: 'Fitness and habit-building matter most.',
    },
    timing: {
      ko: '곧 출현할 일을 위한 준비의 시기예요.',
      en: 'Prepare for what is about to emerge.',
    },
  },
};
