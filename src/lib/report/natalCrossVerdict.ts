/**
 * natalCross 판정 문구 생성 — 두 축의 실제 오행을 쉬운 말 결로 풀어 그 사람
 * 고유의 문장(reason)을 만든다. 생/극/같음/중립 관계별 톤과 결정적(deterministic)
 * 변주(트레잇·마무리 조언)를 담당. 같은 입력이면 항상 같은 문구라 리포트가 흔들리지 않는다.
 */

import { type SajuElement } from '@/lib/saju/elementBridge'
import { iga, eulReul, eunNeun, waGwa } from '@/lib/i18n/koParticle'
import { EL_KO, EL_EN, elementRelation, type CrossVerdict } from './natalCrossShared'

// ── 내부 헬퍼 ──────────────────────────────────────────────────────────────

// 오행별 "쉬운 말" 결 — 전문용어 없이 그 기운의 성향을 한 마디로.
export const ELEMENT_TRAIT: Record<SajuElement, { ko: string; en: string }> = {
  wood: { ko: '뻗어나가 키우는', en: 'growing and expansive' },
  fire: { ko: '드러내고 타오르는', en: 'expressive and fiery' },
  earth: { ko: '안정되고 믿음직한', en: 'steady and grounded' },
  metal: { ko: '예리하고 결단하는', en: 'sharp and decisive' },
  water: { ko: '깊고 유연한', en: 'deep and adaptable' },
}
// 트레잇 동의어 — 같은 원소도 사람·축마다 다른 표현이 나오게(결정적 변주).
// 같은 원소+같은 시드면 항상 같은 선택이라 한 축 안에서는 일관, 다른 사람은 갈림.
const ELEMENT_TRAIT_ALT: Record<SajuElement, { ko: string; en: string }> = {
  wood: { ko: '위로 자라나는', en: 'upward-reaching' },
  fire: { ko: '환하게 피어나는', en: 'bright and radiant' },
  earth: { ko: '묵직하게 받쳐주는', en: 'solid and supportive' },
  metal: { ko: '깔끔하게 끊어내는', en: 'clean and incisive' },
  water: { ko: '잔잔히 스며드는', en: 'fluid and permeating' },
}
function pickTrait(el: SajuElement, seed: string): { ko: string; en: string } {
  let h = 0
  const s = seed + el
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 2 === 0 ? ELEMENT_TRAIT[el] : ELEMENT_TRAIT_ALT[el]
}

/** 두 축의 도메인 라벨(쉬운 말). 예: 정체성 → '본바탕' / '드러나는 자아'. */
export interface DomainCtx {
  aKo: string
  aEn: string
  bKo: string
  bEn: string
  /** 긴장(극) 케이스 조언 문구 override — 도메인별로 달라 중복 방지. */
  tailKo?: string
  tailEn?: string
  /** 트레잇 묘사 override — 공기 별자리 유래 등 element-trait 가 부정확할 때. */
  aTrait?: { ko: string; en: string }
  bTrait?: { ko: string; en: string }
  /** 원소명 라벨 override — 공기 별자리는 '木' 대신 '공기'로 표기. */
  aLabel?: { ko: string; en: string }
  bLabel?: { ko: string; en: string }
  /**
   * 공기(air) 근사 표식 — 한쪽 오행이 공기 별자리에서 木으로 근사돼 나온 경우.
   * 무손실 대응이 아니라 '같은 결(same)' 판정이 거짓 수렴일 수 있으므로, 그 경우
   * 단정 대신 헤지 문구를 덧붙인다(톤은 유지).
   */
  airApprox?: boolean
}

/**
 * 오행 교차 판정 — 두 축의 *실제 오행*을 쉬운 말 결로 풀어 그 사람 고유의
 * 문장을 만든다. (예전엔 관계별 고정 문장 3개라 누구나 같은 결과였음.)
 * 생(生) 관계는 방향(누가 누구를 키우나)까지 구분.
 */
