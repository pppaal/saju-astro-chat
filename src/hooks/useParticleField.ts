'use client'

import { useEffect, type RefObject } from 'react'

/**
 * 배경 파티클 필드 — 점들이 떠다니고, 가까우면 선으로 잇고, 마우스를 피한다.
 * 메인 페이지(ParticleCanvas)와 서비스 페이지(ServicePageLayout)가 거의
 * 똑같은 구현을 각자 들고 있던 걸 하나로 묶은 것. 동작 차이는 전부 옵션으로
 * 노출해 기존 두 화면의 모습이 그대로 유지되도록 한다.
 *
 * 연결선 탐색은 그리드 기반 O(n) — 셀 크기를 maxLinkDistance 로 잡아 인접
 * 3×3 셀만 검사하므로 단순 O(n²) 와 결과(그려지는 선)는 동일하고 더 빠르다.
 */

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  update(): void
  draw(): void
}

export interface ParticleFieldOptions {
  /** 점·연결선 색 (hex, 6자리). 연결선은 이 색에서 RGB 를 뽑아 사용. */
  color?: string
  /** 파티클 개수 상한. */
  particleCount?: number
  /** 이 거리 미만이면 두 점을 선으로 연결. */
  maxLinkDistance?: number
  /** 마우스 반발 반경. */
  mouseRadius?: number
  /** 기본 이동 속도. */
  baseSpeed?: number
  /** 화면 넓이당 파티클 밀도 — 클수록 듬성. (width*height / areaPerParticle) */
  areaPerParticle?: number
  /** 연결선 불투명도 배수 (0~1). */
  linkOpacityFactor?: number
  /** 프레임 상한(fps). 0/미지정이면 매 프레임 렌더. */
  fps?: number
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { r: 136, g: 179, b: 247 }
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function useParticleField(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: ParticleFieldOptions = {}
): void {
  const {
    color = '#88b3f7',
    particleCount = 150,
    maxLinkDistance = 120,
    mouseRadius = 200,
    baseSpeed = 0.5,
    areaPerParticle = 9000,
    linkOpacityFactor = 1,
    fps = 0,
  } = options

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const context = canvasEl.getContext('2d')
    if (!context) return
    // 아래 클로저(클래스 메서드·함수 선언)들이 쓰도록 non-null 타입으로 고정.
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = context

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const { r, g, b } = hexToRgb(color)
    let particlesArray: Particle[] = []
    let raf = 0
    let lastFrame = 0
    const frameInterval = fps > 0 ? 1000 / fps : 0

    const mouse = {
      x: undefined as number | undefined,
      y: undefined as number | undefined,
      radius: mouseRadius,
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.x
      mouse.y = e.y
    }
    const handleMouseOut = () => {
      mouse.x = undefined
      mouse.y = undefined
    }
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      init()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseout', handleMouseOut)
    window.addEventListener('resize', handleResize)

    class ParticleImpl implements Particle {
      x = Math.random() * canvas.width
      y = Math.random() * canvas.height
      size = Math.random() * 2.5 + 1
      speedX = (Math.random() * 2 - 1) * baseSpeed
      speedY = (Math.random() * 2 - 1) * baseSpeed

      update() {
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY
        this.x += this.speedX
        this.y += this.speedY

        if (mouse.x !== undefined && mouse.y !== undefined) {
          const dx = mouse.x - this.x
          const dy = mouse.y - this.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius
            this.x -= (dx / distance) * force * 2
            this.y -= (dy / distance) * force * 2
          }
        }
      }

      draw() {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function init() {
      particlesArray = []
      const n = Math.min((canvas.height * canvas.width) / areaPerParticle, particleCount)
      for (let i = 0; i < n; i++) particlesArray.push(new ParticleImpl())
    }

    // 그리드 기반 O(n) 연결 — 셀 크기 = maxLinkDistance, 인접 3×3 만 검사.
    const gridCellSize = maxLinkDistance
    function connectParticles() {
      const grid = new Map<string, Particle[]>()
      for (const p of particlesArray) {
        const key = `${Math.floor(p.x / gridCellSize)},${Math.floor(p.y / gridCellSize)}`
        const cell = grid.get(key)
        if (cell) cell.push(p)
        else grid.set(key, [p])
      }

      const checked = new Set<string>()
      for (const p of particlesArray) {
        const cellX = Math.floor(p.x / gridCellSize)
        const cellY = Math.floor(p.y / gridCellSize)
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighbors = grid.get(`${cellX + dx},${cellY + dy}`)
            if (!neighbors) continue
            for (const neighbor of neighbors) {
              if (p === neighbor) continue
              const pairKey =
                p.x < neighbor.x
                  ? `${p.x},${p.y}-${neighbor.x},${neighbor.y}`
                  : `${neighbor.x},${neighbor.y}-${p.x},${p.y}`
              if (checked.has(pairKey)) continue
              checked.add(pairKey)

              const distX = p.x - neighbor.x
              const distY = p.y - neighbor.y
              const distSq = distX * distX + distY * distY
              if (distSq < maxLinkDistance * maxLinkDistance) {
                const opacity = (1 - Math.sqrt(distSq) / maxLinkDistance) * linkOpacityFactor
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.moveTo(p.x, p.y)
                ctx.lineTo(neighbor.x, neighbor.y)
                ctx.stroke()
              }
            }
          }
        }
      }
    }

    function animate(timestamp = 0) {
      if (frameInterval === 0 || timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        for (const p of particlesArray) {
          p.update()
          p.draw()
        }
        connectParticles()
      }
      raf = requestAnimationFrame(animate)
    }

    init()
    animate()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseout', handleMouseOut)
      window.removeEventListener('resize', handleResize)
    }
  }, [
    canvasRef,
    color,
    particleCount,
    maxLinkDistance,
    mouseRadius,
    baseSpeed,
    areaPerParticle,
    linkOpacityFactor,
    fps,
  ])
}
