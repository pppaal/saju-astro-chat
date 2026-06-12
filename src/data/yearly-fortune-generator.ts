import { BlogPost } from './blog-posts'
import { iga, waGwa } from '@/lib/i18n/koParticle'

// 천간 (Heavenly Stems)
// export: seo-posts/dayPillarPosts 가 같은 테이블을 재사용한다(중복 금지 — SSOT).
export const HEAVENLY_STEMS = [
  { ko: '갑', hanja: '甲', en: 'Jia', element: 'Wood', yin: false, color: 'Blue', colorKo: '청' },
  { ko: '을', hanja: '乙', en: 'Eul', element: 'Wood', yin: true, color: 'Blue', colorKo: '청' },
  { ko: '병', hanja: '丙', en: 'Byeong', element: 'Fire', yin: false, color: 'Red', colorKo: '적' },
  { ko: '정', hanja: '丁', en: 'Jeong', element: 'Fire', yin: true, color: 'Red', colorKo: '적' },
  { ko: '무', hanja: '戊', en: 'Mu', element: 'Earth', yin: false, color: 'Yellow', colorKo: '황' },
  { ko: '기', hanja: '己', en: 'Gi', element: 'Earth', yin: true, color: 'Yellow', colorKo: '황' },
  {
    ko: '경',
    hanja: '庚',
    en: 'Gyeong',
    element: 'Metal',
    yin: false,
    color: 'White',
    colorKo: '백',
  },
  { ko: '신', hanja: '辛', en: 'Sin', element: 'Metal', yin: true, color: 'White', colorKo: '백' },
  { ko: '임', hanja: '壬', en: 'Im', element: 'Water', yin: false, color: 'Black', colorKo: '흑' },
  { ko: '계', hanja: '癸', en: 'Gye', element: 'Water', yin: true, color: 'Black', colorKo: '흑' },
]

// 지지 (Earthly Branches) - 12띠
export const EARTHLY_BRANCHES = [
  {
    ko: '자',
    hanja: '子',
    en: 'Rat',
    animal: 'Rat',
    animalKo: '쥐',
    icon: '🐀',
    hiddenElement: 'Water',
  },
  {
    ko: '축',
    hanja: '丑',
    en: 'Ox',
    animal: 'Ox',
    animalKo: '소',
    icon: '🐂',
    hiddenElement: 'Earth',
  },
  {
    ko: '인',
    hanja: '寅',
    en: 'Tiger',
    animal: 'Tiger',
    animalKo: '호랑이',
    icon: '🐅',
    hiddenElement: 'Wood',
  },
  {
    ko: '묘',
    hanja: '卯',
    en: 'Rabbit',
    animal: 'Rabbit',
    animalKo: '토끼',
    icon: '🐇',
    hiddenElement: 'Wood',
  },
  {
    ko: '진',
    hanja: '辰',
    en: 'Dragon',
    animal: 'Dragon',
    animalKo: '용',
    icon: '🐉',
    hiddenElement: 'Earth',
  },
  {
    ko: '사',
    hanja: '巳',
    en: 'Snake',
    animal: 'Snake',
    animalKo: '뱀',
    icon: '🐍',
    hiddenElement: 'Fire',
  },
  {
    ko: '오',
    hanja: '午',
    en: 'Horse',
    animal: 'Horse',
    animalKo: '말',
    icon: '🐴',
    hiddenElement: 'Fire',
  },
  {
    ko: '미',
    hanja: '未',
    en: 'Goat',
    animal: 'Goat',
    animalKo: '양',
    icon: '🐐',
    hiddenElement: 'Earth',
  },
  {
    ko: '신',
    hanja: '申',
    en: 'Monkey',
    animal: 'Monkey',
    animalKo: '원숭이',
    icon: '🐵',
    hiddenElement: 'Metal',
  },
  {
    ko: '유',
    hanja: '酉',
    en: 'Rooster',
    animal: 'Rooster',
    animalKo: '닭',
    icon: '🐓',
    hiddenElement: 'Metal',
  },
  {
    ko: '술',
    hanja: '戌',
    en: 'Dog',
    animal: 'Dog',
    animalKo: '개',
    icon: '🐕',
    hiddenElement: 'Earth',
  },
  {
    ko: '해',
    hanja: '亥',
    en: 'Pig',
    animal: 'Pig',
    animalKo: '돼지',
    icon: '🐖',
    hiddenElement: 'Water',
  },
]

