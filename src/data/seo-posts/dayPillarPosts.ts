/**
 * Programmatic SEO — 60갑자 일주(day pillar) 포스트 생성기.
 *
 * 데이터 SSOT:
 * - 일주 해석(성격·장단점·직업·연애, ko·en): chart-dictionary/ilju-60.json
 *   (iljuDictionary 어댑터 경유 — 직접 JSON 을 또 파싱해 드리프트 만들지 않는다)
 * - 천간/지지/오행 메타: yearly-fortune-generator 의 테이블 재사용(export 추가)
 *
 * 슬러그는 영미권 검색 차별화를 위해 로마자 간지 + 영어 오행-띠 동물을 모두
 * 포함한다(예: gapja-day-pillar-wood-rat → "gapja day pillar" + "wood rat day
 * pillar" 두 검색 패턴 커버). 순수 함수 — 모듈 초기화 시 서버에서 실행됨.
 */
import { getIljuArchetype } from '@/lib/saju/iljuDictionary'
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENT_TRAITS } from '@/data/yearly-fortune-generator'
import { iga, eulReul } from '@/lib/i18n/koParticle'
import type { BlogPost } from '@/data/blog-posts-sync'

// 고정 날짜 상수 — tarotCardPosts.ts 의 주석 참조(크롤러 신호 안정화)
export const DAY_PILLAR_POST_DATE = '2026-06-11'

// 국립국어원 로마자 표기 기반 — 슬러그 전용(HEAVENLY_STEMS.en 은 "Jia" 등
// 중국식 표기가 섞여 있어 영어 검색 패턴("gapja day pillar")과 다르다).
const STEM_ROMAN: Record<string, string> = {
  갑: 'gap',
  을: 'eul',
  병: 'byeong',
  정: 'jeong',
  무: 'mu',
  기: 'gi',
  경: 'gyeong',
  신: 'sin',
  임: 'im',
  계: 'gye',
}

const BRANCH_ROMAN: Record<string, string> = {
  자: 'ja',
  축: 'chuk',
  인: 'in',
  묘: 'myo',
  진: 'jin',
  사: 'sa',
  오: 'o',
  미: 'mi',
  신: 'sin',
  유: 'yu',
  술: 'sul',
  해: 'hae',
}

const ELEMENT_KO: Record<string, string> = {
  Wood: '목',
  Fire: '화',
  Earth: '토',
  Metal: '금',
  Water: '수',
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

// ~200 wpm 기준, 최소 3분
function computeReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(3, Math.ceil(words / 200))
}

// 단어 중간에서 끊기지 않게 ~160자 발췌
function clampExcerpt(text: string, max = 160): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, '') + '…'
}

