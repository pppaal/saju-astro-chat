/**
 * 점수 → 등급 매핑.
 * 사용자가 볼 등급명은 명리적 분위기. 점수는 정렬·내부용으로만.
 *
 * 천운 (85+)   purple+gold      "정말 강한 흐름"
 * 길   (70~85) emerald          "받쳐주는 흐름"
 * 평   (45~70) zinc             "보통"
 * 주의 (30~45) amber            "신중하게"
 * 흉   (0~30)  rose             "큰 결정 미루기"
 */
export interface ScoreGrade {
  label: string
  sub: string
  colorClass: string
  bgClass: string
  borderClass: string
}

export function getScoreGrade(score: number): ScoreGrade {
  if (score >= 85) {
    return {
      label: '천운',
      sub: '정말 강한 흐름',
      colorClass: 'text-fuchsia-300',
      bgClass: 'bg-gradient-to-br from-fuchsia-900/40 to-amber-900/30',
      borderClass: 'border-fuchsia-400/40',
    }
  }
  if (score >= 70) {
    return {
      label: '길',
      sub: '받쳐주는 흐름',
      colorClass: 'text-emerald-300',
      bgClass: 'bg-gradient-to-br from-emerald-900/40 to-cyan-900/20',
      borderClass: 'border-emerald-500/30',
    }
  }
  if (score >= 45) {
    return {
      label: '평',
      sub: '보통',
      colorClass: 'text-zinc-300',
      bgClass: 'bg-gradient-to-br from-indigo-950/40 to-zinc-900/40',
      borderClass: 'border-indigo-500/20',
    }
  }
  if (score >= 30) {
    return {
      label: '주의',
      sub: '신중하게',
      colorClass: 'text-amber-300',
      bgClass: 'bg-gradient-to-br from-amber-900/30 to-zinc-900/40',
      borderClass: 'border-amber-500/30',
    }
  }
  return {
    label: '흉',
    sub: '큰 결정 미루기',
    colorClass: 'text-rose-300',
    bgClass: 'bg-gradient-to-br from-rose-900/40 to-zinc-900/40',
    borderClass: 'border-rose-500/40',
  }
}