// 마무리 조언 문구 변주 풀 — 정체성·기질 등 elementVerdict 공유 축이 같은
// 결론 문장을 반복하지 않도록. 결정적 선택(같은 사람·축이면 늘 같은 문장,
// 축·원소가 다르면 다른 문장)이라 리포트 안정성은 유지된다.
const VERDICT_CLOSERS: Record<string, ReadonlyArray<{ ko: string; en: string }>> = {
  same: [
    {
      ko: '힘이 모이는 만큼 한쪽으로 치우치기도 쉬우니, 가끔 반대 결도 의식하면 균형이 좋아져요.',
      en: 'That focus is a strength, but it can tip into one-sidedness, so touch the opposite grain now and then.',
    },
    {
      ko: '방향이 또렷한 게 큰 무기예요 — 같은 패턴만 굳어지지 않게 이따금 낯선 결도 들여보면 더 단단해져요.',
      en: 'A clear direction is a real edge — let an unfamiliar grain in occasionally so it sharpens rather than hardens.',
    },
    {
      ko: '한 길로 깊게 파기 좋은 구조라, 이 강점을 살릴 자리를 일찍 정할수록 멀리 가요.',
      en: "You're built to go deep on one track — the sooner you pick a stage for it, the further it carries you.",
    },
  ],
  aGenB: [
    {
      ko: '꾸준히 쌓을수록 결실이 점점 커지는 구조라, 조급해하지 않는 게 핵심이에요.',
      en: 'Steady effort compounds here, so patience is the key.',
    },
    {
      ko: '안에서 시작해 밖으로 풀어내는 흐름이라, 떠오른 걸 작게라도 바깥으로 꺼내 보는 습관이 잘 맞아요.',
      en: 'It runs from the inside out, so a habit of putting ideas into the world — even small ones — suits you.',
    },
    {
      ko: '뿌리가 단단할수록 열매가 커지니, 기초를 다지는 시간을 아까워하지 마세요.',
      en: "The firmer the roots, the bigger the fruit — don't begrudge the time spent on foundations.",
    },
  ],
  bGenA: [
    {
      ko: '어떤 환경·사람을 곁에 두는지가 특히 중요해요.',
      en: 'The environment and people you keep around you matter a lot.',
    },
    {
      ko: '바깥의 자극이 안을 살리는 구조라, 좋은 입력을 주는 자리에 자주 머무는 게 보약이에요.',
      en: 'Outside input feeds your inner side, so staying where the stimulation is good is a tonic.',
    },
    {
      ko: '혼자 짜내기보다 좋은 환경에 기대는 게 오히려 영리한 전략이에요.',
      en: "Leaning on a good environment beats grinding it out alone — that's the smart play.",
    },
  ],
  tension: [
    {
      ko: '부딪힐 땐 한쪽을 누르기보다 상황에 따라 번갈아 쓰는 리듬을 만들면 오히려 강점이 돼요.',
      en: 'When they clash, alternate between them by context instead of suppressing one — that turns friction into range.',
    },
    {
      ko: '둘 중 하나를 없애려 들면 지치기만 해요 — 장면마다 맞는 쪽을 꺼내 쓰면 폭이 넓어져요.',
      en: 'Trying to erase one side only wears you out — draw on whichever fits the scene and your range widens.',
    },
    {
      ko: '긴장 자체가 깊이의 원천이라, 두 결을 다 인정하는 데서 성장이 시작돼요.',
      en: 'The tension itself is a source of depth — growth starts when you grant both sides their place.',
    },
  ],
  neutral: [
    {
      ko: '서로 독립적이라 상황에 따라 다른 면을 꺼내 쓰는 유연함이 있어요.',
      en: 'Being separate, you can switch between them as the situation calls.',
    },
    {
      ko: '겹치지 않아 서로 방해도 안 하니, 두 자원을 따로 꺼내 쓰는 여유가 있어요.',
      en: "They don't overlap or interfere, so you can draw on each as its own resource.",
    },
    {
      ko: '한 데 묶이지 않은 덕에, 한쪽이 막혀도 다른 쪽으로 풀 길이 남아요.',
      en: "Because they aren't bound together, if one path stalls the other still offers a way through.",
    },
  ],
}
// 결정적 변주 선택 — seed(축+원소) 해시로 풀에서 고른다. 무작위가 아니라
// 같은 입력이면 항상 같은 결과 → 리포트 재생성 시 문구가 흔들리지 않는다.
function pickCloser(kind: keyof typeof VERDICT_CLOSERS, seed: string): { ko: string; en: string } {
  const pool = VERDICT_CLOSERS[kind]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return pool[h % pool.length]
}

