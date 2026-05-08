// 개인화된 어드바이스 생성기 - 사주 요소 조합 + 조건부 변형
import type { SajuData, AstroData } from '../types'
import { eulReul } from '@/lib/i18n/koParticle'

interface PersonalizedAdvice {
  emoji: string
  title: { ko: string; en: string }
  summary: { ko: string; en: string }
  detail: { ko: string; en: string }
  source?: string // 어떤 요소에서 도출되었는지
}

// 십신 분포 추출
function getSibsinDistribution(saju: SajuData | undefined): Record<string, number> {
  return saju?.advancedAnalysis?.sibsin?.sibsinDistribution || {}
}

// 가장 강한 십신 찾기
function getDominantSibsin(saju: SajuData | undefined): string | null {
  const dist = getSibsinDistribution(saju)
  const entries = Object.entries(dist)
  if (entries.length === 0) {
    return null
  }
  const sorted = entries.sort(([, a], [, b]) => b - a)
  return sorted[0]?.[0] || null
}

// 오행 비율 추출
function getElementRatios(saju: SajuData | undefined): { element: string; ratio: number }[] {
  const elements = saju?.fiveElements || {}
  const total = Object.values(elements).reduce((a, b) => (a as number) + (b as number), 0) as number
  if (total === 0) {
    return []
  }

  return Object.entries(elements)
    .map(([el, val]) => ({ element: el, ratio: Math.round(((val as number) / total) * 100) }))
    .sort((a, b) => b.ratio - a.ratio)
}

// 신살 추출
function getSinsalList(saju: SajuData | undefined): string[] {
  const sinsal = saju?.sinsal
  const shinsal = saju?.shinsal
  const result: string[] = []

  if (sinsal?.luckyList) {
    result.push(...sinsal.luckyList.map((s) => s.name))
  }
  if (sinsal?.unluckyList) {
    result.push(...sinsal.unluckyList.map((s) => s.name))
  }
  if (Array.isArray(shinsal)) {
    result.push(...shinsal.map((s) => s.name || '').filter(Boolean))
  }

  return result
}

// 12운성 추출
function getTwelveStage(saju: SajuData | undefined): string | null {
  return saju?.twelveStages?.day || saju?.twelveStage || null
}

// 일간 추출
function getDayMaster(saju: SajuData | undefined): string | null {
  return saju?.dayMaster?.name || saju?.dayMaster?.heavenlyStem || null
}

