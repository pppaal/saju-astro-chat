// src/lib/share/shareHook.ts
//
// 공유 카드용 "도발적" 한 줄(후크) 생성기 — 점수/톤/흐름 같은 엔진 신호에서만
// 뽑는다(없는 사실을 지어내지 않음). 인앱 결론(oneLine·patternLine)은 따뜻하고
// 구체적이라 그대로 두고, *공유 카드* 에서만 더 세고 클릭을 부르는 카피를 쓴다.
//
// 결정론: tone/band 로 풀을 고르고 seed(본명 고정)로 변형을 골라 같은 사람은
// 항상 같은 후크 → 캐시·골든 안정. Co-Star 식 직설을 노리되 운명을 단정하지
// 않는 톤(권유/관찰)으로만 쓴다.

export type ShareTone = 'positive' | 'mixed' | 'caution'

export interface DayHookInput {
  tone: ShareTone
  /** 0..100. */
  score: number
  /** 본명 고정 시드(없으면 0). */
  seed?: number
  /**
   * 날짜별 변화 소금(예: 일-of-month) — 같은 톤 버킷이어도 날마다 다른 변형을 고르게
   * 해 인앱 헤드라인이 매일 같지 않도록(재방문 신선도). 없으면 0(본명 시드만 — 기존
   * 공유카드 동작). 여전히 결정적(같은 사람·같은 날 → 같은 후크).
   */
  daySalt?: number
  ko: boolean
}

export interface ShareHook {
  headline: string
  subline?: string
}

interface HookVariant {
  ko: ShareHook
  en: ShareHook
}

