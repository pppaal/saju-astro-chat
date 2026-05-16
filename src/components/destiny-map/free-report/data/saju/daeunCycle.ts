/**
 * 대운(大運) 10년 사이클 해석.
 *
 * 대운은 10년마다 한 글자(천간/지지)가 바뀌며, 그 글자가 일간 대비 어떤 십신인지에 따라
 * 해당 10년의 인생 흐름이 결정된다. 본 파일은 십신 카테고리별 10년 흐름 해석을 제공한다.
 */

import type { BilingualText, SibsinCategory } from '../../types/core';

export interface DaeunCycleEntry {
  title: BilingualText;
  theme: BilingualText;
  career: BilingualText;
  relationships: BilingualText;
  wealth: BilingualText;
  health: BilingualText;
  caution: BilingualText;
  opportunity: BilingualText;
}

export const DAEUN_BY_SIBSIN: Record<SibsinCategory, DaeunCycleEntry> = {
  비겁: {
    title: { ko: '나의 시기 — 비겁운', en: 'Self Period — Bigup Cycle' },
    theme: {
      ko: '자기 색을 분명히 하고 자기 길을 가는 10년이에요.',
      en: 'A decade of clarifying your color and walking your own path.',
    },
    career: {
      ko: '독립·이직·창업·전문성 강화에 유리해요.',
      en: 'Favors independence, job changes, founding, deepening expertise.',
    },
    relationships: {
      ko: '동료·친구가 많아지지만, 친구와 돈이 얽히면 문제가 돼요.',
      en: 'Peers and friends multiply — money tangled with friends becomes a problem.',
    },
    wealth: {
      ko: '큰 수입 변동이 있을 수 있어 분산 관리가 필수예요.',
      en: 'Big income swings possible — diversified management essential.',
    },
    health: {
      ko: '과로·번아웃·자기 한계 무시에 주의해요.',
      en: 'Watch overwork, burnout, ignoring own limits.',
    },
    caution: {
      ko: '동업·공동 명의 계약은 신중히 검토하세요.',
      en: 'Vet partnerships and joint contracts carefully.',
    },
    opportunity: {
      ko: '자기 이름으로 무언가를 시작할 적기예요.',
      en: 'Right time to start something under your own name.',
    },
  },
  식상: {
    title: { ko: '표현의 시기 — 식상운', en: 'Expression Period — Siksang Cycle' },
    theme: {
      ko: '재능과 매력을 세상에 풀어내는 10년이에요.',
      en: 'A decade to release talent and charm into the world.',
    },
    career: {
      ko: '창작·교육·콘텐츠·서비스 영역에서 두각을 보여요.',
      en: 'Stands out in creation, education, content, service.',
    },
    relationships: {
      ko: '연애·자녀운이 강하고, 새로운 만남이 활발해요.',
      en: 'Love and child-luck strong; new encounters active.',
    },
    wealth: {
      ko: '재능과 표현이 직접 수입으로 연결되는 흐름이에요.',
      en: 'Talent and expression flow directly into income.',
    },
    health: {
      ko: '구강·갑상선·소화기·과식 관리가 필요해요.',
      en: 'Watch oral, thyroid, digestion, overeating.',
    },
    caution: {
      ko: '말과 SNS 표현이 구설을 부를 수 있으니 정중하게.',
      en: 'Speech and SNS may invite gossip — stay courteous.',
    },
    opportunity: {
      ko: '브랜드·이름·작품을 만들어 발표하기에 최적기예요.',
      en: 'Optimal for building brand, name, work — and releasing it.',
    },
  },
  재성: {
    title: { ko: '결실의 시기 — 재성운', en: 'Harvest Period — Jaeseong Cycle' },
    theme: {
      ko: '돈·관계·결과로 자기를 증명하는 10년이에요.',
      en: 'A decade to prove yourself through money, relationships, outcomes.',
    },
    career: {
      ko: '사업·영업·투자·실적 중심의 일에서 성과가 나요.',
      en: 'Results in business, sales, investment, performance-centric work.',
    },
    relationships: {
      ko: '남자에겐 결혼·배우자 운, 여자에겐 시댁·아버지 관련 일이 부각돼요.',
      en: 'For men: marriage and spouse luck; for women: in-laws and father-related affairs surface.',
    },
    wealth: {
      ko: '인생 통틀어 가장 큰 부의 흐름이 만들어질 수 있어요.',
      en: 'Lifetime\'s largest wealth flow may form here.',
    },
    health: {
      ko: '과로·과식·간 부담을 조심해야 해요.',
      en: 'Watch overwork, overeating, liver strain.',
    },
    caution: {
      ko: '큰돈을 다룰수록 사람을 더 조심히 보세요.',
      en: 'The bigger the money, the closer the look at people.',
    },
    opportunity: {
      ko: '자산 구조를 다지고 부동산·사업을 본격화할 적기예요.',
      en: 'Right time to firm asset structure, scale property and business.',
    },
  },
  관성: {
    title: { ko: '책임의 시기 — 관성운', en: 'Responsibility Period — Gwanseong Cycle' },
    theme: {
      ko: '직위·역할·약속으로 자기 격을 올리는 10년이에요.',
      en: 'A decade to elevate your standing through position, role, promises.',
    },
    career: {
      ko: '승진·합격·자격 취득·직책 확대 운이 강해요.',
      en: 'Strong luck in promotion, exams, certifications, expanding roles.',
    },
    relationships: {
      ko: '여자에겐 결혼·배우자 운, 남자에겐 직장·자녀 관련 일이 부각돼요.',
      en: 'For women: marriage and spouse luck; for men: work and child-related affairs surface.',
    },
    wealth: {
      ko: '직위와 연동된 안정적 수입 흐름이 만들어져요.',
      en: 'Stable income flow tied to position is created.',
    },
    health: {
      ko: '스트레스성 두통·고혈압·소화 부담 관리가 필요해요.',
      en: 'Watch stress headaches, hypertension, digestive load.',
    },
    caution: {
      ko: '책임을 떠안되 모든 짐을 혼자 지지는 마세요.',
      en: 'Take responsibility — but do not carry every load alone.',
    },
    opportunity: {
      ko: '사회적 명예와 신뢰를 쌓을 절호의 시기예요.',
      en: 'Prime time to build social honor and trust.',
    },
  },
  인성: {
    title: { ko: '배움과 회복의 시기 — 인성운', en: 'Learning & Recovery Period — Inseong Cycle' },
    theme: {
      ko: '공부·연구·내면 회복으로 깊이를 더하는 10년이에요.',
      en: 'A decade of deepening through study, research, inner recovery.',
    },
    career: {
      ko: '학위·자격증·전문성·연구·교육 분야에서 도약해요.',
      en: 'Leaps in degrees, certifications, expertise, research, education.',
    },
    relationships: {
      ko: '어머니·스승·멘토와의 인연이 운을 좌우해요.',
      en: 'Bonds with mother, teacher, mentor steer fortune.',
    },
    wealth: {
      ko: '큰 수익보다 안정적·장기적 자산 보존에 유리해요.',
      en: 'Favors stable, long-term preservation over big returns.',
    },
    health: {
      ko: '신장·갑상선·자율신경·만성 피로 관리가 필요해요.',
      en: 'Watch kidneys, thyroid, autonomic nerves, chronic fatigue.',
    },
    caution: {
      ko: '결정을 미루는 습관이 운을 막을 수 있어요.',
      en: 'Habitual decision-postponement can block fortune.',
    },
    opportunity: {
      ko: '평생 무기가 될 한 가지 분야의 전문성을 쌓을 적기예요.',
      en: 'Right time to build the one expertise that becomes your lifetime weapon.',
    },
  },
};
