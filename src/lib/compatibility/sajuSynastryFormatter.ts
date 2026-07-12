/**
 * 사주 시너스트리(궁합) 포맷 — 공개 진입점(배럴).
 *
 * 두 사람의 사주 cross 신호를 라인 list로 생성한다(정통 명리 cross 룰).
 * 카테고리: ① 일간 cross(오행 생극) ② 4기둥×4기둥(천간합/충·지지합/충/형/해/파/
 * 자형·삼합·방합) ③ 신살 cross(천을귀인) ④ 현재 대운 cross ⑤ 오행 균형.
 *
 * 구현 분리:
 *  - sajuSynastryData:  합/충/형·생극·십성 canon 표 + leaf 헬퍼(공망·12신살·세운)
 *  - sajuSynastryFacts: 구조화 추출(computeSajuSynastryFacts) — 차트용
 * 이 파일은 그 둘을 재노출하고, 텍스트 라인 포맷(formatSajuSynastry)만 직접 보유한다.
 *
 * dev 검증: scripts/saju-synastry-format.ts.
 */

import { HYEONG_PAIR_TRIO, BRANCH_HYEONG_PAIR, SELF_HYEONG, isHyeong } from '@/lib/saju/hyeong'
import { ELEMENT_KO_TO_EN } from '@/lib/saju/constants'
import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import {
  type SajuPillarInput,
  type SajuSynastryInput,
  STEM_HAP,
  STEM_CHUNG,
  BRANCH_HAP,
  BRANCH_CHUNG,
  BRANCH_HAE,
  BRANCH_PA,
  BRANCH_WONJIN,
  TRI_HAP,
  BANG_HAP,
  STEM_EL,
  BRANCH_MAIN_STEM,
  sibseongFor,
  BRANCH_EL,
  EL_CONTROLS,
  SIBSIN_GLOSS,
  CHEONULGWIIN,
  currentSeun,
  sibsinOf,
  gongmangOf,
  twelveShinsalLabel,
  PILLAR_LABELS,
  koreanize,
  stripAux,
} from './sajuSynastryData'

export * from './sajuSynastryData'
export * from './sajuSynastryFacts'

// ── EN render maps — 한국어 라벨이 영어 응답에 새지 않게 (lang==='en' 일 때만 사용) ──
const PILLAR_LABELS_EN = ['Y', 'M', 'D', 'H'] as const
const SIBSIN_GLOSS_EN: Record<string, string> = {
  비견: 'peer, ally',
  겁재: 'rivalry, cooperation',
  식신: 'expression, ease',
  상관: 'talent, free-spirited',
  편재: 'drive, desire',
  정재: 'stability, diligence',
  편관: 'pressure, challenge',
  정관: 'responsibility, norms',
  편인: 'protection, learning',
  정인: 'support, stability',
}
// 12신살 — pickTwelveSingle 의 한국어 반환값 → 영어.
const TWELVE_SINSAL_EN: Record<string, string> = {
  겁살: 'robbery-star',
  재살: 'calamity-star',
  천살: 'heaven-star',
  지살: 'travel-star',
  년살: 'peach-blossom', // pickTwelveSingle 정본 반환값 (= 도화)
  도화: 'peach-blossom', // 별칭 — 일부 경로는 도화 라벨로 반환
  월살: 'moon-star',
  망신: 'disgrace-star',
  장성: 'general-star',
  반안: 'saddle-star',
  역마: 'wanderer-star',
  육해: 'harm-star',
  화개: 'canopy-star',
}
// 신살 일주 페어 라벨 (백호/괴강 등) 한자 그대로 유지 — 한자는 영어 응답에 안 샌다.

