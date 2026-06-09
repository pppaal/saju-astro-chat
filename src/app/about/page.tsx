'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import s from './about.module.css'

// ============================================================
// Constants
// ============================================================

type SignName =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces'

const SIGN_ORDER: SignName[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

const SIGN_INFO: Record<SignName, { kr: string; el: string; date: string; g: string }> = {
  Aries: { kr: '양자리', el: 'FIRE', date: '03.21–04.19', g: '♈' },
  Taurus: { kr: '황소자리', el: 'EARTH', date: '04.20–05.20', g: '♉' },
  Gemini: { kr: '쌍둥이자리', el: 'AIR', date: '05.21–06.21', g: '♊' },
  Cancer: { kr: '게자리', el: 'WATER', date: '06.22–07.22', g: '♋' },
  Leo: { kr: '사자자리', el: 'FIRE', date: '07.23–08.22', g: '♌' },
  Virgo: { kr: '처녀자리', el: 'EARTH', date: '08.23–09.22', g: '♍' },
  Libra: { kr: '천칭자리', el: 'AIR', date: '09.23–10.23', g: '♎' },
  Scorpio: { kr: '전갈자리', el: 'WATER', date: '10.24–11.22', g: '♏' },
  Sagittarius: { kr: '사수자리', el: 'FIRE', date: '11.23–12.21', g: '♐' },
  Capricorn: { kr: '염소자리', el: 'EARTH', date: '12.22–01.19', g: '♑' },
  Aquarius: { kr: '물병자리', el: 'AIR', date: '01.20–02.18', g: '♒' },
  Pisces: { kr: '물고기자리', el: 'WATER', date: '02.19–03.20', g: '♓' },
}

const SIGN_CONSTELLATIONS: Record<SignName, { pts: [number, number][]; hue: string }> = {
  Aries: {
    pts: [
      [0.3, 0.6],
      [0.42, 0.5],
      [0.55, 0.46],
      [0.7, 0.4],
    ],
    hue: '#ff8fd0',
  },
  Taurus: {
    pts: [
      [0.28, 0.55],
      [0.4, 0.5],
      [0.52, 0.42],
      [0.5, 0.3],
      [0.62, 0.5],
      [0.74, 0.4],
    ],
    hue: '#ffd89b',
  },
  Gemini: {
    pts: [
      [0.34, 0.28],
      [0.36, 0.5],
      [0.4, 0.7],
      [0.6, 0.28],
      [0.62, 0.5],
      [0.66, 0.7],
      [0.34, 0.28],
      [0.6, 0.28],
    ],
    hue: '#7cf5ff',
  },
  Cancer: {
    pts: [
      [0.3, 0.4],
      [0.45, 0.5],
      [0.55, 0.46],
      [0.68, 0.58],
      [0.55, 0.46],
      [0.6, 0.34],
    ],
    hue: '#a78bfa',
  },
  Leo: {
    pts: [
      [0.26, 0.62],
      [0.34, 0.48],
      [0.46, 0.42],
      [0.58, 0.36],
      [0.66, 0.46],
      [0.62, 0.6],
      [0.74, 0.66],
    ],
    hue: '#ffd89b',
  },
  Virgo: {
    pts: [
      [0.24, 0.46],
      [0.36, 0.4],
      [0.48, 0.5],
      [0.56, 0.4],
      [0.64, 0.52],
      [0.72, 0.42],
      [0.5, 0.66],
    ],
    hue: '#7cf5ff',
  },
  Libra: {
    pts: [
      [0.3, 0.58],
      [0.42, 0.42],
      [0.58, 0.42],
      [0.7, 0.58],
      [0.42, 0.42],
      [0.58, 0.42],
    ],
    hue: '#a78bfa',
  },
  Scorpio: {
    pts: [
      [0.24, 0.36],
      [0.34, 0.44],
      [0.44, 0.46],
      [0.54, 0.5],
      [0.62, 0.58],
      [0.7, 0.66],
      [0.78, 0.6],
    ],
    hue: '#ff8fd0',
  },
  Sagittarius: {
    pts: [
      [0.28, 0.66],
      [0.4, 0.54],
      [0.52, 0.46],
      [0.66, 0.4],
      [0.6, 0.3],
      [0.66, 0.4],
      [0.7, 0.54],
    ],
    hue: '#7cf5ff',
  },
  Capricorn: {
    pts: [
      [0.26, 0.44],
      [0.38, 0.38],
      [0.52, 0.46],
      [0.64, 0.58],
      [0.74, 0.5],
      [0.5, 0.64],
    ],
    hue: '#ffd89b',
  },
  Aquarius: {
    pts: [
      [0.26, 0.42],
      [0.36, 0.5],
      [0.46, 0.42],
      [0.56, 0.5],
      [0.66, 0.42],
      [0.76, 0.5],
    ],
    hue: '#7cf5ff',
  },
  Pisces: {
    pts: [
      [0.26, 0.4],
      [0.38, 0.5],
      [0.3, 0.62],
      [0.62, 0.4],
      [0.74, 0.5],
      [0.66, 0.62],
      [0.38, 0.5],
      [0.62, 0.4],
    ],
    hue: '#a78bfa',
  },
}

type TarotCard = {
  n: string
  name: string
  kr: string
  sym: string
  up: string
  rev: string
  upEn: string
  revEn: string
}
const DECK: TarotCard[] = [
  {
    n: '0',
    name: 'The Fool',
    kr: '광대',
    sym: '✦',
    up: '새로운 시작과 자유로운 모험. 두려움 없이 첫발을 내딛을 때.',
    rev: '성급함과 무모함. 한 박자 늦추라는 신호.',
    upEn: 'New beginnings and fearless adventure. Take the first step without fear.',
    revEn: 'Recklessness and haste. A signal to slow down.',
  },
  {
    n: 'I',
    name: 'The Magician',
    kr: '마법사',
    sym: '⚚',
    up: '의지와 창조의 힘. 가진 재능을 현실로 끌어낼 시기.',
    rev: '재능의 낭비, 흩어진 집중. 방향을 다시 잡으세요.',
    upEn: 'Willpower and creation. A time to bring your talents into the real world.',
    revEn: 'Wasted potential, scattered focus. Recalibrate your direction.',
  },
  {
    n: 'II',
    name: 'The High Priestess',
    kr: '여사제',
    sym: '☽',
    up: '직관과 비밀. 말보다 내면의 목소리를 따를 것.',
    rev: '무시한 직감, 감춰진 진실이 수면 위로.',
    upEn: 'Intuition and secrets. Follow the inner voice over outer words.',
    revEn: 'Ignored intuition; hidden truths rising to the surface.',
  },
  {
    n: 'III',
    name: 'The Empress',
    kr: '여제',
    sym: '♀',
    up: '풍요와 결실. 가꾸어 온 것이 무르익습니다.',
    rev: '과보호와 정체. 잠시 손을 놓아도 괜찮아요.',
    upEn: 'Abundance and harvest. What you have tended is ripening.',
    revEn: 'Overprotection, stagnation. It is okay to let go a little.',
  },
  {
    n: 'VII',
    name: 'The Chariot',
    kr: '전차',
    sym: '❖',
    up: '의지의 승리. 흔들림 없이 앞으로 나아갈 때.',
    rev: '통제 잃은 질주. 속도보다 방향을 보세요.',
    upEn: 'Victory of will. Move forward without wavering.',
    revEn: 'Runaway momentum. Watch direction, not speed.',
  },
  {
    n: 'VIII',
    name: 'Strength',
    kr: '힘',
    sym: '∞',
    up: '부드러운 용기. 힘이 아닌 인내가 길을 엽니다.',
    rev: '자기 의심. 안의 사자를 다시 길들일 때.',
    upEn: 'Gentle courage. Patience, not force, opens the way.',
    revEn: 'Self-doubt. Time to tame the inner lion again.',
  },
  {
    n: 'IX',
    name: 'The Hermit',
    kr: '은둔자',
    sym: '✸',
    up: '성찰의 시간. 홀로 든 등불이 길을 비춥니다.',
    rev: '고립과 회피. 이제 문을 열어도 좋습니다.',
    upEn: 'A time for reflection. The lone lantern lights the way.',
    revEn: 'Isolation and avoidance. It is alright to open the door now.',
  },
  {
    n: 'X',
    name: 'Wheel of Fortune',
    kr: '운명의 수레바퀴',
    sym: '⊕',
    up: '전환점. 흐름이 당신 쪽으로 돌아섭니다.',
    rev: '저항하는 변화. 놓아줄 것을 놓아주세요.',
    upEn: 'Turning point. The flow is turning toward you.',
    revEn: 'Resisted change. Release what is asking to be released.',
  },
  {
    n: 'XI',
    name: 'Justice',
    kr: '정의',
    sym: '⚖',
    up: '균형과 인과. 뿌린 대로 정직하게 돌아옵니다.',
    rev: '미뤄진 결정, 불공정. 진실을 마주할 때.',
    upEn: 'Balance and consequence. What you sow returns honestly.',
    revEn: 'A postponed decision, an unfairness. Time to face the truth.',
  },
  {
    n: 'XVII',
    name: 'The Star',
    kr: '별',
    sym: '★',
    up: '희망과 회복. 긴 노력 끝의 조용한 갱신.',
    rev: '흐려진 믿음. 다시 밤하늘을 올려다보세요.',
    upEn: 'Hope and renewal. Quiet restoration after a long effort.',
    revEn: 'Faded faith. Look up at the night sky again.',
  },
  {
    n: 'XVIII',
    name: 'The Moon',
    kr: '달',
    sym: '☾',
    up: '직관과 환상의 경계. 모든 것이 보이진 않는 밤.',
    rev: '걷히는 안개. 두려움의 실체가 드러납니다.',
    upEn: 'The edge between intuition and illusion. Not everything is visible tonight.',
    revEn: 'Mist clearing. Fear shows its actual shape.',
  },
  {
    n: 'XIX',
    name: 'The Sun',
    kr: '태양',
    sym: '☉',
    up: '기쁨과 성취. 빛이 모든 것을 따뜻이 비춥니다.',
    rev: '잠시 가린 빛. 작은 기쁨부터 되찾으세요.',
    upEn: 'Joy and fulfillment. Light warmly touches everything.',
    revEn: 'Light briefly veiled. Reclaim the small joys first.',
  },
  {
    n: 'XX',
    name: 'Judgement',
    kr: '심판',
    sym: '❂',
    up: '각성과 부름. 지난 장을 덮고 다시 태어날 때.',
    rev: '자기 비판. 과거를 용서하면 길이 열립니다.',
    upEn: 'Awakening and calling. Close the last chapter and be reborn.',
    revEn: 'Self-criticism. Forgive the past, and the way opens.',
  },
  {
    n: 'XXI',
    name: 'The World',
    kr: '세계',
    sym: '⊙',
    up: '완성과 통합. 한 여정이 온전히 닫힙니다.',
    rev: '미완의 매듭. 마지막 한 걸음이 남았어요.',
    upEn: 'Completion and integration. One journey closes whole.',
    revEn: 'An unfinished knot. One last step remains.',
  },
]

const COMPAT_COPY = {
  mirror: {
    lo: 74,
    verdict: ['Mirror', 'souls'],
    verdictKo: ['닮은', '영혼'],
    t: '같은 별 아래 태어난 두 사람. 서로를 거울처럼 알아보지만, 닮은 만큼 같은 약점도 나눕니다. 이해는 쉽고, 균형은 노력이 필요해요.',
    tEn: 'Two souls born under the same star. You recognize each other instantly — but you share the same weaknesses, too. Understanding comes easy; balance asks for effort.',
  },
  kin: {
    lo: 86,
    verdict: ['Kindred', 'flame'],
    verdictKo: ['하나의', '불꽃'],
    t: '같은 원소의 깊은 공명. 말하지 않아도 통하는 흐름이 있습니다. 편안함에 안주하지 말고, 함께 새로운 불씨를 지펴 보세요.',
    tEn: 'A deep resonance of the same element. There is a current you both feel without speaking. Do not settle for comfort — kindle a new spark together.',
  },
  spark: {
    lo: 82,
    verdict: ['Bright', 'spark'],
    verdictKo: ['빛나는', '불씨'],
    t: '서로를 키우는 조합. 한쪽의 불꽃을 다른 쪽의 바람이 더 멀리 실어 나릅니다. 다름이 곧 매력이 되는 관계예요.',
    tEn: "A pairing that grows each other. One side's flame is carried further by the other's wind. Difference itself becomes the charm.",
  },
  steady: {
    lo: 68,
    verdict: ['Slow', 'harmony'],
    verdictKo: ['느린', '조화'],
    t: '리듬이 다른 두 사람. 처음엔 어긋나도, 시간을 들이면 단단한 토대를 쌓습니다. 인내가 가장 큰 자산이 됩니다.',
    tEn: 'Two different rhythms. Off-beat at first, but given time you build something solid. Patience becomes the greatest asset.',
  },
  tension: {
    lo: 54,
    verdict: ['Restless', 'pull'],
    verdictKo: ['뜨거운', '끌림'],
    t: '끌림과 충돌이 함께 오는 관계. 긴장이 곧 생기이기도 하지만, 서로의 속도를 존중할 때만 오래갑니다.',
    tEn: "A bond where attraction and collision arrive together. Tension can be aliveness — but it lasts only when you respect each other's pace.",
  },
} as const

const SIGN_ELEMENT: Record<SignName, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

const COMPATIBLE_PAIR = { fire: 'air', air: 'fire', earth: 'water', water: 'earth' } as const
const NEUTRAL_PAIR = { fire: 'earth', earth: 'fire', air: 'water', water: 'air' } as const

function compatBucket(a: SignName, b: SignName): keyof typeof COMPAT_COPY {
  if (a === b) return 'mirror'
  const ea = SIGN_ELEMENT[a]
  const eb = SIGN_ELEMENT[b]
  if (ea === eb) return 'kin'
  if (COMPATIBLE_PAIR[ea] === eb) return 'spark'
  if (NEUTRAL_PAIR[ea] === eb) return 'steady'
  return 'tension'
}

function compatHash(a: string, b: string): number {
  const str = [a, b].sort().join('|')
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000
  return h
}

// ============================================================
// Sky canvas (fixed full-page starfield + mouse constellation)
// ============================================================

function SkyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    type Star = {
      x: number
      y: number
      z: number
      r: number
      tw: number
      tws: number
      hue: 'holo' | 'white'
      vx: number
      vy: number
    }
    type Shoot = { x: number; y: number; vx: number; vy: number; life: number; len: number }

    let W = 0,
      H = 0,
      DPR = 1
    let stars: Star[] = []
    const shooting: Shoot[] = []
    const mouse = { x: -9999, y: -9999, active: false }
    let raf = 0
    let t = 0
    const holoColors = ['#7cf5ff', '#a78bfa', '#ff8fd0', '#ffd89b']

    function seed() {
      const count = Math.min(260, Math.floor((window.innerWidth * window.innerHeight) / 7000))
      stars = []
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          z: Math.random(),
          r: (Math.random() * 1.3 + 0.3) * DPR,
          tw: Math.random() * Math.PI * 2,
          tws: 0.6 + Math.random() * 1.6,
          hue: Math.random() < 0.18 ? 'holo' : 'white',
          vx: (Math.random() - 0.5) * 0.05 * DPR,
          vy: (Math.random() - 0.5) * 0.05 * DPR,
        })
      }
    }

    function resize() {
      const c = canvasRef.current
      if (!c) return
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = c.width = window.innerWidth * DPR
      H = c.height = window.innerHeight * DPR
      c.style.width = window.innerWidth + 'px'
      c.style.height = window.innerHeight + 'px'
      seed()
    }

    function maybeShoot() {
      if (reduce) return
      if (Math.random() < 0.004 && shooting.length < 2) {
        const startX = Math.random() * W
        const startY = Math.random() * H * 0.5
        const ang = Math.PI * (0.18 + Math.random() * 0.12)
        shooting.push({
          x: startX,
          y: startY,
          vx: Math.cos(ang) * 9 * DPR,
          vy: Math.sin(ang) * 9 * DPR,
          life: 1,
          len: (60 + Math.random() * 80) * DPR,
        })
      }
    }

    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      t += 0.016

      const g1 = ctx.createRadialGradient(W * 0.22, H * 0.7, 0, W * 0.22, H * 0.7, W * 0.5)
      g1.addColorStop(0, 'rgba(80,50,140,0.12)')
      g1.addColorStop(1, 'rgba(80,50,140,0)')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, W, H)
      const g2 = ctx.createRadialGradient(W * 0.82, H * 0.2, 0, W * 0.82, H * 0.2, W * 0.45)
      g2.addColorStop(0, 'rgba(40,90,140,0.10)')
      g2.addColorStop(1, 'rgba(40,90,140,0)')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, W, H)

      for (const s of stars) {
        s.x += s.vx
        s.y += s.vy
        if (s.x < 0) s.x = W
        if (s.x > W) s.x = 0
        if (s.y < 0) s.y = H
        if (s.y > H) s.y = 0
        const tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.tws + s.tw)
        const alpha = (0.25 + s.z * 0.75) * tw
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        if (s.hue === 'holo') {
          ctx.fillStyle = holoColors[Math.floor(s.tw * 4) % 4]
          ctx.globalAlpha = alpha * 0.9
        } else {
          ctx.fillStyle = '#eef0ff'
          ctx.globalAlpha = alpha
        }
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (mouse.active) {
        const R = 170 * DPR
        const near: { s: Star; d: number }[] = []
        for (const star of stars) {
          const dx = star.x - mouse.x
          const dy = star.y - mouse.y
          const d = Math.hypot(dx, dy)
          if (d < R) near.push({ s: star, d })
        }
        near.sort((a, b) => a.d - b.d)
        const list = near.slice(0, 7)
        for (const { s: star, d } of list) {
          const a = (1 - d / R) * 0.5
          ctx.beginPath()
          ctx.moveTo(mouse.x, mouse.y)
          ctx.lineTo(star.x, star.y)
          ctx.strokeStyle = `rgba(167,139,250,${a})`
          ctx.lineWidth = DPR * 0.6
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.r * 1.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(124,245,255,${a})`
          ctx.fill()
        }
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i].s
            const b = list[j].s
            const dd = Math.hypot(a.x - b.x, a.y - b.y)
            if (dd < 120 * DPR) {
              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              ctx.strokeStyle = `rgba(124,245,255,${(1 - dd / (120 * DPR)) * 0.18})`
              ctx.lineWidth = DPR * 0.5
              ctx.stroke()
            }
          }
        }
      }

      maybeShoot()
      for (let i = shooting.length - 1; i >= 0; i--) {
        const sh = shooting[i]
        sh.x += sh.vx
        sh.y += sh.vy
        sh.life -= 0.012
        const tailX = sh.x - (sh.vx / Math.hypot(sh.vx, sh.vy)) * sh.len
        const tailY = sh.y - (sh.vy / Math.hypot(sh.vx, sh.vy)) * sh.len
        const grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY)
        grad.addColorStop(0, `rgba(255,255,255,${sh.life})`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.beginPath()
        ctx.moveTo(sh.x, sh.y)
        ctx.lineTo(tailX, tailY)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.6 * DPR
        ctx.stroke()
        if (sh.life <= 0 || sh.x > W || sh.y > H) shooting.splice(i, 1)
      }

      raf = requestAnimationFrame(draw)
    }

    function onMove(e: PointerEvent) {
      mouse.x = e.clientX * DPR
      mouse.y = e.clientY * DPR
      mouse.active = true
    }
    function onLeave() {
      mouse.active = false
    }

    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    resize()
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className={s.sky} aria-hidden />
}

// ============================================================
// Destiny Map (interactive constellation canvas)
// ============================================================

function DestinyMap({ sign }: { sign: SignName }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const signRef = useRef(sign)

  useEffect(() => {
    signRef.current = sign
  }, [sign])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = 0,
      H = 0,
      DPR = 1
    let bg: { x: number; y: number; r: number; tw: number; s: number }[] = []
    let progress = 0
    let rot = 0
    let lastSign: SignName | null = null
    let t = 0
    let raf = 0

    function resize() {
      const c = canvasRef.current
      if (!c) return
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      const rect = c.getBoundingClientRect()
      W = c.width = rect.width * DPR
      H = c.height = rect.height * DPR
      seedBg()
    }
    function seedBg() {
      bg = []
      const n = Math.floor((W * H) / (12000 * DPR))
      for (let i = 0; i < n; i++) {
        bg.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.1 * DPR + 0.3,
          tw: Math.random() * 6,
          s: 0.5 + Math.random(),
        })
      }
    }

    function draw() {
      if (!ctx) return
      t += 0.016
      rot += reduce ? 0 : 0.0006

      if (lastSign !== signRef.current) {
        progress = 0
        lastSign = signRef.current
      }

      ctx.clearRect(0, 0, W, H)

      for (const star of bg) {
        const a = 0.3 + 0.5 * Math.abs(Math.sin(t * star.s + star.tw))
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220,225,255,${a * 0.5})`
        ctx.fill()
      }

      const constellation = SIGN_CONSTELLATIONS[signRef.current]
      const cx = W / 2
      const cy = H / 2
      const scale = Math.min(W, H) * 0.92
      const mapped: [number, number][] = constellation.pts.map(([px, py]) => {
        const x = (px - 0.5) * scale
        const y = (py - 0.5) * scale * (W < H ? 1.4 : 1)
        const c = Math.cos(rot)
        const si = Math.sin(rot)
        return [cx + (x * c - y * si), cy + (x * si + y * c)]
      })

      if (!reduce && progress < 1) progress += 0.018
      else progress = 1
      const shown = progress * (mapped.length - 1)

      ctx.lineWidth = 1.2 * DPR
      for (let i = 0; i < mapped.length - 1; i++) {
        const a = mapped[i]
        const b = mapped[i + 1]
        const frac = Math.min(1, Math.max(0, shown - i))
        if (frac <= 0) break
        const ex = a[0] + (b[0] - a[0]) * frac
        const ey = a[1] + (b[1] - a[1]) * frac
        const grad = ctx.createLinearGradient(a[0], a[1], b[0], b[1])
        grad.addColorStop(0, constellation.hue)
        grad.addColorStop(1, '#ffffff')
        ctx.strokeStyle = grad
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(ex, ey)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      mapped.forEach((p, i) => {
        const reveal = progress * mapped.length > i
        if (!reveal) return
        const pulse = 1 + 0.4 * Math.sin(t * 2 + i)
        const gr = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 16 * DPR * pulse)
        gr.addColorStop(0, constellation.hue)
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.globalAlpha = 0.35
        ctx.fillStyle = gr
        ctx.beginPath()
        ctx.arc(p[0], p[1], 16 * DPR * pulse, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(p[0], p[1], 2.4 * DPR, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize, { passive: true })
    resize()
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={s.mapCanvas} />
}

// ============================================================
// Tarot Spread
// ============================================================

type Draw = { card: TarotCard; rev: boolean }

function sampleHand(): Draw[] {
  const idx: number[] = []
  while (idx.length < 3) {
    const r = Math.floor(Math.random() * DECK.length)
    if (!idx.includes(r)) idx.push(r)
  }
  return idx.map((i) => ({ card: DECK[i], rev: Math.random() < 0.32 }))
}

function TarotSpread() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [hand, setHand] = useState<Draw[] | null>(null)
  const [flipped, setFlipped] = useState([false, false, false])

  // Initial deal — client only, avoids SSR randomness mismatch
  useEffect(() => {
    setHand(sampleHand())
  }, [])

  const deal = useCallback(() => {
    setFlipped([false, false, false])
    // Wait for the flip-back animation before swapping faces
    setTimeout(() => setHand(sampleHand()), 420)
  }, [])

  const flip = (i: number) => {
    setFlipped((p) => p.map((v, idx) => (idx === i ? !v : v)))
  }

  const allFlipped = flipped.every(Boolean) && hand !== null
  const summary =
    allFlipped && hand
      ? isKo
        ? `지난 자리의 ${hand[0].card.kr}, 지금 자리의 ${hand[1].card.kr}, 그리고 다가오는 자리의 ${hand[2].card.kr}. 세 장이 가리키는 방향은 하나입니다 — 지금 내딛는 한 걸음을 믿어도 좋다는 것.`
        : `${hand[0].card.name} in the past, ${hand[1].card.name} now, and ${hand[2].card.name} drawing near. The three point in one direction — trust the step you are taking right now.`
      : ''

  const positions = isKo
    ? [
        { main: '과거', sub: 'Past' },
        { main: '현재', sub: 'Present' },
        { main: '미래', sub: 'Future' },
      ]
    : [
        { main: 'Past', sub: '' },
        { main: 'Present', sub: '' },
        { main: 'Future', sub: '' },
      ]

  return (
    <>
      <div className={s.tarotSpread} data-reveal data-d="2">
        {[0, 1, 2].map((i) => {
          const draw = hand?.[i]
          const isFlipped = flipped[i]
          return (
            <div key={i} className={s.tslot}>
              <div className={s.tslotPos}>
                <b>{positions[i].main}</b>
                {positions[i].sub}
              </div>
              <button
                type="button"
                className={`${s.tcard} ${isFlipped ? s.flipped : ''} ${draw?.rev ? s.reversed : ''}`}
                onClick={() => flip(i)}
                aria-label={
                  isKo
                    ? `${positions[i].main} 카드 펼치기`
                    : `Reveal the ${positions[i].main.toLowerCase()} card`
                }
              >
                <div className={s.tcardInner}>
                  <div className={`${s.tcardFace} ${s.tcardBack}`}>
                    <div className={s.tcardBackIn}>
                      <span className={`${s.tcardEmblem} ${s.holoText}`}>✦</span>
                      <span className={s.tcardHint}>
                        {isKo ? '탭하여 펼치기' : 'Tap to reveal'}
                      </span>
                    </div>
                  </div>
                  <div className={`${s.tcardFace} ${s.tcardFront}`}>
                    <div className={s.tcardFrontIn}>
                      {draw && (
                        <>
                          <div className={s.tcardNum}>
                            {draw.card.n} · {isKo ? '아르카나' : 'ARCANA'}
                          </div>
                          <div className={`${s.tcardSym} ${s.holoText}`}>{draw.card.sym}</div>
                          <div className={s.tcardName}>
                            {isKo ? draw.card.kr : draw.card.name}
                            <small>{isKo ? draw.card.name : draw.card.kr}</small>
                          </div>
                          <div className={s.tcardMeaning}>
                            {isKo
                              ? draw.rev
                                ? draw.card.rev
                                : draw.card.up
                              : draw.rev
                                ? draw.card.revEn
                                : draw.card.upEn}
                          </div>
                          <div className={s.tcardOri}>
                            {draw.rev
                              ? isKo
                                ? '역방향'
                                : 'Reversed'
                              : isKo
                                ? '정방향'
                                : 'Upright'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      <div className={s.tarotActions} data-reveal>
        <button className={`${s.btn} ${s.btnHolo}`} type="button" onClick={deal}>
          ↻ {isKo ? '다시 섞기' : 'Shuffle & re-pull'}
        </button>
      </div>
      <p className={`${s.tarotSummary} ${allFlipped ? s.show : ''}`}>{summary}</p>
    </>
  )
}

// ============================================================
// Compatibility
// ============================================================

function useAnimatedNumber(target: number, durationMs = 1000): number {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const from = fromRef.current
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs)
      const e = 1 - Math.pow(1 - p, 3)
      const v = Math.round(from + (target - from) * e)
      setVal(v)
      if (p < 1) {
        raf = requestAnimationFrame(step)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return val
}

function CompatibilityPanel() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [a, setA] = useState<SignName>('Leo')
  const [b, setB] = useState<SignName>('Libra')

  const result = useMemo(() => {
    const bucket = compatBucket(a, b)
    const meta = COMPAT_COPY[bucket]
    const variance = (compatHash(a, b) % 11) - 2
    const score = Math.max(42, Math.min(99, meta.lo + variance))
    return { meta, score }
  }, [a, b])

  const animatedScore = useAnimatedNumber(result.score)

  const R = 70
  const CIRC = 2 * Math.PI * R
  const dashoffset = CIRC * (1 - result.score / 100)

  const swap = () => {
    setA(b)
    setB(a)
  }

  return (
    <div className={s.compat} data-reveal data-d="2">
      <div className={s.compatPick}>
        <div className={s.compatField}>
          <label>{isKo ? '나' : 'You'}</label>
          <select
            className={s.compatSelect}
            value={a}
            onChange={(e) => setA(e.target.value as SignName)}
            aria-label={isKo ? '내 별자리' : 'Your sign'}
          >
            {SIGN_ORDER.map((sn) => (
              <option key={sn} value={sn}>
                {SIGN_INFO[sn].g} {isKo ? SIGN_INFO[sn].kr : sn}
              </option>
            ))}
          </select>
        </div>
        <div className={s.compatSwap}>
          <button type="button" onClick={swap}>
            ⇅ {isKo ? '바꾸기' : 'Swap'}
          </button>
        </div>
        <div className={s.compatField}>
          <label>{isKo ? '상대' : 'Them'}</label>
          <select
            className={s.compatSelect}
            value={b}
            onChange={(e) => setB(e.target.value as SignName)}
            aria-label={isKo ? '상대 별자리' : 'Their sign'}
          >
            {SIGN_ORDER.map((sn) => (
              <option key={sn} value={sn}>
                {SIGN_INFO[sn].g} {isKo ? SIGN_INFO[sn].kr : sn}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={s.compatResult}>
        <div className={s.compatMeter}>
          <svg viewBox="0 0 160 160" aria-hidden>
            <defs>
              <linearGradient id="compatGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7cf5ff" />
                <stop offset="0.5" stopColor="#a78bfa" />
                <stop offset="1" stopColor="#ff8fd0" />
              </linearGradient>
            </defs>
            <circle className="track" cx="80" cy="80" r={R} />
            <circle
              className="bar"
              cx="80"
              cy="80"
              r={R}
              style={{ strokeDasharray: CIRC, strokeDashoffset: dashoffset }}
            />
          </svg>
          <div className={s.compatScore}>
            <b className={s.holoText}>{animatedScore}</b>
            <span>{isKo ? '조화' : 'Harmony'}</span>
          </div>
        </div>
        <div className={s.compatRead}>
          <div className={s.compatPair}>
            {isKo ? SIGN_INFO[a].kr : a} {SIGN_INFO[a].g} × {isKo ? SIGN_INFO[b].kr : b}{' '}
            {SIGN_INFO[b].g}
          </div>
          <div className={s.compatVerdict}>
            {isKo ? result.meta.verdictKo[0] : result.meta.verdict[0]}{' '}
            <em>{isKo ? result.meta.verdictKo[1] : result.meta.verdict[1]}</em>
          </div>
          <div className={s.compatText}>{isKo ? result.meta.t : result.meta.tEn}</div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Scroll reveal hook
// ============================================================

function useScrollReveal(inClass: string) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    let ticking = false

    function check() {
      const vh = window.innerHeight || document.documentElement.clientHeight
      for (let i = els.length - 1; i >= 0; i--) {
        const el = els[i]
        const r = el.getBoundingClientRect()
        if (r.top < vh * 0.9 && r.bottom > 0) {
          el.classList.add(inClass)
          els.splice(i, 1)
        }
      }
      ticking = false
    }
    function req() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(check)
    }

    window.addEventListener('scroll', req, { passive: true })
    window.addEventListener('resize', req, { passive: true })
    check()
    const t1 = window.setTimeout(check, 120)
    const t2 = window.setTimeout(check, 500)
    const t3 = window.setTimeout(check, 1200)

    return () => {
      window.removeEventListener('scroll', req)
      window.removeEventListener('resize', req)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [inClass])
}

// ============================================================
// Live coords readout
// ============================================================

function useLiveReadout(): string {
  // Static initial value matches SSR; updates start after mount.
  const [text, setText] = useState('LAT 37.5665° · LON 126.9780° · 00:00:00 KST')

  useEffect(() => {
    const pad = (n: number, l = 2) => String(n).padStart(l, '0')
    const tick = () => {
      const d = new Date()
      const lat = (37.5665 + Math.sin(Date.now() / 4000) * 0.4).toFixed(4)
      const lon = (126.978 + Math.cos(Date.now() / 4000) * 0.4).toFixed(4)
      setText(
        `LAT ${lat}° · LON ${lon}° · ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} KST`
      )
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => clearInterval(id)
  }, [])

  return text
}

// ============================================================
// Sign chips (with auto-cycle until user interacts)
// ============================================================

function SignChips({ active, onChange }: { active: SignName; onChange: (n: SignName) => void }) {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const userTouchedRef = useRef(false)
  const idxRef = useRef(SIGN_ORDER.indexOf('Leo'))

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => {
      if (userTouchedRef.current) return
      const stage = document.querySelector<HTMLElement>(`.${s.mapStage}`)
      if (stage) {
        const r = stage.getBoundingClientRect()
        if (r.bottom < 0 || r.top > window.innerHeight) return
      }
      idxRef.current = (idxRef.current + 1) % SIGN_ORDER.length
      onChange(SIGN_ORDER[idxRef.current])
    }, 3800)
    return () => clearInterval(id)
  }, [onChange])

  return (
    <div className={s.mapSigns}>
      {SIGN_ORDER.map((sn) => (
        <button
          key={sn}
          type="button"
          className={`${s.signChip} ${active === sn ? s.active : ''}`}
          onClick={() => {
            userTouchedRef.current = true
            idxRef.current = SIGN_ORDER.indexOf(sn)
            onChange(sn)
          }}
        >
          <span className={s.signG}>{SIGN_INFO[sn].g}</span>
          {isKo ? SIGN_INFO[sn].kr : sn}
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Main page
// ============================================================

export default function AboutPage() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [sign, setSign] = useState<SignName>('Leo')
  const readout = useLiveReadout()
  useScrollReveal(s.in)

  // 샘플 리딩 카드 날짜 — 하드코딩하면 시간이 지날수록 "오래된 목업"으로 보임.
  // 마운트 후 오늘 날짜로 채워 항상 최신처럼. (초기값은 SSR/CSR 동일해 hydration 안전)
  const [sampleDate, setSampleDate] = useState({ ko: '오늘 · KST', en: 'TODAY · KST' })
  useEffect(() => {
    const d = new Date()
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    setSampleDate({ ko: `${y}.${mo}.${da} · KST`, en: `${da} ${mon} ${y} · KST` })
  }, [])

  const signInfo = SIGN_INFO[sign]

  return (
    <div className={s.page}>
      <SkyCanvas />
      <div className={s.grain} aria-hidden />

      <main className={s.main} id="top">
        {/* HERO */}
        <header className={s.hero}>
          <div className={s.heroRing} aria-hidden>
            <svg viewBox="0 0 800 800">
              <g className={s.ringSpin}>
                <circle
                  cx="400"
                  cy="400"
                  r="392"
                  fill="none"
                  stroke="rgba(199,197,216,0.18)"
                  strokeWidth="1"
                />
                <circle
                  cx="400"
                  cy="400"
                  r="330"
                  fill="none"
                  stroke="rgba(199,197,216,0.10)"
                  strokeWidth="1"
                  strokeDasharray="2 8"
                />
                <g stroke="rgba(199,197,216,0.30)" strokeWidth="1">
                  <line x1="400" y1="8" x2="400" y2="46" />
                  <line x1="400" y1="754" x2="400" y2="792" />
                  <line x1="8" y1="400" x2="46" y2="400" />
                  <line x1="754" y1="400" x2="792" y2="400" />
                </g>
              </g>
              <g className={s.ringSpinRev}>
                <circle
                  cx="400"
                  cy="400"
                  r="262"
                  fill="none"
                  stroke="rgba(167,139,250,0.22)"
                  strokeWidth="1"
                />
                <text
                  x="400"
                  y="160"
                  textAnchor="middle"
                  fontFamily="var(--font-lora), Georgia, serif"
                  fontSize="34"
                  fill="rgba(230,197,128,0.55)"
                >
                  ♈ ♉ ♊ ♋ ♌ ♍
                </text>
                <text
                  x="400"
                  y="660"
                  textAnchor="middle"
                  fontFamily="var(--font-lora), Georgia, serif"
                  fontSize="34"
                  fill="rgba(230,197,128,0.55)"
                >
                  ♎ ♏ ♐ ♑ ♒ ♓
                </text>
              </g>
            </svg>
          </div>

          <div className={`${s.heroInner} ${s.wrap}`}>
            <div className={s.heroMeta} data-reveal>
              <span className={`${s.kicker} ${s.solo}`}>
                {isKo ? '✦ 별의 지능 · 2026' : '✦ Celestial Intelligence · Est. MMXXVI'}
              </span>
              <div className={s.heroCoords}>
                N 37.5665° · E 126.9780°
                <br />
                {isKo ? '서울 · GMT+9 · 맑은 하늘' : 'SEOUL · GMT+9 · CLEAR SKIES'}
              </div>
            </div>

            <h1 className={s.heroTitle} data-reveal data-d="1">
              <span className={s.chrome}>Destiny</span>
              <span className={`${s.lower} ${s.holoText}`}>Pal</span>
            </h1>

            <div className={s.heroSubwrap} data-reveal data-d="2">
              <div>
                {isKo ? (
                  <p className={s.heroSubKr}>
                    사주와 별자리를 AI가 한 화면에서 함께 읽어 드립니다.
                  </p>
                ) : (
                  <p className={s.heroSubKr} style={{ fontFamily: 'inherit' }}>
                    Saju and the stars, read together on one screen by AI.
                  </p>
                )}
              </div>
              <div className={s.heroCtaRow}>
                <a href="/destiny-counselor" className={`${s.btn} ${s.btnSolid}`}>
                  {isKo ? '상담사 연결' : 'Talk to counselor'}
                </a>
              </div>
            </div>
          </div>

          <div className={s.scrollcue}>
            <span>{isKo ? '스크롤' : 'SCROLL'}</span>
            <span className={s.scrollcueLine} />
          </div>
        </header>

        {/* MARQUEE */}
        <div className={s.marquee} aria-hidden>
          <div className={s.marqueeTrack}>
            {[0, 1].map((k) => (
              <span key={k} className={s.marqueeItem}>
                <span className={s.mqZodi}>♈</span> {isKo ? '사주' : 'Saju'}{' '}
                <span className={s.mqStar}>✦</span> {isKo ? '서양 점성술' : 'Western Astrology'}{' '}
                <span className={s.mqStar}>✦</span> {isKo ? '타로' : 'Tarot'}{' '}
                <span className={s.mqStar}>✦</span> {isKo ? '오늘의 운세' : 'Daily Fortune'}{' '}
                <span className={s.mqStar}>✦</span> <span className={s.mqZodi}>♓</span>{' '}
                {isKo ? '궁합' : 'Compatibility'} <span className={s.mqStar}>✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* EDITORIAL */}
        <section className={`${s.section} ${s.sectionCream}`} id="about">
          <div className={`${s.wrap} ${s.editorial}`}>
            <div data-reveal>
              <span className={s.kicker}>
                {isKo ? '№ 01 — 시작하는 이야기' : '№ 01 — The Premise'}
              </span>
            </div>
            {isKo ? (
              <p className={s.editorialLead} data-reveal data-d="1">
                별과 운명을 읽는 일은 오래된 <em>지혜</em>입니다. DestinyPal은 그 지혜를 AI로 다시
                펼쳐 보입니다 — 조용히, <em>당신 한 사람을 위해.</em>
              </p>
            ) : (
              <p className={s.editorialLead} data-reveal data-d="1">
                Reading the stars is an <em>ancient wisdom.</em> DestinyPal lets a machine learn it
                again — softly, and <em>just for you.</em>
              </p>
            )}
            {isKo ? (
              <div className={`${s.editorialCols} ${s.dropcap}`} data-reveal data-d="2">
                <p>
                  오랜 시간 사람들은 별과 사주의 네 기둥, 그리고 한 장의 카드에서 자신의 길을 읽어
                  왔습니다. 그 마음은 사라지지 않았습니다. 다만 누군가와 마주 앉아 가만히 풀이를
                  듣는 시간이 멀어졌을 뿐입니다. DestinyPal은 그 빈자리를 채웁니다. 사주, 서양
                  점성술, 타로를 하나의 모델로 엮어, 당신이 태어난 바로 그 시각에 맞춰 함께 읽어
                  드립니다.
                </p>
                <p>
                  돌아오는 리딩은 모두에게 똑같이 찍혀 나오는 운세가 아닙니다. 당신의 시각, 당신이
                  서 있는 자리, 오늘 밤 천천히 지나가는 행성까지 함께 본 당신만의 차트입니다 —
                  모르는 것은 모른다고 솔직하게 말씀드립니다. 입 밖으로 꺼내기 어려운 질문 옆에
                  조용히 함께 있어 드립니다.
                </p>
              </div>
            ) : (
              <div className={`${s.editorialCols} ${s.dropcap}`} data-reveal data-d="2">
                <p>
                  For thousands of years, people have read their path in the stars, in the four
                  pillars of birth, and in a single card laid down. That instinct never went away.
                  What faded was the quiet time to sit with a true reader. DestinyPal fills that
                  empty seat. It weaves classical Saju, Western astrology, and tarot into one model,
                  then reads them together against the exact moment you arrived.
                </p>
                <p>
                  What comes back is not a horoscope stamped out for the millions. It is a chart
                  that knows your hour, the ground you stand on, and the slow planet passing
                  overhead tonight — honest about what it cannot see. A quiet companion for the
                  questions you would rather not say out loud.
                </p>
              </div>
            )}
            <div className={s.editorialMeta} data-reveal data-d="3">
              <span>{isKo ? '사주 · 네 기둥' : 'Saju · Four Pillars'}</span>
              <span>{isKo ? '천궁도 · 12 하우스' : 'Natal Chart · 12 Houses'}</span>
              <span>{isKo ? '타로 · 78 아르카나' : 'Tarot · 78 Arcana'}</span>
              <span>destinypal.com</span>
            </div>
          </div>
        </section>

        {/* DESTINY MAP */}
        <section className={s.section} id="map">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 02 — 당신의 별자리' : '№ 02 — Your Constellation'}
              </span>
              <h2 className={s.secHeadTitle} data-reveal data-d="1">
                {isKo ? (
                  <>
                    별자리를 골라 보세요. <em>지도가 스스로 그려집니다.</em>
                  </>
                ) : (
                  <>
                    Choose a sign. <em>Watch your map draw itself.</em>
                  </>
                )}
              </h2>
            </div>

            <div className={s.map} data-reveal data-d="2">
              <div className={s.mapStage}>
                <DestinyMap sign={sign} />
                <div className={s.mapHud}>
                  <div className={s.mapCorner}>
                    <span className={s.mapTag}>
                      {isKo ? 'DestinyPal · 라이브 차트 엔진' : 'DestinyPal · Live Chart Engine'}
                    </span>
                    <span className={s.mapReadout}>{readout}</span>
                  </div>
                  <div className={s.mapCorner} style={{ alignItems: 'flex-end' }}>
                    <span className={s.mapTag}>
                      {signInfo.el} · {signInfo.date}
                    </span>
                    <span className={s.mapName}>{isKo ? signInfo.kr : sign}</span>
                  </div>
                </div>
              </div>
              <SignChips active={sign} onChange={setSign} />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className={s.section} id="how">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 03 — 의식' : '№ 03 — The Ritual'}
              </span>
              <h2 className={s.secHeadTitle} data-reveal data-d="1">
                {isKo ? (
                  <>
                    <em>당신</em>과 하늘 사이의 세 걸음.
                  </>
                ) : (
                  <>
                    Three steps between <em>you</em> and the sky.
                  </>
                )}
              </h2>
            </div>
            <div className={s.steps}>
              {[
                {
                  n: '01',
                  t: isKo ? '도착의 순간을 기록합니다' : 'Mark your arrival',
                  d: isKo
                    ? '생년월일, 가능하다면 태어난 시각, 그리고 도시. 진짜 차트와 단순한 추측을 가르는 것은 분 단위의 시각과 자오선입니다.'
                    : 'Birth date, the hour if you have it, and the city. The minute and the meridian are what separate a real chart from a guess.',
                },
                {
                  n: '02',
                  t: isKo ? '모델이 읽어냅니다' : 'The model reads',
                  d: isKo
                    ? '사주의 네 기둥, 출생 천궁도, 현재의 트랜짓을 한 자리에 두고, 세 전통이 동의하는 지점과 충돌하는 지점을 함께 살핍니다.'
                    : 'DestinyPal aligns your four pillars, natal houses and current transits, cross-checking the three traditions for where they agree — and where they argue.',
                },
                {
                  n: '03',
                  t: isKo ? '당신의 차트가 펼쳐집니다' : 'Your chart unfolds',
                  d: isKo
                    ? '사랑, 일, 다가올 한 해 — 대화하듯 묻고, 하늘이 움직일 때마다 새로 받아 볼 수 있는 살아 있는 리딩입니다.'
                    : 'A living reading you can ask questions of — about love, work, the year ahead — returning whenever the sky shifts.',
                },
              ].map((step, i) => (
                <div key={step.n} className={s.step} data-reveal data-d={String(i + 1)}>
                  <div className={`${s.stepN} ${s.holoText}`}>{step.n}</div>
                  <h3 className={s.stepT}>{step.t}</h3>
                  <p className={s.stepD}>{step.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className={s.section} id="features">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 04 — 당신을 읽는 다섯 가지 방법' : '№ 04 — Five Ways to Read You'}
              </span>
              <h2 className={s.secHeadTitle} data-reveal data-d="1">
                {isKo ? (
                  <>
                    하나의 모델, 여러 <em>옛 언어들.</em>
                  </>
                ) : (
                  <>
                    One model, many <em>old languages.</em>
                  </>
                )}
              </h2>
            </div>
            <div className={s.features}>
              <article className={`${s.feat} ${s.featLg}`} data-reveal>
                <div className={s.featHead}>
                  <div>
                    <div className={s.featT}>{isKo ? '사주명리' : 'Four Pillars'}</div>
                    <div className={s.featKr}>
                      {isKo ? '네 기둥의 운명' : 'the four columns of fate'}
                    </div>
                  </div>
                  <span className={s.featIdx}>01 / 05</span>
                </div>
                <p className={s.featD}>
                  {isKo
                    ? '태어난 연·월·일·시 네 기둥이 그리는 우주의 기상도. DestinyPal은 오행의 균형과 한 해 한 해의 흐름을 읽어, 모든 리딩의 뼈대를 세웁니다.'
                    : 'The hour, day, month and year of your birth as four columns of cosmic weather. DestinyPal reads the balance of your five elements and where the years run hot or cold — the backbone of every reading.'}
                </p>
              </article>
              <article className={`${s.feat} ${s.featSm}`} data-reveal data-d="1">
                <div className={s.featHead}>
                  <span className={`${s.featGlyph} ${s.chrome}`}>☉</span>
                  <span className={s.featIdx}>02</span>
                </div>
                <div>
                  <div className={s.featT}>{isKo ? '출생 천궁도' : 'Natal Chart'}</div>
                  <div className={s.featKr}>
                    {isKo ? '태어난 순간의 하늘' : 'the sky at your birth'}
                  </div>
                  <p className={s.featD}>
                    {isKo
                      ? '12 하우스, 10개 행성, 태어난 자리 위의 정확한 하늘.'
                      : 'Twelve houses, ten bodies, the exact sky over your birthplace.'}
                  </p>
                </div>
              </article>
              <article className={`${s.feat} ${s.featSm}`} data-reveal data-d="2">
                <div className={s.featHead}>
                  <span className={`${s.featGlyph} ${s.holoText}`}>✦</span>
                  <span className={s.featIdx}>03</span>
                </div>
                <div>
                  <div className={s.featT}>{isKo ? '오늘의 운세' : 'Daily Fortune'}</div>
                  <div className={s.featKr}>
                    {isKo ? '매일 아침의 하늘' : 'the morning sky, daily'}
                  </div>
                  <p className={s.featD}>
                    {isKo
                      ? '오늘 밤 하늘의 흐름에 맞춘, 매일 아침의 짧은 리딩.'
                      : "A short reading tuned to tonight's transits, every morning."}
                  </p>
                </div>
              </article>
              <article className={`${s.feat} ${s.featMd}`} data-reveal data-d="1">
                <div className={s.featHead}>
                  <span className={`${s.featGlyph} ${s.chrome}`}>☾</span>
                  <span className={s.featIdx}>04</span>
                </div>
                <div>
                  <div className={s.featT}>{isKo ? '궁합' : 'Compatibility'}</div>
                  <div className={s.featKr}>
                    {isKo ? '두 별이 만날 때' : 'where two stars meet'}
                  </div>
                  <p className={s.featD}>
                    {isKo
                      ? '두 사람의 차트를 나란히 펴서 조화로운 자리, 불꽃이 튀는 자리, 인내가 필요한 자리를 함께 살핍니다.'
                      : 'Lay two charts side by side and find where they harmonize, where they spark, and where they will need patience.'}
                  </p>
                </div>
              </article>
              <article className={`${s.feat} ${s.featWide}`} data-reveal data-d="2">
                <div className={s.featHead}>
                  <span className={`${s.featGlyph} ${s.holoText}`}>⚜</span>
                  <span className={s.featIdx}>05</span>
                </div>
                <div>
                  <div className={s.featT}>{isKo ? '타로 상담' : 'Tarot, on call'}</div>
                  <div className={s.featKr}>{isKo ? '78장의 아르카나' : '78 arcana'}</div>
                  <p className={s.featD}>
                    {isKo
                      ? '질문 하나에 카드 한 장씩 펼치고, 모델은 당신의 차트가 이미 알려준 모든 맥락 위에서 78 아르카나를 읽어 냅니다 — 카드 혼자서는 닿지 못하는 깊이로.'
                      : 'Ask a question, pull a spread, and let the model read the 78 arcana against everything it already knows about your chart — context the cards alone can never carry.'}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* TAROT */}
        <section className={s.section} id="tarot">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 05 — 타로 상담' : '№ 05 — Tarot, on call'}
              </span>
              <h2 className={s.secHeadTitle} data-reveal data-d="1">
                {isKo ? (
                  <>
                    질문 하나, <em>세 장의 카드.</em>
                  </>
                ) : (
                  <>
                    Ask a question. <em>Pull your spread.</em>
                  </>
                )}
              </h2>
            </div>
            <div className={s.tarotLead} data-reveal data-d="1">
              <p>
                {isKo
                  ? '78장의 아르카나를, DestinyPal이 당신의 차트에서 이미 알고 있는 모든 것 위에서 읽어 드립니다. 카드를 한 장씩 눌러 보세요 — 지난 자리, 지금의 자리, 다가오는 자리.'
                  : "Seventy-eight arcana, read against everything DestinyPal already knows about your chart. Tap each card to turn it — what's behind you, what holds now, what is drawing near."}
              </p>
              <span className={`${s.kicker} ${s.solo}`}>
                {isKo ? '타로 · 78장의 아르카나' : 'Tarot · 78 Arcana'}
              </span>
            </div>
            <TarotSpread />
          </div>
        </section>

        {/* COMPATIBILITY */}
        <section className={s.section} id="compat">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 06 — 궁합' : '№ 06 — Compatibility'}
              </span>
              <h2 className={s.secHeadTitle} data-reveal data-d="1">
                {isKo ? (
                  <>
                    두 차트를 <em>나란히 펴봅니다.</em>
                  </>
                ) : (
                  <>
                    Lay two charts <em>side by side.</em>
                  </>
                )}
              </h2>
            </div>
            <CompatibilityPanel />
          </div>
        </section>

        {/* SAMPLE READING */}
        <section className={s.section} id="reading">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 07 — 지도의 한 페이지' : '№ 07 — A Page From the Map'}
              </span>
            </div>
            <div className={s.reading}>
              <div className={s.readingCard} data-reveal>
                <div className={s.readingInner}>
                  <div className={s.readingTop}>
                    <span>{isKo ? 'DestinyPal · 일일 리딩' : 'DestinyPal · Daily'}</span>
                    <span>{isKo ? sampleDate.ko : sampleDate.en}</span>
                  </div>
                  <div className={s.readingSign}>
                    <span className={s.holoText}>♌</span>
                    <small>{isKo ? '사자자리 · 불' : 'Leo · Fire'}</small>
                  </div>
                  <p className={s.readingBody}>
                    {isKo
                      ? '화성이 당신의 야망의 집을 지나는 한 주. 오래 미뤄둔 한 가지를 시작하기 좋은 흐름이지만, 욕심이 속도를 앞지르지 않게 하세요. 목요일, 뜻밖의 제안이 닿습니다 — 바로 답하지 말고 하루를 두세요.'
                      : 'A week with Mars crossing your house of ambition. A good current to begin the one thing you have been postponing — but do not let desire outrun your pace. On Thursday, an unexpected offer arrives. Do not answer immediately; give it a day.'}
                  </p>
                  <div className={s.readingScore}>
                    <div>
                      <b className={s.holoText}>88</b>
                      <span>{isKo ? '운' : 'Fortune'}</span>
                    </div>
                    <div>
                      <b className={s.holoText}>72</b>
                      <span>{isKo ? '사랑' : 'Love'}</span>
                    </div>
                    <div>
                      <b className={s.holoText}>91</b>
                      <span>{isKo ? '일' : 'Career'}</span>
                    </div>
                    <div>
                      <b className={s.holoText}>SE</b>
                      <span>{isKo ? '방향' : 'Lucky dir.'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className={s.readingTxt} data-reveal data-d="1">
                <h3>
                  {isKo ? (
                    <>
                      운세가 아닙니다. <em>기억하는 리딩입니다.</em>
                    </>
                  ) : (
                    <>
                      Not a horoscope. <em>A reading that remembers.</em>
                    </>
                  )}
                </h3>
                <p>
                  {isKo
                    ? '모든 DestinyPal 페이지는 단 하나의 차트 — 당신의 차트 — 를 위해 생성되며, 지난번에 배운 것을 이어 갑니다. 각 문장이 어느 전통에서 왔는지 밝히고, 하늘이 잠잠한 날에는 솔직하게 그렇다고 말합니다.'
                    : 'Every DestinyPal page is generated for one chart — yours — and carries forward what it learned last time. It cites which tradition each line came from, and it will tell you plainly when the sky is quiet.'}
                </p>
                <div className={s.readingList}>
                  <div className={s.readingLi}>
                    <b>{isKo ? '사주' : 'SAJU'}</b>
                    <span>
                      {isKo
                        ? '일간이 불 기운에 강함 — 신중함보다 시도가 보답받는 한 주.'
                        : 'Day Master strong in Fire — a week that rewards initiative over caution.'}
                    </span>
                  </div>
                  <div className={s.readingLi}>
                    <b>{isKo ? '트랜짓' : 'TRANSIT'}</b>
                    <span>
                      {isKo
                        ? '화성이 10번째 하우스를 통과: 야심이 인내보다 한 박자 앞섭니다.'
                        : 'Mars crossing the 10th house: ambition runs ahead of patience.'}
                    </span>
                  </div>
                  <div className={s.readingLi}>
                    <b>{isKo ? '타로' : 'TAROT'}</b>
                    <span>
                      {isKo
                        ? '별, 정방향 — 긴 노력 끝에 찾아오는 조용한 회복.'
                        : 'The Star, upright — quiet renewal after a long stretch of effort.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE */}
        <section className={`${s.section} ${s.quoteband}`}>
          <div className={s.wrap}>
            <blockquote data-reveal>
              {isKo ? (
                <>
                  <em>오랫동안 나를 알아온 사람</em>처럼 읽어 주었어요 — 그리고 보지 못하는 부분은
                  솔직히 모른다고 했어요.
                </>
              ) : (
                <>
                  It read me like someone who had <em>known me for years</em> — and admitted the
                  parts it couldn&apos;t see.
                </>
              )}
            </blockquote>
            <cite data-reveal data-d="1">
              {isKo
                ? '— 예시 후기 · 서울의 초기 사용자 · ★★★★★'
                : '— Illustrative · Early user, Seoul · ★★★★★'}
            </cite>
          </div>
        </section>

        {/* CTA */}
        <section className={`${s.section} ${s.cta}`} id="join">
          <div className={s.wrap}>
            <h2 className={`${s.ctaTitle} ${isKo ? s.nowrap : ''}`} data-reveal>
              {isKo ? (
                <>
                  <span className={s.chrome}>당신의 운명을</span>{' '}
                  <em className={s.holoText}>펼치세요</em>
                </>
              ) : (
                <>
                  <span className={s.chrome}>unfold your</span>{' '}
                  <em className={s.holoText}>destiny</em>
                </>
              )}
            </h2>
            <p className={s.ctaSub} data-reveal data-d="1">
              {isKo ? '첫 리딩은 무료입니다.' : 'Your first reading is free.'}
            </p>
            <div
              className={s.heroCtaRow}
              data-reveal
              data-d="2"
              style={{ justifyContent: 'center' }}
            >
              <a href="/destiny-counselor" className={`${s.btn} ${s.btnSolid}`}>
                {isKo ? '지금 시작하기' : 'Start now'}
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className={s.footer}>
          <div className={s.wrap}>
            <div className={s.footerTop}>
              <div className={s.footerCols}>
                <div className={s.footerCol}>
                  <h4>{isKo ? '리딩' : 'Readings'}</h4>
                  <a href="#features">{isKo ? '사주' : 'Four Pillars'}</a>
                  <a href="#features">{isKo ? '출생 천궁도' : 'Natal Chart'}</a>
                  <a href="#features">{isKo ? '타로' : 'Tarot'}</a>
                  <a href="#features">{isKo ? '궁합' : 'Compatibility'}</a>
                </div>
                <div className={s.footerCol}>
                  <h4>{isKo ? '소개' : 'Company'}</h4>
                  <a href="#about">{isKo ? '시작 이야기' : 'The Premise'}</a>
                  <a href="#how">{isKo ? '이용 방법' : 'How it works'}</a>
                  <a href="#join">{isKo ? '시작하기' : 'Begin'}</a>
                </div>
                <div className={s.footerCol}>
                  <h4>{isKo ? '문의' : 'Contact'}</h4>
                  <a href="mailto:rheeco88@gmail.com">rheeco88@gmail.com</a>
                </div>
              </div>
            </div>
            <div className={s.footerBottom}>
              <span>© 2026 DestinyPal · destinypal.com</span>
              <span>
                {isKo
                  ? '사주와 별자리를 함께 읽는 AI ✦ 맑은 하늘 아래 만들어졌습니다'
                  : 'AI that reads Saju and the stars ✦ Made under a clear sky'}
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
