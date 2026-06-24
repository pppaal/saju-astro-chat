/**
 * natalCross 도메인 평가기 — 사주의 고정 정체성과 점성의 고정 정체성을 도메인별로
 * 교차 판정한다(정체성·욕구·사회역할·재물·관계·강약·기질·에너지·추진력·핵심각·공망·
 * 노스노드·연애·이동·영성·재물·음양·표현). 각 함수는 이미 계산된 사주/점성 값만 받아
 * CrossVerdict 를 돌려준다 — DB·네트워크 의존 없음.
 */

import { GENERATES, CONTROLS, type SajuElement } from '@/lib/saju/elementBridge'
import { type CrossMapping } from '@/lib/calendar-engine/data/saju-astro-mapping'
import { dignityOf } from '@/lib/astrology/foundation/dignities'
import { PLANET_LABEL } from './chartLabels'
import {
  EL_KO,
  EL_EN,
  SAJU_ELS,
  normSajuElement,
  signToSajuElement,
  sajuKeyMapping,
  toEnSign,
  signTraitOverride,
  signElementLabel,
  isAirSign,
  planetTheme,
  AIR_TRAIT_OVERRIDE,
  AIR_ELEMENT_LABEL,
  type CrossVerdict,
} from './natalCrossShared'
import { elementVerdict, ELEMENT_TRAIT, type DomainCtx } from './natalCrossVerdict'

// ── 판정 헤지(경고 꼬리표) ──────────────────────────────────────────────────
// 엔진이 단정조로 말하면 안 되는 두 경우에 reason 끝에 한 줄 덧붙인다:
//   ① air 근사 — 공기(별자리)는 사주 5행에 무손실 대응이 없어 木으로 근사한 값이라,
//      거기서 나온 '같은 결' 판정은 느슨하게 받아들여야 한다.
//   ② 동률 — 분포 우세/결핍이 다른 것과 개수가 비등하면 '단정'이 아니라 '약간 앞섬'이다.
// (톤은 그대로 두고 문구만 보정 — 기존 air 라벨 헤지와 같은 철학.)
const AIR_JUDGE_HEDGE = {
  ko: ` (참고 — 별자리의 공기 기운은 사주 오행에 딱 맞는 짝이 없어 木으로 근사해 본 거라, 이 "같은 결" 판정은 글자 그대로보다 느슨하게 봐주세요.)`,
  en: ` (Note — the chart's air energy has no exact Saju-element match and is approximated as Wood, so read this "same grain" call loosely rather than literally.)`,
}
const DOM_TIE_HEDGE = {
  ko: ` 다만 이 기운이 다른 기운들과 개수가 비등해서, 절대적 우세라기보다 "약간 앞서는" 정도로 봐주세요.`,
  en: ` That said, this energy is nearly tied with others in count, so read it as "slightly ahead" rather than absolutely dominant.`,
}
const SIBSIN_TIE_HEDGE = {
  ko: ` 다만 비중이 가장 큰 기질이 다른 기질과 비등해서, 이 한 축만으로 단정하긴 일러요.`,
  en: ` That said, your top trait is nearly tied with another, so it's early to pin everything on this one axis.`,
}
const WEAK_TIE_HEDGE = {
  ko: ` 다만 부족한 기운이 여러 개 비슷해서, 이 방향 하나로 못 박기보다 결핍된 쪽들을 두루 채운다는 마음이면 돼요.`,
  en: ` That said, several elements are similarly lacking, so treat this as one of a few directions to fill rather than the only one.`,
}
function withHedge(v: CrossVerdict, hedge: { ko: string; en: string }): CrossVerdict {
  return { ...v, reason: { ko: v.reason.ko + hedge.ko, en: v.reason.en + hedge.en } }
}

/**
 * order 순서로 최댓/최솟값 키를 고르되, 그 값이 다른 키와 비등한지(tied)도 함께 반환.
 * 기존엔 strict `>`/`<` 라 동률일 때 항상 '먼저 선언된' 키가 이겨 wood/비겁 으로 쏠렸다
 * (ENGINE-AUDIT). 선택값은 결정론적으로 유지하되, 동률이면 호출부가 헤지를 붙이게 한다.
 */
function pickExtreme<T extends string>(
  agg: Record<T, number>,
  order: readonly T[],
  mode: 'max' | 'min'
): { key: T; value: number; tied: boolean } | undefined {
  let key: T | undefined
  let value = mode === 'max' ? -Infinity : Infinity
  for (const k of order) {
    const n = agg[k]
    if (mode === 'max' ? n > value : n < value) {
      value = n
      key = k
    }
  }
  if (key === undefined) return undefined
  // 선택값과 같은 값을 가진 키가 2개 이상이면 동률.
  const tiedCount = order.reduce((c, k) => (agg[k] === value ? c + 1 : c), 0)
  return { key, value, tied: tiedCount > 1 }
}

// ── 도메인 평가기 (단일 포인트) ────────────────────────────────────────────

/** 정체성: 일간 오행 ↔ 태양 별자리(+ 상승점). 속(일간)·드러나는 자아(태양)·
 *  첫인상(ASC)을 한 축으로 통합 — 정체성과 페르소나를 따로 두지 않는다. */
export function evalIdentity(
  dayMasterEl: string | undefined,
  sunSign: string | undefined,
  ascSign?: string | undefined,
  almutenPlanet?: string | null
): CrossVerdict | null {
  const a = normSajuElement(dayMasterEl)
  const b = signToSajuElement(sunSign)
  if (!a || !b) return null
  const base = elementVerdict(a, b, {
    aKo: '타고난 속마음',
    aEn: 'inner nature',
    bKo: '드러나는 자아',
    bEn: 'outer self',
    bTrait: signTraitOverride(sunSign),
    bLabel: signElementLabel(sunSign),
    airApprox: isAirSign(sunSign),
  })
  const c = signToSajuElement(ascSign)
  if (!c) return base
  const tc = signTraitOverride(ascSign) ?? ELEMENT_TRAIT[c]
  const ascSame = c === b
  const tailKo = ascSame
    ? ` 남에게 비치는 첫인상도 ${tc.ko} 결이라, 속·자아·첫인상이 한 줄로 또렷하게 이어져요.`
    : ` 게다가 첫인상은 ${tc.ko} 쪽이라 진짜 자아와 겉모습이 한 번 더 갈려요 — 알수록 처음 인상과 달라 보이는 사람이에요.`
  const tailEn = ascSame
    ? ` Your first impression reads ${tc.en} too, so inner self, core self, and the face you show line up cleanly.`
    : ` And your first impression reads ${tc.en}, so who you are and how you appear split once more — people find you different the better they know you.`
  // almuten figuris — 차트를 총괄하는 '주인 행성'. 정체성의 키로 한 줄 덧붙임.
  let almutenKo = ''
  let almutenEn = ''
  if (almutenPlanet) {
    almutenKo = ` 그리고 이 전부를 끌고 가는 차트의 주인 행성은 '${planetTheme(almutenPlanet, 'ko')}' 쪽 — 인생 전반의 키예요.`
    almutenEn = ` And the planet that rules your whole chart leans ${planetTheme(almutenPlanet, 'en')} — the key to your life as a whole.`
  }
  const out: CrossVerdict = {
    ...base,
    reason: { ko: base.reason.ko + tailKo + almutenKo, en: base.reason.en + tailEn + almutenEn },
  }
  // ASC 가 공기 별자리면 c 는 wood 근사값이라 ascSame(첫인상 일치) 판정이 근사에서
  // 나온 거짓 수렴일 수 있다 → 헤지. (태양 쪽 근사는 base 의 airApprox 가 이미 처리.)
  return isAirSign(ascSign) ? withHedge(out, AIR_JUDGE_HEDGE) : out
}

/** 필요·욕망: 용신 오행 ↔ 달 별자리. */
export function evalNeeds(
  yongsinEl: string | undefined,
  moonSign: string | undefined,
  avoidEl?: string,
  johu?: { el?: string; climateKo?: string; climateEn?: string; rating?: number }
): CrossVerdict | null {
  const need = normSajuElement(yongsinEl)
  const moon = signToSajuElement(moonSign)
  if (!need || !moon) return null
  const tNeed = ELEMENT_TRAIT[need]
  const tCrave = signTraitOverride(moonSign) ?? ELEMENT_TRAIT[moon]
  const base: CrossVerdict = (() => {
    if (moon === need)
      return {
        tone: 'resonant',
        reason: {
          ko: `사주가 채우라는 ${tNeed.ko} 기운과 달(평소 마음이 끌리는 곳)이 같은 쪽을 가리켜요 — 진짜 필요한 것과 좋아하는 게 딱 맞는 사람이에요. 몸과 마음이 원하는 게 곧 보약이라, 끌리는 대로 따라가도 크게 어긋나지 않아요. 다만 익숙한 것만 반복하지 않게 가끔 새 자극을 더해주면 그 강점이 더 오래가요.`,
          en: `The ${tNeed.en} energy your Saju asks for and your Moon (where your heart leans) point the same way — what you truly need and what you like line up. What your body and mind crave is your tonic, so following the pull rarely leads you wrong. Just add a fresh stimulus now and then so it doesn't become mere repetition, and the strength lasts longer.`,
        },
      }
    if (GENERATES[moon] === need)
      return {
        tone: 'complement',
        reason: {
          ko: `평소 ${tCrave.ko} 쪽에 끌리는데, 그게 정작 필요한 ${tNeed.ko} 기운을 자연스럽게 채워줘요 — 좋아하는 걸 하다 보면 필요한 게 저절로 채워지는 선순환이에요. 취향을 죄책감 없이 믿고 키워도 되는 구조라, 이 흐름을 일이나 취미로 연결하면 회복과 성장이 함께 와요. 무리해서 바꾸려 들 필요가 없어요.`,
          en: `You're drawn to the ${tCrave.en}, and it quietly supplies the ${tNeed.en} energy you need — a virtuous loop where doing what you love refills what you need. You can trust and grow your taste without guilt; wire this flow into work or a hobby and recovery and growth arrive together. No need to force a change.`,
        },
      }
    if (CONTROLS[moon] === need)
      return {
        tone: 'tension',
        reason: {
          ko: `평소 ${tCrave.ko} 쪽에 끌리는데 정작 필요한 건 ${tNeed.ko} 기운이라 어긋나요 — 원하는 것만 좇다 정작 중요한 걸 놓칠 수 있는 구조예요. 좋아하는 걸 다 끊으라는 게 아니라, 필요한 ${tNeed.ko} 쪽을 하루 일과에 의식적으로 조금씩 끼워 넣는 게 핵심이에요. 그 작은 보정만으로도 공허함이나 번아웃이 한결 줄어요.`,
          en: `You crave the ${tCrave.en} but actually need the ${tNeed.en} — chasing only what you want can crowd out what matters. It's not about cutting out what you love, but deliberately slotting a little ${tNeed.en} into your daily routine. That small correction alone eases a lot of the emptiness or burnout.`,
        },
      }
    return {
      tone: 'neutral',
      reason: {
        ko: `필요한 ${tNeed.ko} 기운과 평소 끌리는 ${tCrave.ko} 쪽이 따로 노는 편이에요 — 둘이 자동으로 연결되진 않아 의식하지 않으면 따로 굴러가요. 필요한 기운을 채우는 루틴을 따로 정해 두면 마음이 한결 안정돼요. 끌림과 필요를 같은 활동 안에서 만나게 해주는 게 이 축의 숙제예요.`,
        en: `Your needed ${tNeed.en} energy and your ${tCrave.en} pulls run on separate tracks — they don't link by themselves, so without attention they drift apart. Set a dedicated routine to refill the needed energy and your mind settles noticeably. The task of this axis is to let pull and need meet inside the same activity.`,
      },
    }
  })()

  let sufKo = ''
  let sufEn = ''
  // 기신(避) — 채울 기운의 짝. 용신 primary 와 다르면 한 줄.
  const avoid = normSajuElement(avoidEl)
  if (avoid && avoid !== need) {
    sufKo += ` 채울 건 ${EL_KO[need]}, 피할 건 ${EL_KO[avoid]} — ${EL_KO[avoid]} 기운이 과해지면 오히려 흐름이 막혀요.`
    sufEn += ` Fill ${EL_EN[need]}, ease off ${EL_EN[avoid]} — too much ${EL_EN[avoid]} tends to clog the flow.`
  }
  // 조후(調候) — 계절 기후상 급히 필요한 기운(rating 높을 때만).
  const johuEl = normSajuElement(johu?.el)
  if (johuEl && (johu?.rating ?? 0) >= 4) {
    const CLIMATE_KO: Record<string, string> = {
      한: '추운',
      습: '습한',
      조: '건조한',
      열: '무더운',
      온화: '온화한',
    }
    const climateKo = CLIMATE_KO[johu?.climateKo ?? ''] ?? ''
    sufKo += ` 계절로 보면 ${climateKo} 달에 태어나 ${EL_KO[johuEl]} 기운이 특히 절실해요 — 그게 활기의 스위치예요.`
    sufEn += ` By season, born in a ${johu?.climateEn ?? ''} month, you especially need ${EL_EN[johuEl]} — it's your switch for vitality.`
  }
  const out = sufKo
    ? { ...base, reason: { ko: base.reason.ko + sufKo, en: base.reason.en + sufEn } }
    : base
  // 달이 공기 별자리면 moon 은 wood 근사값이라, '필요와 끌림이 같은 결' 판정이
  // air→木 근사에서 나온 거짓 수렴일 수 있다 → 헤지(ENGINE-AUDIT).
  return isAirSign(moonSign) ? withHedge(out, AIR_JUDGE_HEDGE) : out
}