// 십신별 개인화된 어드바이스
const sibsinAdvice: Record<string, PersonalizedAdvice> = {
  비겁: {
    emoji: '🏃',
    title: { ko: '경쟁을 두려워하지 마세요', en: "Don't fear competition" },
    summary: {
      ko: '당신의 경쟁심은 성장의 원동력이에요.',
      en: 'Your competitive spirit drives growth.',
    },
    detail: {
      ko: "비겁이 강한 당신은 남들과 비교할 때 힘이 생겨요. 이건 나쁜 게 아니에요. 오히려 그 에너지를 자신과의 경쟁으로 바꿔보세요. '어제의 나보다 오늘의 나'가 되는 거예요. 혼자 잘하려고 하지 말고, 라이벌이 있으면 더 빨리 성장해요.",
      en: "With strong Bigyeok, you gain power when comparing with others. This isn't bad. Channel that energy into competing with yourself. 'Today's me vs yesterday's me.' Don't try to do it alone—having a rival helps you grow faster.",
    },
    source: 'sibsin',
  },
  식상: {
    emoji: '🎨',
    title: { ko: '표현하지 않으면 병이 돼요', en: 'Expression prevents illness' },
    summary: { ko: '창작과 표현이 당신의 치유예요.', en: 'Creation and expression heal you.' },
    detail: {
      ko: '식상이 강한 당신은 머릿속에 아이디어가 끊이지 않아요. 그걸 밖으로 안 내보내면 답답해서 미쳐요. 글이든, 그림이든, 말이든, 뭐든 좋아요. 일주일에 한 번은 창작 시간을 만드세요. SNS에 올리든, 일기를 쓰든, 노래를 부르든. 표현이 곧 에너지 정화예요.',
      en: 'With strong Siksang, ideas never stop flowing in your head. Not letting them out makes you stifled. Writing, drawing, talking—anything works. Make creative time weekly. Post on social media, write a diary, sing. Expression is energy purification.',
    },
    source: 'sibsin',
  },
  재성: {
    emoji: '💰',
    title: { ko: '돈이 따라오게 하세요', en: 'Let money follow you' },
    summary: { ko: '쫓지 말고 가치를 만드세요.', en: "Don't chase—create value." },
    detail: {
      ko: "재성이 강한 당신은 현실감각이 뛰어나요. 하지만 돈만 쫓으면 오히려 멀어져요. 당신이 진짜 잘하는 것, 사람들에게 도움이 되는 것에 집중하세요. 가치가 쌓이면 돈은 자연히 따라와요. 재물보다 '관계'가 먼저라는 것도 기억하세요. 인맥이 기회를 열어줘요.",
      en: "With strong Jaesung, you have excellent practical sense. But chasing only money pushes it away. Focus on what you're truly good at, what helps people. When value accumulates, money follows naturally. Remember 'relationships' come before wealth. Connections open opportunities.",
    },
    source: 'sibsin',
  },
  관성: {
    emoji: '👔',
    title: { ko: '명예보다 본질을 챙기세요', en: 'Pursue essence over status' },
    summary: { ko: '타이틀에 집착하면 본질을 잃어요.', en: 'Obsessing over titles loses essence.' },
    detail: {
      ko: "관성이 강한 당신은 사회적 인정을 중요하게 여겨요. 그건 좋은 동기부여가 돼요. 하지만 명함의 직함, 사람들의 평가에만 매달리면 정작 '나는 뭘 원하는가'를 놓쳐요. 가끔은 '아무도 안 볼 때도 내가 이 일을 할까?'라고 물어보세요. 그 답이 진짜 방향이에요.",
      en: "With strong Gwanseong, you value social recognition. That's good motivation. But clinging only to job titles and others' evaluations makes you lose 'what do I actually want?' Sometimes ask 'Would I do this if no one was watching?' That answer is your true direction.",
    },
    source: 'sibsin',
  },
  인성: {
    emoji: '📚',
    title: { ko: '배움을 실행으로 연결하세요', en: 'Connect learning to action' },
    summary: { ko: '알기만 하면 바뀌는 게 없어요.', en: 'Knowing without doing changes nothing.' },
    detail: {
      ko: "인성이 강한 당신은 배우는 것을 좋아해요. 강의도 듣고, 책도 읽고, 늘 뭔가를 공부해요. 하지만 '알기만 하고 안 하면' 아무것도 안 바뀌어요. 이번 주 배운 것 중 하나만 실행해보세요. 완벽하게 이해할 때까지 기다리지 말고요. 실행하면서 배우는 게 더 빨라요.",
      en: "With strong Insung, you love learning. Lectures, books, always studying something. But 'knowing without doing' changes nothing. Try executing just one thing you learned this week. Don't wait until you perfectly understand. Learning through doing is faster.",
    },
    source: 'sibsin',
  },
}

// 오행 극단적 상태별 어드바이스 (과다/부족)
const elementExtremeAdvice: Record<
  string,
  { excess: PersonalizedAdvice; deficient: PersonalizedAdvice }
