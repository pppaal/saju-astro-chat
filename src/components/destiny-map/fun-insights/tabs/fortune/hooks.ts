// src/components/destiny-map/fun-insights/tabs/fortune/hooks.ts

import { elementTraits } from '../../data';
import type { SajuDataExtended, YearFortune, MonthFortune, TodayFortune } from './types';
import { getStemElement } from './utils';
import { DM_ELEMENTS } from './constants';

interface UseYearFortuneParams {
  sajuExt: SajuDataExtended | undefined;
  dayMasterName: string;
  dayElement: string | undefined;
  isKo: boolean;
}

export function calculateYearFortune({ sajuExt, dayMasterName, dayElement, isKo }: UseYearFortuneParams): YearFortune | null {
  if (!sajuExt?.unse?.annual || !Array.isArray(sajuExt.unse.annual) || sajuExt.unse.annual.length === 0) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const thisYearUnse = sajuExt.unse.annual.find((a) => a.year === currentYear) ?? sajuExt.unse.annual[0];
  if (!thisYearUnse) return null;

  const ganji = thisYearUnse.ganji || `${thisYearUnse.stem?.name || ""}${thisYearUnse.branch?.name || ""}`;
  const element = thisYearUnse.stem?.element || thisYearUnse.element || getStemElement(ganji);

  const getYearFortune = (el: string): { theme: string; desc: string; advice: string; emoji: string } => {
    const e = el.toLowerCase();
    if (e.includes("목") || e === "wood") return {
      theme: isKo ? "성장과 시작의 해 🌱" : "Year of Growth & Beginnings 🌱",
      desc: isKo
        ? "올해는 새싹이 땅을 뚫고 올라오는 해예요. 무언가를 시작하기에 최적의 타이밍이에요."
        : "This year is like a sprout breaking through soil. Perfect timing to start something.",
      advice: isKo
        ? "새로운 것을 시작하세요. 배움, 프로젝트, 관계... 뭐든 좋아요! 멈춰있으면 오히려 답답해지는 해예요."
        : "Start something new. Learning, projects, relationships... anything! Staying still will frustrate you this year.",
      emoji: "🌱"
    };
    if (e.includes("화") || e === "fire") return {
      theme: isKo ? "열정과 표현의 해 🔥" : "Year of Passion & Expression 🔥",
      desc: isKo
        ? "올해는 당신이 빛나는 해예요. 존재감을 드러내고 적극적으로 움직일 때 기회가 와요."
        : "This year is when you shine. Opportunities come when you show presence and move actively.",
      advice: isKo
        ? "숨지 말고 드러내세요! 자기 PR, 네트워킹, 발표... 밖으로 나갈수록 기회가 와요."
        : "Don't hide—show yourself! Self-PR, networking, presentations... more outside = more opportunities.",
      emoji: "🔥"
    };
    if (e.includes("토") || e === "earth") return {
      theme: isKo ? "안정과 기반의 해 🏔️" : "Year of Stability & Foundation 🏔️",
      desc: isKo
        ? "올해는 기반을 다지는 해예요. 화려하진 않지만 단단해지는 시간이에요."
        : "This year is for building foundation. Not flashy, but you become solid.",
      advice: isKo
        ? "급하게 가지 마세요. 기반을 다지고, 관계를 정리하고, 내실을 채우세요."
        : "Don't rush. Build foundation, organize relationships, strengthen your core.",
      emoji: "🏔️"
    };
    if (e.includes("금") || e === "metal") return {
      theme: isKo ? "결실과 정리의 해 ⚔️" : "Year of Harvest & Organization ⚔️",
      desc: isKo
        ? "올해는 수확의 해예요. 지금까지 쌓아온 것들이 결과로 나타나요."
        : "This year is harvest time. What you've built shows results.",
      advice: isKo
        ? "지금까지 한 것들이 결실을 맺어요. 마무리, 수확, 정산의 시기예요."
        : "Your past efforts bear fruit. Time for finishing, harvesting, settling.",
      emoji: "⚔️"
    };
    if (e.includes("수") || e === "water") return {
      theme: isKo ? "준비와 지혜의 해 💧" : "Year of Preparation & Wisdom 💧",
      desc: isKo
        ? "올해는 물처럼 깊어지는 해예요. 겉으로 드러나진 않지만 내면이 성장해요."
        : "This year you deepen like water. Not visible outside, but inner growth happens.",
      advice: isKo
        ? "겉으로 드러나진 않지만 내면이 깊어지는 해예요. 공부, 계획, 성찰의 시기예요."
        : "Inner depth grows though not visible. Study, plan, reflect... preparation time for next leap.",
      emoji: "💧"
    };
    const dayElTrait = dayElement ? elementTraits[dayElement] : undefined;
    return {
      theme: isKo ? "변화와 적응의 해 🔄" : "Year of Change & Adaptation 🔄",
      desc: isKo
        ? `당신의 ${dayElTrait?.ko || ""} 에너지와 올해의 기운이 만나 새로운 변화가 시작돼요.`
        : `Your ${dayElTrait?.en || ""} energy meets this year's energy, starting new changes.`,
      advice: isKo
        ? "올해는 변화의 흐름을 받아들이는 것이 핵심이에요. 유연하게 대응하세요."
        : "The key this year is accepting the flow of change. Respond flexibly to situations.",
      emoji: "🔄"
    };
  };

  const getYearRelation = (dm: string, yearEl: string) => {
    const myEl = DM_ELEMENTS[dm] || "";
    const el = yearEl.toLowerCase();

    if (myEl === el || el.includes(myEl)) {
      return {
        relation: isKo ? "비겁(동료)의 해" : "Year of Peers",
        impact: isKo ? "같은 에너지가 만나는 해예요. 경쟁도 있지만 동료와 함께 성장할 수 있어요." : "Same energy meets. Competition exists, but you can grow with peers.",
        focus: isKo ? "협력과 경쟁의 균형" : "Balance cooperation and competition",
        caution: isKo ? "과도한 경쟁심, 지나친 고집" : "Excessive competitiveness, stubbornness"
      };
    }

    const relations: Record<string, { relation: string; impact: string; focus: string; caution: string }> = {
      "wood-fire": { relation: isKo ? "식상(표현)의 해" : "Year of Expression", impact: isKo ? "당신의 아이디어가 꽃피는 해예요." : "Your ideas bloom this year.", focus: isKo ? "창의적 표현, 재능 발휘" : "Creative expression", caution: isKo ? "에너지 과소비" : "Energy overuse" },
      "fire-earth": { relation: isKo ? "식상(표현)의 해" : "Year of Expression", impact: isKo ? "열정이 결과물로 이어져요." : "Passion leads to results.", focus: isKo ? "프로젝트 완성" : "Complete projects", caution: isKo ? "과욕" : "Greed" },
      "wood-earth": { relation: isKo ? "재성(재물)의 해" : "Year of Wealth", impact: isKo ? "돈과 관련된 움직임이 많아요." : "Many money-related movements.", focus: isKo ? "재테크, 사업" : "Finance, business", caution: isKo ? "무리한 투자" : "Reckless investment" },
      "fire-metal": { relation: isKo ? "재성(재물)의 해" : "Year of Wealth", impact: isKo ? "열정이 돈으로 이어질 수 있어요." : "Passion can lead to money.", focus: isKo ? "수익 창출" : "Generate income", caution: isKo ? "급한 투자" : "Hasty investment" },
      "wood-metal": { relation: isKo ? "관성(시험)의 해" : "Year of Tests", impact: isKo ? "시험대에 오르는 해예요." : "A year of tests.", focus: isKo ? "실력 증명" : "Prove skills", caution: isKo ? "과도한 스트레스" : "Excessive stress" },
      "fire-water": { relation: isKo ? "관성(시험)의 해" : "Year of Tests", impact: isKo ? "열정이 시험받는 해예요." : "Passion is tested.", focus: isKo ? "인내, 실력 향상" : "Patience, skill improvement", caution: isKo ? "감정적 대응" : "Emotional reactions" },
      "fire-wood": { relation: isKo ? "인성(도움)의 해" : "Year of Support", impact: isKo ? "귀인이 나타나는 해예요." : "Helpful people appear.", focus: isKo ? "공부, 멘토 찾기" : "Study, find mentors", caution: isKo ? "의존, 게으름" : "Dependence, laziness" },
      "earth-fire": { relation: isKo ? "인성(도움)의 해" : "Year of Support", impact: isKo ? "따뜻한 지원을 받는 해예요." : "Receive warm support.", focus: isKo ? "관계 강화" : "Strengthen relationships", caution: isKo ? "수동적 태도" : "Passive attitude" }
    };

    const targetEl = el.includes("wood") ? "wood" : el.includes("fire") ? "fire" : el.includes("earth") ? "earth" : el.includes("metal") ? "metal" : "water";
    const key = `${myEl}-${targetEl}`;

    return relations[key] || {
      relation: isKo ? "변화의 해" : "Year of Change",
      impact: isKo ? "새로운 에너지가 들어오는 해예요." : "New energy enters this year.",
      focus: isKo ? "유연하게 대응하기" : "Respond flexibly",
      caution: isKo ? "과도한 변화" : "Excessive change"
    };
  };

  return {
    year: currentYear,
    ganji,
    fortune: getYearFortune(element),
    relation: getYearRelation(dayMasterName, element)
  };
}