/** 사회 역할: 격국 ↔ MC. 격국 대표 십신을 행성으로 환원해 MC 위신으로 판정. */
export function evalSocialRole(
  geokguk: string | undefined,
  mcSign: string | undefined
): CrossVerdict | null {
  if (!geokguk || !mcSign) return null
  const sibsin = geokguk.replace(/격$/, '')
  const mapping = sajuKeyMapping(sibsin)
  const planet = mapping?.astro
  if (!planet) return null
  // MC sign 이 인식 불가면 peregrine 으로 단정하지 말고 행 생략(거짓 판정 방지, ENGINE-AUDIT).
  const en = toEnSign(mcSign)
  if (!en) return null
  const dig = dignityOf(planet, en)
  const tk = planetTheme(planet, 'ko')
  const te = planetTheme(planet, 'en')
  if (dig === 'domicile' || dig === 'exaltation')
    return {
      tone: 'resonant',
      reason: {
        ko: `타고난 ${tk} 성향이, 별자리가 보는 사회적 자리에서도 힘을 받아요 — 타고난 결이 직업·사회 자리에서 그대로 강점으로 드러나는 구조예요. 자기 성향을 억지로 바꿔 가며 일하지 않아도 돼서, 본래 모습 그대로 신뢰받고 자리를 잡기 좋아요. 이 강점을 살릴 무대를 일찍 고를수록 성취가 빨라져요.`,
        en: `Your natural bent for ${te} also sits in a strong spot in how you show up in the world — your innate grain shows up directly as a strength in work and status. You don't have to remake yourself to work, so you earn trust and footing as you are. The earlier you pick a stage that uses this, the faster the achievement comes.`,
      },
    }
  if (dig === 'detriment' || dig === 'fall')
    return {
      tone: 'tension',
      reason: {
        ko: `타고난 ${tk} 성향과, 별자리가 보여주는, 사회가 기대하는 역할이 살짝 어긋나요 — 직업에서 "이게 정말 내 길인가" 하는 고민이 한 번씩 생길 수 있어요. 남들 기준에 자기를 맞추다 지치기 쉬운 구조라, 사회적 정답보다 자기 성향이 살아나는 방식을 찾는 게 핵심이에요. 어긋남을 약점으로 보지 말고, 남과 다른 길을 내는 신호로 쓰면 오히려 독보적이 돼요.`,
        en: `Your natural bent for ${te} and the role the world expects of you don't quite line up — work can periodically raise a "is this really my path?" doubt. It's easy to wear out bending yourself to others' standards, so the key is finding a way that keeps your own grain alive rather than the social "correct answer." Read the mismatch not as a flaw but as a signal to carve a different path, and it makes you one of a kind.`,
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: `타고난 ${tk} 성향을, 사회생활이 다른 방식으로 넓혀줘요 — 일하면서 자기도 몰랐던 새 면이 열리는 타입이에요. 한 가지 직업관에 갇히기보다, 일을 통해 성향이 확장되는 흐름이라 커리어 전환이나 부캐가 잘 어울려요. 지금 자리가 전부라 여기지 말고 새 역할에 한 번씩 자기를 던져 보면 길이 넓어져요.`,
      en: `Work and public life stretch your natural bent for ${te} in a fresh direction — a type who finds new sides on the job they didn't know they had. Rather than being boxed into one idea of a career, your nature expands through work, so career pivots and side personas suit you. Don't treat your current seat as the whole story — throw yourself into a new role now and then and the path widens.`,
    },
  }
}

/**
 * 길흉: 일주 신살 ↔ *그 신살에 대응하는 행성이 내 차트에서 실제로 강조됐는가*.
 * (예전엔 신살만 보고 매핑 polarity 만 썼음 — 진짜 교차가 아니었다.)
 * 신살의 대응 행성(mapping.astro)이 emphasizedPlanets 에 있으면 동·서양이 같은
 * 기운을 동시에 키운 셈 → 길신은 강한 복(resonant), 흉신은 그 압력이 증폭
 * (tension). 대응 행성이 차트에서 약하면 한쪽만 작동(complement) 으로 약화.
 */
export function evalFortune(
  shinsal: string[] | undefined,
  emphasizedPlanets: Set<string> = new Set()
): CrossVerdict | null {
  if (!shinsal || shinsal.length === 0) return null
  // 예전엔 '첫 번째로 매핑되는 신살'을 채택해 — 신살 배열 순서만으로 길흉(복↔압력)이
  // 뒤집혔다(ENGINE-AUDIT). 이제 매핑된 신살 중 *신호가 가장 결정적인* 것을 고른다:
  // |polarity| 큰 쪽 → 동률이면 등급(A>B>C) 높은 쪽. 순서 의존 제거.
  const GRADE_RANK: Record<string, number> = { A: 3, B: 2, C: 1 }
  let mapping: CrossMapping | undefined
  for (const s of shinsal) {
    const m = sajuKeyMapping(s)
    if (!m) continue
    if (!mapping) {
      mapping = m
      continue
    }
    const better =
      Math.abs(m.polarity) !== Math.abs(mapping.polarity)
        ? Math.abs(m.polarity) > Math.abs(mapping.polarity)
        : (GRADE_RANK[m.grade] ?? 0) > (GRADE_RANK[mapping.grade] ?? 0)
    if (better) mapping = m
  }
  if (!mapping) return null
  const planetEmphasized = emphasizedPlanets.has(mapping.astro)
  const tk = planetTheme(mapping.astro, 'ko')
  const te = planetTheme(mapping.astro, 'en')
  // polarity 0 은 길도 흉도 아닌 '중립 자원'(도화×Venus 매력, 비견×Saturn 자립 등)이다.
  // 예전엔 polarity>=0 으로 0 을 '복'에 묶어 거짓 긍정을 냈다(ENGINE-AUDIT) → 별도 분기.
  if (mapping.polarity === 0) {
    return planetEmphasized
      ? {
          tone: 'complement',
          reason: {
            ko: `타고난 ${tk} 자원이 별자리에서도 또렷한 자리에 놓여요 — 길흉으로 가를 일이 아니라, 잘 쓰면 강점이 되는 '중립 자원'(매력·자립·전문성 같은)이에요. 좋고 나쁨을 따지기보다 이 기운을 어디에 쓸지 방향만 정하면 그대로 무기가 돼요.`,
            en: `Your innate ${te} resource also sits in a clear spot in your chart — not a matter of good or bad luck but a "neutral resource" (charm, self-reliance, expertise) that becomes a strength when used well. Rather than weighing it as fortune, just decide where to point it and it turns into a tool.`,
          },
        }
      : {
          tone: 'neutral',
          reason: {
            ko: `사주엔 ${tk} 자원이 있는데 별자리에선 그 자리가 잔잔해요 — 길흉의 문제가 아니라 아직 깨우지 않은 중립 자원이에요. 의식적으로 꺼내 쓸 자리에 데려다 놓으면 그제야 제 몫을 해요.`,
            en: `Your Saju carries a ${te} resource while that spot is quiet in your chart — not a fortune question but a neutral resource not yet awakened. Bring it deliberately into places where it gets used and it starts to pull its weight.`,
          },
        }
  }
  const benefic = mapping.polarity > 0
  if (benefic) {
    return planetEmphasized
      ? {
          tone: 'resonant',
          reason: {
            ko: `타고난 복이 향하는 ${tk} 기운이 별자리에서도 힘 있는 자리에 놓여요 — 동·서양이 똑같이 이 분야를 복이자 강점으로 봐요. 위기 때 의외의 도움이 들어오거나 결정적 순간에 운이 따라주는 자리라, 평소 사람과 인연을 잘 가꿔두면 그 복이 더 자주 발동해요. 타고난 복도 쓰지 않으면 잠들어 있으니, 이 강점을 적극적으로 무대에 올리세요.`,
            en: `The ${te} energy your inborn luck favors also sits in a strong spot in your chart — both systems read this field as a blessing and a strength. It's a place where unexpected help arrives in a pinch or luck shows up at the decisive moment, so tending people and ties keeps that fortune firing more often. Even inborn luck sleeps if unused, so put this strength on stage on purpose.`,
          },
        }
      : {
          tone: 'complement',
          reason: {
            ko: `사주엔 ${tk} 기운의 복이 또렷한데, 별자리에선 그 자리가 잔잔해요 — 타고난 복이 자동으로 터지기보다 의식적으로 살려야 빛나는 구조예요. 가만히 기다리기보다 그 기운을 쓸 자리에 스스로를 데려다 놓으면, 잠재된 복이 현실의 결과로 바뀌어요. 있는 복을 안 쓰고 묵히지 않는 게 핵심이에요.`,
            en: `Your Saju carries a clear ${te} blessing, while that spot is quieter in your chart — the luck shines when you activate it on purpose rather than waiting for it to fire by itself. Instead of sitting still, put yourself where that energy gets used and the latent blessing turns into real results. The key is not to let good fortune sit idle.`,
          },
        }
  }
  return planetEmphasized
    ? {
        tone: 'tension',
        reason: {
          ko: `타고난 강한 추진력이 향하는 ${tk} 쪽이 별자리에서도 도드라져요 — 추진력과 승부욕이 양쪽에서 증폭돼 힘이 두 배가 되는 자리예요. 잘 쓰면 누구도 못 따라오는 돌파력이 되지만, 욱하거나 과속하면 그 힘이 자기를 향하기 쉬워요. 센 기운일수록 '한 박자 쉬는' 안전장치를 미리 정해두면 강점만 남아요.`,
          en: `The ${te} side in your nature is pronounced in your chart too — drive and competitiveness amplify on both sides, doubling the force. Used well it's breakthrough power no one can match, but flare up or overspeed and that force turns on you. The stronger the energy, the more a pre-set "pause one beat" safeguard leaves only the strength.`,
        },
      }
    : {
        tone: 'complement',
        reason: {
          ko: `사주엔 추진력·승부욕의 센 기운이 있는데, 별자리에선 그 자리가 약해 거친 결이 한결 눌려요 — 안에선 뜨거운데 겉으론 차분해 보이는, 속도 조절이 되는 구조예요. 그 내면의 힘을 너무 억누르기만 하면 동력이 줄 수 있으니, 안전한 통로(운동·도전·목표)로 풀어주는 게 좋아요. 센 기운을 길들여 쓰는 데 유리한 조합이에요.`,
          en: `Your Saju carries strong drive and competitiveness, but that spot is weak in your chart, so the rough edge is tempered — hot inside yet calm outside, a built-in speed governor. Suppressing that inner force entirely can sap your momentum, so release it through safe channels (exercise, challenges, goals). It's a combination well-suited to taming strong energy into use.`,
        },
      }
}