export function formatSajuSynastry(input: SajuSynastryInput): string {
  if (input.pillarsA.length < 4 || input.pillarsB.length < 4) return ''
  // 시각 미상이면 시주(時, index 3)는 정오 앵커(午시) 가정의 날조값 → cross 대상에서 제외.
  // 아래 모든 pillar 루프는 A.length / B.length 로 도므로, 잘라내면 자동으로
  // 시주가 빠진다(일주=index 2 는 항상 유지). i 는 항상 A, j 는 항상 B 를 인덱싱.
  const A = input.timeUnknownA ? input.pillarsA.slice(0, 3) : input.pillarsA
  const B = input.timeUnknownB ? input.pillarsB.slice(0, 3) : input.pillarsB
  const aDay = A[2]
  const bDay = B[2]
  if (!aDay.stem || !bDay.stem) return ''

  // EN 렌더 헬퍼 — lang==='en' 이면 한국어 라벨을 영어로. KO 출력은 byte 동일.
  const en = input.lang === 'en'
  const L = (ko: string, e: string) => (en ? e : ko)
  const PL = en ? PILLAR_LABELS_EN : PILLAR_LABELS
  const elD = (c: string) => (en ? (ELEMENT_KO_TO_EN[c] ?? c) : c)
  // stem+element 표기: KO 는 `甲목`(붙임), EN 은 `甲=Wood`.
  // EN 을 예전엔 `甲(Wood)` 괄호로 썼는데, 최종 stripAux(stripParens)가 괄호를
  // 전부 지워 EN 출력에서 일간 오행이 통째로 사라졌다("never reverse the element"
  // 지시가 정작 참조할 오행이 없어짐). 괄호 대신 `=` 로 박아 flip 방지 앵커가
  // stripAux 를 통과하게 한다(KO 는 원래 괄호가 아니라 영향 없음).
  const se = (stem: string, el: string) => (en ? `${stem}=${elD(el)}` : `${stem}${el}`)
  const sibD = (s: string) => (en ? (SIBSIN_EN[s] ?? s) : s)
  const glossD = (s: string) => (en ? (SIBSIN_GLOSS_EN[s] ?? '') : (SIBSIN_GLOSS[s] ?? ''))
  const twD = (lbl: string) => (en ? (TWELVE_SINSAL_EN[lbl] ?? lbl) : lbl)

  // 라벨에 실명을 고정한다. "A", "B"만 주면 모델이 어느 쪽이 누구인지,
  // 辛→금 같은 오행 매핑까지 머릿속으로 다시 풀다가 통째로 뒤집는 사고가
  // 난다(辛(금) 일간을 "목"이라 부르는 등). 이름·오행을 데이터에 박아둔다.
  // 라벨은 `A·철수` 형식 — 예전 `A(철수)` 는 최종 stripAux 가 괄호를 지워
  // 이름이 통째로 사라졌다(flip 방지 앵커 무력화). 괄호 대신 `·` 로 박는다.
  const nmA = (input.nameA || '').trim()
  const nmB = (input.nameB || '').trim()
  const labelA = nmA ? `A·${nmA}` : 'A'
  const labelB = nmB ? `B·${nmB}` : 'B'
  const elA = STEM_EL[aDay.stem]
  const elB = STEM_EL[bDay.stem]

  // 우선순위 버킷 — LLM이 토큰 무게가 아니라 명시적 티어로 중요도를 읽게.
  const critical: string[] = []
  const important: string[] = []
  const chamgo: string[] = []
  const yongsinCrossLines: string[] = [] // 용신 보완 cross (오행 궁합) — 아래 섹션 7-b 에서 채움

  // 1. 일간 cross — 항상 CRITICAL
  if (elA && elB) {
    const dm = `${labelA} ${L('일간', 'day-master')} ${se(aDay.stem, elA)} ↔ ${labelB} ${L('일간', 'day-master')} ${se(bDay.stem, elB)}`
    if (elA === elB) {
      critical.push(L(`${dm} — 같은 오행 (비견)`, `${dm} — same element (peer)`))
    } else if (EL_CONTROLS[elA] === elB) {
      const a = nmA || 'A',
        b = nmB || 'B'
      critical.push(
        L(
          `${dm} — ${elA}극${elB} · 통제 방향 ${a}=${elA} → ${b}=${elB} (${a}이(가) ${b}을(를) 정리·다듬는 흐름, ${b}은(는) 따끔·제약처럼 느낄 수 있음) ※오행·방향 반대로 쓰지 말 것`,
          `${dm} — ${elD(elA)} controls ${elD(elB)} · control direction ${a}=${elD(elA)} → ${b}=${elD(elB)} (${a} files down / refines ${b}; ${b} may feel it as a sting / constraint) ※never reverse the element or direction`
        )
      )
    } else if (EL_CONTROLS[elB] === elA) {
      const a = nmA || 'A',
        b = nmB || 'B'
      critical.push(
        L(
          `${dm} — ${elB}극${elA} · 통제 방향 ${b}=${elB} → ${a}=${elA} (${b}이(가) ${a}을(를) 정리·다듬는 흐름, ${a}은(는) 따끔·제약처럼 느낄 수 있음) ※오행·방향 반대로 쓰지 말 것`,
          `${dm} — ${elD(elB)} controls ${elD(elA)} · control direction ${b}=${elD(elB)} → ${a}=${elD(elA)} (${b} files down / refines ${a}; ${a} may feel it as a sting / constraint) ※never reverse the element or direction`
        )
      )
    } else {
      important.push(
        L(`${dm} — 상생 (서로 보완)`, `${dm} — generating cycle (mutually complementary)`)
      )
    }
  }

  // 1-2. 십성 cross — 상대 일간이 내 사주에서 무슨 십성인가. 오행 상생/극만으론
  // 정관 vs 편관 같은 관계의 질감이 안 잡힌다 → 양방향 십성으로 보강.
  {
    const aSeesB = sibsinOf(aDay.stem, bDay.stem) // A 일간 입장에서 B 일간은
    const bSeesA = sibsinOf(bDay.stem, aDay.stem) // B 일간 입장에서 A 일간은
    if (aSeesB && bSeesA) {
      critical.push(
        L(
          `십성 cross — ${labelA} 입장에서 ${labelB}는 ${aSeesB}(${SIBSIN_GLOSS[aSeesB] ?? ''}), ${labelB} 입장에서 ${labelA}는 ${bSeesA}(${SIBSIN_GLOSS[bSeesA] ?? ''})`,
          `ten-gods cross — from ${labelA}'s view ${labelB} is ${sibD(aSeesB)}(${glossD(aSeesB)}), from ${labelB}'s view ${labelA} is ${sibD(bSeesA)}(${glossD(bSeesA)})`
        )
      )
    }
  }

  // 2. 천간합(끌림)=CRITICAL, 천간충=IMPORTANT
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      const aS = A[i].stem,
        bS = B[j].stem
      if (!aS || !bS) continue
      const hap = STEM_HAP[aS]
      if (hap && hap.other === bS) {
        critical.push(
          L(
            `A ${PILLAR_LABELS[i]}천간 ${aS} + B ${PILLAR_LABELS[j]}천간 ${bS} — ${aS}${bS}合化${hap.element} (천간합 — 화학적 끌림)`,
            `A ${PL[i]}-stem ${aS} + B ${PL[j]}-stem ${bS} — ${aS}${bS} combine→${elD(hap.element)} (stem-combine — chemical attraction)`
          )
        )
      }
      if (STEM_CHUNG[aS] === bS) {
        important.push(
          L(
            `A ${PILLAR_LABELS[i]}천간 ${aS} ↔ B ${PILLAR_LABELS[j]}천간 ${bS} — 천간충 (대립)`,
            `A ${PL[i]}-stem ${aS} ↔ B ${PL[j]}-stem ${bS} — stem-clash (opposition)`
          )
        )
      }
    }
  }

  // 3. 지지 관계 — 같은 (i,j) 페어의 충·형·합·해·파를 한 줄로 병합 (중복 제거)
  type PairRel = { i: number; j: number; aBr: string; bBr: string; tags: string[] }
  const pairMap = new Map<string, PairRel>()
  const addTag = (i: number, j: number, aBr: string, bBr: string, tag: string) => {
    const key = `${i},${j}`
    const cur = pairMap.get(key) ?? { i, j, aBr, bBr, tags: [] }
    if (!cur.tags.includes(tag)) cur.tags.push(tag)
    pairMap.set(key, cur)
  }
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B.length; j++) {
      const aBr = A[i].branch,
        bBr = B[j].branch
      if (!aBr || !bBr) continue
      if (BRANCH_HAP[aBr]?.other === bBr) addTag(i, j, aBr, bBr, '합')
      if (BRANCH_CHUNG[aBr] === bBr) addTag(i, j, aBr, bBr, '충')
      if (BRANCH_HYEONG_PAIR[aBr] === bBr) addTag(i, j, aBr, bBr, '형')
      if (HYEONG_PAIR_TRIO.has(aBr + bBr)) addTag(i, j, aBr, bBr, '형')
      if (SELF_HYEONG.has(aBr) && aBr === bBr) addTag(i, j, aBr, bBr, '자형')
      if (BRANCH_HAE[aBr] === bBr) addTag(i, j, aBr, bBr, '해')
      if (BRANCH_PA[aBr] === bBr) addTag(i, j, aBr, bBr, '파')
      // 원진(元嗔) — 이유 없이 미묘하게 어긋나는 심리적 반감. 정통 궁합 신호.
      // 子未·丑午 는 해(害)와 겹쳐 "해+원진 복합"으로 함께 표기된다(둘 다 성립).
      if (BRANCH_WONJIN[aBr] === bBr) addTag(i, j, aBr, bBr, '원진')
    }
  }
  const TAG_EN: Record<string, string> = {
    합: 'union',
    충: 'clash',
    형: 'punishment',
    '3형': 'triple-punishment',
    자형: 'self-punishment',
    해: 'harm',
    파: 'break',
    원진: 'resentment',
  }
  for (const { i, j, aBr, bBr, tags } of pairMap.values()) {
    const hasClash = tags.some((t) => t === '충' || t === '형' || t === '3형' || t === '자형')
    const hasHap = tags.includes('합')
    const note = hasClash
      ? L('이별·갈등 핵심 신호', 'core breakup/conflict signal')
      : hasHap
        ? L('결속', 'bonding')
        : tags.includes('원진')
          ? L('미묘한 반감·원망', 'subtle resentment')
          : tags.includes('해')
            ? L('미묘한 거리감', 'subtle distance')
            : L('사소한 파열', 'minor rupture')
    const tagsD = en ? tags.map((t) => TAG_EN[t] ?? t) : tags
    const combo = tagsD.length > 1 ? `${tagsD.join('+')} ${L('복합', 'combined')}` : tagsD[0]
    const line = L(
      `A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr} ${combo} (${note})`,
      `A ${PL[i]}-branch ${aBr} ↔ B ${PL[j]}-branch ${bBr} — ${aBr}${bBr} ${combo} (${note})`
    )
    // 충/형이 일지(2)를 물면 가장 강한 신호 → CRITICAL, 그 외는 IMPORTANT
    if (hasClash && (i === 2 || j === 2)) critical.push(line)
    else important.push(line)
  }

  // 삼합·방합 cross — 두 사람 지지를 합쳐 trio가 형성되는지. 양쪽이 서로
  // 없는 글자를 보태야 진짜 cross(union이 각자보다 커야 함). 한 사람이 이미
  // 다 갖고 있으면 본명 신호라 제외. 옛 코드는 각자 1지만 잡아 "2지" 라벨을
  // 붙여, 한 쪽이 3지 다 가진 경우(본명)나 cross로 3지 완성된 경우를 오분류.
  const sbComplete: string[] = [] // 3/3 교차 완성
  const sbPartial: string[] = [] // 2/3 부분
  for (const trio of [...TRI_HAP, ...BANG_HAP]) {
    const setA = new Set(A.map((p) => p.branch).filter((b) => trio.branches.includes(b)))
    const setB = new Set(B.map((p) => p.branch).filter((b) => trio.branches.includes(b)))
    const union = new Set([...setA, ...setB])
    if (union.size >= 2 && union.size > setA.size && union.size > setB.size) {
      const tag = TRI_HAP.includes(trio)
        ? L('삼합', 'trine-combine')
        : L('방합', 'directional-combine')
      const label = `${trio.branches.join('')}${tag}(→${elD(trio.element)})`
      ;(union.size === 3 ? sbComplete : sbPartial).push(label)
    }
  }
  if (sbComplete.length > 0) {
    important.push(
      L(
        `삼합/방합 교차 완성 ${sbComplete.length}건: ${sbComplete.join(' · ')} — 두 사람 지지가 3지 모두 채워 국(局) 형성 (강한 결속 잠재)`,
        `trine/directional combine completed ${sbComplete.length}: ${sbComplete.join(' · ')} — the two charts' branches fill all 3 to form a frame (strong bonding potential)`
      )
    )
  }
  if (sbPartial.length > 0) {
    chamgo.push(
      L(
        `삼합/방합 부분 ${sbPartial.length}건: ${sbPartial.join(' · ')} — 3지 중 2지 교차 성립 (결속 잠재, 비중 낮음)`,
        `trine/directional partial ${sbPartial.length}: ${sbPartial.join(' · ')} — 2 of 3 branches cross (bonding potential, low weight)`
      )
    )
  }

  // 4. 천을귀인 → IMPORTANT
  const aCheonul = CHEONULGWIIN[aDay.stem] ?? []
  const bCheonul = CHEONULGWIIN[bDay.stem] ?? []
  for (let j = 0; j < B.length; j++) {
    if (aCheonul.includes(B[j].branch)) {
      important.push(
        L(
          `${labelA}의 천을귀인(${aCheonul.join('·')}, 일간 ${aDay.stem}) → ${labelB} ${PILLAR_LABELS[j]}지 ${B[j].branch} 활성 → 길성 보호`,
          `${labelA}'s Cheoneul-nobleman(${aCheonul.join('·')}, day-master ${aDay.stem}) → ${labelB} ${PL[j]}-branch ${B[j].branch} activated → benefic protection`
        )
      )
    }
  }
  for (let i = 0; i < A.length; i++) {
    if (bCheonul.includes(A[i].branch)) {
      important.push(
        L(
          `${labelB}의 천을귀인(${bCheonul.join('·')}, 일간 ${bDay.stem}) → ${labelA} ${PILLAR_LABELS[i]}지 ${A[i].branch} 활성 → 길성 보호`,
          `${labelB}'s Cheoneul-nobleman(${bCheonul.join('·')}, day-master ${bDay.stem}) → ${labelA} ${PL[i]}-branch ${A[i].branch} activated → benefic protection`
        )
      )
    }
  }

  // 5. 12신살 → IMPORTANT (방향별 1줄 압축)
  // 각 항목을 `${pillar}지 ${branch}=${label}` 형태로 — 과거 `오육해`
  // 처럼 branch+label 을 붙여 쓰면 "오 육해" 인지 "오육해(한 단어)" 인지
  // 구분 안 돼 LLM 이 잘못 파싱. = 로 명확히 분리.
  if (aDay.branch) {
    const items: string[] = []
    for (let j = 0; j < B.length; j++) {
      if (!B[j].branch) continue
      const lbl = twelveShinsalLabel(aDay.branch, B[j].branch)
      if (lbl) items.push(`${PL[j]}${L('지', '-branch')} ${B[j].branch}=${twD(lbl)}`)
    }
    if (items.length)
      important.push(
        L(
          `12신살 ${labelA} 일지 ${aDay.branch} 기준 → ${labelB}: ${items.join(' · ')}`,
          `12-sinsal relative to ${labelA} day-branch ${aDay.branch} → ${labelB}: ${items.join(' · ')}`
        )
      )
  }
  if (bDay.branch) {
    const items: string[] = []
    for (let i = 0; i < A.length; i++) {
      if (!A[i].branch) continue
      const lbl = twelveShinsalLabel(bDay.branch, A[i].branch)
      if (lbl) items.push(`${PL[i]}${L('지', '-branch')} ${A[i].branch}=${twD(lbl)}`)
    }
    if (items.length)
      important.push(
        L(
          `12신살 ${labelB} 일지 ${bDay.branch} 기준 → ${labelA}: ${items.join(' · ')}`,
          `12-sinsal relative to ${labelB} day-branch ${bDay.branch} → ${labelA}: ${items.join(' · ')}`
        )
      )
  }

  // 6. 현재 대운 cross → IMPORTANT
  // 나이 표기는 `시작~끝세` 범위로 (cycle 10년). 단순 `32세` 면 LLM 이
  // "현재 32세" 로 오인 가능.
  if (input.currentDaeunA && input.currentDaeunB) {
    const dA = input.currentDaeunA,
      dB = input.currentDaeunB
    const ys = L('세', '')
    const ageRange = (age?: number) =>
      typeof age === 'number' ? `${age}~${age + 9}${ys}` : `?${ys}`
    important.push(
      L(
        `현재 대운: ${labelA} ${ageRange(dA.age)} ${dA.stem}${dA.branch} · ${labelB} ${ageRange(dB.age)} ${dB.stem}${dB.branch}`,
        `current daeun: ${labelA} ${ageRange(dA.age)} ${dA.stem}${dA.branch} · ${labelB} ${ageRange(dB.age)} ${dB.stem}${dB.branch}`
      )
    )
    if (STEM_HAP[dA.stem]?.other === dB.stem)
      important.push(
        L(
          `대운 천간 ${dA.stem}${dB.stem}合化${STEM_HAP[dA.stem]!.element} (흐름 결속)`,
          `daeun stems ${dA.stem}${dB.stem} combine→${elD(STEM_HAP[dA.stem]!.element)} (flow bonding)`
        )
      )
    if (STEM_CHUNG[dA.stem] === dB.stem)
      important.push(L(`대운 천간충 (시기 흐름 충돌)`, `daeun stem-clash (period-flow conflict)`))
    if (BRANCH_HAP[dA.branch]?.other === dB.branch)
      important.push(
        L(
          `대운 지지 ${dA.branch}${dB.branch}합 (결속)`,
          `daeun branches ${dA.branch}${dB.branch} union (bonding)`
        )
      )
    if (BRANCH_CHUNG[dA.branch] === dB.branch)
      important.push(L(`대운 지지충 (큰 흐름 충돌)`, `daeun branch-clash (major flow conflict)`))
    if (dA.branch === dB.branch)
      important.push(
        L(
          `대운 지지 ${dA.branch} 일치 (강한 시기 공명)`,
          `daeun branch ${dA.branch} match (strong period resonance)`
        )
      )
  }

  // 6-2. 세운(올해) cross — 올해 세운 간지가 두 사람 일주·대운을 합/충/형으로
  // 건드리는지. "올해 우리 어때 / 언제" 질문의 시기 해상도. (월운·일진은 과잉)
  {
    const seun = currentSeun(input.now ?? new Date())
    const ss = seun.stem,
      sb = seun.branch
    const seunLines: string[] = []
    const crossNatal = (lbl: string, day: SajuPillarInput) => {
      if (STEM_HAP[ss]?.other === day.stem)
        seunLines.push(
          L(
            `세운천간 ${ss} + ${lbl} 일간 ${day.stem} — ${ss}${day.stem}合化${STEM_HAP[ss]!.element} (올해 끌림·기회)`,
            `annual stem ${ss} + ${lbl} day-master ${day.stem} — ${ss}${day.stem} combine→${elD(STEM_HAP[ss]!.element)} (this year: attraction/opportunity)`
          )
        )
      if (STEM_CHUNG[ss] === day.stem)
        seunLines.push(
          L(
            `세운천간 ${ss} ↔ ${lbl} 일간 ${day.stem} — 충 (올해 압박·결정)`,
            `annual stem ${ss} ↔ ${lbl} day-master ${day.stem} — clash (this year: pressure/decision)`
          )
        )
      if (BRANCH_HAP[sb]?.other === day.branch)
        seunLines.push(
          L(
            `세운지지 ${sb} + ${lbl} 일지 ${day.branch} — 합 (올해 결속·안정)`,
            `annual branch ${sb} + ${lbl} day-branch ${day.branch} — union (this year: bonding/stability)`
          )
        )
      if (BRANCH_CHUNG[sb] === day.branch)
        seunLines.push(
          L(
            `세운지지 ${sb} ↔ ${lbl} 일지 ${day.branch} — 충 (올해 이동·변동)`,
            `annual branch ${sb} ↔ ${lbl} day-branch ${day.branch} — clash (this year: movement/change)`
          )
        )
      else if (isHyeong(sb, day.branch))
        seunLines.push(
          L(
            `세운지지 ${sb} ↔ ${lbl} 일지 ${day.branch} — 형 (올해 갈등·구설)`,
            `annual branch ${sb} ↔ ${lbl} day-branch ${day.branch} — punishment (this year: conflict/gossip)`
          )
        )
    }
    crossNatal(labelA, aDay)
    crossNatal(labelB, bDay)
    const crossDaeun = (lbl: string, dae?: { stem: string; branch: string } | null) => {
      if (!dae) return
      if (STEM_CHUNG[ss] === dae.stem)
        seunLines.push(
          L(
            `세운 ↔ ${lbl} 대운천간 ${dae.stem} — 충 (올해와 대운 흐름 충돌)`,
            `annual ↔ ${lbl} daeun-stem ${dae.stem} — clash (this year vs daeun-flow conflict)`
          )
        )
      if (BRANCH_CHUNG[sb] === dae.branch)
        seunLines.push(
          L(
            `세운 ↔ ${lbl} 대운지지 ${dae.branch} — 충 (올해와 대운 흐름 충돌)`,
            `annual ↔ ${lbl} daeun-branch ${dae.branch} — clash (this year vs daeun-flow conflict)`
          )
        )
      if (BRANCH_HAP[sb]?.other === dae.branch)
        seunLines.push(
          L(
            `세운 ↔ ${lbl} 대운지지 ${dae.branch} — 합 (올해 대운과 결속)`,
            `annual ↔ ${lbl} daeun-branch ${dae.branch} — union (this year bonds with daeun)`
          )
        )
    }
    crossDaeun(labelA, input.currentDaeunA)
    crossDaeun(labelB, input.currentDaeunB)
    important.push(
      L(
        `올해 세운 ${seun.year}년 ${ss}${sb} cross${seunLines.length ? ':' : ' — 두 사람 본명·대운과 직접 합·충 없음 (올해 큰 변동 신호 약함)'}`,
        `this year's annual ${seun.year} ${ss}${sb} cross${seunLines.length ? ':' : ' — no direct union/clash with either chart or daeun (weak signal for big change this year)'}`
      )
    )
    for (const l of seunLines) important.push(`  ${l}`)
  }

  // 7. 오행 균형 → IMPORTANT (1줄)
  const els = ['목', '화', '토', '금', '수'] as const
  const countsA: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const countsB: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of A) {
    if (STEM_EL[p.stem]) countsA[STEM_EL[p.stem]]++
    if (BRANCH_EL[p.branch]) countsA[BRANCH_EL[p.branch]]++
  }
  for (const p of B) {
    if (STEM_EL[p.stem]) countsB[STEM_EL[p.stem]]++
    if (BRANCH_EL[p.branch]) countsB[BRANCH_EL[p.branch]]++
  }
  const merged: Record<string, number> = {}
  for (const e of els) merged[e] = countsA[e] + countsB[e]
  const sorted = [...els].sort((a, b) => merged[b] - merged[a])
  const balNote =
    merged[sorted[0]] - merged[sorted[4]] >= 4
      ? L(
          `${sorted[0]} 강 / ${sorted[4]} 약 (보완 필요)`,
          `${elD(sorted[0])} strong / ${elD(sorted[4])} weak (needs balancing)`
        )
      : L(
          `${sorted[0]}~${sorted[4]} 폭 좁음 (비교적 균형)`,
          `${elD(sorted[0])}~${elD(sorted[4])} narrow spread (fairly balanced)`
        )
  const elTally = (cnt: Record<string, number>, sp: string) =>
    els.map((e) => `${en ? `${elD(e)}${sp}` : e}${cnt[e]}`).join(en ? ' ' : '')
  important.push(
    L(
      `오행 합산 ${els.map((e) => `${e}${merged[e]}`).join(' ')} (A ${els.map((e) => `${e}${countsA[e]}`).join('')} / B ${els.map((e) => `${e}${countsB[e]}`).join('')}) → ${balNote}`,
      `element totals ${els.map((e) => `${elD(e)} ${merged[e]}`).join(' / ')} (A: ${elTally(countsA, ' ')} / B: ${elTally(countsB, ' ')}) → ${balNote}`
    )
  )

  // 7-b. 용신 보완 cross → CRITICAL. 정통 명리 궁합의 1급 신호: 상대가 내
  // *주용신* 오행을 채워주나(궁합 호), 내 *기신* 오행을 가중하나(주의).
  // 주용신/기신은 FiveElement('목/화/토/금/수')라 위 counts 키와 동일 →
  // 상대 카운트로 바로 인덱싱. yongsin 미제공(구버전·계산 실패)이면 통째 생략.
  {
    const yongOne = (
      label: string,
      y: SajuSynastryInput['yongsinA'],
      partnerCnt: Record<string, number>
    ): string | null => {
      if (!y?.primaryYongsin) return null
      const yong = y.primaryYongsin
      const sup = partnerCnt[yong] ?? 0
      // stripAux 가 괄호를 전부 제거하므로 유형·강도를 괄호 밖에 둔다.
      const verdict =
        sup >= 2
          ? L('잘 채워줌', 'well supplied')
          : sup === 1
            ? L('약간 보완', 'partial')
            : L('못 채움', 'not supplied')
      // 용신 유형(조후/억부/…)은 KO 만 — EN 유형 라벨 맵이 없어 한글 누수 방지차 생략.
      const ytype = y.yongsinType ? y.yongsinType.replace('용신', '') : ''
      let line = L(
        `${label} ${ytype}용신 ${yong} ← 상대 ${yong}${sup} ${verdict}`,
        `${label} yongsin ${elD(yong)} ← partner ${elD(yong)} ${sup} ${verdict}`
      )
      const kib = y.kibsin
      if (kib) {
        const kc = partnerCnt[kib] ?? 0
        if (kc >= 2)
          line += L(
            ` · 기신 ${kib} 상대 ${kib}${kc} 가중주의`,
            ` · avoids ${elD(kib)} but partner has ${kc}`
          )
      }
      return line
    }
    const yLineA = yongOne(labelA, input.yongsinA, countsB)
    const yLineB = yongOne(labelB, input.yongsinB, countsA)
    if (yLineA) yongsinCrossLines.push(yLineA)
    if (yLineB) yongsinCrossLines.push(yLineB)
  }

  // 8. 공망 cross — 한 쪽 공망이 상대 지지에 걸리면 그 영역이 공허·초연.
  // 일지(2)에 걸리면 가장 강한 신호.
  {
    const aGong = gongmangOf(aDay.stem, aDay.branch)
    const bGong = gongmangOf(bDay.stem, bDay.branch)
    const hits: string[] = []
    const dayStrong = (k: number) => (k === 2 ? L('(일지·강)', '(day-branch·strong)') : '')
    for (let j = 0; j < B.length; j++) {
      if (B[j].branch && aGong.includes(B[j].branch)) {
        hits.push(
          L(
            `${labelA}공망 → ${labelB} ${PILLAR_LABELS[j]}지 ${B[j].branch}${j === 2 ? '(일지·강)' : ''}`,
            `${labelA} void → ${labelB} ${PL[j]}-branch ${B[j].branch}${dayStrong(j)}`
          )
        )
      }
    }
    for (let i = 0; i < A.length; i++) {
      if (A[i].branch && bGong.includes(A[i].branch)) {
        hits.push(
          L(
            `${labelB}공망 → ${labelA} ${PILLAR_LABELS[i]}지 ${A[i].branch}${i === 2 ? '(일지·강)' : ''}`,
            `${labelB} void → ${labelA} ${PL[i]}-branch ${A[i].branch}${dayStrong(i)}`
          )
        )
      }
    }
    if (hits.length) {
      important.push(
        L(
          `공망 cross (${labelA}공망 ${aGong.join('')} / ${labelB}공망 ${bGong.join('')}): ${hits.join(' · ')} — 적중 영역은 서로 공허·초연·집착 약함`,
          `void cross (${labelA} void ${aGong.join('')} / ${labelB} void ${bGong.join('')}): ${hits.join(' · ')} — hit areas feel mutually empty/detached, low attachment`
        )
      )
    } else {
      chamgo.push(
        L(
          `공망 cross: ${labelA}공망 ${aGong.join('')} / ${labelB}공망 ${bGong.join('')} — 서로 적중 없음 (공허 신호 약함)`,
          `void cross: ${labelA} void ${aGong.join('')} / ${labelB} void ${bGong.join('')} — no mutual hit (weak void signal)`
        )
      )
    }
  }

  // ── 배우자성 cross (sibsin) — 정통 명리 궁합의 핵심.
  // A 일간 시각 B 의 각 천간/지지 + B 일간 시각 A 의 각 천간/지지 매핑.
  // 정재/편재(妻星) 와 정관/편관(夫星) 만 추출해 LLM 에 명시.
  // 일주(=배우자궁) 에 잡히면 가장 강한 신호.
  const spouseStars = new Set(['정재', '편재', '정관', '편관'])
  const spouseRoleLabel: Record<string, string> = {
    정재: '처성(안정·가정)',
    편재: '처성(활달·자유)',
    정관: '부성(책임·안정)',
    편관: '부성(열정·자극)',
  }
  const spouseRoleLabelEn: Record<string, string> = {
    정재: 'wife-star (stable·home)',
    편재: 'wife-star (lively·free)',
    정관: 'husband-star (responsible·stable)',
    편관: 'husband-star (passion·spark)',
  }
  const roleD = (s: string) => (en ? (spouseRoleLabelEn[s] ?? '') : spouseRoleLabel[s])
  const sibsinCrossLines: string[] = []
  const findSpouseSignals = (
    fromLabel: string,
    fromDay: { stem: string },
    other: SajuPillarInput[],
    otherLabel: string
  ) => {
    const hits: string[] = []
    other.forEach((p, idx) => {
      if (!p.stem) return
      const s = sibseongFor(fromDay.stem, p.stem)
      if (spouseStars.has(s)) {
        const at =
          idx === 2
            ? L('일주(배우자궁)', 'D-pillar(spouse-palace)')
            : `${PL[idx]}${L('주', '-pillar')}`
        hits.push(`${sibD(s)}(${roleD(s)}) ${L('→', 'at')} ${otherLabel} ${at} ${p.stem}`)
      }
      // 지지 본기 천간으로도 체크 — 지지 십성 보완.
      const branchStem = BRANCH_MAIN_STEM[p.branch]
      if (branchStem) {
        const sBr = sibseongFor(fromDay.stem, branchStem)
        if (spouseStars.has(sBr)) {
          const at =
            idx === 2
              ? L('일지(배우자궁)', 'D-branch(spouse-palace)')
              : `${PL[idx]}${L('지', '-branch')}`
          hits.push(
            `${sibD(sBr)}(${roleD(sBr)}) ${L('→', 'at')} ${otherLabel} ${at} ${p.branch}${L(`(본기 ${branchStem})`, `(main-qi ${branchStem})`)}`
          )
        }
      }
    })
    if (hits.length) {
      sibsinCrossLines.push(
        L(
          `${fromLabel} 일간(${fromDay.stem}) 기준 ${otherLabel} 차트의 배우자성: ${hits.join(' · ')}`,
          `spouse-stars in ${otherLabel}'s chart, relative to ${fromLabel} day-master(${fromDay.stem}): ${hits.join(' · ')}`
        )
      )
    }
  }
  if (aDay.stem && bDay.stem) {
    findSpouseSignals(labelA, aDay, B, labelB)
    findSpouseSignals(labelB, bDay, A, labelA)
  }

  // ── 신살 cross — 도화/홍염/백호/괴강. 정통 명리에 명시된 lookup table 로
  // 결정적으로 계산 (LLM 한테 personalShinsal 추측 맡기지 않음).
  //   - 도화 (자오묘유): A 일지의 三合 마지막 지지가 B 의 지지에 있으면 자석 끌림.
  //   - 홍염 (일간별 특정 지지): A 일간 홍염 지지가 B 지지에 있으면 색기·끌림.
  //   - 백호일주: 둘 다 백호 또는 한쪽 백호 + 상대 일지가 그 백호 일지와 충 → 격정.
  //   - 괴강일주: 둘 다 괴강이면 강력 충돌·자극.
  const DOHWA: Record<string, string> = {
    申: '酉',
    子: '酉',
    辰: '酉',
    寅: '卯',
    午: '卯',
    戌: '卯',
    巳: '午',
    酉: '午',
    丑: '午',
    亥: '子',
    卯: '子',
    未: '子',
  }
  const HONGYEOM: Record<string, string> = {
    甲: '午',
    乙: '午',
    丙: '寅',
    丁: '未',
    戊: '辰',
    己: '辰',
    庚: '戌',
    辛: '酉',
    壬: '子',
    癸: '申',
  }
  const BAEKHO = new Set(['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'])
  const GOEGANG = new Set(['庚辰', '庚戌', '壬辰', '壬戌', '戊戌'])
  // BRANCH_CHUNG 은 파일 상단(line ~52) 에 이미 정의됨 — 재사용.
  const shinsalCrossLines: string[] = []
  const aDayBr = aDay.branch
  const bDayBr = bDay.branch
  const otherBranches = (p: SajuPillarInput[]) =>
    p.map((x, i) => ({ idx: i, br: x.branch })).filter((x) => !!x.br)
  // 도화 cross — A 일지 기준
  if (aDayBr) {
    const aDohwa = DOHWA[aDayBr]
    if (aDohwa) {
      for (const { idx, br } of otherBranches(B)) {
        if (br === aDohwa) {
          shinsalCrossLines.push(
            L(
              `${labelA} 일지(${aDayBr}) 기준 도화 자리(${aDohwa}) 가 ${labelB} ${PILLAR_LABELS[idx]}지(${br}) 에 적중 — 자석 끌림·매력 자극`,
              `${labelA} day-branch(${aDayBr}) → peach-blossom seat(${aDohwa}) hits ${labelB} ${PL[idx]}-branch(${br}) — magnetic pull, charm trigger`
            )
          )
        }
      }
    }
  }
  if (bDayBr) {
    const bDohwa = DOHWA[bDayBr]
    if (bDohwa) {
      for (const { idx, br } of otherBranches(A)) {
        if (br === bDohwa) {
          shinsalCrossLines.push(
            L(
              `${labelB} 일지(${bDayBr}) 기준 도화 자리(${bDohwa}) 가 ${labelA} ${PILLAR_LABELS[idx]}지(${br}) 에 적중 — 자석 끌림·매력 자극`,
              `${labelB} day-branch(${bDayBr}) → peach-blossom seat(${bDohwa}) hits ${labelA} ${PL[idx]}-branch(${br}) — magnetic pull, charm trigger`
            )
          )
        }
      }
    }
  }
  // 홍염살 cross — A 일간 기준
  if (aDay.stem) {
    const aHy = HONGYEOM[aDay.stem]
    if (aHy) {
      for (const { idx, br } of otherBranches(B)) {
        if (br === aHy) {
          shinsalCrossLines.push(
            L(
              `${labelA} 일간(${aDay.stem}) 기준 홍염살(${aHy}) 이 ${labelB} ${PILLAR_LABELS[idx]}지(${br}) 에 적중 — 색기·연애 강도 +`,
              `${labelA} day-master(${aDay.stem}) → Hongyeom star(${aHy}) hits ${labelB} ${PL[idx]}-branch(${br}) — sensuality / romance intensity +`
            )
          )
        }
      }
    }
  }
  if (bDay.stem) {
    const bHy = HONGYEOM[bDay.stem]
    if (bHy) {
      for (const { idx, br } of otherBranches(A)) {
        if (br === bHy) {
          shinsalCrossLines.push(
            L(
              `${labelB} 일간(${bDay.stem}) 기준 홍염살(${bHy}) 이 ${labelA} ${PILLAR_LABELS[idx]}지(${br}) 에 적중 — 색기·연애 강도 +`,
              `${labelB} day-master(${bDay.stem}) → Hongyeom star(${bHy}) hits ${labelA} ${PL[idx]}-branch(${br}) — sensuality / romance intensity +`
            )
          )
        }
      }
    }
  }
  // 백호일주 cross
  const aDayPair = `${aDay.stem}${aDayBr}`
  const bDayPair = `${bDay.stem}${bDayBr}`
  const aIsBaekho = BAEKHO.has(aDayPair)
  const bIsBaekho = BAEKHO.has(bDayPair)
  if (aIsBaekho && bIsBaekho) {
    shinsalCrossLines.push(
      L(
        `${labelA}·${labelB} 둘 다 백호 일주(${aDayPair} / ${bDayPair}) — 격정·강한 의지 충돌 가능, 한쪽이 누그러져야 안정`,
        `${labelA}·${labelB} both Baekho day-pillar(${aDayPair} / ${bDayPair}) — possible intense clash of strong wills; one must soften for stability`
      )
    )
  } else if (aIsBaekho || bIsBaekho) {
    const baekhoSide = aIsBaekho ? labelA : labelB
    const baekhoBr = aIsBaekho ? aDayBr : bDayBr
    const otherSide = aIsBaekho ? labelB : labelA
    const otherDayBr = aIsBaekho ? bDayBr : aDayBr
    if (baekhoBr && otherDayBr && BRANCH_CHUNG[baekhoBr] === otherDayBr) {
      shinsalCrossLines.push(
        L(
          `${baekhoSide} 백호 일주(${aIsBaekho ? aDayPair : bDayPair}) + ${otherSide} 일지가 그 백호 지지와 충(${baekhoBr}↔${otherDayBr}) — 격정 충돌 가능`,
          `${baekhoSide} Baekho day-pillar(${aIsBaekho ? aDayPair : bDayPair}) + ${otherSide} day-branch clashes that Baekho branch(${baekhoBr}↔${otherDayBr}) — possible intense clash`
        )
      )
    }
  }
  // 괴강일주 cross
  const aIsGoegang = GOEGANG.has(aDayPair)
  const bIsGoegang = GOEGANG.has(bDayPair)
  if (aIsGoegang && bIsGoegang) {
    shinsalCrossLines.push(
      L(
        `${labelA}·${labelB} 둘 다 괴강 일주(${aDayPair} / ${bDayPair}) — 카리스마 강 대 강, 서로 안 꺾이면 부딪힘`,
        `${labelA}·${labelB} both Goegang day-pillar(${aDayPair} / ${bDayPair}) — charisma vs charisma; if neither yields, they collide`
      )
    )
  }

  // ── 지장간 cross — 정통 명리 깊이의 핵심.
  // 지장간(支藏干): 지지 안에 숨은 천간들. 본기/중기/여기. 표면 천간만이
  // 아닌 "지지 안의 숨은 관계" 가 진짜 결속·갈등을 만든다. cross 룰:
  //   1) 한쪽 일간 ↔ 상대 일지 지장간에 들어있으면 "숨은 매혹/통제"
  //      (특히 정관/정재 십성이면 배우자성 잠재)
  //   2) 한쪽 일지 지장간의 본기 ↔ 상대 일지 지장간의 본기 합/충
  //      → 깊은 결속 또는 숨은 갈등
  const JIJANGGAN_TABLE: Record<string, string[]> = {
    子: ['癸'],
    丑: ['癸', '辛', '己'],
    寅: ['戊', '丙', '甲'],
    卯: ['乙'],
    辰: ['乙', '癸', '戊'],
    巳: ['戊', '庚', '丙'],
    午: ['丙', '己', '丁'],
    未: ['丁', '乙', '己'],
    申: ['戊', '壬', '庚'],
    酉: ['辛'],
    戌: ['辛', '丁', '戊'],
    亥: ['戊', '甲', '壬'],
  }
  const jijangganCrossLines: string[] = []
  // (1) A 일간이 B 일지 지장간 안에 — 숨은 매혹/통제 결정.
  if (aDay.stem && bDayBr) {
    const bDayHidden = JIJANGGAN_TABLE[bDayBr] ?? []
    if (bDayHidden.includes(aDay.stem)) {
      jijangganCrossLines.push(
        L(
          `${labelA} 일간(${aDay.stem}) 이 ${labelB} 일지(${bDayBr}) 지장간 [${bDayHidden.join('·')}] 안에 숨어 있음 — 표면엔 안 보여도 ${labelB} 안에 ${labelA} 가 깊이 자리 잡은 관계`,
          `${labelA} day-master(${aDay.stem}) is hidden inside ${labelB} day-branch(${bDayBr}) hidden-stems [${bDayHidden.join('·')}] — not visible on the surface, yet ${labelA} sits deep within ${labelB}`
        )
      )
    }
  }
  if (bDay.stem && aDayBr) {
    const aDayHidden = JIJANGGAN_TABLE[aDayBr] ?? []
    if (aDayHidden.includes(bDay.stem)) {
      jijangganCrossLines.push(
        L(
          `${labelB} 일간(${bDay.stem}) 이 ${labelA} 일지(${aDayBr}) 지장간 [${aDayHidden.join('·')}] 안에 숨어 있음 — 표면엔 안 보여도 ${labelA} 안에 ${labelB} 가 깊이 자리 잡은 관계`,
          `${labelB} day-master(${bDay.stem}) is hidden inside ${labelA} day-branch(${aDayBr}) hidden-stems [${aDayHidden.join('·')}] — not visible on the surface, yet ${labelB} sits deep within ${labelA}`
        )
      )
    }
  }
  // (2) 두 일지 지장간 본기 끼리의 합/충. (본기 = 가장 강한 숨은 천간)
  if (aDayBr && bDayBr) {
    const aHidden = JIJANGGAN_TABLE[aDayBr] ?? []
    const bHidden = JIJANGGAN_TABLE[bDayBr] ?? []
    const aJeongi = aHidden[aHidden.length - 1] // 본기 = 마지막
    const bJeongi = bHidden[bHidden.length - 1]
    if (aJeongi && bJeongi && aJeongi !== aDay.stem && bJeongi !== bDay.stem) {
      if (STEM_HAP[aJeongi]?.other === bJeongi) {
        jijangganCrossLines.push(
          L(
            `${labelA} 일지 본기(${aJeongi}) + ${labelB} 일지 본기(${bJeongi}) 합화${STEM_HAP[aJeongi]!.element} — 표면 외에 *지지 깊이* 에서 결속`,
            `${labelA} day-branch main-qi(${aJeongi}) + ${labelB} day-branch main-qi(${bJeongi}) combine→${elD(STEM_HAP[aJeongi]!.element)} — bonding at *branch depth* beyond the surface`
          )
        )
      } else if (STEM_CHUNG[aJeongi] === bJeongi) {
        jijangganCrossLines.push(
          L(
            `${labelA} 일지 본기(${aJeongi}) ↔ ${labelB} 일지 본기(${bJeongi}) 충 — 표면은 잠잠해도 *지지 깊이* 에서 부딪힘`,
            `${labelA} day-branch main-qi(${aJeongi}) ↔ ${labelB} day-branch main-qi(${bJeongi}) clash — calm on the surface, yet colliding at *branch depth*`
          )
        )
      }
    }
  }

  // ── 조립: 우선순위 티어 ── (헤더 짧게, 빈자료 블록 생략, 빈 라인 제거)
  const out: string[] = [L('== 시너스트리 (사주 cross) ==', '== Synastry (Saju cross) ==')]
  if (elA && elB) {
    out.push(
      L(
        `[고정] ${labelA} 일간 ${aDay.stem}${elA} · ${labelB} 일간 ${bDay.stem}${elB} — 오행·방향 절대 뒤집지 말 것`,
        `[FIXED] ${labelA} day-master ${se(aDay.stem, elA)} · ${labelB} day-master ${se(bDay.stem, elB)} — never reverse the element or direction`
      )
    )
  }
  if (critical.length) {
    out.push(
      L(
        '[CRITICAL · 일간 극/천간합/일지 충형]',
        '[CRITICAL · day-master control / stem-combine / day-branch clash·punishment]'
      )
    )
    out.push(critical.join('\n'))
  }
  if (sibsinCrossLines.length) {
    out.push(L('[CRITICAL · 배우자성 (십성)]', '[CRITICAL · spouse-stars (ten-gods)]'))
    out.push(...sibsinCrossLines)
  }
  if (yongsinCrossLines.length) {
    out.push(L('[CRITICAL · 용신 보완 (오행 궁합)]', '[CRITICAL · yongsin supply (element fit)]'))
    out.push(...yongsinCrossLines)
  }
  if (shinsalCrossLines.length) {
    out.push(
      L(
        '[CRITICAL · 신살 (도화·홍염·백호·괴강)]',
        '[CRITICAL · sinsal (peach-blossom·Hongyeom·Baekho·Goegang)]'
      )
    )
    out.push(...shinsalCrossLines)
  }
  if (jijangganCrossLines.length) {
    out.push(
      L(
        '[CRITICAL · 지장간 (지지 깊이의 숨은 관계)]',
        '[CRITICAL · hidden-stems (deep hidden relations in branches)]'
      )
    )
    out.push(...jijangganCrossLines)
  }
  if (important.length) {
    out.push('[IMPORTANT]') // tier label kept (language-neutral)
    out.push(important.join('\n'))
  }
  if (chamgo.length) {
    out.push(L('[참고]', '[NOTE]'))
    out.push(...chamgo)
  }
  const joined = stripAux(out.join('\n'))
  return en ? joined : koreanize(joined)
}