interface UseMonthFortuneParams {
  sajuExt: SajuDataExtended | undefined;
  isKo: boolean;
}

export function calculateMonthFortune({ sajuExt, isKo }: UseMonthFortuneParams): MonthFortune | null {
  if (!sajuExt?.unse?.monthly || !Array.isArray(sajuExt.unse.monthly) || sajuExt.unse.monthly.length === 0) {
    return null;
  }

  const currentMonth = new Date().getMonth() + 1;
  const thisMonthUnse = sajuExt.unse.monthly.find((m) => m.month === currentMonth) ?? sajuExt.unse.monthly[0];
  if (!thisMonthUnse) return null;

  const ganji = thisMonthUnse.ganji || `${thisMonthUnse.stem?.name || ""}${thisMonthUnse.branch?.name || ""}`;
  const element = thisMonthUnse.stem?.element || thisMonthUnse.element || getStemElement(ganji);

  const getMonthFortune = (el: string): { theme: string; advice: string; emoji: string } => {
    const e = el.toLowerCase();
    if (e.includes("목") || e.includes("wood")) return {
      theme: isKo ? "활동적인 달" : "Active Month",
      advice: isKo ? "움직이세요! 새로운 만남, 시작, 도전이 좋아요." : "Get moving! New meetings, beginnings, challenges are good.",
      emoji: "🌿"
    };
    if (e.includes("화") || e.includes("fire")) return {
      theme: isKo ? "주목받는 달" : "Spotlight Month",
      advice: isKo ? "사람들 앞에 서세요. 당신의 매력이 빛나는 달이에요." : "Step in front of people. Your charm shines this month.",
      emoji: "✨"
    };
    if (e.includes("토") || e.includes("earth")) return {
      theme: isKo ? "안정의 달" : "Stable Month",
      advice: isKo ? "무리하지 마세요. 기존 것을 유지하고 다지는 게 좋아요." : "Don't overdo it. Maintain and strengthen what you have.",
      emoji: "🏠"
    };
    if (e.includes("금") || e.includes("metal")) return {
      theme: isKo ? "정리의 달" : "Organizing Month",
      advice: isKo ? "결단이 필요해요. 미루던 일을 끝내고 정리하세요." : "Decisions are needed. Finish delayed tasks, organize.",
      emoji: "✂️"
    };
    if (e.includes("수") || e.includes("water")) return {
      theme: isKo ? "충전의 달" : "Recharging Month",
      advice: isKo ? "쉬어가세요. 재충전하고 생각을 정리하기 좋은 때예요." : "Take a break. Good time to recharge and organize thoughts.",
      emoji: "🌙"
    };
    return {
      theme: isKo ? "흐름을 타는 달" : "Flow Month",
      advice: isKo ? "자연스럽게 흘러가세요." : "Go with the natural flow.",
      emoji: "🌊"
    };
  };

  const getMonthDetail = (el: string): { work: string; love: string; money: string; health: string } => {
    const e = el.toLowerCase();
    const monthDetails: Record<string, { work: string; love: string; money: string; health: string }> = {
      "wood": {
        work: isKo ? "새 프로젝트나 도전이 잘 풀려요." : "New projects and challenges go well.",
        love: isKo ? "새로운 만남이 기대돼요." : "New encounters await.",
        money: isKo ? "활동에 집중하세요. 돈은 따라와요." : "Focus on activity. Money follows.",
        health: isKo ? "운동하기 좋은 달이에요." : "Great month for exercise."
      },
      "fire": {
        work: isKo ? "발표나 미팅이 잘 돼요." : "Presentations and meetings go well.",
        love: isKo ? "분위기가 화끈해요." : "The mood is hot.",
        money: isKo ? "소비 욕구가 커져요. 계획적으로." : "Spending desire increases. Plan carefully.",
        health: isKo ? "심장과 혈압 관리하세요." : "Manage heart and blood pressure."
      },
      "earth": {
        work: isKo ? "기존 업무를 안정적으로 처리하세요." : "Handle existing work stably.",
        love: isKo ? "편안한 만남이 좋아요." : "Comfortable meetings are good.",
        money: isKo ? "저축하기 좋은 달이에요." : "Good month for saving.",
        health: isKo ? "소화기 관리하세요." : "Manage digestion."
      },
      "metal": {
        work: isKo ? "결정을 내려야 할 때예요." : "Time to make decisions.",
        love: isKo ? "관계를 정리할 시기예요." : "Time to organize relationships.",
        money: isKo ? "불필요한 지출을 정리하세요." : "Organize unnecessary spending.",
        health: isKo ? "호흡기와 피부를 관리하세요." : "Manage respiratory and skin health."
      },
      "water": {
        work: isKo ? "아이디어를 정리하고 계획을 세우세요." : "Organize ideas and make plans.",
        love: isKo ? "깊은 대화가 관계를 발전시켜요." : "Deep conversation develops relationships.",
        money: isKo ? "재정 상태를 점검하세요." : "Check financial status.",
        health: isKo ? "충분히 쉬세요." : "Rest well."
      }
    };

    const elKey = e.includes("wood") ? "wood" : e.includes("fire") ? "fire" : e.includes("earth") ? "earth" : e.includes("metal") ? "metal" : "water";
    return monthDetails[elKey] || monthDetails["earth"];
  };

  const monthNames = isKo
    ? ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return {
    month: currentMonth,
    monthName: monthNames[currentMonth - 1],
    ganji,
    fortune: getMonthFortune(element),
    detail: getMonthDetail(element)
  };
}