/** 관계: 사주 합/충 ↔ 점성 조화각/긴장각의 우세 방향. */
export function evalRelations(
  hap: number,
  chung: number,
  harmonious: number,
  hard: number,
  gender: 'male' | 'female' = 'male',
  childStarCount = 0,
  isMinor = false
): CrossVerdict | null {
  if (hap + chung + harmonious + hard === 0) return null
  const sajuHarmony = hap - chung
  const astroHarmony = harmonious - hard
  const base: { tone: CrossVerdict['tone']; ko: string; en: string } =
    sajuHarmony > 0 && astroHarmony > 0
      ? {
          tone: 'resonant',
          ko: '사람들과 잘 어울리고 관계가 매끄럽게 풀리는 편 — 사주의 합(合)과 별자리의 부드러운 각이 둘 다 그렇게 봐요. 사람을 끌어모으고 곁에 두는 게 타고난 자산이라, 인맥과 협업이 인생의 큰 동력이 돼요. 다만 다들 좋게 봐주는 만큼 싫은 소리를 미루다 속앓이하기 쉬우니, 할 말은 부드럽게라도 그때그때 해두는 게 관계를 더 오래 가게 해요.',
          en: "You get along easily and relationships flow — your Saju's unions and your chart's soft aspects both agree. Drawing people in and keeping them close is a natural asset, so connections and collaboration become a major engine in your life. Just don't let being well-liked make you swallow hard truths — saying the awkward thing gently and on time is what keeps the bond lasting.",
        }
      : sajuHarmony < 0 && astroHarmony < 0
        ? {
            tone: 'tension',
            ko: '관계에서 부딪힘이 좀 있는 편인데 — 사주의 충(沖)과 별자리의 단단한 각이 둘 다 그렇게 짚어요. 사람과 쉽게 매끄럽진 않아도 그 마찰을 거치며 진짜 내 사람을 가려내고 더 단단해지는 타입이에요. 모두와 잘 지내려 애쓰기보다, 부딪혀도 끝까지 남는 소수에게 마음을 모으면 관계가 훨씬 편해져요.',
            en: "Relationships bring some friction — your Saju's clashes and your chart's hard aspects both point that way. You don't connect smoothly with everyone, but you grow tougher through the friction and sift out who's truly yours. Rather than straining to please everyone, pour your heart into the few who stay after the clash, and relationships get far easier.",
          }
        : {
            tone: 'complement',
            ko: '어떤 관계는 매끄럽고 어떤 관계는 부딪혀요 — 사주와 별자리가 다른 결을 짚어, 상황 따라 두 모습이 다 나오는 균형형이에요. 잘 맞는 사람과는 깊게, 부딪히는 사람과는 거리를 두는 식으로 자연스럽게 나눠 쓰면 돼요. 모든 관계를 똑같이 잘하려 애쓰지 않는 게 오히려 에너지를 아끼는 길이에요.',
            en: 'Some ties flow, some clash — Saju and chart read different grains, so you show both sides depending on the situation, a balanced type. Go deep with the people who fit and keep distance from the ones who grate — you sort it naturally. Not trying to ace every relationship equally is actually how you save your energy.',
          }

  // ── 성별 자식성(子息星) — 남: 관성, 여: 식상 ──
  // 미성년 안전 모드: 자녀·후대 서술은 아동에게 부적합하므로 생략(기본 관계 해석만).
  if (isMinor) {
    return { tone: base.tone, reason: { ko: base.ko, en: base.en } }
  }
  const g = gender === 'female'
  const starKo = g ? '식상' : '관성'
  const starEn = g ? 'the Output star' : 'the Officer star'
  const who = g ? '여자' : '남자'
  const whoEn = g ? "a woman's" : "a man's"
  const present = childStarCount > 0
  const childKo = present
    ? ` 또 ${who} 사주에서 자식 자리는 ${starKo}인데 원국에 자리해, 자녀·후대와의 인연이나 무언가를 길러내는 결이 또렷한 편이에요.`
    : ` 또 ${who} 사주에서 자식 자리는 ${starKo}인데 뚜렷하진 않아, 자녀든 일이든 '길러내는' 인연은 양보다 깊이로 가꿔가는 쪽이에요.`
  const childEn = present
    ? ` Also, ${whoEn} child indicator is ${starEn}, and it sits in your chart — a clear thread for raising the next generation, or nurturing something into being.`
    : ` Also, ${whoEn} child indicator is ${starEn}, and it's faint — the "raising" bond, whether children or work, grows by depth rather than volume.`

  return { tone: base.tone, reason: { ko: base.ko + childKo, en: base.en + childEn } }
}

/** 강점: 12운성(일주) ↔ 차트에서 가장 위신 높은 행성. */
const STRONG_STAGES = new Set(['장생', '관대', '건록', '제왕'])
const WEAK_STAGES = new Set(['병', '사', '묘', '절'])

export function evalStrength(
  twelveStage: string | undefined,
  topDignity: { planet: string; status: string } | null,
  rooted?: boolean,
  sect?: 'day' | 'night'
): CrossVerdict | null {
  if (!twelveStage && !topDignity && rooted === undefined) return null
  const sajuStrong = twelveStage ? STRONG_STAGES.has(twelveStage) : false
  const sajuWeak = twelveStage ? WEAK_STAGES.has(twelveStage) : false
  const astroStrong = !!topDignity
  const stk = topDignity ? planetTheme(topDignity.planet, 'ko') : ''
  const ste = topDignity ? planetTheme(topDignity.planet, 'en') : ''
  const base: CrossVerdict = (() => {
    if (sajuStrong && astroStrong)
      return {
        tone: 'resonant',
        reason: {
          ko: `타고난 힘이 가장 셀 자리에 있고, 별자리에선 ${stk} 쪽이 특히 강해요 — 사주의 기세와 점성의 강한 자리가 같은 방향으로 모인 셈이에요. 한 분야를 깊게 파고들면 누구보다 또렷하게 두각을 내는 구조라, 이것저것 벌이기보다 ${stk} 쪽 한 우물에 힘을 모으는 게 유리해요. 가진 힘이 큰 만큼 자만이나 과속만 조심하면 멀리 가요.`,
          en: `Your power sits at its strongest, and in your chart the ${ste} side is especially strong — Saju's momentum and the chart's strong placement gather in one direction. You stand out sharpest when you dig deep into one field, so it pays to pool your force into the ${ste} lane rather than spreading thin. With this much power, just guard against overconfidence and overspeed and you'll go far.`,
        },
      }
    if (astroStrong)
      return {
        tone: 'complement',
        reason: {
          ko: `별자리에서 ${stk} 쪽이 가장 힘 있는 자리예요 — 사주가 또렷이 받쳐주진 않아도, 점성이 가리키는 이 분야는 분명한 강점이에요. 자신 없을 때도 ${stk} 영역에 서면 의외로 힘이 나니, 진로나 역할을 정할 때 이 자리를 기준점으로 삼으면 좋아요. 타고났다 믿고 꾸준히 쓰면 점점 더 단단해지는 강점이에요.`,
          en: `In your chart the ${ste} side is your strongest placement — even if Saju doesn't loudly back it, the field your chart points to is a clear strength. You find unexpected power standing in the ${ste} arena even on low days, so use it as your anchor when choosing a path or role. Trust it as innate and keep using it, and it only grows sturdier.`,
        },
      }
    if (sajuStrong)
      return {
        tone: 'complement',
        reason: {
          ko: '타고난 힘이 안정적으로 받쳐주는 자리예요 — 별자리가 특정 분야를 콕 집어주진 않지만, 사주의 기세가 어디서든 자기 자리를 잡게 해줘요. 화려한 한 방보다 버티고 쌓는 데 강하니, 시간이 걸려도 꾸준히 가는 길이 잘 맞아요. 흔들려도 결국 제자리를 찾는 힘이 있어요.',
          en: "Your foundation is solid — your chart doesn't pinpoint one field, but Saju's momentum lets you claim your ground anywhere. You're strong at enduring and stacking rather than landing one flashy hit, so the slow, steady path suits you even when it takes time. However shaken, you have the power to find your footing again.",
        },
      }
    if (sajuWeak)
      return {
        tone: 'neutral',
        reason: {
          ko: '지금은 힘을 비축하는 단계예요 — 지금은 정점이 아니라 충전기라, 무리하게 밀어붙이기보다 안으로 쌓아두는 게 맞아요. 이 시기에 배우고 다져둔 건 다음 상승기에 고스란히 터져 나와요. 조급함만 내려놓으면 오히려 깊어지는 때예요.',
          en: "This is a power-storing phase — you're in a recharge, not a peak, so it's better to build inward than to push hard. What you learn and firm up now pays out in full at the next rise. Set down the impatience and this becomes a season that deepens you instead.",
        },
      }
    return {
      tone: 'neutral',
      reason: {
        ko: '특정 분야에 확 쏠리기보다 여러 면이 고르게 퍼진 균형형이에요 — 사주도 별자리도 한쪽으로 몰지 않아, 두루 잘하는 제너럴리스트에 가까워요. 한 우물만 파야 한다는 부담은 내려놔도 돼요. 여러 경험을 잇는 자리에서 오히려 가장 빛나는 타입이에요.',
        en: 'No single spike — your strengths spread evenly, and neither Saju nor chart tilts one way, so you lean generalist, good across the board. You can drop the pressure to dig only one well. You actually shine most in roles that connect varied experiences.',
      },
    }
  })()

  let sufKo = ''
  let sufEn = ''
  // 통근(通根) — 일간이 지지에 뿌리내렸나. 심지의 단단함을 한 줄로.
  if (rooted === true) {
    sufKo +=
      ' 게다가 일간이 통근(지지에 뿌리)해 심지가 단단하고, 흔들려도 자기 중심으로 돌아오는 복원력이 있어요.'
    sufEn +=
      ' On top of that, your day master is rooted, so your core is firm — even when shaken, you return to your own center.'
  } else if (rooted === false) {
    sufKo +=
      ' 다만 일간이 통근하지 못해 환경·사람에 영향을 잘 받는 편이라, 좋은 환경을 고르는 것 자체가 곧 자기관리예요.'
    sufEn +=
      ' That said, your day master is unrooted, so environment and people sway you easily — choosing a good environment is itself your self-care.'
  }
  // sect(주야) — 같은 섹트의 길성이 '타고난 아군'. 밤=금성, 낮=목성.
  if (sect === 'night') {
    sufKo +=
      ' 또 밤에 태어나 금성이 당신 편(같은 섹트의 길성)이라, 사람·관계·아름다움이 어려울 때 의외의 힘이 돼요.'
    sufEn +=
      ' Born by night, Venus is your ally (in-sect benefic) — people, relationship, and beauty become unexpected help when things get hard.'
  } else if (sect === 'day') {
    sufKo +=
      ' 또 낮에 태어나 목성이 당신 편(같은 섹트의 길성)이라, 확장·기회·행운이 결정적일 때 따라주는 편이에요.'
    sufEn +=
      ' Born by day, Jupiter is your ally (in-sect benefic) — expansion, opportunity, and luck tend to show up at the decisive moment.'
  }
  return sufKo
    ? { ...base, reason: { ko: base.reason.ko + sufKo, en: base.reason.en + sufEn } }
    : base
}