> = {
  wood: {
    excess: {
      emoji: '🌳',
      title: { ko: '멈추는 것도 성장이에요', en: 'Stopping is also growth' },
      summary: { ko: '나무 기운이 과해요. 쉬어가세요.', en: 'Excess Wood energy. Take a break.' },
      detail: {
        ko: `나무 기운이 많아서 항상 뭔가를 시작하고 싶어해요. 새 프로젝트, 새 취미, 새 관계... 하지만 시작만 하고 마무리를 못 하면 에너지만 낭비돼요. 지금 하고 있는 것 하나에 집중하세요. '이것만 끝내고 다음'이라는 규칙을 세우면 오히려 더 많이 이뤄요.`,
        en: `High Wood energy makes you always want to start something new—projects, hobbies, relationships. But starting without finishing wastes energy. Focus on one thing you're doing now. Setting a rule of 'finish this, then next' actually achieves more.`,
      },
      source: 'element-excess',
    },
    deficient: {
      emoji: '🌱',
      title: { ko: '새로운 시작이 필요해요', en: 'You need new beginnings' },
      summary: { ko: '나무 기운을 보충하세요.', en: 'Replenish Wood energy.' },
      detail: {
        ko: `나무 기운이 부족해서 시작하는 게 어려워요. 귀찮고, 두렵고, 일단 미루게 돼요. 작은 것부터 시작하세요. 새로운 식당 가보기, 새 사람 만나기, 작은 취미 시작하기. 아침에 5분 스트레칭하는 것만으로도 '시작의 기운'이 살아나요. 초록색 아이템도 도움 돼요.`,
        en: `Low Wood energy makes starting things difficult. Annoying, scary, you procrastinate. Start small. Try a new restaurant, meet new people, start a small hobby. Even 5 minutes of morning stretching awakens 'starting energy.' Green items help too.`,
      },
      source: 'element-deficient',
    },
  },
  fire: {
    excess: {
      emoji: '🔥',
      title: { ko: '열정도 쉬어야 해요', en: 'Even passion needs rest' },
      summary: {
        ko: '불 기운이 과해요. 번아웃 조심.',
        en: 'Excess Fire energy. Watch for burnout.',
      },
      detail: {
        ko: `불 기운이 많아서 열정적이고 에너지 넘쳐요. 하지만 너무 화끈하게 달리면 빨리 타버려요. 번아웃 신호가 이미 오고 있을 수 있어요. 일주일에 하루는 아무것도 안 하는 날을 만드세요. 'Do Nothing Day'가 당신에게 가장 필요한 충전이에요.`,
        en: `High Fire energy makes you passionate and full of energy. But running too hot burns you out fast. Burnout signals may already be coming. Make one day a week a 'Do Nothing Day.' That's the recharge you need most.`,
      },
      source: 'element-excess',
    },
    deficient: {
      emoji: '✨',
      title: { ko: '열정의 불씨를 찾으세요', en: 'Find your passion spark' },
      summary: { ko: '불 기운을 보충하세요.', en: 'Replenish Fire energy.' },
      detail: {
        ko: `불 기운이 부족해서 무기력하고 의욕이 없어요. '뭘 해도 재미없다'는 느낌이 들 수 있어요. 예전에 가슴 뛰었던 것을 떠올려보세요. 오래된 친구 만나기, 좋아했던 음악 듣기, 취미 다시 시작하기. 사람들과 어울리는 시간이 불 기운을 살려줘요. 빨간색/주황색 아이템 추천.`,
        en: `Low Fire energy makes you lethargic and unmotivated. 'Nothing feels fun' may be how you feel. Recall what made your heart race before. Meet old friends, listen to favorite music, restart hobbies. Social time revives Fire energy. Red/orange items recommended.`,
      },
      source: 'element-deficient',
    },
  },
  earth: {
    excess: {
      emoji: '⛰️',
      title: { ko: '변화를 두려워하지 마세요', en: "Don't fear change" },
      summary: { ko: '흙 기운이 과해요. 유연해지세요.', en: 'Excess Earth energy. Be flexible.' },
      detail: {
        ko: `흙 기운이 많아서 안정을 추구해요. 하지만 너무 안전만 찾으면 기회를 놓쳐요. '이대로 괜찮을까?' 싶은 순간이 변화의 타이밍이에요. 익숙한 것을 조금씩 바꿔보세요. 출근 경로, 점심 메뉴, 주말 루틴... 작은 변화가 큰 변화를 만들어요.`,
        en: `High Earth energy makes you seek stability. But seeking only safety misses opportunities. When you think 'Is this really okay?' is the time for change. Change familiar things little by little—commute route, lunch menu, weekend routine. Small changes create big ones.`,
      },
      source: 'element-excess',
    },
    deficient: {
      emoji: '🏠',
      title: { ko: '안정의 기반을 만드세요', en: 'Build a stable foundation' },
      summary: { ko: '흙 기운을 보충하세요.', en: 'Replenish Earth energy.' },
      detail: {
        ko: `흙 기운이 부족해서 불안정하고 마음이 흔들려요. 뭔가에 뿌리내리는 느낌이 없어요. 규칙적인 생활이 답이에요. 정해진 시간에 자고, 정해진 시간에 먹고, 주변을 정리하세요. '루틴'이 당신에게 안전 기지가 돼요. 노란색/갈색 소품이 안정감을 줘요.`,
        en: `Low Earth energy makes you feel unstable and shaky. No feeling of being rooted. Regular life is the answer. Sleep at set times, eat at set times, organize surroundings. 'Routine' becomes your safe base. Yellow/brown items give stability.`,
      },
      source: 'element-deficient',
    },
  },
  metal: {
    excess: {
      emoji: '⚔️',
      title: { ko: '완벽주의를 내려놓으세요', en: 'Let go of perfectionism' },
      summary: {
        ko: '쇠 기운이 과해요. 그만해도 돼요.',
        en: "Excess Metal energy. It's okay to stop.",
      },
      detail: {
        ko: `쇠 기운이 많아서 스스로에게 엄격해요. '이 정도론 안 돼', '더 잘해야 해'가 입버릇이에요. 하지만 100점이 아니어도 괜찮아요. 80점으로 빨리 끝내고 다음으로 가는 게 100점 기다리다 아무것도 못 하는 것보다 나아요. 자신에게 좀 더 관대해지세요.`,
        en: `High Metal energy makes you strict with yourself. 'This isn't enough,' 'Must do better' are your phrases. But not being 100% is okay. Finishing quickly at 80% and moving on beats waiting for 100% and doing nothing. Be more generous with yourself.`,
      },
      source: 'element-excess',
    },
    deficient: {
      emoji: '🔔',
      title: { ko: '결단력을 키우세요', en: 'Build decisiveness' },
      summary: { ko: '쇠 기운을 보충하세요.', en: 'Replenish Metal energy.' },
      detail: {
        ko: `쇠 기운이 부족해서 결정을 못 내리고 우유부단해요. '이것도 좋고 저것도 좋고'하다가 아무것도 못 해요. 작은 결정부터 빨리 내리는 연습을 하세요. 메뉴 고를 때 3초 안에 결정, 옷 고를 때 5초 안에 결정. 결단력은 근육처럼 훈련할 수 있어요. 흰색/금속 소품 추천.`,
        en: `Low Metal energy makes you indecisive and wishy-washy. 'This is good, that's good too' leads to doing nothing. Practice making small decisions quickly. Choose menu in 3 seconds, pick clothes in 5 seconds. Decisiveness is a muscle you can train. White/metallic items recommended.`,
      },
      source: 'element-deficient',
    },
  },
  water: {
    excess: {
      emoji: '🌊',
      title: { ko: '생각만 하지 말고 움직이세요', en: 'Stop thinking, start moving' },
      summary: {
        ko: '물 기운이 과해요. 행동으로 옮기세요.',
        en: 'Excess Water energy. Take action.',
      },
      detail: {
        ko: `물 기운이 많아서 생각이 깊고 직관이 좋아요. 하지만 너무 머릿속에만 있으면 '분석 마비'에 빠져요. 완벽한 계획을 기다리지 마세요. 일단 시작하고 가면서 조정하세요. '생각 30%, 행동 70%' 비율로 바꿔보세요. 생각보다 행동이 답을 줘요.`,
        en: `High Water energy gives deep thinking and good intuition. But staying only in your head causes 'analysis paralysis.' Don't wait for perfect plans. Start and adjust as you go. Try '30% thinking, 70% action' ratio. Action gives answers more than thinking.`,
      },
      source: 'element-excess',
    },
    deficient: {
      emoji: '💧',
      title: { ko: '내면의 시간을 가지세요', en: 'Take inner time' },
      summary: { ko: '물 기운을 보충하세요.', en: 'Replenish Water energy.' },
      detail: {
        ko: `물 기운이 부족해서 직관이 약하고 너무 바삐 움직여요. 멈춰서 생각할 시간이 없어요. 하루에 10분만 조용히 혼자 있는 시간을 만드세요. 명상까지 아니어도, 그냥 멍때리는 것도 좋아요. 물 많이 마시고, 목욕하고, 자연 소리 듣기. 검정색/파란색 소품 추천.`,
        en: `Low Water energy weakens intuition and makes you rush too much. No time to stop and think. Make just 10 minutes of quiet alone time daily. Doesn't have to be meditation—spacing out works too. Drink lots of water, take baths, listen to nature sounds. Black/blue items recommended.`,
      },
      source: 'element-deficient',
    },
  },
}

