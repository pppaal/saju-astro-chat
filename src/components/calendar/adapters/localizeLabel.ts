/**
 * localizeLabel — 캘린더 '근거 신호' 라벨을 KO 로 best-effort 치환.
 * 엔진 신호 라벨엔 영문 행성명·12별자리·내부 위계/ZR 코드가 섞여 나오는데,
 * KO 로케일 화면에서 그대로 노출되면 영어/전문코드 벽이 된다. 컴포넌트 렌더
 * 직전에 이 헬퍼로 평어화한다(엔진·공유데이터 무수정). 인식 못 한 문자열은
 * 그대로 통과 → EN 로케일·미상 라벨엔 영향 없음.
 */

import { SIBSIN_EN } from '@/lib/saju/sibsinLabels'
import { translateSignalLabel } from '@/lib/calendar-engine/derivers/signalI18n'

// 12별자리 EN → KO.
const SIGN_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

// 신호 라벨 EN 행성·점 이름 → KO (긴 키 먼저 치환되도록 순서 주의).
const LABEL_PLANET_KO: Array<[string, string]> = [
  ['True Node', '북교점'],
  ['Ascendant', '상승점'],
  ['Sun', '태양'],
  ['Moon', '달'],
  ['Mercury', '수성'],
  ['Venus', '금성'],
  ['Mars', '화성'],
  ['Jupiter', '목성'],
  ['Saturn', '토성'],
  ['Uranus', '천왕성'],
  ['Neptune', '해왕성'],
  ['Pluto', '명왕성'],
  ['Chiron', '카이런'],
  ['Lilith', '릴리스'],
  ['MC', '중천'],
  ['Node', '교점'],
]

export function localizeLabel(label: string, ko: boolean): string {
  if (!label) return label
  if (!ko) {
    // EN: KO 음역 위계·태그 잔재만 영문화(엔진이 일부 라벨에 KO '엑잘테이션' 등을
    // 박아 EN 화면에 새는 경우). 그 외 문자열은 그대로.
    let en = label
      .replace(/\[월운\]/g, '[monthly]')
      .replace(/엑잘테이션\s*\(고양\)/g, 'at its best (exaltation)')
      .replace(/디트리먼트\s*\(반대\s*자리\)/g, 'weakened (detriment)')
      .replace(/폴\s*\(추락\)/g, 'weak (fall)')
    // 십신·격국 KO 잔재(예: "정관 시진", "식신격") → EN.
    if (/시진|격/.test(en)) {
      for (const [koSib, enSib] of Object.entries(SIBSIN_EN)) {
        en = en.replace(new RegExp(koSib, 'g'), enSib)
      }
      en = en.replace(/\s*시진/g, ' hour').replace(/격(?![가-힣])/g, ' frame')
    }
    // 폴백: 위 specific 맵이 못 잡은 엔진 KO 토큰(관계 충/합/형, 신살,
    // 집계 star 관성/재성, ZR/격국 상태어 등)을 signalI18n 의 넓은 표로 영문화.
    // 매칭 안 되는 토큰은 그대로 통과(graceful) → 미상 라벨엔 영향 없음.
    en = translateSignalLabel(en, 'en')
    return en
  }
  let out = label

  // ZR(Zodiacal Releasing) 코드 → 평이한 KO. "운명 ZR L2 결 풀림" / "ZR Fortune L3 Peak" 등.
  out = out.replace(/Loosing-of-the-Bond\s*:?/gi, '전환점 — ')
  out = out.replace(
    /(운명\s+)?ZR\s+(?:Fortune|Spirit)?\s*(?:L\d+)?(?:\s+Peak)?\s*:?/gi,
    '운명 흐름 '
  )
  out = out.replace(/\bL\d+\b/g, '')
  out = out.replace(/운명 흐름(?:\s+운명 흐름)+/g, '운명 흐름')

  // ' in <Sign>' → '(<한글별자리>)'
  out = out.replace(
    /\s+in\s+(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/g,
    (_m, sign: string) => `(${SIGN_KO[sign] ?? sign})`
  )
  // 남은 별자리 영문 (괄호·콜론 뒤 등) → 한글.
  for (const [en, koName] of Object.entries(SIGN_KO)) {
    out = out.replace(new RegExp(`\\b${en}\\b`, 'g'), koName)
  }

  // 내부 위계 코드 완화.
  out = out
    .replace(/엑잘테이션\s*\(고양\)/g, '가장 좋은 자리(고양)')
    .replace(/디트리먼트\s*\(반대\s*자리\)/g, '불리한 자리(디트리먼트)')
    .replace(/폴\s*\(추락\)/g, '약한 자리(추락)')

  // 영문 행성명 → 한글 (긴 키 먼저).
  for (const [en, koName] of LABEL_PLANET_KO) {
    out = out.replace(new RegExp(`\\b${en}\\b`, 'g'), koName)
  }

  // 공백 정리.
  return out.replace(/\s{2,}/g, ' ').trim()
}