// ── 분포·전체급 교차 (차트의 모든 글자/행성을 집계) ────────────────────────

/** 오행 카운트(한/영 키 혼용) → 우세 원소 + 동률 여부. */
function dominantSajuElementTied(
  counts: Record<string, number> | undefined
): { key: SajuElement; tied: boolean } | undefined {
  if (!counts) return undefined
  const agg: Record<SajuElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const [k, v] of Object.entries(counts)) {
    const el = normSajuElement(k)
    if (el && typeof v === 'number') agg[el] += v
  }
  const top = pickExtreme(agg, SAJU_ELS, 'max')
  return top && top.value > 0 ? { key: top.key, tied: top.tied } : undefined
}

/** 오행 카운트(한/영 키 혼용)에서 가장 강한 원소. */
export function dominantSajuElement(
  counts: Record<string, number> | undefined
): SajuElement | undefined {
  return dominantSajuElementTied(counts)?.key
}

/**
 * 점성 sign 배열에서 가장 강한 원소.
 *
 * 주의: signToSajuElement 는 fire→fire / earth→earth / water→water / air→wood 라,
 * 여기서 'wood' 는 *오직 공기(air) 별자리에서만* 나오고 'metal' 은 절대 안 나온다.
 * air→wood 는 4원소를 5행에 끼워 맞춘 *무손실 아님*(근사)이므로, 동률일 때
 * 근사값(wood=air)이 무손실 원소(fire/earth/water)를 이기지 않게 한다 — 이전엔
 * SAJU_ELS 순서상 wood 가 맨 앞이라 동률에서 air 가 과대 선택됐다(ENGINE-AUDIT).
 */
export function dominantAstroElement(signs: string[] | undefined): SajuElement | undefined {
  if (!signs || signs.length === 0) return undefined
  const agg: Record<SajuElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const s of signs) {
    const el = signToSajuElement(s)
    if (el) agg[el] += 1
  }
  // 무손실 원소(불·흙·물) 중 최댓값을 먼저 고른다.
  let best: SajuElement | undefined
  let bestN = -1
  for (const el of ['fire', 'earth', 'water'] as SajuElement[]) {
    if (agg[el] > bestN) {
      bestN = agg[el]
      best = el
    }
  }
  // 근사값 wood(=air)는 무손실 원소를 *엄격히 초과*할 때만 우세로 인정(동률은 무손실 우선).
  if (agg.wood > bestN) {
    best = 'wood'
    bestN = agg.wood
  }
  return bestN > 0 ? best : undefined
}

/** 기질: 사주 오행 분포 ↔ 점성 원소 분포 — 차트 전체의 우세 기운을 교차. */
export function evalTemperament(
  sajuCounts: Record<string, number> | undefined,
  astroSigns: string[] | undefined
): CrossVerdict | null {
  const aTop = dominantSajuElementTied(sajuCounts)
  const a = aTop?.key
  const b = dominantAstroElement(astroSigns)
  if (!a || !b) return null
  // dominantAstroElement 의 'wood' 는 *항상 공기(air) 별자리 유래*다(다른 사인은
  // 무손실로 5행에 들어가고 air 만 wood 로 근사). 그래서 b==='wood' 면 evalIdentity
  // 와 동일하게 공기 헤지(원소명 '공기' 표기 + 근사 경고)를 적용해, 분포 우세
  // 평가에서 木 라벨이 새거나 '같은 결' 거짓 수렴이 단정되지 않게 한다(ENGINE-AUDIT).
  const airDom = b === 'wood'
  const v = elementVerdict(a, b, {
    aKo: '사주가 본 성향',
    aEn: 'Saju-read side',
    bKo: '별자리가 본 성향',
    bEn: 'astrology-read side',
    bTrait: airDom ? AIR_TRAIT_OVERRIDE : undefined,
    bLabel: airDom ? AIR_ELEMENT_LABEL : undefined,
    airApprox: airDom,
  })
  // 사주 우세 원소가 동률이면(예: 木·火 둘 다 3개) 단정조 대신 '약간 앞섬' 헤지.
  return aTop?.tied ? withHedge(v, DOM_TIE_HEDGE) : v
}

// 십신 5그룹 → 대표 행성 (A급 매핑 방향과 일치).
const SIBSIN_GROUP_PLANETS: Record<string, string[]> = {
  관성: ['Saturn', 'Mars'],
  재성: ['Venus', 'Mercury'],
  인성: ['Jupiter', 'Moon'],
  식상: ['Mercury'],
  비겁: ['Sun', 'Mars'],
}
// 그룹별 "쉬운 말" 테마.
const SIBSIN_GROUP_THEME: Record<string, { ko: string; en: string }> = {
  관성: { ko: '책임감·체계', en: 'duty and structure' },
  재성: { ko: '실리·현실 감각', en: 'practicality and realism' },
  인성: { ko: '배움·돌봄', en: 'learning and care' },
  식상: { ko: '표현·창의', en: 'expression and creativity' },
  비겁: { ko: '주체성·승부욕', en: 'independence and drive' },
}
const SIBSIN_GROUPS = ['비겁', '식상', '재성', '관성', '인성']

/** 십신 그룹 카운트 → 우세 그룹 + 동률 여부. */
function dominantSibsinGroupTied(
  details: Record<string, number> | undefined
): { key: string; tied: boolean } | undefined {
  if (!details) return undefined
  const agg: Record<string, number> = {}
  for (const g of SIBSIN_GROUPS) agg[g] = details[g] ?? 0
  const top = pickExtreme(agg, SIBSIN_GROUPS, 'max')
  return top && top.value > 0 ? { key: top.key, tied: top.tied } : undefined
}

/** 십신 그룹 카운트에서 가장 강한 그룹. */
export function dominantSibsinGroup(
  details: Record<string, number> | undefined
): string | undefined {
  return dominantSibsinGroupTied(details)?.key
}

/** 에너지 방향: 십신 우세 그룹 ↔ 그 그룹의 대표 행성이 차트에서 강조됐는가. */
export function evalEnergyDirection(
  details: Record<string, number> | undefined,
  emphasizedPlanets: Set<string>
): CrossVerdict | null {
  const top = dominantSibsinGroupTied(details)
  if (!top) return null
  const group = top.key
  const planets = SIBSIN_GROUP_PLANETS[group] ?? []
  const theme = SIBSIN_GROUP_THEME[group]
  const matched = planets.filter((p) => emphasizedPlanets.has(p))
  const v: CrossVerdict =
    matched.length > 0
      ? {
          tone: 'resonant',
          reason: {
            ko: `타고난 기질에서 가장 큰 비중이 '${theme.ko}'인데, 그 대표 행성도 별자리에서 강조돼 있어요 — 동·서양이 똑같이 이 쪽으로 에너지가 모인다고 봐요. 한눈팔지 않고 ${theme.ko} 한 방향으로 밀어붙일 때 가장 효율이 나는 사람이라, 진로·시간 배분도 이 축에 맞추면 덜 흔들려요. 힘이 모인 만큼 다른 영역이 비기 쉬우니, 가끔 반대편도 의식해 채워두면 균형이 좋아져요.`,
            en: `What you value most is ${theme.en}, and its signature planet is emphasized in your chart too — both systems agree your energy gathers here. You run most efficiently pushing ${theme.en} in one undivided direction, so aligning your path and time to this axis keeps you steady. With force this concentrated, other areas can run thin, so consciously topping up the opposite side now and then keeps you balanced.`,
          },
        }
      : {
          tone: 'complement',
          reason: {
            ko: `타고난 기질에서 '${theme.ko}' 쪽이 강한데, 별자리는 그 힘을 다른 통로로 풀어줘요 — 같은 에너지를 여러 방식으로 쓰는, 응용 범위가 넓은 타입이에요. 한 우물만 파야 한다는 부담 없이, ${theme.ko} 힘을 여러 분야에 옮겨 쓰는 게 오히려 강점이 돼요. 본질(${theme.ko})은 같으니, 겉으로 하는 일이 달라져도 자기 결을 잃지 않아요.`,
            en: `Your ${theme.en} side is strong, while your chart channels that force through other routes — a wide-range type who uses the same energy in many ways. Without the pressure to dig only one well, transferring your ${theme.en} power across fields is actually your strength. The essence (${theme.en}) stays the same, so even as the outward work changes, you never lose your own grain.`,
          },
        }
  // 우세 십신 그룹이 동률이면 단정 대신 헤지.
  return top.tied ? withHedge(v, SIBSIN_TIE_HEDGE) : v
}