interface UseTodayFortuneParams {
  sajuExt: SajuDataExtended | undefined;
  isKo: boolean;
}

export function calculateTodayFortune({ sajuExt, isKo }: UseTodayFortuneParams): TodayFortune | null {
  if (!sajuExt?.unse?.iljin || !Array.isArray(sajuExt.unse.iljin) || sajuExt.unse.iljin.length === 0) {
    return null;
  }

  const today = new Date();
  const todayDate = today.getDate();
  const todayIljin = sajuExt.unse.iljin.find((i) => i.day === todayDate) ?? sajuExt.unse.iljin[0];
  if (!todayIljin) return null;

  const ganji = todayIljin.ganji || `${todayIljin.stem?.name || ""}${todayIljin.branch?.name || ""}`;
  const element = todayIljin.stem?.element || todayIljin.element || getStemElement(ganji);

  const getDayFortune = (el: string): { mood: string; tip: string; emoji: string; luckyTime: string } => {
    const e = el.toLowerCase();
    if (e.includes("목") || e.includes("wood")) return {
      mood: isKo ? "활기찬 하루! 새로운 시작 에너지가 넘쳐요." : "Energetic day! Full of new beginning energy.",
      tip: isKo ? "오늘은 적극적으로 움직이세요. 새로운 도전이 좋아요." : "Move actively today. New challenges are good.",
      emoji: "🌱",
      luckyTime: isKo ? "오전 7-9시" : "7-9 AM"
    };
    if (e.includes("화") || e.includes("fire")) return {
      mood: isKo ? "열정적인 하루! 표현하고 빛날 때예요." : "Passionate day! Time to express and shine.",
      tip: isKo ? "숨기지 말고 드러내세요. 당신의 매력이 통해요." : "Don't hide, show yourself. Your charm works.",
      emoji: "🔥",
      luckyTime: isKo ? "오전 11시-오후 1시" : "11 AM - 1 PM"
    };
    if (e.includes("토") || e.includes("earth")) return {
      mood: isKo ? "안정적인 하루! 기존 일을 마무리하기 좋아요." : "Stable day! Good for finishing existing work.",
      tip: isKo ? "급하게 움직이지 마세요. 차분히 정리하는 날이에요." : "Don't move hastily. It's a day for calm organizing.",
      emoji: "🏠",
      luckyTime: isKo ? "오후 1-3시" : "1-3 PM"
    };
    if (e.includes("금") || e.includes("metal")) return {
      mood: isKo ? "결단의 하루! 미루던 걸 끝낼 때예요." : "Day of decision! Time to finish what you've delayed.",
      tip: isKo ? "잘라낼 건 잘라내세요. 깔끔해지면 새 에너지가 와요." : "Cut what needs cutting. Clarity brings new energy.",
      emoji: "✂️",
      luckyTime: isKo ? "오후 3-5시" : "3-5 PM"
    };
    return {
      mood: isKo ? "직관적인 하루! 생각보다 느낌으로 가세요." : "Intuitive day! Go by feeling rather than thinking.",
      tip: isKo ? "물처럼 유연하게 흘러가세요. 억지로 밀어붙이지 마세요." : "Flow like water. Don't force things.",
      emoji: "💧",
      luckyTime: isKo ? "밤 9-11시" : "9-11 PM"
    };
  };

  return {
    ganji,
    fortune: getDayFortune(element)
  };
}