// 오행 특성
export const ELEMENT_TRAITS = {
  Wood: {
    en: ['growth', 'creativity', 'flexibility', 'new beginnings'],
    ko: ['성장', '창의성', '유연성', '새로운 시작'],
    interaction: { feeds: 'Fire', controls: 'Earth', weakens: 'Metal' },
  },
  Fire: {
    en: ['passion', 'transformation', 'visibility', 'action'],
    ko: ['열정', '변화', '가시성', '행동'],
    interaction: { feeds: 'Earth', controls: 'Metal', weakens: 'Water' },
  },
  Earth: {
    en: ['stability', 'nourishment', 'grounding', 'reliability'],
    ko: ['안정', '양육', '기반', '신뢰성'],
    interaction: { feeds: 'Metal', controls: 'Water', weakens: 'Wood' },
  },
  Metal: {
    en: ['refinement', 'precision', 'value', 'clarity'],
    ko: ['정제', '정밀함', '가치', '명확성'],
    interaction: { feeds: 'Water', controls: 'Wood', weakens: 'Fire' },
  },
  Water: {
    en: ['wisdom', 'flow', 'adaptability', 'depth'],
    ko: ['지혜', '흐름', '적응력', '깊이'],
    interaction: { feeds: 'Wood', controls: 'Fire', weakens: 'Earth' },
  },
}

// 연도에서 간지 계산
function getYearGanZhi(year: number) {
  // 1984년은 갑자년(甲子年) - 60갑자 기준점
  const baseYear = 1984
  const diff = year - baseYear
  const stemIndex = ((diff % 10) + 10) % 10
  const branchIndex = ((diff % 12) + 12) % 12

  return {
    stem: HEAVENLY_STEMS[stemIndex],
    branch: EARTHLY_BRANCHES[branchIndex],
  }
}

// 동적 연도 운세 블로그 글 생성
export function generateYearlyFortuneBlogPost(year: number): BlogPost {
  const { stem, branch } = getYearGanZhi(year)
  const element = stem.element as keyof typeof ELEMENT_TRAITS
  const traits = ELEMENT_TRAITS[element]
  const hiddenElement = branch.hiddenElement as keyof typeof ELEMENT_TRAITS

  const yearName = `${stem.hanja}${branch.hanja}`
  const yearNameKo = `${stem.ko}${branch.ko}년`
  const colorAnimal = `${stem.color} ${stem.element} ${branch.animal}`
  const colorAnimalKo = `${stem.colorKo}${branch.animalKo}`

  return {
    slug: `saju-${year}-year-of-${stem.color.toLowerCase()}-${branch.animal.toLowerCase()}`,
    title: `${year} Year of the ${colorAnimal}: What Saju Reveals About Your Year Ahead`,
    titleKo: `${year} ${colorAnimalKo}년(${stem.colorKo}${branch.hanja}年): 사주로 보는 새해 운세`,
    excerpt: `Discover what the ${year} Year of the ${colorAnimal} means for your Saju chart and how to maximize your fortune this year.`,
    excerptKo: `${year}년 ${yearNameKo}(${yearName}年) ${colorAnimalKo}의 해가 당신의 사주에 어떤 의미인지, 올해 행운을 극대화하는 방법을 알아보세요.`,
    category: 'Saju',
    categoryKo: '사주',
    icon: branch.icon,
    date: `${year}-01-01`,
    readTime: 10,
    featured: true,
    content: generateEnglishContent(year, stem, branch, traits, hiddenElement),
    contentKo: generateKoreanContent(year, stem, branch, traits, hiddenElement),
  }
}

