'use client'

import { useEffect, useRef, useState } from 'react'
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
                {isKo ? '№ 01 — 우리 소개' : '№ 01 — About DestinyPal'}
              </span>
            </div>
            {isKo ? (
              <p className={s.editorialLead} data-reveal data-d="1">
                흩어진 운세를, <em>한 곳에서 정확하게.</em>
              </p>
            ) : (
              <p className={s.editorialLead} data-reveal data-d="1">
                Scattered fortunes, <em>read in one place.</em>
              </p>
            )}
            {isKo ? (
              <div className={`${s.editorialCols} ${s.dropcap}`} data-reveal data-d="2">
                <p>
                  DestinyPal은 사주와 서양 점성술, 타로를 하나의 모델로 묶어 읽는 AI 운세
                  서비스입니다. 앱과 점집을 옮겨 다니지 않아도, 한 화면에서 세 전통을 함께 봅니다.
                </p>
                <p>
                  우리는 운명을 대신 정해 드리지 않습니다. 정확한 계산 위에서 지금의 흐름을 풀어
                  드리고, 더 나은 선택을 하도록 곁에서 돕습니다. 운세가 처음인 분도, 깊게 보는 분도
                  함께 쓸 수 있습니다.
                </p>
              </div>
            ) : (
              <div className={`${s.editorialCols} ${s.dropcap}`} data-reveal data-d="2">
                <p>
                  DestinyPal is an AI service that reads Saju, Western astrology, and tarot through
                  a single model. Instead of hopping between apps and fortune-tellers, you see all
                  three traditions on one screen.
                </p>
                <p>
                  We do not decide your fate for you. We read where things stand right now on top of
                  precise calculation, and we stay beside you while you make the call. It works
                  whether this is your first reading or your hundredth.
                </p>
              </div>
            )}
            <div className={s.editorialMeta} data-reveal data-d="3">
              <span>{isKo ? '정직함' : 'Honest'}</span>
              <span>{isKo ? '정밀함' : 'Precise'}</span>
              <span>{isKo ? '사람의 언어로' : 'In plain language'}</span>
            </div>
          </div>
        </section>

        {/* DESTINY MAP */}
        <section className={s.section} id="map">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '✦ 직접 해보세요 · 별자리 지도' : '✦ Try it · Your constellation'}
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

        {/* FEATURES */}
        <section className={s.section} id="features">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 02 — 우리가 하는 것' : '№ 02 — What We Do'}
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
                    : 'The hour, day, month and year of your birth as four columns of cosmic weather. DestinyPal reads the balance of your five elements and where the years run hot or cold. It is the backbone of every reading.'}
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
                      ? '질문 하나에 카드 한 장씩 펼치고, 모델은 당신의 차트가 이미 알려준 모든 맥락 위에서 78 아르카나를 읽어 냅니다. 카드 혼자서는 건네지 못하는 깊이입니다.'
                      : 'Ask a question, pull a spread, and let the model read the 78 arcana against everything it already knows about your chart. That is context the cards alone can never carry.'}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* OUR EDGE — 내부 구현(라이브러리·모델·매핑)은 비공개로 두고, 강점만
            프로페셔널하게. */}
        <section className={s.section} id="engine">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 03 — 우리의 강점' : '№ 03 — Our Edge'}
              </span>
              <h2 className={s.secHeadTitle} data-reveal data-d="1">
                {isKo ? (
                  <>
                    정확히 계산하고, <em>정직하게 잇습니다.</em>
                  </>
                ) : (
                  <>
                    Computed exactly, <em>joined honestly.</em>
                  </>
                )}
              </h2>
            </div>
            <div className={s.steps}>
              {[
                {
                  g: '☯',
                  t: isKo ? '천문학적 정밀도' : 'Astronomical precision',
                  d: isKo
                    ? '태어난 시각과 장소를 그대로 반영합니다. 흔히 놓치는 시간의 경계까지 바로잡아, 고전 명리 그대로의 차트를 세웁니다.'
                    : 'We honor the exact time and place of your birth, down to the boundaries most apps skip over. Your chart stands the way the classical tradition intended.',
                },
                {
                  g: '☉',
                  t: isKo ? '실제 하늘 그대로' : 'The real sky',
                  d: isKo
                    ? '태어난 순간, 그 자리의 하늘을 그대로 계산해 천궁도를 그립니다. 평균이나 어림이 아니라 그 시각의 진짜 하늘입니다.'
                    : 'Your natal chart is drawn from the real sky at your exact moment and place. Not an average or a guess, but the heavens as they actually stood.',
                },
                {
                  g: '✦',
                  t: isKo ? '하나의 흐름으로' : 'One flow',
                  d: isKo
                    ? '동양과 서양을 따로 읽지 않습니다. 두 전통이 같은 곳을 가리킬 때 하나로 엮습니다. 한쪽만 말할 땐 굳이 부풀리지 않아요.'
                    : "We don't read East and West separately. We find where both traditions point the same way and weave them into one. When only one of them speaks, we leave it there.",
                },
              ].map((part) => (
                <div key={part.t} className={s.step} data-reveal data-d="2">
                  <div className={`${s.stepN} ${s.holoText}`}>{part.g}</div>
                  <h3 className={s.stepT}>{part.t}</h3>
                  <p className={s.stepD}>{part.d}</p>
                </div>
              ))}
            </div>
            <div className={s.editorialMeta} data-reveal data-d="3">
              <span>{isKo ? '천문학적 정밀도' : 'Astronomical precision'}</span>
              <span>{isKo ? '고전 명리 그대로' : 'True to tradition'}</span>
              <span>{isKo ? '동·서양 교차 검증' : 'Cross-checked traditions'}</span>
              <span>{isKo ? '사람의 언어로' : 'In plain language'}</span>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className={s.section} id="how">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 04 — 이렇게 작동합니다' : '№ 04 — How It Works'}
              </span>
              <h2 className={s.secHeadTitle} data-reveal data-d="1">
                {isKo ? (
                  <>
                    정보 한 줄에서, <em>차트 한 장으로.</em>
                  </>
                ) : (
                  <>
                    From a few details, <em>to one chart.</em>
                  </>
                )}
              </h2>
            </div>
            <div className={s.steps}>
              {[
                {
                  n: '01',
                  t: isKo ? '정보를 입력합니다' : 'You share a few details',
                  d: isKo
                    ? '생년월일, 가능하다면 태어난 시각, 그리고 도시. 정확함은 바로 그 디테일에서 갈립니다.'
                    : 'Birth date, the hour if you have it, and the city. The accuracy is in those small details.',
                },
                {
                  n: '02',
                  t: isKo ? '모델이 읽어냅니다' : 'The model reads',
                  d: isKo
                    ? '사주의 네 기둥, 출생 천궁도, 현재의 트랜짓을 한 자리에 두고, 세 전통이 동의하는 지점과 충돌하는 지점을 함께 살핍니다.'
                    : 'It aligns your four pillars, natal houses and current transits. We check where the three traditions agree, and where they pull apart.',
                },
                {
                  n: '03',
                  t: isKo ? '차트가 펼쳐집니다' : 'Your chart unfolds',
                  d: isKo
                    ? '사랑, 일, 다가올 한 해. 대화하듯 묻고, 하늘이 움직일 때마다 새로 받아 보는 살아 있는 리딩입니다.'
                    : 'A living reading you can ask questions of. Love, work, the year ahead. It refreshes whenever the sky shifts.',
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

        {/* SAMPLE READING */}
        <section className={s.section} id="reading">
          <div className={s.wrap}>
            <div className={s.secHead}>
              <span className={s.kicker} data-reveal>
                {isKo ? '№ 05 — 결과물 예시' : '№ 05 — A Sample Reading'}
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
                      ? '화성이 당신의 야망의 집을 지나는 한 주. 오래 미뤄둔 한 가지를 시작하기 좋은 흐름이지만, 욕심이 속도를 앞지르지 않게 하세요. 목요일, 뜻밖의 제안이 닿습니다. 바로 답하지 말고 하루를 두고 보세요.'
                      : 'A week with Mars crossing your house of ambition. A good time to begin the one thing you keep putting off, but do not let desire outrun your pace. On Thursday, an unexpected offer arrives. Sit with it a day before you answer.'}
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
                      운세가 아닙니다. <em>당신을 기억하는 리딩입니다.</em>
                    </>
                  ) : (
                    <>
                      Not a horoscope. <em>A reading that remembers.</em>
                    </>
                  )}
                </h3>
                <p>
                  {isKo
                    ? '모든 DestinyPal 페이지는 단 하나의 차트, 당신의 차트를 위해 만들어집니다. 지난번에 나눈 이야기를 이어 갑니다. 각 문장이 어느 전통에서 왔는지 밝힙니다. 특별한 흐름이 없는 날엔 억지로 만들지 않아요.'
                    : 'Every DestinyPal page is generated for one chart: yours. It carries forward what you talked about last time. Each line cites its tradition, and on a quiet day it simply says so.'}
                </p>
                <div className={s.readingList}>
                  <div className={s.readingLi}>
                    <b>{isKo ? '사주' : 'SAJU'}</b>
                    <span>
                      {isKo
                        ? '일간이 불 기운에 강함. 신중함보다 시도가 보답받는 한 주.'
                        : 'Day Master strong in Fire. A week that rewards initiative over caution.'}
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
                        ? '별, 정방향. 긴 노력 끝에 찾아오는 조용한 회복.'
                        : 'The Star, upright. Quiet renewal after a long stretch of effort.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
                  <a href="#about">{isKo ? '우리 소개' : 'About us'}</a>
                  <a href="#engine">{isKo ? '우리의 강점' : 'Our Edge'}</a>
                  <a href="#how">{isKo ? '이용 방법' : 'How it works'}</a>
                  <a href="/faq">{isKo ? '자주 묻는 질문' : 'FAQ'}</a>
                  <a href="#join">{isKo ? '시작하기' : 'Begin'}</a>
                </div>
                <div className={s.footerCol}>
                  <h4>{isKo ? '약관·정책' : 'Legal'}</h4>
                  <a href="/policy/privacy">{isKo ? '개인정보처리방침' : 'Privacy Policy'}</a>
                  <a href="/policy/terms">{isKo ? '이용약관' : 'Terms of Service'}</a>
                  <a href="/policy/refund">{isKo ? '환불 정책' : 'Refund Policy'}</a>
                </div>
                <div className={s.footerCol}>
                  <h4>{isKo ? '문의' : 'Contact'}</h4>
                  <a href="/contact">{isKo ? '문의하기' : 'Contact us'}</a>
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
