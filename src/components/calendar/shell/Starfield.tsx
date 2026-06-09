'use client'

/* ============================================================
   destinypal · Starfield — canvas 별 parallax 배경
   직역 출처: destinypal-extracted/js/app.jsx initStarfield()
   forwardRef 로 setCamDepth(cam) imperative 핸들 노출 — Shell 의
   카메라 depth (float 0..3) 가 그대로 parallax zoom 인자가 됨.
   ============================================================ */

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import styles from '../styles/shell.module.css'

export interface StarfieldHandle {
  setCamDepth: (cam: number) => void
}

interface Star {
  x: number
  y: number
  z: number
  r: number
  tw: number
  tws: number
  hue: number
}

export const Starfield = forwardRef<StarfieldHandle, { className?: string }>(function Starfield(
  { className },
  ref
) {
  const cvRef = useRef<HTMLCanvasElement | null>(null)
  const depthRef = useRef(0)

  useImperativeHandle(
    ref,
    () => ({
      setCamDepth: (cam: number) => {
        depthRef.current = cam
      },
    }),
    []
  )

  useEffect(() => {
    const cv = cvRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0
    let dpr = 1
    let stars: Star[] = []
    let rafId = 0
    let cancelled = false

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      W = cv.width = w * dpr
      H = cv.height = h * dpr
      cv.style.width = w + 'px'
      cv.style.height = h + 'px'
      const n = Math.floor((w * h) / 6500)
      stars = Array.from({ length: n }, () => ({
        x: Math.random(),
        y: Math.random(),
        z: Math.random() * 0.9 + 0.1,
        r: Math.random() * 1.3 + 0.2,
        tw: Math.random() * Math.PI * 2,
        tws: Math.random() * 1.6 + 0.4,
        hue: Math.random() < 0.22 ? 210 : Math.random() < 0.5 ? 45 : 0,
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const draw = () => {
      if (cancelled) return
      t += 0.016
      ctx.clearRect(0, 0, W, H)
      const depth = depthRef.current || 0
      for (const s of stars) {
        const zoom = 1 + depth * 0.12 * s.z
        const cx = 0.5 + (s.x - 0.5) * zoom
        const cy = 0.44 + (s.y - 0.44) * zoom
        if (cx < -0.1 || cx > 1.1 || cy < -0.1 || cy > 1.1) continue
        const px = cx * W
        const py = cy * H
        const tw = 0.55 + 0.45 * Math.sin(t * s.tws + s.tw)
        const alpha = tw * (0.35 + s.z * 0.5)
        const rad = s.r * dpr * (1 + s.z * 0.6)
        let col: string
        if (s.hue === 210) col = `rgba(150,185,255,${alpha})`
        else if (s.hue === 45) col = `rgba(240,210,150,${alpha * 0.85})`
        else col = `rgba(230,236,255,${alpha})`
        ctx.beginPath()
        ctx.arc(px, py, rad, 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()
        if (s.z > 0.7 && tw > 0.85) {
          ctx.globalAlpha = (tw - 0.85) * 2
          ctx.strokeStyle = col
          ctx.lineWidth = 0.5 * dpr
          ctx.beginPath()
          ctx.moveTo(px - rad * 3, py)
          ctx.lineTo(px + rad * 3, py)
          ctx.moveTo(px, py - rad * 3)
          ctx.lineTo(px, py + rad * 3)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={cvRef}
      className={[styles.stars, className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
})

export default Starfield