// 후크 = 스크린샷 되는 "헐 완전 나야" 한 줄. 카피 원칙(시장조사): 2인칭·현재·반말,
// 두루뭉술한 상태 묘사 대신 *구체적 감정 시나리오*로 콕 집기, 헤지("~일 수도") 금지,
// 사실은 열어두고 감정의 결만 정확히("먼저 카톡 보내고 후회할 거잖아"). 톤/점수에서만
// 뽑아 없는 사실은 지어내지 않는다(엔진 규약). EN 은 Co-Star 식 직설.
// 양수 강(>=72) / 양수 약(60~71) / 중립 / 주의 — seed+daySalt 로 날마다 회전.
const DAY_POOL: Record<'high' | 'good' | 'mixed' | 'caution', HookVariant[]> = {
  high: [
    {
      ko: {
        headline: '오늘 먼저 움직인 사람이 이겨. 그거 너야.',
        subline: '미뤄둔 거, 오늘 꺼내면 통해.',
      },
      en: {
        headline: "Today, whoever moves first wins. That's you.",
        subline: 'Bring up the thing you shelved — it lands.',
      },
    },
    {
      ko: {
        headline: "지를 거면 오늘. 내일 되면 또 '다음에' 할 거잖아.",
        subline: '받쳐주는 기운 제대로 왔어.',
      },
      en: {
        headline: "Going for it? Go today. Tomorrow you'll say 'later' again.",
        subline: "The wind's actually at your back.",
      },
    },
    {
      ko: {
        headline: '오늘 겁먹고 넘기면 두고두고 생각날 거야.',
        subline: '흐름이 정점으로 꺾여 올라가는 중.',
      },
      en: {
        headline: "Flinch today and you'll replay it for weeks.",
        subline: 'The flow is bending up toward its peak.',
      },
    },
    {
      ko: {
        headline: '판이 너한테 기울었어. 안 쓰면 너만 손해.',
        subline: '먼저 연락하고 먼저 질러.',
      },
      en: {
        headline: 'The board tilted your way. Not using it is the only loss.',
        subline: 'Text first. Ask first.',
      },
    },
    {
      ko: { headline: "'나중에'가 오늘이야.", subline: '핑계 대던 그 일, 오늘 열려.' },
      en: {
        headline: "'Later' is today.",
        subline: 'The thing you keep excusing yourself out of — open now.',
      },
    },
    {
      ko: { headline: '오늘은 재보지 마. 그냥 질러.', subline: '밀면 밀리는 날.' },
      en: { headline: "Don't measure it today. Just go.", subline: 'Push and it gives.' },
    },
    {
      ko: { headline: '머뭇거리는 순간 남이 가져가.', subline: '오늘 네 편인 거 흐름이 말해줘.' },
      en: {
        headline: 'Hesitate and someone else takes it.',
        subline: 'The day is on your side.',
      },
    },
  ],
  good: [
    {
      ko: { headline: '오늘 먼저 말 꺼내도 안 튕겨.', subline: '받쳐주는 흐름이 같이 와.' },
      en: {
        headline: "Speak up first today — it won't bounce.",
        subline: 'A supporting current comes with it.',
      },
    },
    {
      ko: { headline: '재보지 말고 하나만 질러봐. 열려.', subline: '작게 움직여도 풀리는 쪽.' },
      en: {
        headline: 'Stop weighing it. Commit to one thing — it opens.',
        subline: 'Even a small move unlocks it.',
      },
    },
    {
      ko: { headline: '너 오늘 은근 잘 통해. 써먹어.', subline: '연락·제안 타이밍 좋아.' },
      en: {
        headline: 'You land easier than you think today. Use it.',
        subline: 'Good timing to reach out.',
      },
    },
    {
      ko: { headline: '한 발만 더. 딱 거기서 열려.', subline: '생각보다 순하게 가.' },
      en: {
        headline: 'One more step. That’s where it opens.',
        subline: 'Smoother than you expect.',
      },
    },
    {
      ko: { headline: "오늘은 '될까?'보다 '해볼까'가 맞아.", subline: '밀어주는 결이 와 있어.' },
      en: {
        headline: "Today's a 'let's try' day, not a 'will it work' day.",
        subline: 'The grain’s behind you.',
      },
    },
    {
      ko: {
        headline: '미루던 거 오늘 반만 해도 돼. 시작이 되니까.',
        subline: '시작에 바람이 붙어.',
      },
      en: {
        headline: 'Do half the thing you keep putting off. Half counts.',
        subline: 'Starting catches a tailwind.',
      },
    },
  ],
  mixed: [
    {
      ko: {
        headline: '될 듯 말 듯, 오늘은 네 선택에 달렸어.',
        subline: '받쳐주는 기운·거스르는 기운 같이 깔렸어.',
      },
      en: {
        headline: 'On the fence — today turns on your call.',
        subline: 'Supporting and opposing currents both run under it.',
      },
    },
    {
      ko: { headline: '다 하려다 아무것도 못 할 거잖아. 하나만.', subline: '되는 것만 붙잡아.' },
      en: {
        headline: "You'll try to do it all and land nothing. Pick one.",
        subline: 'Hold only what works.',
      },
    },
    {
      ko: { headline: '서두르면 꼬여. 고르면 풀려.', subline: '딱 하나만, 천천히.' },
      en: { headline: 'Rush and it tangles. Choose and it opens.', subline: 'One thing. Slowly.' },
    },
    {
      ko: { headline: '기분 따라 움직이면 오늘 진다.', subline: '무게중심만 안 놓치면 돼.' },
      en: { headline: 'Move on mood today and you lose.', subline: "Just don't drop your center." },
    },
    {
      ko: {
        headline: '오늘 잘 풀리는 쪽이랑 막히는 쪽이 딱 갈려.',
        subline: '잘 되는 데만 힘 실어.',
      },
      en: {
        headline: 'Today splits clean into what flows and what jams.',
        subline: 'Put your weight only where it flows.',
      },
    },
    {
      ko: { headline: '반은 맞고 반은 틀린 날. 욕심만 빼면 돼.', subline: '한쪽으로 쏠리지 마.' },
      en: {
        headline: "Half right, half wrong. Drop the greed and it's fine.",
        subline: "Don't lean all one way.",
      },
    },
  ],
  caution: [
    {
      ko: {
        headline: '오늘 너, 괜히 다 갈아엎고 싶어질 거야. 참아.',
        subline: '살짝 거스르는 기운 깔렸어.',
      },
      en: {
        headline: "You'll want to burn it all down today. Don't.",
        subline: 'A rough current runs underneath.',
      },
    },
    {
      ko: {
        headline: '먼저 카톡 보내고 후회할 거잖아. 오늘은 참아.',
        subline: '부딪히기 쉬운 날, 말 아껴.',
      },
      en: {
        headline: "You'll text first and regret it. Not today.",
        subline: 'Friction comes easy — spend words carefully.',
      },
    },
    {
      ko: {
        headline: '지르지 마. 내일이 진짜 더 좋아.',
        subline: '큰 결정·큰 지출은 미뤄. 이득이야.',
      },
      en: {
        headline: 'Don’t push — tomorrow genuinely reads better.',
        subline: 'Big calls, big spends: defer them.',
      },
    },
    {
      ko: { headline: '오늘 예민한 거, 기분 탓 아냐.', subline: '몸도 마음도 좀 사려.' },
      en: {
        headline: "That edge you feel today isn't in your head.",
        subline: 'Spare your body and your mood.',
      },
    },
    {
      ko: {
        headline: '한 박자만 늦춰. 급하면 너만 손해 보는 날.',
        subline: '말은 둥글게, 결정은 천천히.',
      },
      en: {
        headline: 'Hold for one beat. Rushing only costs you today.',
        subline: 'Keep words soft, decisions slow.',
      },
    },
    {
      ko: {
        headline: '오늘 욱하면 내일 수습해야 돼. 알잖아.',
        subline: '감정보다 한 박자 뒤에서 움직여.',
      },
      en: {
        headline: "Snap today and you'll spend tomorrow cleaning it up. You know this.",
        subline: 'Move a beat behind the feeling.',
      },
    },
    {
      ko: {
        headline: '안 사도 되는 거 오늘 사려고 하지 마.',
        subline: '지갑도 마음도 닫아두는 날.',
      },
      en: {
        headline: "Don't buy the thing you don't need today.",
        subline: 'Keep your wallet and your heart shut.',
      },
    },
  ],
}

