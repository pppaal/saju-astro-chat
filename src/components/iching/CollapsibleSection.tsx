'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './CollapsibleSection.module.css'

interface CollapsibleSectionProps {
  title: string
  icon?: string
  children: React.ReactNode
  defaultOpen?: boolean
  variant?: 'default' | 'highlight' | 'warning'
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  variant = 'default',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0)

  useEffect(() => {
    if (!contentRef.current) return

    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight
      setHeight(contentHeight)
    } else {
      setHeight(0)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className={`${styles.collapsible} ${styles[variant]}`}>
      <button
        className={`${styles.header} ${isOpen ? styles.headerOpen : ''}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title}`}
      >
        <div className={styles.headerContent}>
          {icon && (
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
          )}
          <h3 className={styles.title}>{title}</h3>
        </div>
        <span
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>
      <div
        id={`collapsible-content-${title}`}
        className={styles.contentWrapper}
        style={{ height: height }}
        aria-hidden={!isOpen}
      >
        <div ref={contentRef} className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}
