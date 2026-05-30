'use client'

import { ReactNode, useRef } from 'react'
import BackButton from './BackButton'
import CreditBadge from './CreditBadge'
import { useParticleField } from '@/hooks/useParticleField'
import styles from './ServicePageLayout.module.css'

interface ServicePageLayoutProps {
  title: string
  subtitle?: string
  icon?: string
  children: ReactNode
  particleColor?: string
  onBack?: () => void
  backLabel?: string
  /**
   * Compact layout for entry forms — drops the floating icon, hides
   * title/subtitle, and tightens content padding so the form anchors
   * near the top of the viewport instead of leaving ~200px of empty
   * chrome above it. The page still gets the back button + particle
   * canvas + credit badge, just without the marketing header.
   */
  compact?: boolean
}

export default function ServicePageLayout({
  title,
  subtitle,
  icon,
  children,
  particleColor = '#d8d4cc',
  onBack,
  backLabel,
  compact = false,
}: ServicePageLayoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 서비스 페이지 배경 — 기존 파라미터 그대로 (색은 prop, 70개, 듬성, 연결선
  // 불투명도 0.6, 프레임 캡 없음).
  useParticleField(canvasRef, {
    color: particleColor,
    particleCount: 70,
    maxLinkDistance: 100,
    mouseRadius: 180,
    baseSpeed: 0.4,
    areaPerParticle: 12000,
    linkOpacityFactor: 0.6,
  })

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />
      <BackButton onClick={onBack} label={backLabel} />
      <div className={styles.creditBadgeWrapper}>
        <CreditBadge variant="compact" />
      </div>
      <div className={`${styles.content} ${compact ? styles.contentCompact : ''}`}>
        {!compact && (
          <header className={styles.header}>
            {icon && (
              <div className={styles.iconWrapper}>
                <div className={styles.icon}>{icon}</div>
              </div>
            )}
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </header>
        )}
        {compact && <h1 className={styles.titleSr}>{title}</h1>}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
