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

// 양수 강(>=72) / 양수 약(60~71) / 중립 / 주의 — 각 풀에서 seed 로 하나 고른다.
const DAY_POOL: Record<'high' | 'good' | 'mixed' | 'caution', HookVariant[]> = {
  high: [
    {
      ko: {
        headline: '먼저 움직여. 오늘은 네가 이겨.',
        subline: '미뤄둔 그 일, 지금 꺼내도 통하는 날.',
      },
      en: {
        headline: 'Make the first move — today is yours.',
        subline: 'That thing you put off? Bring it up now.',
      },
    },
    {
      ko: { headline: '오늘 안 하면 손해인 날.', subline: '흐름이 정점으로 꺾여 올라가는 중.' },
      en: {
        headline: 'Not acting today is the only mistake.',
        subline: 'The flow is bending up toward its peak.',
      },
    },
    {
      ko: { headline: '지를 거면 오늘.', subline: '받쳐주는 기운이 제대로 들어와 있어.' },
      en: {
        headline: 'If you’re going for it — go today.',
        subline: 'The wind is genuinely at your back.',
      },
    },
  ],
  good: [
    {
      ko: { headline: '먼저 말 꺼내도 무리 없는 날.', subline: '받쳐주는 흐름이 같이 와요.' },
      en: {
        headline: 'A day you can speak up first.',
        subline: 'A supporting current comes with it.',
      },
    },
    {
      ko: { headline: '오늘은 한 발 더 가도 돼.', subline: '작게라도 움직이면 풀리는 쪽.' },
      en: {
        headline: 'You can push one step further today.',
        subline: 'Even a small move tends to unlock things.',
      },
    },
  ],
  mixed: [
    {
      ko: {
        headline: '될 듯 말 듯, 네 선택에 달린 날.',
        subline: '받쳐주는 기운과 거스르는 기운이 같이 깔려요.',
      },
      en: {
        headline: 'On the fence — today turns on your call.',
        subline: 'Supporting and opposing currents both run underneath.',
      },
    },
    {
      ko: { headline: '서두르면 꼬이고, 고르면 풀려.', subline: '결정은 천천히, 한 가지만.' },
      en: {
        headline: 'Rush and it tangles; choose and it opens.',
        subline: 'Decide slowly — one thing only.',
      },
    },
  ],
  caution: [
    {
      ko: { headline: '오늘은 한 박자 늦춰.', subline: '살짝 거스르는 기운이 깔려 있어요.' },
      en: {
        headline: 'Hold for one beat today.',
        subline: 'A slightly rough current runs underneath.',
      },
    },
    {
      ko: {
        headline: '지르지 마. 내일이 더 좋아.',
        subline: '큰 결정·큰 지출은 미루는 쪽이 이득.',
      },
      en: {
        headline: 'Don’t push — tomorrow reads better.',
        subline: 'Big calls and big spends are better deferred.',
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
  const v = pick(DAY_POOL[bucket], input.seed ?? 0)
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