// 신살별 특별 어드바이스
const sinsalAdvice: Record<string, PersonalizedAdvice> = {
  역마: {
    emoji: '🏃‍♂️',
    title: { ko: '움직여야 운이 열려요', en: 'Movement opens fortune' },
    summary: {
      ko: '역마살이 있어요. 여행과 이동이 행운.',
      en: 'You have Yeokma. Travel brings luck.',
    },
    detail: {
      ko: '역마살이 있는 당신은 한곳에 오래 있으면 답답해져요. 여행, 출장, 이사, 이직... 움직임이 있을 때 새로운 기회가 열려요. 일상에서도 자주 장소를 바꿔보세요. 카페 노마드, 주말 드라이브, 새로운 동네 탐험. 움직임이 곧 에너지예요.',
      en: 'With Yeokma, staying in one place too long feels stifling. Travel, business trips, moving, job changes—new opportunities open when you move. Change places often in daily life too. Café hopping, weekend drives, exploring new neighborhoods. Movement is energy.',
    },
    source: 'sinsal',
  },
  화개: {
    emoji: '🎭',
    title: { ko: '예술과 영성이 답이에요', en: 'Art and spirituality are answers' },
    summary: {
      ko: '화개살이 있어요. 창작과 명상이 필요.',
      en: 'You have Hwagae. Creation and meditation needed.',
    },
    detail: {
      ko: "화개살이 있는 당신은 보통 사람들과 다른 감수성을 가졌어요. 예술, 종교, 철학, 명상... 이런 것에 끌려요. 세상이 '현실적으로 살아라'고 해도 당신의 그 특별함을 무시하지 마세요. 창작 활동이나 영적 수행이 당신의 균형을 잡아줘요.",
      en: "With Hwagae, you have sensitivity different from ordinary people. Art, religion, philosophy, meditation... these attract you. Even when the world says 'be practical,' don't ignore your uniqueness. Creative activities or spiritual practice balance you.",
    },
    source: 'sinsal',
  },
  도화: {
    emoji: '🌸',
    title: { ko: '매력을 활용하세요', en: 'Use your charm' },
    summary: {
      ko: '도화살이 있어요. 인간관계가 무기.',
      en: 'You have Dohwa. Relationships are your weapon.',
    },
    detail: {
      ko: '도화살이 있는 당신은 자연스러운 매력이 있어요. 사람들이 끌려요. 이 에너지를 잘 활용하세요. 네트워킹, 영업, 서비스업... 사람을 상대하는 일에서 빛나요. 단, 관계에서 선을 잘 지키세요. 매력이 양날의 검이 될 수 있어요.',
      en: 'With Dohwa, you have natural charm. People are drawn to you. Use this energy well. Networking, sales, service industry... you shine in people-facing work. But keep clear boundaries in relationships. Charm can be a double-edged sword.',
    },
    source: 'sinsal',
  },
  귀문관: {
    emoji: '👁️',
    title: { ko: '직감을 믿되 검증하세요', en: 'Trust intuition but verify' },
    summary: {
      ko: '귀문관살이 있어요. 직감이 예민해요.',
      en: 'You have Gwimungwan. Your intuition is sharp.',
    },
    detail: {
      ko: '귀문관살이 있는 당신은 보이지 않는 것을 느끼는 능력이 있어요. 직감이 예리하고, 사람을 읽는 눈이 있어요. 그 느낌을 무시하지 마세요. 하지만 느낌만 믿고 결정하진 마세요. 직감 + 검증의 조합이 최강이에요.',
      en: "With Gwimungwan, you have ability to sense unseen things. Sharp intuition, eyes that read people. Don't ignore those feelings. But don't decide on feelings alone. Intuition + verification is the strongest combination.",
    },
    source: 'sinsal',
  },
}