function generateEnglishContent(
  year: number,
  stem: (typeof HEAVENLY_STEMS)[0],
  branch: (typeof EARTHLY_BRANCHES)[0],
  traits: (typeof ELEMENT_TRAITS)[keyof typeof ELEMENT_TRAITS],
  hiddenElement: keyof typeof ELEMENT_TRAITS
): string {
  const yearName = `${stem.hanja}${branch.hanja}`
  const colorAnimal = `${stem.color} ${stem.element} ${branch.animal}`
  const yinYang = stem.yin ? 'Yin' : 'Yang'

  return `
## Welcome to the Year of the ${colorAnimal}

${year} marks the Year of the ${colorAnimal} (${yearName}年, ${stem.en}${branch.ko}-nyeon) in the traditional East Asian calendar. This is a year of ${traits.en.slice(0, 2).join(' and ')}. Let's explore what this means for your Saju.

## Understanding ${year}'s Energy

### The Heavenly Stem: ${stem.en} (${stem.hanja}) - ${yinYang} ${stem.element}
${stem.en} represents:
- **${traits.en[0].charAt(0).toUpperCase() + traits.en[0].slice(1)}**: Core energy of ${stem.element}
- **${traits.en[1].charAt(0).toUpperCase() + traits.en[1].slice(1)}**: ${yinYang} expression
- **${traits.en[2].charAt(0).toUpperCase() + traits.en[2].slice(1)}**: Natural tendencies
- **${traits.en[3].charAt(0).toUpperCase() + traits.en[3].slice(1)}**: Life direction

### The Earthly Branch: ${branch.ko.charAt(0).toUpperCase() + branch.ko.slice(1)} (${branch.hanja}) - ${branch.animal}
The ${branch.animal} embodies:
- **Wisdom**: ${branch.animal} characteristics
- **Hidden ${branch.hiddenElement}**: Internal energy reserves
- **Strategy**: ${branch.animal} approach to challenges
- **Timing**: ${branch.animal}'s natural rhythms

### The Elemental Combination
${stem.element} interacting with ${hiddenElement} (${branch.animal} contains hidden ${hiddenElement}):
- ${traits.interaction.feeds === hiddenElement ? `${stem.element} feeds ${hiddenElement} - productive cycle` : `Complex elemental dynamics`}
- Plans and ideas taking shape
- ${traits.en[0].charAt(0).toUpperCase() + traits.en[0].slice(1)} energy throughout the year

## ${year} Predictions by Day Master

### Wood Day Masters (甲, 乙)
**Overall**: ${stem.element === 'Wood' ? 'Your element year - heightened self-expression' : `${stem.element} influence on your growth`}

**Jia Wood (甲)**
- ${stem.element === 'Wood' ? 'Strong year for leadership' : 'Adaptation required'}
- Career opportunities emerging
- Balance work and rest
- Best months: February, June, October

**Eul Wood (乙)**
- Partnership energy strong
- Creative projects favored
- Flexibility is key
- Best months: March, July, November

### Fire Day Masters (丙, 丁)
**Overall**: ${stem.element === 'Fire' ? 'Your element year - visibility and action' : `${stem.element} shapes your expression`}

**Byeong Fire (丙)**
- Resources ${traits.interaction.feeds === 'Fire' ? 'flowing well' : 'need attention'}
- Learning opportunities
- Relationship focus
- Best months: February, May, August

**Jeong Fire (丁)**
- Nurturing energy present
- Academic pursuits favored
- Family matters highlighted
- Best months: March, June, September

### Earth Day Masters (戊, 己)
**Overall**: ${stem.element === 'Earth' ? 'Your element year - stability and growth' : `${stem.element} influences your foundation`}

**Mu Earth (戊)**
- Creative output increases
- Projects and ventures thrive
- Romance opportunities
- Best months: April, July, October

**Gi Earth (己)**
- Artistic expression flows
- Joy and pleasure emphasized
- Financial caution advised
- Best months: May, August, November

### Metal Day Masters (庚, 辛)
**Overall**: ${stem.element === 'Metal' ? 'Your element year - refinement and value' : `${stem.element} affects your resources`}

**Gyeong Metal (庚)**
- Financial ${traits.interaction.controls === 'Metal' ? 'caution needed' : 'gains possible'}
- Business opportunities
- Competition awareness
- Best months: January, April, October

**Sin Metal (辛)**
- Unexpected opportunities
- Side ventures considered
- Spending awareness
- Best months: February, August, November

### Water Day Masters (壬, 癸)
**Overall**: ${stem.element === 'Water' ? 'Your element year - wisdom and flow' : `${stem.element} influences your authority`}

**Im Water (壬)**
- Leadership roles possible
- Reputation matters
- Stress management important
- Best months: March, September, December

**Gye Water (癸)**
- Career advancement potential
- Recognition for efforts
- Work-life balance needed
- Best months: January, June, December

## Monthly Energy Flow in ${year}

| Month | Energy | Focus |
|-------|--------|-------|
| January | Earth | Foundation building |
| February | Wood | New beginnings |
| March | Wood | Growth acceleration |
| April | Earth | Consolidation |
| May | Fire | Peak activity |
| June | Fire | Culmination |
| July | Earth | Harvest time |
| August | Metal | Refinement |
| September | Metal | Evaluation |
| October | Earth | Preparation |
| November | Water | Reflection |
| December | Water | Completion |

## Maximizing Your ${year} Fortune

### For Everyone
1. **Embrace ${traits.en[2]}**: Key theme of the year
2. **Think strategically**: ${branch.animal} energy rewards planning
3. **Let go of old patterns**: Transformation is supported
4. **Cultivate ${traits.en[0]}**: Primary energy of the year
5. **Move with intention**: Avoid impulsive actions

### Favorable Activities
- Starting new educational pursuits
- Creative and artistic projects
- Strategic business planning
- Relationship development
- Health transformations

### Caution Areas
- Impulsive decisions
- Rushed commitments
- Ignoring intuition
- Overworking without rest
- Neglecting relationships

## Special Considerations

### If You're Born in ${branch.animal} Year
This is your "Tai Sui" year. Traditional recommendations:
- Wear red for protection
- Be extra mindful of major decisions
- Practice patience and caution
- Consider protective practices

### If ${branch.animal} is in Your Chart
${branch.animal} energy is amplified. This intensifies:
- Your natural ${branch.animal} characteristics
- Transformation potential
- Need for strategic thinking

## Conclusion

The ${year} Year of the ${colorAnimal} offers opportunities for ${traits.en.slice(0, 2).join(' and ')}. Success comes through ${traits.en[2]}, ${traits.en[0]}, and thoughtful action. Work with the ${branch.animal}'s energy rather than against it, and this year can bring significant positive change.

Ready to see your personalized ${year} forecast? Get your detailed Saju reading for the Year of the ${branch.animal}.
    `
}

