'use client'

/**
 * Starfield — canvas 별/먼지 배경 (ink-on-hanji 파스텔 톤).
 * 포팅 출처: destinypal-extracted/js-ink/app.jsx initStarfield()
 *
 * camDepth (0..3) 를 ref 로 받아 부드러운 parallax + 줌 느낌을 표현.
 * 부모 (DestinypalShell) 가 매 프레임 setCamDepth(cam) 으로 값을 갱신하면
 * 다음 RAF tick 에서 별들이 바깥쪽으로 드리프트한다.
 *
 * SSR safe: useEffect 안에서만 canvas/window 접근.
 */

import * as React from 'react'
import shellStyles from '../styles/shell.module.css'

export interface StarfieldHandle {
  /** 부모 (DestinypalShell) 가 각 frame 의 카메라 깊이를 흘려주는 setter. */
  setCamDepth: (depth: number) => void
}

interface Star {
  x: number
  y: number
  z: number
  r: number
  tw: number
  tws: number
  drift: number
  hue: number
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface StarfieldProps {}

export const Starfield = React.forwardRef<StarfieldHandle, StarfieldProps>(
  function Starfield(_props, ref) {
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
    const depthRef = React.useRef(0)

    React.useImperativeHandle(ref, () => ({
      setCamDepth: (d: number) => {
        depthRef.current = d
      },
    }))

    React.useEffect(() => {
      const cv = canvasRef.current
      if (!cv) return
      const ctx = cv.getContext('2d')
      if (!ctx) return

      let W = 0
      let H = 0
      let dpr = 1
      let stars: Star[] = []
      let rafId = 0
      let mounted = true

      const resize = (): void => {
        dpr = Math.min(2, window.devicePixelRatio || 1)
        W = cv.width = window.innerWidth * dpr
        H = cv.height = window.innerHeight * dpr
        cv.style.width = window.innerWidth + 'px'
        cv.style.height = window.innerHeight + 'px'
        const n = Math.floor((window.innerWidth * window.innerHeight) / 9500)
        stars = Array.from({ length: n }, () => ({
          x: Math.random(),
          y: Math.random(),
          z: Math.random() * 0.9 + 0.1,
          r: Math.random() * 1.6 + 0.4,
          tw: Math.random() * Math.PI * 2,
          tws: Math.random() * 0.7 + 0.2,
          drift: (Math.random() - 0.5) * 0.0009,
          // pigment: ink-fleck (0), sepia dust (45), faint gold (30)
          hue:
            Math.random() < 0.2
              ? 0
              : Math.random() < 0.5
                ? 45
                : 30,
        }))
      }

      resize()
      window.addEventListener('resize', resize)

      let t = 0
      const draw = (): void => {
        if (!mounted) return
        t += 0.016
        ctx.clearRect(0, 0, W, H)
        const depth = depthRef.current || 0
        for (const s of stars) {
          // parallax: deeper cam → motes drift outward & scale (zoom feel)
          const zoom = 1 + depth * 0.12 * s.z
          const cx =
            0.5 +
            (s.x - 0.5) * zoom +
            Math.sin(t * 0.25 + s.tw) * s.drift * 60
          const cy = 0.44 + (s.y - 0.44) * zoom + t * s.drift
          const wrapY = ((cy % 1) + 1) % 1
          if (cx < -0.1 || cx > 1.1) continue
          const px = cx * W
          const py = wrapY * H
          const tw = 0.6 + 0.4 * Math.sin(t * s.tws + s.tw)
          const alpha = tw * (0.18 + s.z * 0.3)
          const rad = s.r * dpr * (1 + s.z * 0.5)
          let col: string
          if (s.hue === 0) col = `rgba(70,56,36,${alpha * 0.7})` // ink fleck
          else if (s.hue === 45) col = `rgba(150,118,66,${alpha})` // sepia
          else col = `rgba(186,150,86,${alpha * 0.9})` // faint gold

          const grd = ctx.createRadialGradient(px, py, 0, px, py, rad * 2.4)
          grd.addColorStop(0, col)
          grd.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'))
          ctx.beginPath()
          ctx.arc(px, py, rad * 2.4, 0, Math.PI * 2)
          ctx.fillStyle = grd
          ctx.fill()
        }
        rafId = requestAnimationFrame(draw)
      }

      rafId = requestAnimationFrame(draw)

      return () => {
        mounted = false
        window.removeEventListener('resize', resize)
        cancelAnimationFrame(rafId)
      }
    }, [])

    return <canvas ref={canvasRef} className={shellStyles.stars} aria-hidden="true" />
  },
)

export default Starfield