// 12운성별 현재 상태 어드바이스
const twelveStageAdvice: Record<string, PersonalizedAdvice> = {
  장생: {
    emoji: '🌅',
    title: { ko: '지금이 시작의 때예요', en: 'Now is the time to start' },
    summary: { ko: '장생기 - 새로운 시작의 에너지.', en: 'Birth stage - New beginning energy.' },
    detail: {
      ko: '장생기의 당신은 새로운 시작의 에너지가 넘쳐요. 뭔가를 시작하기 좋은 때예요. 두려워하지 말고 시작하세요. 지금 뿌린 씨앗이 나중에 큰 열매가 돼요.',
      en: "In your birth stage, new beginning energy overflows. Great time to start something. Don't be afraid, just start. Seeds planted now become great fruits later.",
    },
    source: 'twelve-stage',
  },
  건록: {
    emoji: '💼',
    title: { ko: '실력을 마음껏 발휘하세요', en: 'Show your full ability' },
    summary: {
      ko: '건록기 - 능력 발휘의 전성기.',
      en: 'Prosperity stage - Peak performance time.',
    },
    detail: {
      ko: '건록기의 당신은 가장 안정적이고 실력이 발휘되는 시기예요. 자신감을 가지세요. 지금 하는 일에 집중하면 좋은 결과가 따라와요.',
      en: "In your prosperity stage, you're most stable and your abilities shine. Have confidence. Focus on what you're doing now and good results will follow.",
    },
    source: 'twelve-stage',
  },
  제왕: {
    emoji: '👑',
    title: { ko: '정점에서 겸손을 유지하세요', en: 'Stay humble at the peak' },
    summary: { ko: '제왕기 - 정점이지만 과용 주의.', en: 'Emperor stage - Peak but watch excess.' },
    detail: {
      ko: '제왕기의 당신은 에너지가 최고조예요. 뭘 해도 잘 되는 것 같아요. 하지만 정점은 내리막의 시작일 수 있어요. 겸손을 유지하고, 다음 단계를 준비하세요.',
      en: 'In your emperor stage, energy is at maximum. Everything seems to go well. But the peak can start a decline. Stay humble and prepare for the next phase.',
    },
    source: 'twelve-stage',
  },
  병: {
    emoji: '🛋️',
    title: { ko: '휴식이 가장 큰 투자예요', en: 'Rest is the biggest investment' },
    summary: { ko: '병기 - 휴식과 회복이 필요.', en: 'Illness stage - Rest and recovery needed.' },
    detail: {
      ko: '병기의 당신은 에너지가 약해지는 시기예요. 억지로 달리지 마세요. 지금은 쉬어야 할 때예요. 충분한 수면, 가벼운 운동, 건강 관리에 집중하세요.',
      en: "In your illness stage, energy is weakening. Don't force yourself to run. Now is the time to rest. Focus on sufficient sleep, light exercise, health management.",
    },
    source: 'twelve-stage',
  },
  절: {
    emoji: '🔄',
    title: { ko: '끝은 새로운 시작이에요', en: 'Endings are new beginnings' },
    summary: {
      ko: '절기 - 완전한 전환의 시기.',
      en: 'Transition stage - Complete transformation time.',
    },
    detail: {
      ko: '절기의 당신은 완전한 전환의 시기예요. 뭔가가 끝나고 새로운 것이 시작돼요. 과거에 집착하지 말고 흘러보내세요. 비워야 새것이 채워져요.',
      en: "In your transition stage, complete transformation is happening. Something ends and something new begins. Don't cling to the past, let it flow. Empty to fill with new.",
    },
    source: 'twelve-stage',
  },
}