function generateKoreanContent(
  year: number,
  stem: (typeof HEAVENLY_STEMS)[0],
  branch: (typeof EARTHLY_BRANCHES)[0],
  traits: (typeof ELEMENT_TRAITS)[keyof typeof ELEMENT_TRAITS],
  hiddenElement: keyof typeof ELEMENT_TRAITS
): string {
  const yearName = `${stem.hanja}${branch.hanja}`
  const yearNameKo = `${stem.ko}${branch.ko}년`
  const colorAnimalKo = `${stem.colorKo}${branch.animalKo}`
  const yinYangKo = stem.yin ? '음' : '양'
  const elementKo: Record<string, string> = {
    Wood: '목',
    Fire: '화',
    Earth: '토',
    Metal: '금',
    Water: '수',
  }

  return `
## ${colorAnimalKo}년(${stem.colorKo}${branch.hanja}年)을 맞이하며

${year}년은 전통 동아시아 달력으로 ${yearNameKo}(${yearName}年), ${colorAnimalKo}의 해입니다. 이것은 ${traits.ko.slice(0, 2).join('과 ')}의 해입니다. 이것이 당신의 사주에 어떤 의미인지 알아봅시다.

## ${year}년의 에너지 이해하기

### 천간: ${stem.ko}(${stem.hanja}) - ${yinYangKo}${elementKo[stem.element]}
${stem.ko}${elementKo[stem.element]}${iga(elementKo[stem.element])} 나타내는 것:
- **${traits.ko[0]}**: ${elementKo[stem.element]}의 핵심 에너지
- **${traits.ko[1]}**: ${yinYangKo}의 표현
- **${traits.ko[2]}**: 자연스러운 성향
- **${traits.ko[3]}**: 삶의 방향

### 지지: ${branch.ko}(${branch.hanja}) - ${branch.animalKo}
${branch.animalKo}${iga(branch.animalKo)} 구현하는 것:
- **지혜**: ${branch.animalKo}의 특성
- **숨겨진 ${elementKo[branch.hiddenElement]}기**: 내면의 에너지
- **전략**: ${branch.animalKo}의 도전 접근법
- **타이밍**: ${branch.animalKo}의 자연스러운 리듬

### 오행 조합
${elementKo[stem.element]}${waGwa(elementKo[stem.element])} ${elementKo[hiddenElement]}의 상호작용 (${branch.animalKo}에 숨겨진 ${elementKo[hiddenElement]}기):
- ${traits.interaction.feeds === hiddenElement ? `${elementKo[stem.element]}생${elementKo[hiddenElement]} - 상생 관계` : `복잡한 오행 역학`}
- 계획과 아이디어가 형태를 갖춤
- 연중 ${traits.ko[0]} 에너지

## 일간별 ${year}년 운세

### 목 일간 (甲, 乙)
**종합**: ${stem.element === 'Wood' ? '비견의 해 - 자기 표현 강화' : `${elementKo[stem.element]}${iga(elementKo[stem.element])} 성장에 영향`}

**갑목(甲)**
- ${stem.element === 'Wood' ? '리더십에 강한 해' : '적응이 필요한 해'}
- 경력 기회 부상
- 일과 휴식의 균형
- 좋은 달: 2월, 6월, 10월

**을목(乙)**
- 파트너십 에너지 강함
- 창의적 프로젝트에 유리
- 유연성이 핵심
- 좋은 달: 3월, 7월, 11월

### 화 일간 (丙, 丁)
**종합**: ${stem.element === 'Fire' ? '비견의 해 - 가시성과 행동' : `${elementKo[stem.element]}${iga(elementKo[stem.element])} 표현에 영향`}

**병화(丙)**
- 자원 ${traits.interaction.feeds === 'Fire' ? '순조로움' : '관리 필요'}
- 학습 기회
- 관계 집중
- 좋은 달: 2월, 5월, 8월

**정화(丁)**
- 양육 에너지 존재
- 학업 추구에 유리
- 가족 문제 부각
- 좋은 달: 3월, 6월, 9월

### 토 일간 (戊, 己)
**종합**: ${stem.element === 'Earth' ? '비견의 해 - 안정과 성장' : `${elementKo[stem.element]}${iga(elementKo[stem.element])} 기반에 영향`}

**무토(戊)**
- 창작 산출 증가
- 프로젝트와 사업 번성
- 로맨스 기회
- 좋은 달: 4월, 7월, 10월

**기토(己)**
- 예술적 표현 흐름
- 기쁨과 즐거움 강조
- 금전 주의 권고
- 좋은 달: 5월, 8월, 11월

### 금 일간 (庚, 辛)
**종합**: ${stem.element === 'Metal' ? '비견의 해 - 정제와 가치' : `${elementKo[stem.element]}${iga(elementKo[stem.element])} 자원에 영향`}

**경금(庚)**
- 금전 ${traits.interaction.controls === 'Metal' ? '주의 필요' : '이득 가능'}
- 사업 기회
- 경쟁 인식
- 좋은 달: 1월, 4월, 10월

**신금(辛)**
- 예상치 못한 기회
- 부업 고려
- 지출 인식
- 좋은 달: 2월, 8월, 11월

### 수 일간 (壬, 癸)
**종합**: ${stem.element === 'Water' ? '비견의 해 - 지혜와 흐름' : `${elementKo[stem.element]}${iga(elementKo[stem.element])} 권위에 영향`}

**임수(壬)**
- 리더십 역할 가능
- 평판 중요
- 스트레스 관리 필수
- 좋은 달: 3월, 9월, 12월

**계수(癸)**
- 경력 발전 잠재력
- 노력에 대한 인정
- 일과 삶의 균형 필요
- 좋은 달: 1월, 6월, 12월

## ${year}년 월별 에너지 흐름

| 월 | 에너지 | 초점 |
|---|--------|------|
| 1월 | 토 | 기반 구축 |
| 2월 | 목 | 새로운 시작 |
| 3월 | 목 | 성장 가속화 |
| 4월 | 토 | 통합 |
| 5월 | 화 | 최고 활동 |
| 6월 | 화 | 절정 |
| 7월 | 토 | 수확 시기 |
| 8월 | 금 | 정제 |
| 9월 | 금 | 평가 |
| 10월 | 토 | 준비 |
| 11월 | 수 | 성찰 |
| 12월 | 수 | 완성 |

## ${year}년 행운 극대화하기

### 모든 분께
1. **${traits.ko[2]} 포용**: 올해의 핵심 주제
2. **전략적 사고**: ${branch.animalKo} 에너지는 계획에 보상
3. **오래된 패턴 버리기**: 변화가 지원됨
4. **${traits.ko[0]} 배양**: 올해의 주요 에너지
5. **의도를 가지고 움직이기**: 충동적 행동 피하기

### 유리한 활동
- 새로운 교육 추구 시작
- 창의적 및 예술적 프로젝트
- 전략적 사업 계획
- 관계 발전
- 건강 변화

### 주의 영역
- 충동적 결정
- 급한 약속
- 직관 무시
- 휴식 없는 과로
- 관계 소홀

## 특별 고려사항

### ${branch.animalKo}띠생이라면
올해는 태세(太歲)의 해입니다. 전통적 권고:
- 보호를 위해 빨간색 착용
- 주요 결정에 특히 신중
- 인내와 주의 실천
- 보호 관행 고려

### 사주에 ${branch.ko}(${branch.hanja})가 있다면
${branch.animalKo} 에너지가 증폭됩니다. 이것이 강화되는 것:
- 당신의 자연스러운 ${branch.animalKo} 특성
- 변화 잠재력
- 전략적 사고의 필요

## 결론

${year}년 ${colorAnimalKo}의 해는 ${traits.ko.slice(0, 2).join('과 ')}의 기회를 제공합니다. 성공은 ${traits.ko[2]}, ${traits.ko[0]}, 사려 깊은 행동을 통해 옵니다. ${branch.animalKo}의 에너지에 맞서지 말고 함께 일하면 이 해는 상당한 긍정적 변화를 가져올 수 있습니다.

개인화된 ${year}년 예측을 보실 준비가 되셨나요? ${branch.animalKo}의 해를 위한 상세한 사주 리딩을 받아보세요.
    `
}

// 현재 연도 가져오기
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

// 현재 연도의 운세 글 생성
export function generateCurrentYearFortuneBlogPost(): BlogPost {
  return generateYearlyFortuneBlogPost(getCurrentYear())
}