export function elementVerdict(a: SajuElement, b: SajuElement, d: DomainCtx): CrossVerdict {
  const seed = `${d.aKo}|${d.bKo}|${a}|${b}`
  // 트레잇은 동의어 풀에서 결정적으로 고른다(override 우선). 같은 원소+같은 시드면
  // 동일 선택이라, a===b(같음 관계)면 ta/tb 가 자동으로 같아져 'same' 로직이 유지된다.
  const ta = d.aTrait ?? pickTrait(a, seed)
  const tb = d.bTrait ?? pickTrait(b, seed)
  const rel = elementRelation(a, b)
  const la = d.aLabel ?? { ko: EL_KO[a], en: EL_EN[a] }
  const lb = d.bLabel ?? { ko: EL_KO[b], en: EL_EN[b] }
  const left = { ko: `${la.ko} · ${ta.ko}`, en: `${la.en} · ${ta.en}` }
  const right = { ko: `${lb.ko} · ${tb.ko}`, en: `${lb.en} · ${tb.en}` }
  // 같은 오행이라도 트레잇 override(예: 공기→木) 가 걸리면 표시 결이 달라진다.
  // 그 경우 "둘 다 ${ta}" 라고 하면 라벨(목 ↔ 공기)과 모순되므로 분기.
  const sameTrait = ta.ko === tb.ko
  const base: CrossVerdict = (() => {
    switch (rel) {
      case 'same': {
        const cl = pickCloser('same', seed)
        // 공기 근사로 나온 '같은 결'은 무손실 대응이 아니라 거짓 수렴일 수 있어,
        // 단정 대신 헤지 한 줄을 덧붙인다(톤=resonant 는 유지).
        const hedgeKo = d.airApprox
          ? '다만 한쪽이 공기 별자리라 오행으로는 어림잡아 맞춘 면이 있어, 이 수렴은 단정이라기보다 결이 비슷하다는 정도로 봐 두세요. '
          : ''
        const hedgeEn = d.airApprox
          ? 'That said, one side is an air sign mapped only approximately onto the elements, so read this as a loose resemblance rather than a firm match. '
          : ''
        return {
          tone: 'resonant',
          reason: {
            ko:
              (sameTrait
                ? `${d.aKo}${waGwa(d.aKo)} ${d.bKo}${iga(d.bKo)} 둘 다 ${ta.ko} 결이라, 한 방향으로 또렷한 사람이에요. `
                : `${d.aKo}${eunNeun(d.aKo)} ${ta.ko}, ${d.bKo}${eunNeun(d.bKo)} ${tb.ko} 결이라 겉보기엔 달라도 뿌리는 같은 흐름이라 한 방향으로 통해요. `) +
              hedgeKo +
              cl.ko,
            en:
              (sameTrait
                ? `Your ${d.aEn} and ${d.bEn} are both ${ta.en} — one clear, consistent direction. `
                : `Your ${d.aEn} is ${ta.en} and your ${d.bEn} is ${tb.en} — different on the surface, yet they share one root and pull the same way. `) +
              hedgeEn +
              cl.en,
          },
        }
      }
      case 'aGenB': {
        const cl = pickCloser('aGenB', seed)
        return {
          tone: 'complement',
          reason: {
            ko: `${ta.ko} ${d.aKo}${iga(d.aKo)} ${tb.ko} ${d.bKo}${eulReul(d.bKo)} 자연스럽게 키워줘요 — 안에서 밖으로 잘 이어지는 타입이에요. ${cl.ko}`,
            en: `Your ${ta.en} ${d.aEn} naturally feeds your ${tb.en} ${d.bEn} — inner flows outward. ${cl.en}`,
          },
        }
      }
      case 'bGenA': {
        const cl = pickCloser('bGenA', seed)
        return {
          tone: 'complement',
          reason: {
            ko: `${tb.ko} ${d.bKo}${iga(d.bKo)} ${ta.ko} ${d.aKo}${eulReul(d.aKo)} 받쳐줘요 — 밖이 안을 채워주는 타입이에요. ${cl.ko}`,
            en: `Your ${tb.en} ${d.bEn} feeds your ${ta.en} ${d.aEn} — outer replenishes inner. ${cl.en}`,
          },
        }
      }
      case 'aCtrlB':
      case 'bCtrlA': {
        const cl = pickCloser('tension', seed)
        return {
          tone: 'tension',
          reason: {
            ko: `${d.aKo}${eunNeun(d.aKo)} ${ta.ko} 쪽인데 ${d.bKo}${eunNeun(d.bKo)} ${tb.ko} 쪽이라 서로 당겨요 — 한 사람 안에 다른 두 결이 같이 있는 셈이에요. ${d.tailKo ?? cl.ko}`,
            en: `Your ${d.aEn} is ${ta.en} while your ${d.bEn} is ${tb.en} — two different sides pulling within one person. ${d.tailEn ?? cl.en}`,
          },
        }
      }
      default: {
        const cl = pickCloser('neutral', seed)
        return {
          tone: 'neutral',
          reason: {
            ko: `${ta.ko} ${d.aKo}${waGwa(d.aKo)} ${tb.ko} ${d.bKo}${iga(d.bKo)} 직접 엮이진 않고 따로 작동해요. ${cl.ko}`,
            en: `Your ${ta.en} ${d.aEn} and ${tb.en} ${d.bEn} run independently. ${cl.en}`,
          },
        }
      }
    }
  })()
  return { ...base, left, right }
}