/**
 * 개인화된 어드바이스 생성
 */
export function getPersonalizedAdvice(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): PersonalizedAdvice[] {
  const _isKo = lang === 'ko'
  const advice: PersonalizedAdvice[] = []

  // 1. 십신 기반 어드바이스
  const dominantSibsin = getDominantSibsin(saju)
  if (dominantSibsin && sibsinAdvice[dominantSibsin]) {
    advice.push(sibsinAdvice[dominantSibsin])
  }

  // 2. 오행 극단 상태 어드바이스
  const elementRatios = getElementRatios(saju)
  if (elementRatios.length >= 2) {
    const strongest = elementRatios[0]
    const weakest = elementRatios[elementRatios.length - 1]

    // 강한 오행이 35% 이상이면 과다 어드바이스
    if (strongest.ratio >= 35 && elementExtremeAdvice[strongest.element]) {
      advice.push(elementExtremeAdvice[strongest.element].excess)
    }

    // 약한 오행이 10% 이하면 부족 어드바이스
    if (weakest.ratio <= 10 && elementExtremeAdvice[weakest.element]) {
      advice.push(elementExtremeAdvice[weakest.element].deficient)
    }
  }

  // 3. 신살 기반 어드바이스
  const sinsalList = getSinsalList(saju)
  for (const sinsal of sinsalList) {
    if (sinsalAdvice[sinsal]) {
      advice.push(sinsalAdvice[sinsal])
      break // 하나만 추가
    }
  }

  // 4. 12운성 기반 어드바이스
  const stage = getTwelveStage(saju)
  if (stage && twelveStageAdvice[stage]) {
    advice.push(twelveStageAdvice[stage])
  }

  // 최대 5개로 제한
  return advice.slice(0, 5)
}