export function generateDayPillarPosts(): BlogPost[] {
  const posts: BlogPost[] = []

  // 60갑자: 甲子(0)부터 천간 10 × 지지 12 의 최소공배수 60 주기
  for (let i = 0; i < 60; i++) {
    const stem = HEAVENLY_STEMS[i % 10]
    const branch = EARTHLY_BRANCHES[i % 12]

    const archetype = getIljuArchetype(stem.hanja, branch.hanja)
    // 데이터 누락 시 해당 일주만 건너뛴다 — throw 하면 blog-posts-sync 의
    // catch 가 블로그 전체를 비워버림. 개수(60)는 테스트가 보증한다.
    if (!archetype) continue

    const hanja = `${stem.hanja}${branch.hanja}`
    const ganjiKo = `${stem.ko}${branch.ko}`
    const roman = `${STEM_ROMAN[stem.ko]}${BRANCH_ROMAN[branch.ko]}`
    const romanTitle = capitalize(roman)
    const element = stem.element as keyof typeof ELEMENT_TRAITS
    const traits = ELEMENT_TRAITS[element]
    const hiddenElement = branch.hiddenElement as keyof typeof ELEMENT_TRAITS
    const animal = branch.animal
    const elementAnimal = `${element} ${animal}`
    const yinYang = stem.yin ? 'Yin' : 'Yang'
    const yinYangKo = stem.yin ? '음' : '양'
    const elementKo = ELEMENT_KO[stem.element]
    const hiddenElementKo = ELEMENT_KO[branch.hiddenElement]
    const lastTraitKo = traits.ko[traits.ko.length - 1]

    const content = `In Saju — the Korean Four Pillars of Destiny — your day pillar is the stem-and-branch pair of the day you were born. It is read as the heart of your chart: the day master that describes your core personality, instincts, and relationship style. ${romanTitle} (${hanja}), the ${elementAnimal} day pillar, is one of the 60 pillars in the cycle — here is what it reveals.

## ${romanTitle} (${hanja}) Day Pillar Personality

${archetype.character_en}

## Strengths of the ${romanTitle} Day Pillar

${archetype.strengths_en.join(' ')}

## Weaknesses to Watch

${archetype.weaknesses_en.join(' ')}

## Best Careers for ${romanTitle}

${archetype.career_en.join(' ')}

## ${romanTitle} in Love & Relationships

${archetype.relationship_en}

## The ${elementAnimal}: Element & Symbolism

${romanTitle} pairs the heavenly stem ${stem.hanja} — ${yinYang} ${element}, traditionally linked to the color ${stem.color.toLowerCase()} — with the earthly branch ${branch.hanja}, the ${animal}. ${element} energy stands for ${traits.en.join(', ')}. The ${animal} also carries hidden ${hiddenElement} energy, which shapes how this pillar's ${element} nature shows up in everyday life.

## Find Your Own Day Pillar

Not sure whether ${romanTitle} is your day pillar? Get a [free Saju reading](/destiny-map) on DestinyPal to see your exact day pillar and your full Four Pillars chart.
`

    const contentKo = `${ganjiKo}일주(${hanja})는 사주명리학 60갑자 일주 중 하나입니다. 일주는 태어난 날의 천간과 지지로, 사주팔자에서 나 자신을 가장 직접적으로 보여주는 기둥입니다. ${ganjiKo}일주의 성격·장단점·직업·연애 스타일을 정리했습니다.

## ${ganjiKo}일주 성격

${archetype.character}

## ${ganjiKo}일주 장점

${archetype.strengths.join(' ')}

## 주의할 단점

${archetype.weaknesses.join(' ')}

## 어울리는 직업

${archetype.career.join(' ')}

## 연애와 인간관계

${archetype.relationship}

## 오행과 상징: ${yinYangKo}${elementKo}의 ${branch.animalKo}

${ganjiKo}일주는 천간 ${stem.ko}(${stem.hanja}, ${yinYangKo}${elementKo})에 지지 ${branch.ko}(${branch.hanja}, ${branch.animalKo})${iga(branch.ko)} 더해진 조합입니다. ${elementKo} 기운은 ${traits.ko.join(', ')}${eulReul(lastTraitKo)} 상징하며, 전통 색은 ${stem.colorKo}색입니다. 지지 ${branch.ko}의 ${branch.animalKo}는 지장간에 ${hiddenElementKo} 기운을 품고 있어, 이 일주의 ${elementKo} 기운이 일상에서 드러나는 방식에 깊이를 더합니다.

## 내 일주 확인하기

내 일주가 ${ganjiKo}일주인지 확실하지 않다면, [무료 사주 풀이](/destiny-map)에서 정확한 일주와 사주 원국 전체를 확인해 보세요.
`

    posts.push({
      slug: `${roman}-day-pillar-${element.toLowerCase()}-${animal.toLowerCase()}`,
      title: `${romanTitle} (${hanja}) Day Pillar: The ${elementAnimal} — Personality, Career & Love`,
      titleKo: `${ganjiKo}일주(${hanja}) — 성격·직업·연애 총정리`,
      excerpt: clampExcerpt(
        `${romanTitle} (${hanja}) day pillar meaning in Saju: the ${elementAnimal} personality, strengths, weaknesses, best careers, and love style explained.`
      ),
      excerptKo: clampExcerpt(
        `${ganjiKo}일주(${hanja})의 성격과 장단점, 어울리는 직업, 연애 스타일까지 — 사주 일주 풀이로 보는 ${ganjiKo}일주 총정리.`
      ),
      content,
      contentKo,
      category: 'Saju',
      categoryKo: '사주',
      icon: branch.icon,
      date: DAY_PILLAR_POST_DATE,
      readTime: computeReadTime(content),
    })
  }

  return posts
}