function pick<T>(pool: T[], seed: number): T {
  const i = ((Math.abs(Math.trunc(seed)) % pool.length) + pool.length) % pool.length
  return pool[i]
}

/** 하루 공유 카드 후크 — 점수/톤에서만 뽑는다(없는 사실 X). */
export function dayShareHook(input: DayHookInput): ShareHook {
  const bucket: keyof typeof DAY_POOL =
    input.tone === 'caution'
      ? 'caution'
      : input.tone === 'mixed'
        ? 'mixed'
        : input.score >= 72
          ? 'high'
          : 'good'
  const v = pick(DAY_POOL[bucket], (input.seed ?? 0) + (input.daySalt ?? 0))
  return input.ko ? v.ko : v.en
}

export type MonthTone = 'bright' | 'careful' | 'mixed'

export interface MonthHookInput {
  tone: MonthTone
  /** 본명 고정 시드(없으면 0). */
  seed?: number
  /** 달별 변화 소금(예: 월 번호) — 달마다 다른 변형. 없으면 0. */
  monthSalt?: number
  ko: boolean
}

// "이번 달 = 너" 후크 — 월 톤에서만 뽑는다(없는 사실 X). day 후크와 같은 원칙:
// 2인칭·현재·반말, 헤지 없이 결만 콕. seed+monthSalt 로 달마다 회전.
const MONTH_POOL: Record<MonthTone, HookVariant[]> = {
  bright: [
    {
      ko: {
        headline: '이번 달, 너한테 유리하게 짜였어. 안 쓰면 아까워.',
        subline: '미루던 거 꺼내는 달이야.',
      },
      en: {
        headline: 'This month is rigged in your favor. Wasting it would be a shame.',
        subline: 'The month to bring back what you shelved.',
      },
    },
    {
      ko: {
        headline: '이번 달은 먼저 지르는 사람이 먹어. 그거 너 해.',
        subline: '받쳐주는 흐름이 길게 와.',
      },
      en: {
        headline: 'This month, whoever moves first eats. Be that person.',
        subline: 'A long supporting current.',
      },
    },
    {
      ko: { headline: '이번 달 안 풀리면 그게 이상한 거야.', subline: '바람이 네 쪽으로 불어.' },
      en: {
        headline: "If this month doesn't open up, that'd be the weird part.",
        subline: 'The wind blows your way.',
      },
    },
    {
      ko: { headline: '이번 달 흐름, 등 떠밀리듯 가벼워.', subline: '큰일 벌이기 좋은 달.' },
      en: {
        headline: 'This month moves light, like a push at your back.',
        subline: 'A month to start big things.',
      },
    },
  ],
  careful: [
    {
      ko: { headline: '이번 달은 벌이기보다 지키는 달이야.', subline: '급하게 굴면 달 내내 꼬여.' },
      en: {
        headline: 'This month rewards holding, not launching.',
        subline: 'Rush and the whole month tangles.',
      },
    },
    {
      ko: {
        headline: '이번 달, 욕심내면 딱 그만큼 새어나가.',
        subline: '속도 줄이고 다지는 게 이득.',
      },
      en: {
        headline: 'Reach too far this month and it leaks out just as much.',
        subline: 'Slow down and consolidate.',
      },
    },
    {
      ko: { headline: '크게 지르고 싶겠지만 이번 달은 아냐.', subline: '마무리·점검에 힘 실어.' },
      en: {
        headline: "You'll want to go big. Not this month.",
        subline: 'Put your weight on finishing and checking.',
      },
    },
  ],
  mixed: [
    {
      ko: {
        headline: '이번 달은 오르락내리락해. 큰 날만 노려.',
        subline: '좋은 날 몰아치고 나머진 흘려.',
      },
      en: {
        headline: 'This month swings. Play only the big days.',
        subline: 'Go hard on the good days, let the rest pass.',
      },
    },
    {
      ko: { headline: '이번 달, 다 잡으려다 다 놓쳐. 골라.', subline: '되는 흐름에만 올라타.' },
      en: {
        headline: 'Grab at everything this month and you drop it all. Choose.',
        subline: 'Ride only the flow that works.',
      },
    },
    {
      ko: {
        headline: '이번 달 기복 뚜렷해. 타이밍 싸움이야.',
        subline: '좋은 날에 결정, 흐린 날엔 정비.',
      },
      en: {
        headline: "Sharp ups and downs this month. It's a timing game.",
        subline: 'Decide on good days, repair on murky ones.',
      },
    },
  ],
}