/** 드러나는 나: 일간(본질) ↔ ASC(첫인상·외적 자아). */
export function evalPersona(
  dayMasterEl: string | undefined,
  ascSign: string | undefined
): CrossVerdict | null {
  const a = normSajuElement(dayMasterEl)
  const b = signToSajuElement(ascSign)
  if (!a || !b) return null
  return elementVerdict(a, b, {
    aKo: '속 모습',
    aEn: 'inner self',
    bKo: '남에게 비치는 첫인상',
    bEn: 'first impression',
    bTrait: signTraitOverride(ascSign),
    bLabel: signElementLabel(ascSign),
    airApprox: isAirSign(ascSign),
    tailKo:
      '첫인상과 진짜 속이 다른 만큼, 처음엔 가볍게 다가가되 시간을 두고 진짜 결을 보여주면 신뢰가 더 깊어져요.',
    tailEn:
      'Since your first impression differs from your true self, let people in gradually — the deeper grain earns lasting trust.',
  })
}

/** 추진력: 신강약(사주) ↔ 자기주장 행성(태양·화성) 강조 여부. */
export function evalDrive(
  strengthLevel: string | undefined,
  selfEmphasized: boolean,
  drivePlanetCondition: 'strong' | 'weak' | 'neutral' = 'neutral',
  gwansalHonjap = false
): CrossVerdict | null {
  if (!strengthLevel) return null
  const s = strengthLevel.toLowerCase()
  const strong = /강|strong/.test(s) && !/약/.test(strengthLevel)
  const weak = /약|weak/.test(s)
  const base: CrossVerdict = (() => {
    if (strong)
      return selfEmphasized
        ? {
            tone: 'resonant',
            reason: {
              ko: '타고나길 자기 주도로 밀어붙이는 힘이 강하고, 별자리도 앞에 나서는 기질(태양·화성 강조)을 받쳐줘요 — 동·서양이 똑같이 리더·행동파로 봐요. 결정하고 책임지는 자리에 설 때 가장 살아나니, 누군가 시키길 기다리기보다 먼저 판을 여는 역할이 잘 맞아요. 추진력이 센 만큼 주변 속도도 한 번씩 살펴주면 혼자 너무 앞서가지 않아요.',
              en: "You're wired to drive things yourself, and your chart backs it (Sun/Mars emphasis) — both systems read leader/doer. You come alive in seats where you decide and own the outcome, so opening the game first suits you better than waiting to be told. With drive this strong, glancing back at everyone else's pace now and then keeps you from racing too far ahead alone.",
            },
          }
        : {
            tone: 'complement',
            reason: {
              ko: '타고난 추진력은 센데, 별자리는 그 힘을 부드럽게 다듬어줘요 — 세지만 거칠지 않은, 안에 강단이 있는 타입이에요. 평소엔 유연하다가 결정적 순간에 단단함이 나오는 구조라, 급할수록 오히려 차분하게 밀고 가면 신뢰를 얻어요. 속의 추진력을 너무 누르지만 않으면 좋은 균형이에요.',
              en: "Strong inner drive, softened by your chart — forceful but not rough, with steel kept inside. You're flexible day to day and firm at the decisive moment, so pushing calmly when things get urgent earns trust. Just don't bottle the drive too tightly and it's a fine balance.",
            },
          }
    if (weak)
      return selfEmphasized
        ? {
            tone: 'tension',
            reason: {
              ko: '타고나길 받쳐주고 조율하는 쪽인데 별자리는 앞에 나서라 부추겨요(태양·화성 강조) — 속도와 무대가 엇갈릴 수 있어요. 안에선 신중하게 받쳐주고 싶은데 밖에선 리더를 기대받는, 그 사이의 긴장을 안고 사는 타입이에요. 둘 중 하나를 죽이기보다, 준비는 조용히 하되 결과만 앞에서 보여주는 식으로 번갈아 쓰면 둘 다 강점이 돼요.',
              en: "You're built to support and harmonize, but your chart pushes you to the front (Sun/Mars emphasis) — pace and stage can pull apart. Inside you want to back others carefully, while outside you're expected to lead, and you carry that tension. Rather than killing one side, prep quietly but show the result up front — alternate them and both become strengths.",
            },
          }
        : {
            tone: 'resonant',
            reason: {
              ko: '타고나길 혼자 밀어붙이기보다 받쳐주고 조율하는 데 강한데, 별자리도 같은 결이에요 — 동·서양 둘 다 든든한 조력자형으로 봐요. 앞에 나서는 화려함보다 판을 굴러가게 만드는 힘이라, 좋은 2인자·기획자·조율자 자리에서 가장 빛나요. 굳이 리더처럼 보이려 애쓰지 않아도 당신 없으면 안 돌아가는 사람이 돼요.',
              en: "You're built to support and harmonize rather than force, and your chart agrees — both systems read a dependable enabler. Your power is making the machine run, not standing in the spotlight, so you shine as a great number-two, planner, or coordinator. No need to perform like a leader — you become the person things can't run without.",
            },
          }
    return {
      tone: 'neutral',
      reason: {
        ko: '주도와 조율 사이에서 균형 잡힌 편이에요 — 사주도 별자리도 한쪽으로 몰지 않아, 상황에 따라 앞에 서기도 받쳐주기도 해요. 이 유연함이 강점이라, 팀에선 빈 역할을 메우는 사람이 되기 쉬워요. 다만 매번 남에게 맞추다 자기 페이스를 잃지 않게, 정말 원하는 게 뭔지는 스스로 한 번씩 확인해 두면 좋아요.',
        en: "Balanced between leading and supporting — neither Saju nor chart tilts one way, so you step up or step back as the moment calls. That flexibility is a strength; on a team you tend to fill whatever role is missing. Just don't lose your own pace always adapting to others — check in with what you actually want now and then.",
      },
    }
  })()

  let sufKo = ''
  let sufEn = ''
  // dignity 강도 — 추진 행성(태양·화성)이 제 자리인지로 "거침없이/엇박" 뉘앙스.
  // selfEmphasized(태양·화성 강조)일 때만 의미 있다.
  if (selfEmphasized && drivePlanetCondition === 'strong') {
    sufKo +=
      ' 게다가 그 추진의 핵심 행성이 제 자리(본궁·고양)에 있어, 의욕이 곧장 행동으로 거침없이 이어져요.'
    sufEn +=
      ' On top of that, the key drive planet sits in its own dignity, so intent flows straight into action without friction.'
  } else if (selfEmphasized && drivePlanetCondition === 'weak') {
    sufKo +=
      ' 다만 그 추진 행성이 약한 자리(손상·쇠약)라 의욕은 큰데 방향이 자주 엇나가니, 욱하기 전에 한 박자만 점검하면 힘이 제대로 실려요.'
    sufEn +=
      ' That said, the drive planet is debilitated, so the urge runs high but the aim wanders — pause one beat before reacting and the force lands where you want it.'
  }
  // 관살혼잡(官殺混雜) — 정관+편관 공존. 규범과 돌파가 한 사람 안에 섞임.
  if (gwansalHonjap) {
    sufKo +=
      ' 또 사주에 정관·편관이 섞여(관살혼잡) — 규범을 지키려는 힘과 틀을 깨려는 힘이 한 사람 안에 공존해, 다재다능하지만 안에서 두 동력이 부딪히기도 해요. 역할을 나눠 번갈아 쓰면 약점이 강점이 돼요.'
    sufEn +=
      ' Also, both Direct and Indirect Officer sit in your chart (mixed authority) — the urge to keep the rules and the urge to break them coexist, making you versatile yet inwardly torn at times. Split the roles and alternate them, and the friction becomes a strength.'
  }
  return sufKo
    ? { ...base, reason: { ko: base.reason.ko + sufKo, en: base.reason.en + sufEn } }
    : base
}

// 행성 쌍 → 의미·테마(쉬운 말). 키는 알파벳순 "A|B".
const PERSONAL_PLANETS = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'])
const MAJOR_ASPECTS = new Set(['conjunction', 'sextile', 'square', 'trine', 'opposition'])
const ASPECT_PAIR_THEME: Record<string, { ko: string; en: string; group: string }> = {
  'Jupiter|Sun': {
    ko: '타고난 낙천과 자신감 — 기회를 크게 보고 사람을 끌어요.',
    en: 'Born optimism and confidence — you think big and draw people in.',
    group: '인성',
  },
  'Mars|Sun': {
    ko: '에너지가 넘치고 앞장서는 행동파예요.',
    en: 'High energy, first to act — a doer.',
    group: '비겁',
  },
  'Saturn|Sun': {
    ko: '일찍 철든 책임감형 — 인정은 늦게 와도 단단하게 쌓여요.',
    en: 'Mature and responsible early — recognition comes slow but solid.',
    group: '관성',
  },
  'Moon|Venus': {
    ko: '정 많고 사람을 끄는 다정한 매력형이에요.',
    en: 'Warm and magnetic — people feel at ease with you.',
    group: '재성',
  },
  'Moon|Saturn': {
    ko: '감정을 안으로 삭이는 진중하고 어른스러운 타입이에요.',
    en: 'You hold feelings in — steady and grown-up.',
    group: '인성',
  },
  'Mars|Moon': {
    ko: '감정이 솔직하고 열정적 — 가끔 욱하지만 뒤끝은 없어요.',
    en: 'Honest, passionate feelings — quick to flare, quick to let go.',
    group: '비겁',
  },
  'Mercury|Saturn': {
    ko: '말과 생각이 신중하고 논리적인 편이에요.',
    en: 'Careful, logical in thought and speech.',
    group: '관성',
  },
  'Mars|Venus': {
    ko: '관계·연애에 적극적이고 매력을 잘 드러내요.',
    en: 'Forward in love and quick to show your charm.',
    group: '재성',
  },
  'Saturn|Venus': {
    ko: '관계에 신중하고 진지 — 한번 정하면 오래가요.',
    en: 'Careful and serious in love — once you commit, it lasts.',
    group: '관성',
  },
  'Mars|Saturn': {
    ko: '참을성 있게 끝까지 밀어붙이는 인내형이에요.',
    en: 'Patient, you push through to the end.',
    group: '관성',
  },
  'Moon|Sun': {
    ko: '속과 겉이 한 방향 — 자기 자신과 잘 합의된 사람이에요.',
    en: 'Inner and outer in sync — at peace with yourself.',
    group: '비겁',
  },
  'Jupiter|Mercury': {
    ko: '배우고 가르치는 데 강하고 시야가 넓어요.',
    en: 'Strong at learning and teaching, with a wide view.',
    group: '인성',
  },
  'Jupiter|Moon': {
    ko: '정서가 넉넉하고 낙천적이라 사람들이 편하게 느껴요.',
    en: 'Generous, easygoing feelings — others relax around you.',
    group: '인성',
  },
  'Mercury|Venus': {
    ko: '말·글·미적 감각이 좋은 표현형이에요.',
    en: 'A natural communicator with good taste.',
    group: '식상',
  },
  'Mercury|Sun': {
    ko: '생각이 또렷하고 자기 표현이 분명한 편이에요.',
    en: 'Clear-minded and articulate about who you are.',
    group: '식상',
  },
}
interface AspectLike {
  from?: { name?: string }
  to?: { name?: string }
  type?: string
  orb?: number
}

