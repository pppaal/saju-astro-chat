'use client'

import { useRef, memo } from 'react'
import styles from '../main-page.module.css'
import { useParticleField } from '@/hooks/useParticleField'

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 메인 히어로 배경 — 기존 파라미터 그대로 (파랑 #88b3f7, 150개, 30fps 캡).
  useParticleField(canvasRef, {
    color: '#88b3f7',
    particleCount: 150,
    maxLinkDistance: 120,
    mouseRadius: 200,
    baseSpeed: 0.5,
    areaPerParticle: 9000,
    linkOpacityFactor: 1,
    fps: 30,
  })

  return <canvas ref={canvasRef} className={styles.particleCanvas} />
}

// Memoize ParticleCanvas - it has no props so will never re-render unnecessarily
export default memo(ParticleCanvas)