/**
 * 조합형 인생 테마 생성 - 일간 + 강한 오행 + 약한 오행 조합
 */
export function getCombinedLifeTheme(
  saju: SajuData | undefined,
  _lang: string
): { ko: string; en: string; detail: { ko: string; en: string } } | null {
  const dayMaster = getDayMaster(saju)
  const elementRatios = getElementRatios(saju)

  if (!dayMaster || elementRatios.length < 2) {
    return null
  }

  const strongEl = elementRatios[0].element
  const strongRatio = elementRatios[0].ratio
  const weakEl = elementRatios[elementRatios.length - 1].element
  const weakRatio = elementRatios[elementRatios.length - 1].ratio

  // 일간별 기본 특성
  const dayMasterThemes: Record<string, { ko: string; en: string }> = {
    갑: { ko: '리더십과 성장', en: 'leadership and growth' },
    을: { ko: '유연함과 적응', en: 'flexibility and adaptation' },
    병: { ko: '열정과 표현', en: 'passion and expression' },
    정: { ko: '섬세함과 배려', en: 'delicacy and care' },
    무: { ko: '안정과 신뢰', en: 'stability and trust' },
    기: { ko: '포용과 화합', en: 'embrace and harmony' },
    경: { ko: '결단력과 정의', en: 'decisiveness and justice' },
    신: { ko: '세련됨과 완벽', en: 'refinement and perfection' },
    임: { ko: '지혜와 깊이', en: 'wisdom and depth' },
    계: { ko: '직관과 영감', en: 'intuition and inspiration' },
  }

  const elementNames: Record<string, { ko: string; en: string }> = {
    wood: { ko: '목', en: 'Wood' },
    fire: { ko: '화', en: 'Fire' },
    earth: { ko: '토', en: 'Earth' },
    metal: { ko: '금', en: 'Metal' },
    water: { ko: '수', en: 'Water' },
  }

  const dmTheme = dayMasterThemes[dayMaster] || { ko: '특별함', en: 'uniqueness' }
  const strongName = elementNames[strongEl]
  const weakName = elementNames[weakEl]

  return {
    ko: `${dmTheme.ko}${eulReul(dmTheme.ko)} 추구하되, ${strongName.ko}(${strongRatio}%)의 힘을 활용하고 ${weakName.ko}(${weakRatio}%)${eulReul(weakName.ko)} 보완하는 여정`,
    en: `A journey pursuing ${dmTheme.en}, leveraging ${strongName.en} (${strongRatio}%) while complementing ${weakName.en} (${weakRatio}%)`,
    detail: {
      ko: (() => {
        const dmCop = dmTheme.ko.match(/[가-힣]$/) && (dmTheme.ko.charCodeAt(dmTheme.ko.length - 1) - 0xac00) % 28 !== 0 ? '이에요' : '예요'
        const weakObj = (weakEl === 'wood' ? '새로운 시작' : weakEl === 'fire' ? '열정 표현' : weakEl === 'earth' ? '안정감 확보' : weakEl === 'metal' ? '결단력 발휘' : '휴식과 직관')
        return `당신의 본질은 ${dmTheme.ko}${dmCop}. ${strongName.ko} 기운이 ${strongRatio}%로 강해서 ${strongEl === 'wood' ? '시작과 성장' : strongEl === 'fire' ? '열정과 표현' : strongEl === 'earth' ? '안정과 신뢰' : strongEl === 'metal' ? '결단과 완결' : '직관과 유연함'}에 탁월해요. 반면 ${weakName.ko} 기운이 ${weakRatio}%로 부족해서 ${weakObj}${eulReul(weakObj)} 의식적으로 챙겨야 해요.`
      })(),
      en: `Your essence is ${dmTheme.en}. With ${strongName.en} at ${strongRatio}%, you excel at ${strongEl === 'wood' ? 'starting and growing' : strongEl === 'fire' ? 'passion and expression' : strongEl === 'earth' ? 'stability and trust' : strongEl === 'metal' ? 'decisiveness and completion' : 'intuition and flexibility'}. Meanwhile, ${weakName.en} at ${weakRatio}% means you need to consciously cultivate ${weakEl === 'wood' ? 'new beginnings' : weakEl === 'fire' ? 'passion expression' : weakEl === 'earth' ? 'securing stability' : weakEl === 'metal' ? 'decisiveness' : 'rest and intuition'}.`,
    },
  }
}