// 각의 성질(하드/소프트/중립) — 톤·문구가 달라야 한다. 같은 행성쌍이라도
// 스퀘어(하드)는 마찰을 통한 단련, 트라인(소프트)은 자연스러운 흐름이라 의미가 다르다.
const HARD_ASPECTS = new Set(['square', 'opposition'])
const SOFT_ASPECTS = new Set(['sextile', 'trine'])
function aspectClass(type: string): 'hard' | 'soft' | 'neutral' {
  if (HARD_ASPECTS.has(type)) return 'hard'
  if (SOFT_ASPECTS.has(type)) return 'soft'
  return 'neutral' // conjunction — 융합·증폭
}

/** 핵심 각: 가장 강한(orb 작은) 주요 행성 각 1개의 의미 ↔ 사주 우세 십신. */
export function evalKeyAspect(
  aspects: AspectLike[] | undefined,
  sajuDominantGroup: string | undefined
): CrossVerdict | null {
  if (!aspects || aspects.length === 0) return null
  let best: {
    key: string
    pairKo: string
    pairEn: string
    orb: number
    cls: 'hard' | 'soft' | 'neutral'
  } | null = null
  for (const a of aspects) {
    const p1 = a.from?.name
    const p2 = a.to?.name
    const type = String(a.type ?? '').toLowerCase()
    if (!p1 || !p2 || !PERSONAL_PLANETS.has(p1) || !PERSONAL_PLANETS.has(p2)) continue
    if (!MAJOR_ASPECTS.has(type)) continue
    const key = [p1, p2].sort().join('|')
    if (!ASPECT_PAIR_THEME[key]) continue
    // orb 가 숫자가 아니거나 NaN 이면 99 센티넬로 끼워넣지 말고 건너뛴다 — 예전엔
    // 망가진 orb 가 99 로 둔갑해, 멀쩡한 각이 없을 때 임의의 '핵심각'을 냈다(ENGINE-AUDIT).
    if (typeof a.orb !== 'number' || Number.isNaN(a.orb)) continue
    const orb = Math.abs(a.orb)
    if (!best || orb < best.orb) {
      const pairKo = `${PLANET_LABEL[p1]?.ko ?? p1}·${PLANET_LABEL[p2]?.ko ?? p2}`
      const pairEn = `${PLANET_LABEL[p1]?.en ?? p1}–${PLANET_LABEL[p2]?.en ?? p2}`
      best = { key, pairKo, pairEn, orb, cls: aspectClass(type) }
    }
  }
  if (!best) return null
  const theme = ASPECT_PAIR_THEME[best.key]
  const matches = sajuDominantGroup === theme.group

  // 톤: 하드각은 마찰각이라 일치해도 '강점'으로 단정하지 않고 긴장(단련)으로 둔다.
  // 소프트각만 무조건 강점(일치 시 resonant). 컨정션(중립)은 융합·증폭이라 소프트처럼 취급.
  const tone: CrossVerdict['tone'] =
    best.cls === 'hard' ? 'tension' : matches ? 'resonant' : 'complement'

  // 각 성질별 결(흐름) 문구 — 같은 행성쌍이라도 하드/소프트면 의미가 갈린다.
  const flowKo =
    best.cls === 'hard'
      ? ' 다만 이 각은 긴장각이라 마찰을 통해 단련되는 결이에요 — 거저 주어지기보다 부딪히며 벼려지는 힘이라, 갈등을 피하지 않고 통과할 때 진짜 강점이 돼요.'
      : best.cls === 'soft'
        ? ' 이 각은 조화각이라 자연스럽게 흐르는 결이에요 — 애써 끌어내지 않아도 편하게 발휘되는 면이에요.'
        : ' 이 각은 두 기운이 한 점에 융합돼 강하게 증폭되는 결이에요 — 좋게 쓰면 큰 무기지만 한쪽으로 쏠리기도 쉬워요.'
  const flowEn =
    best.cls === 'hard'
      ? " That said, this is a hard aspect, forged through friction — it isn't handed to you but tempered by clashing, so it becomes a real strength only when you pass through the tension rather than avoid it."
      : best.cls === 'soft'
        ? ' This is a soft aspect that flows naturally — a side that comes through with ease, without forcing.'
        : ' This is a conjunction, where the two energies fuse at one point and amplify strongly — a great asset used well, but easy to over-lean on.'

  const matchKo = matches
    ? ' 사주의 우세 성향과도 같은 결이라, 이 면이 특히 도드라져요.'
    : ' 사주가 본 우세 성향과는 결이 달라, 상황에 따라 꺼내 쓰는 또 하나의 카드예요.'
  const matchEn = matches
    ? '. Your dominant Saju trait runs the same grain, so this stands out.'
    : '. It runs a different grain from your dominant Saju trait — another card to play as the situation calls.'
  return {
    tone,
    reason: {
      ko: `별자리가 보여주는 가장 또렷한 기질은 — ${theme.ko}${matchKo}${flowKo} 이런 기질은 평생 잘 안 변하는 기본 성격이라, 억지로 바꾸기보다 이 결을 그대로 살릴 자리를 찾는 게 훨씬 편하고 빨라요.`,
      en: `The clearest trait your chart shows — ${theme.en.charAt(0).toLowerCase()}${theme.en.slice(1).replace(/\.$/, '')}${matchEn}${flowEn} This kind of trait is a lifelong baseline, so finding a place that uses it as-is is far easier than trying to remake it.`,
    },
  }
}

/**
 * 공망 × South Node — 둘 다 "이번 생에 자연스럽게 만들어지지 않는 영역"을
 * 가리키는 표상. 사주의 공망 지지(허虛한 자리)와 점성의 사우스노드 sign(과거
 * 카르마/익숙해서 자동으로 떨어지는 지점) 이 같은 오행을 가리키면 두 시스템이
 * 같은 카르마를 같은 방향으로 짚는 셈 — tension 으로 강하게 발현. 다른 오행을
 * 가리키면 카르마가 두 갈래로 흩어진 neutral.
 *
 * 지지 본기 오행 매핑 (子=水, 丑=土, 寅卯=木, 辰=土, 巳午=火, 未=土, 申酉=金,
 * 戌=土, 亥=水) — 인라인 상수로 두어 외부 의존 없음.
 */
const BRANCH_TO_ELEMENT: Record<string, SajuElement> = {
  子: 'water',
  丑: 'earth',
  寅: 'wood',
  卯: 'wood',
  辰: 'earth',
  巳: 'fire',
  午: 'fire',
  未: 'earth',
  申: 'metal',
  酉: 'metal',
  戌: 'earth',
  亥: 'water',
}

export function evalVoid(
  gongmangBranches: string[] | undefined,
  southNodeSign: string | undefined
): CrossVerdict | null {
  if (!gongmangBranches?.length || !southNodeSign) return null

  const branches = gongmangBranches.slice(0, 2).join('·')
  const branchEl = BRANCH_TO_ELEMENT[gongmangBranches[0]]
  // air→木 근사 포함, 모든 sign→오행 변환은 단일 경로(signToSajuElement)로 통일한다 —
  // 예전엔 여기서 변환을 손으로 복제(third path)해 계약이 엇나갈 위험이 있었다(ENGINE-AUDIT E7).
  const sajuFromAstro = signToSajuElement(toEnSign(southNodeSign) ?? southNodeSign)
  // 지지/사우스노드 sign 중 하나라도 오행으로 못 풀면 거짓 neutral 을 내지 말고 행 생략.
  if (!branchEl || !sajuFromAstro) return null
  const matches = sajuFromAstro === branchEl

  if (matches) {
    // 둘 다 같은 자리를 가리키므로 두 시스템은 '합의'한다(resonant). 내용이 어렵다는
    // 것과 시스템이 어긋난다는 것(tension)은 다른 축이다 — 톤은 '같은 얘길 해요'로.
    return {
      tone: 'resonant',
      // 두 시스템이 '같은 빈자리'를 짚는 합의지만, 이건 강점 수렴이 아니라 평생 숙제다.
      // '잘 맞아요' 집계엔 넣지 않도록 표식만 단다(톤·문구는 그대로).
      karmaAxis: true,
      reason: {
        ko: `사주의 공망(空亡)이 ${EL_KO[branchEl]} 자리에 걸려 있는데 — 가졌어도 비어 도는 자리라 오행 개수와는 별개예요 — 별자리(사우스노드)도 똑같이 그 지점을 짚어요. 동·서양 둘 다 "이번 생엔 ${EL_KO[branchEl]} 영역이 자동으로는 안 채워진다"고 입을 모아요. 타고난 복이 아니라 의식적으로 만들어가야 하는 평생 과제라, 여기서 쌓은 건 온전히 자기 힘으로 얻은 거예요. 부족하다 느끼는 그 자리를 피하지 말고 작게라도 꾸준히 채워가면, 약점이 가장 단단한 강점으로 바뀌어요.`,
        en: `Your chart's void (空亡) falls on the ${EL_EN[branchEl]} position — a seat that stays hollow even when occupied, separate from the raw element count — and the stars (South Node) point to the very same place. East and West agree this area "won't fill itself this life." It isn't an inborn gift but a lifelong task you build by hand, so whatever you earn here is fully your own. Don't avoid the spot that feels lacking; fill it in small, steady steps and the weak point becomes your most solid strength.`,
      },
    }
  }
  return {
    tone: 'neutral',
    reason: {
      ko: `타고난 빈자리와 별자리가 짚는 빈자리가 서로 다른 영역을 가리켜요 — 풀어내야 할 과제가 두 갈래로 흩어져 있어요. 한 번에 하나씩 다루는 게 안전해요.`,
      en: `Your makeup and the stars each flag a different empty area — karmic work is spread across two threads. Better to address one at a time.`,
    },
  }
}

