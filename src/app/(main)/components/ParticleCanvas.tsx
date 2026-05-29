'use client'

import { useRef, memo } from 'react'
import styles from '../main-page.module.css'
import { useParticleField } from '@/hooks/useParticleField'
import { useLowEndDevice } from '@/hooks/useLowEndDevice'

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isLowEnd = useLowEndDevice()

  // 메인 히어로 배경 — 저사양 기기는 파라미터 반 절감 (PWA 느림 호소 회피).
  // 메모리 4GB↓ / 코어 4↓ / saveData / 2g / prefers-reduced-motion 중 하나면 저사양.
  useParticleField(canvasRef, {
    color: '#88b3f7',
    particleCount: isLowEnd ? 60 : 150,
    maxLinkDistance: isLowEnd ? 90 : 120,
    mouseRadius: isLowEnd ? 150 : 200,
    baseSpeed: 0.5,
    areaPerParticle: 9000,
    linkOpacityFactor: 1,
    fps: isLowEnd ? 24 : 30,
  })

  return <canvas ref={canvasRef} className={styles.particleCanvas} />
}

// Memoize ParticleCanvas - it has no props so will never re-render unnecessarily
export default memo(ParticleCanvas)
