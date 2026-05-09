// Saju/myunggung.ts
// 命宮 (명궁) — 자평진전·적천수 정통.
// 寅月起命宮 + 五虎遁(년간으로 寅월 천간 결정) 산출법.
//
// 산출:
//  1. 寅월 출생 시 명궁(指地支): 卯時=子, 寅=丑, 丑=寅, 子=卯, 亥=辰, 戌=巳, 酉=午,
//     申=未, 未=申, 午=酉, 巳=戌, 辰=亥
//     (즉 시지가 한 방향으로 進行하면 명궁은 反方向)
//  2. 출생월이 寅에서 N칸 進行하면 명궁을 N칸 逆行
//  3. 명궁 천간: 五虎遁 — 년간으로 寅월 천간 결정 후 명궁 지지까지 順行
//     (甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅)

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

type Stem = typeof STEMS[number]
type Branch = typeof BRANCHES[number]

// 寅월 출생 시 시지 → 명궁 지지
const HOUR_TO_INWOL_MYUNGGUNG: Record<Branch, Branch> = {
  子: '卯', 丑: '寅', 寅: '丑', 卯: '子',
  辰: '亥', 巳: '戌', 午: '酉', 未: '申',
  申: '未', 酉: '午', 戌: '巳', 亥: '辰',
}

// 五虎遁 (년간 → 寅월 천간)
const FIVE_TIGER_TUN: Record<Stem, Stem> = {
  甲: '丙', 己: '丙',
  乙: '戊', 庚: '戊',
  丙: '庚', 辛: '庚',
  丁: '壬', 壬: '壬',
  戊: '甲', 癸: '甲',
}

export interface MyunggungResult {
  stem: Stem
  branch: Branch
  description: string
}

function isStem(s: string): s is Stem {
  return (STEMS as readonly string[]).includes(s)
}

function isBranch(b: string): b is Branch {
  return (BRANCHES as readonly string[]).includes(b)
}

/**
 * 명궁 산출.
 * @param yearStem  년주 천간 (五虎遁 적용용)
 * @param monthBranch 출생 월지 (寅起 기준 월지)
 * @param hourBranch  출생 시지
 */
export function calculateMyunggung(
  yearStem: string,
  monthBranch: string,
  hourBranch: string,
): MyunggungResult {
  if (!isStem(yearStem)) throw new Error(`Invalid year stem: ${yearStem}`)
  if (!isBranch(monthBranch)) throw new Error(`Invalid month branch: ${monthBranch}`)
  if (!isBranch(hourBranch)) throw new Error(`Invalid hour branch: ${hourBranch}`)

  // 1. 寅월 출생 시 명궁 지지
  const inwolMyunggung = HOUR_TO_INWOL_MYUNGGUNG[hourBranch]

  // 2. 출생월이 寅에서 N칸 진행 → 명궁 N칸 역행
  //    寅 = idx 2 in BRANCHES
  const monthShift = (BRANCHES.indexOf(monthBranch) - 2 + 12) % 12
  const myunggungBranchIdx = (BRANCHES.indexOf(inwolMyunggung) - monthShift + 12) % 12
  const myunggungBranch = BRANCHES[myunggungBranchIdx]

  // 3. 五虎遁 — 년간으로 寅월 천간 → 명궁 지지까지 순행
  const inwolStem = FIVE_TIGER_TUN[yearStem]
  const branchShiftFromIn = (myunggungBranchIdx - 2 + 12) % 12
  const myunggungStemIdx = (STEMS.indexOf(inwolStem) + branchShiftFromIn) % 10
  const myunggungStem = STEMS[myunggungStemIdx]

  return {
    stem: myunggungStem,
    branch: myunggungBranch,
    description: `명궁 ${myunggungStem}${myunggungBranch} — 본명의 운명궁, 평생 지향과 정신의 자리.`,
  }
}