/** 오행 카운트에서 가장 부족한(결핍) 원소 + 동률 여부 — 이번 생에 키워야 할 결.
 * 결핍은 0개짜리가 여럿인 게 흔해 동률이 잦다 → 동률 시 호출부가 헤지를 붙인다
 * (예전엔 strict `<` 라 동률이면 항상 SAJU_ELS 첫 원소 wood 로 쏠렸다 — ENGINE-AUDIT). */
function weakestSajuElementTied(
  counts: Record<string, number> | undefined
): { key: SajuElement; tied: boolean } | undefined {
  if (!counts) return undefined
  const agg: Record<SajuElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
  for (const [k, v] of Object.entries(counts)) {
    const el = normSajuElement(k)
    if (el && typeof v === 'number') agg[el] += v
  }
  const bottom = pickExtreme(agg, SAJU_ELS, 'min')
  return bottom ? { key: bottom.key, tied: bottom.tied } : undefined
}

/**
 * 성장 방향: 노스노드(이번 생 키워야 할 방향) ↔ 사주에서 가장 부족한 오행
 * (결핍 = 채워야 할 것). 둘 다 "이번 생에 새로 키워가는 것"을 가리키는 표상이라,
 * 같은 오행을 가리키면 동·서양이 한 성장 방향을 또렷이 짚는 셈. evalVoid(공망 ×
 * 사우스노드 = 비움·과거)의 양(陽)짝.
 */
export function evalNorthNode(
  sajuCounts: Record<string, number> | undefined,
  northNodeSign: string | undefined
): CrossVerdict | null {
  const weakTop = weakestSajuElementTied(sajuCounts)
  const weak = weakTop?.key
  const nn = signToSajuElement(northNodeSign)
  if (!weak || !nn || !northNodeSign) return null
  const tw = ELEMENT_TRAIT[weak]
  const tn = signTraitOverride(northNodeSign) ?? ELEMENT_TRAIT[nn]
  const v: CrossVerdict =
    nn === weak
      ? {
          tone: 'resonant',
          // 결핍 수렴(가장 약한 오행 = 노스노드 방향)은 evalVoid 와 같은 부류의 '결핍 축'이다.
          // 두 시스템이 같은 '채워야 할 빈자리'를 짚는 합의(resonant)이지만 강점 수렴이 아니라
          // 평생 성장 숙제라, evalVoid 처럼 karmaAxis 로 '잘 맞아요' 집계에서만 분리한다.
          karmaAxis: true,
          reason: {
            ko: `이번 생 키워야 할 방향을 동·서양이 둘 다 ${tw.ko} 쪽으로 짚어요 — 타고난 가장 약한 결과 별자리가 보는 성장 방향이 같은 곳을 가리키는, 보기 드물게 또렷한 성장 신호예요. 처음엔 어색하고 불편한 영역이라 자꾸 피하게 되지만, 바로 그 불편함을 통과하는 게 이번 생의 핵심 성장이에요. 잘하는 것만 반복하지 말고 이 ${tw.ko} 쪽에 의식적으로 시간을 들이면, 인생이 한 단계 열려요.`,
            en: `Both systems point your growth the same way — toward the ${tw.en} — your weakest Saju element and your growth direction landing on the same spot, an unusually clear growth signal. It feels awkward and uncomfortable at first, so you keep avoiding it, but passing through exactly that discomfort is this life's core growth. Don't just repeat what you're good at — invest deliberate time in the ${tw.en} side and life opens to a new level.`,
          },
        }
      : GENERATES[weak] === nn || GENERATES[nn] === weak
        ? {
            tone: 'complement',
            reason: {
              ko: `사주가 채우라는 ${tw.ko} 결과 별자리가 가리키는 ${tn.ko} 방향이 서로 이어져요 — 두 성장 축이 생(生)으로 맞물려, 한쪽을 키우면 다른 쪽도 따라 자라요. 둘을 따로 떼어 부담스럽게 볼 필요 없이, ${tn.ko} 쪽을 입구 삼아 들어가면 ${tw.ko} 쪽도 자연스럽게 채워져요. 성장이 선순환으로 굴러가는, 비교적 수월한 배치예요.`,
              en: `The ${tw.en} energy your Saju asks you to fill and the ${tn.en} direction your chart points to feed each other — the two growth axes mesh as a generating cycle, so grow one and the other follows. No need to face them as two separate burdens; enter through the ${tn.en} door and the ${tw.en} side fills in naturally. A relatively easy layout where growth runs as a virtuous loop.`,
            },
          }
        : {
            tone: 'complement',
            reason: {
              ko: `사주는 ${tw.ko} 기운을 채우라 하고, 별자리는 ${tn.ko} 방향을 가리켜요 — 성장 축이 서로 다른 두 갈래라 한 번에 둘 다 잡으려면 벅찰 수 있어요. 시기를 나눠 번갈아 키우는 게 핵심 — 한동안 ${tw.ko} 쪽에 집중했다가, 또 한동안 ${tn.ko} 쪽에 집중하는 식이면 둘 다 놓치지 않아요. 욕심내 동시에 밀어붙이기보다 리듬을 두는 게 멀리 가는 길이에요.`,
              en: `Saju asks you to build ${tw.en} energy while your chart's growth direction points to ${tn.en} — two separate growth directions, so chasing both at once can overwhelm. The key is to alternate by season: focus on ${tw.en} for a while, then on ${tn.en}, and you drop neither. Setting a rhythm rather than forcing both at once is how you go the distance.`,
            },
          }
  // 헤지: ① 노스노드가 공기 별자리면 nn 은 wood 근사값이라 '같은 결' 단정을 느슨하게.
  //       ② 결핍 오행이 동률이면(0개가 여럿 — 흔함) 한 방향 단정 대신 두루 채우기 권유.
  let out = v
  if (isAirSign(northNodeSign)) out = withHedge(out, AIR_JUDGE_HEDGE)
  if (weakTop?.tied) out = withHedge(out, WEAK_TIE_HEDGE)
  return out
}

// ── 생활 영역 교차 (사주의 신살·십신 ↔ 점성의 하우스·행성) ──────────────────
// 정체성 축들이 "성향"을 본다면, 아래 축들은 "삶의 테마"(연애·이동·영성·재물)를
// 동·서양 신호로 동시에 비춘다. 양쪽 신호가 다 있으면 그 테마가 인생에서 크게
// 작동(resonant), 한쪽만 있으면 한 방향으로 풀림(complement), 둘 다 없으면 행 생략.

/** 연애·매력: 도화·홍염(사주) ↔ 금성 강조·5/7하우스(점성). */
export function evalRomance(
  hasDohwa: boolean,
  venusStrong: boolean,
  loveHouseCount: number,
  gender: 'male' | 'female' = 'male',
  spouseStarCount = 0,
  dayBranchClash = false,
  dayBranchCombine = false
): CrossVerdict | null {
  const astroLove = venusStrong || loveHouseCount > 0
  const spousePresent = spouseStarCount > 0
  // 배우자성(남=재성/여=관성)이 원국에 있으면 도화·금성이 약해도 이 축은 띄운다
  // — 성별로 갈리는 정통 육친 해석이라 거의 모든 차트에서 노출되게.
  if (!hasDohwa && !astroLove && !spousePresent) return null

  const base: { tone: CrossVerdict['tone']; ko: string; en: string } =
    hasDohwa && astroLove
      ? {
          tone: 'resonant',
          ko: '사주의 끄는 매력과 별자리의 사랑·관계 자리가 둘 다 켜져 있어요 — 사람을 끌고, 관계가 인생의 큰 테마가 되는 편이에요. 매력을 즐기되 한 사람에게 깊이 머무는 연습이 인연을 오래 가게 해요.',
          en: "Both your chart's pull and its houses of love and partnership are lit — you draw people in, and relationships become a central life theme. Enjoy the magnetism, but learning to stay deeply with one person is what makes love last.",
        }
      : hasDohwa
        ? {
            tone: 'complement',
            ko: '타고난 끄는 매력(도화)은 또렷한데 별자리는 사랑을 차분히 다뤄요 — 화려하기보다 은근하게 사람을 끄는 타입이에요. 먼저 다가가는 한 걸음이 좋은 인연을 앞당겨요.',
            en: 'Your natural magnetism is clear, while your chart handles love more quietly — your appeal is understated rather than flashy. One step forward of your own brings the right connection sooner.',
          }
        : astroLove
          ? {
              tone: 'complement',
              ko: '사주는 연애를 담담하게 보는데, 별자리의 사랑·관계 자리가 활발해요 — 관계 속에서 자기를 발견하는 타입이에요. 관계에 기대되 자기 중심도 함께 챙기면 좋아요.',
              en: "Your Saju treats romance evenly, but your chart's houses of love run active — you find yourself through relationships. Lean in, but keep your own center alongside.",
            }
          : {
              tone: 'neutral',
              ko: '도화나 별자리의 사랑 자리가 크게 두드러지진 않아요 — 연애가 인생 1순위 테마라기보다, 인연이 올 때 진중하게 가꾸는 타입이에요.',
              en: 'Neither a strong romance star nor lit houses of love stand out — partnership is less a top life theme than something you tend earnestly when it arrives.',
            }

  // ── 성별 배우자성(配偶星) — 남: 재성, 여: 관성 ──
  const g = gender === 'female'
  const starKo = g ? '관성' : '재성'
  const starEn = g ? 'the Officer star' : 'the Wealth star'
  const who = g ? '여자' : '남자'
  const whoEn = g ? "a woman's" : "a man's"
  const spouseKo = spousePresent
    ? ` 명리에서 ${who} 사주의 배우자 자리는 ${starKo}인데, 원국에 또렷이 자리해 배우자 인연의 윤곽이 분명한 편이에요.`
    : ` 명리에서 ${who} 사주의 배우자 자리는 ${starKo}인데, 원국에 뚜렷이 드러나지 않아 인연은 때를 기다리기보다 스스로 만들어가는 쪽이에요.`
  const spouseEn = spousePresent
    ? ` In Saju, ${whoEn} spouse indicator is ${starEn}, and it sits clearly in your chart — the outline of partnership is well-defined.`
    : ` In Saju, ${whoEn} spouse indicator is ${starEn}, but it's faint in your chart — you shape partnership yourself rather than wait on timing.`

  // 궁위(宮位) — 일지(日支)는 배우자궁. 충/합이 일지에 걸리면 인연의 결을 한 줄로.
  let palaceKo = ''
  let palaceEn = ''
  if (dayBranchClash) {
    palaceKo =
      ' 특히 일지(배우자궁)에 충(沖)이 걸려 — 배우자 인연이 자극적이고 역동적이며 변화가 잦은 결이에요. 안정보다 생동을 주는 상대와 잘 맞아요.'
    palaceEn =
      ' Notably, a clash falls on your day branch (the spouse palace) — partnership runs dynamic, stimulating, and change-prone; someone who brings aliveness over calm suits you.'
  } else if (dayBranchCombine) {
    palaceKo =
      ' 특히 일지(배우자궁)에 합(合)이 들어 — 배우자와 끌어당겨 가까이 묶이는 인연, 정으로 깊어지는 결이에요.'
    palaceEn =
      ' Notably, a combination sits on your day branch (the spouse palace) — partnership pulls close and binds, a bond that deepens through affection.'
  }
  return {
    tone: base.tone,
    reason: { ko: base.ko + spouseKo + palaceKo, en: base.en + spouseEn + palaceEn },
  }
}