/** 이달 후크 — 월 톤에서만 뽑는다(없는 사실 X). */
export function monthShareHook(input: MonthHookInput): ShareHook {
  const v = pick(MONTH_POOL[input.tone], (input.seed ?? 0) + (input.monthSalt ?? 0))
  return input.ko ? v.ko : v.en
}

export type LifeSlope = 'rising' | 'falling' | 'plateau'

export interface LifeHookInput {
  slope: LifeSlope
  /** 현재 만 나이. */
  nowAge: number
  /** 피크 나이(없으면 -1). */
  peakAge?: number
  /** 피크 연도(없으면 0). */
  peakYear?: number
  seed?: number
  ko: boolean
}

const DECADE_KO: Record<number, string> = {
  20: '스물',
  30: '서른',
  40: '마흔',
  50: '쉰',
  60: '예순',
  70: '일흔',
  80: '여든',
}

/** 인생 곡선 공유 후크 — 피크/추세에서만 뽑는다. */
export function lifeShareHook(input: LifeHookInput): ShareHook {
  const { ko } = input
  const peakAge = input.peakAge ?? -1
  const peakFuture = peakAge >= 0 && peakAge > input.nowAge + 2
  if (peakFuture) {
    const dec = Math.floor(peakAge / 10) * 10
    const decKo = DECADE_KO[dec]
    if (ko) {
      const pool: ShareHook[] = [
        {
          headline: decKo
            ? `${decKo}에, 판이 한 번 뒤집힌다.`
            : `${peakAge}세, 판이 한 번 뒤집힌다.`,
          subline: '흩어진 지금을 지나 흐름이 한곳으로 모여요.',
        },
        {
          headline: decKo ? `진짜 판은 ${decKo}부터.` : `진짜 판은 ${peakAge}세부터.`,
          subline: '지금은 그 정점으로 올라가는 길목.',
        },
      ]
      return pick(pool, input.seed ?? 0)
    }
    const pool: ShareHook[] = [
      {
        headline: `Around ${peakAge}, the board flips once.`,
        subline: 'Past today’s scatter, the flow gathers into one.',
      },
      {
        headline: `The real game starts at ${peakAge}.`,
        subline: 'Right now you’re on the climb toward it.',
      },
    ]
    return pick(pool, input.seed ?? 0)
  }
  // 피크가 과거/지금 → 추세 기반.
  if (input.slope === 'rising') {
    return ko
      ? {
          headline: '지금, 흐름이 위로 꺾이는 자리.',
          subline: '올라타기 딱 좋은 구간에 와 있어요.',
        }
      : {
          headline: 'Right now the flow bends upward.',
          subline: 'You’re at a good stretch to ride it.',
        }
  }
  if (input.slope === 'falling') {
    return ko
      ? { headline: '지금은 거두고 정리할 때.', subline: '다음 마디를 위해 힘을 아끼는 구간.' }
      : {
          headline: 'Now is a time to gather and settle.',
          subline: 'A stretch to save strength for the next turn.',
        }
  }
  return ko
    ? { headline: '흐름이 고르게 깔린 구간.', subline: '큰 굴곡 없이 다질 수 있는 시기.' }
    : {
        headline: 'A level stretch in the flow.',
        subline: 'A time to consolidate without big swings.',
      }
}