/** 이동·변화: 역마(사주) ↔ 3/9하우스·목성(점성). */
export function evalMovement(
  hasYeokma: boolean,
  moveHouseCount: number,
  jupiterStrong: boolean
): CrossVerdict | null {
  const astroMove = moveHouseCount > 0 || jupiterStrong
  if (!hasYeokma && !astroMove) return null
  if (hasYeokma && astroMove)
    return {
      tone: 'resonant',
      reason: {
        ko: '사주의 역마(이동·변동)와 별자리의 이동·확장 자리가 함께 켜져 있어요 — 한자리에 오래 머물기보다 옮겨 다니며 크는 사람이에요. 변화를 불안이 아니라 자원으로 쓰면 길이 넓어져요.',
        en: "Your chart's Traveling Horse (movement) and its houses of travel and expansion are both lit — you grow by moving rather than staying put. Treat change as a resource, not a worry, and the road widens.",
      },
    }
  if (hasYeokma)
    return {
      tone: 'complement',
      reason: {
        ko: '사주엔 역마(이동) 기운이 있는데 별자리는 한곳에 뿌리내리는 쪽이에요 — 떠나고 싶은 마음과 머물고 싶은 마음이 같이 있어요. 베이스를 두고 거기서 뻗어 나가는 리듬이 잘 맞아요.',
        en: 'Your Saju carries the Traveling Horse, while your chart prefers to root in one place — a pull to leave and a pull to stay, side by side. A home base you venture out from suits you best.',
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: '사주는 자리를 지키는 편인데 별자리의 이동·확장 자리가 활발해요 — 멀리 나가 보는 경험이 시야를 크게 넓혀줘요. 익숙한 곳을 벗어나는 시도를 가끔 의식적으로 해보면 좋아요.',
      en: "Your Saju tends to hold its place, but your chart's houses of travel and expansion run active — going far stretches your view. Step out of the familiar on purpose now and then.",
    },
  }
}

/** 예술·영성: 화개(사주) ↔ 12하우스·해왕성(점성). */
export function evalSpirit(
  hasHwagae: boolean,
  twelfthCount: number,
  neptuneStrong: boolean
): CrossVerdict | null {
  const astroSpirit = twelfthCount > 0 || neptuneStrong
  if (!hasHwagae && !astroSpirit) return null
  if (hasHwagae && astroSpirit)
    return {
      tone: 'resonant',
      reason: {
        ko: '타고난 예술·고독의 기질과 별자리의 내면·영성 자리가 둘 다 켜져 있어요 — 보이지 않는 것을 읽고 표현하는 깊이가 있는 사람이에요. 혼자만의 시간을 충분히 두면 그 감각이 작품과 통찰로 흘러나와요.',
        en: "Your art-and-solitude streak and its houses of the inner life are both lit — you read and express what others can't see. Give yourself enough solitude and that sense flows out as art and insight.",
      },
    }
  if (hasHwagae)
    return {
      tone: 'complement',
      reason: {
        ko: '사주엔 화개(예술·영성) 기운이 또렷한데 별자리는 현실에 발 딛는 쪽이에요 — 깊은 감수성을 일상의 형태로 풀어내기 좋은 조합이에요. 떠오른 영감을 손에 잡히는 결과물로 옮기면 빛나요.',
        en: 'Your Saju carries a clear artistic-spiritual streak, while your chart stays grounded in the real — a fine combination for turning deep sensitivity into concrete form. Move inspiration into something tangible and it shines.',
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: '사주는 담백하고 현실적인데 별자리의 내면·영성 자리가 활발해요 — 보이지 않는 흐름에 예민하게 반응하는 면이 있어요. 명상·기록처럼 안을 들여다보는 습관이 중심을 잡아줘요.',
      en: "Your Saju is plain and practical, but your chart's houses of the inner life run active — you're quietly sensitive to unseen currents. Habits that look inward, like journaling or meditation, steady your center.",
    },
  }
}

/** 재물 그릇: 재성 비중(사주) ↔ 2/8하우스·길성(점성). */
export function evalWealth(
  jaeseongCount: number,
  wealthHouseCount: number,
  beneficStrong: boolean
): CrossVerdict | null {
  const sajuWealth = jaeseongCount >= 2
  const astroWealth = wealthHouseCount > 0 || beneficStrong
  if (!sajuWealth && !astroWealth) return null
  if (sajuWealth && astroWealth)
    return {
      tone: 'resonant',
      reason: {
        ko: '타고난 돈 다루는 감각과 별자리의 자원·소유 자리가 둘 다 또렷해요 — 돈을 벌고 굴리는 감각이 양쪽에서 받쳐주는 편이에요. 한탕보다 흐름을 만들면 그 그릇이 꾸준히 커져요.',
        en: 'Your inborn sense for money and its houses of resources are both strong — a feel for earning and growing money is backed on both sides. Build a steady flow rather than chasing a jackpot, and the capacity keeps growing.',
      },
    }
  if (sajuWealth)
    return {
      tone: 'complement',
      reason: {
        ko: '타고난 돈 다루는 감각은 있는데 별자리는 돈보다 다른 가치를 가리켜요 — 버는 재주는 있되, 무엇을 위해 버는지를 정하면 힘이 또렷해져요. 목적이 생기면 수완이 따라와요.',
        en: "Your Saju carries a hand for money, while your chart points to values beyond money — the earning knack is there, and it sharpens once you decide what you're earning for. Purpose first, and the skill follows.",
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: '사주는 재물에 담담한데 별자리의 자원·소유 자리가 활발해요 — 가진 것을 잘 지키고 불리는 자리예요. 돈을 멀리하기보다 자기만의 기준으로 다루면 안정이 따라와요.',
      en: "Your Saju is even about wealth, but your chart's houses of resources run active — a placement that keeps and grows what you hold. Rather than avoiding money, handle it on your own terms and stability follows.",
    },
  }
}

/** 음양 리듬: 일간 음양(陽발산·외향 / 陰수용·내향) ↔ 출생 sect(주간=바깥 무대 / 야간=안 무대). */
export function evalYinYang(
  dayMasterYy: string | undefined,
  sect: string | undefined
): CrossVerdict | null {
  const yy = dayMasterYy === '陽' ? 'yang' : dayMasterYy === '陰' ? 'yin' : undefined
  const s = sect === 'day' ? 'day' : sect === 'night' ? 'night' : undefined
  if (!yy || !s) return null
  const match = (yy === 'yang' && s === 'day') || (yy === 'yin' && s === 'night')
  if (match) {
    return yy === 'yang'
      ? {
          tone: 'resonant',
          reason: {
            ko: '타고난 기질이 양(발산·외향)인데 낮에 태어나 무대도 바깥을 향해요 — 드러내고 추진하는 결이 한 방향으로 또렷해요. 쉴 줄 아는 리듬만 챙기면 돼요.',
            en: 'Your nature is yang (outward, expressive) and you were born by day, so your stage faces outward too — a clear, consistent drive to show up and push. Just build in time to rest.',
          },
        }
      : {
          tone: 'resonant',
          reason: {
            ko: '타고난 기질이 음(수용·내향)인데 밤에 태어나 무대도 안을 향해요 — 깊이 사고하고 받아들이는 결이 일관돼요. 가끔 먼저 드러내는 연습이 도움이 돼요.',
            en: 'Your nature is yin (receptive, inward) and you were born by night, so your stage faces inward too — consistent depth and receptivity. Practicing speaking up first helps now and then.',
          },
        }
  }
  return yy === 'yang'
    ? {
        tone: 'complement',
        reason: {
          ko: '타고난 기질은 양(발산·외향)인데 밤에 태어나 무대는 안을 향해요 — 낮에 다 못 쓴 에너지를 밤의 깊이로 돌리는, 폭이 넓은 사람이에요.',
          en: 'Your nature is yang (outward) yet you were born by night, turning toward inner depth — a wide range that channels daytime drive into nighttime depth.',
        },
      }
    : {
        tone: 'complement',
        reason: {
          ko: '타고난 기질은 음(수용·내향)인데 낮에 태어나 무대는 밖을 향해요 — 안의 깊이를 바깥으로 꺼내 보여주는, 폭이 넓은 사람이에요.',
          en: 'Your nature is yin (receptive) yet you were born by day, with an outward stage — a wide range that brings inner depth out into the open.',
        },
      }
}

/** 소통·표현: 식상 비중(사주) ↔ 수성 강조·3/5하우스(점성). */
export function evalExpression(
  siksangCount: number,
  mercuryStrong: boolean,
  exprHouseCount: number
): CrossVerdict | null {
  const sajuExpr = siksangCount >= 2
  const astroExpr = mercuryStrong || exprHouseCount > 0
  if (!sajuExpr && !astroExpr) return null
  if (sajuExpr && astroExpr)
    return {
      tone: 'resonant',
      reason: {
        ko: '타고난 표현·창의 기운과 별자리의 소통·표현 자리가 둘 다 또렷해요 — 생각을 밖으로 꺼내 전하는 힘이 양쪽에서 받쳐줘요. 말과 글, 만드는 일로 자기를 드러낼 때 가장 빛나요.',
        en: 'Your inborn knack for speech and expression and its houses of communication are both strong — the power to voice and share ideas is backed on both sides. You shine brightest expressing yourself through words, writing, or making things.',
      },
    }
  if (sajuExpr)
    return {
      tone: 'complement',
      reason: {
        ko: '사주엔 표현·창의 기운이 또렷한데 별자리는 말수가 적은 쪽이에요 — 안에 할 말이 많은데 겉으론 담백한 타입이에요. 떠오른 걸 미루지 말고 그때그때 꺼내 두면 막힘이 풀려요.',
        en: 'Your Saju carries a clear expressive-creative streak, while your chart is the quieter type — plenty to say inside, plain on the surface. Get thoughts out as they come rather than holding them in, and the blockage clears.',
      },
    }
  return {
    tone: 'complement',
    reason: {
      ko: '사주는 말수가 적은 편인데 별자리의 소통·표현 자리가 활발해요 — 배우고 나누고 연결하는 데 에너지가 많이 흘러요. 꾸준히 쓰고 말하는 습관이 그 재능을 실력으로 굳혀줘요.',
      en: "Your Saju is the quieter type, but your chart's houses of communication run active — much of your energy flows into learning, sharing, and connecting. A steady habit of writing and talking turns that gift into real skill.",
    },
  }
}
