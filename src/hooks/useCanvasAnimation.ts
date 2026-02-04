import { useEffect, RefObject } from 'react'

// Calculate moon phase based on date
function getMoonPhase(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  let c = 0
  const _e = 0
  let jd = 0
  let b = 0

  if (month < 3) {
    const yearAdjust = year - 1
    const monthAdjust = month + 12
    c = Math.floor(yearAdjust / 100)
    jd = Math.floor(365.25 * yearAdjust) + Math.floor(30.6001 * (monthAdjust + 1)) + day + 1720994.5
  } else {
    c = Math.floor(year / 100)
    jd = Math.floor(365.25 * year) + Math.floor(30.6001 * (month + 1)) + day + 1720994.5
  }

  b = 2 - c + Math.floor(c / 4)
  jd = jd + b

  const daysSinceNew = jd - 2451549.5
  const newMoons = daysSinceNew / 29.53
  const phase = (newMoons - Math.floor(newMoons)) * 29.53

  return phase / 29.53 // 0 = new moon, 0.5 = full moon
}

export function useCanvasAnimation(canvasRef: RefObject<HTMLCanvasElement>, birthDate?: string) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let animationId: number | null = null
    let time = 0
    let isRunning = false
    let lastFrame = 0
    const frameInterval = 1000 / 30

    // Calculate moon phase if birthDate is provided
    const moonPhase = birthDate ? getMoonPhase(new Date(birthDate)) : getMoonPhase(new Date())

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const drawFrame = () => {
      const width = canvas.width
      const height = canvas.height
      const starCount = width < 640 ? 50 : width < 1024 ? 65 : 80

      // Deep blue/indigo gradient for dream theme
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, 'rgba(10, 8, 24, 1)')
      gradient.addColorStop(0.5, 'rgba(20, 15, 45, 1)')
      gradient.addColorStop(1, 'rgba(8, 12, 30, 1)')

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Stars with cyan/pink dream colors
      for (let i = 0; i < starCount; i++) {
        const x = (Math.sin(time * 0.3 + i * 1.5) * 0.5 + 0.5) * width
        const y = (Math.cos(time * 0.2 + i * 0.9) * 0.5 + 0.5) * height
        const opacity = 0.15 + Math.sin(time * 2 + i) * 0.1
        const hue = 180 + Math.sin(time + i) * 30 // Cyan to pink range

        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${hue}, 70%, 80%, ${opacity})`
        ctx.fill()
      }

      // Moon with phase-based position and appearance
      const moonX = width * (0.7 + moonPhase * 0.2) // Moon moves across sky based on phase
      const moonY = height * (0.15 + Math.abs(moonPhase - 0.5) * 0.1) // Arc movement
      const baseRadius = width < 640 ? 40 : 60
      const moonRadius = baseRadius + Math.sin(time) * 5

      // Moon glow - brighter during full moon
      const glowIntensity = 0.1 + (1 - Math.abs(moonPhase - 0.5) * 2) * 0.15
      const moonGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 2)
      moonGradient.addColorStop(0, `rgba(168, 237, 234, ${glowIntensity})`)
      moonGradient.addColorStop(0.5, `rgba(168, 237, 234, ${glowIntensity * 0.3})`)
      moonGradient.addColorStop(1, 'transparent')

      ctx.beginPath()
      ctx.arc(moonX, moonY, moonRadius * 2, 0, Math.PI * 2)
      ctx.fillStyle = moonGradient
      ctx.fill()

      // Draw moon body
      ctx.beginPath()
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(220, 240, 250, ${0.85 + Math.sin(time * 0.5) * 0.1})`
      ctx.fill()

      // Moon phase shadow
      if (moonPhase < 0.48 || moonPhase > 0.52) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2)
        ctx.clip()

        const shadowOffset = (moonPhase - 0.5) * moonRadius * 2
        ctx.beginPath()
        ctx.arc(moonX + shadowOffset, moonY, moonRadius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(10, 8, 24, 0.7)'
        ctx.fill()
        ctx.restore()
      }
    }

    const animate = (timestamp = 0) => {
      if (!isRunning) {
        return
      }
      if (timestamp - lastFrame >= frameInterval) {
        lastFrame = timestamp
        time += 0.002
        drawFrame()
      }
      animationId = requestAnimationFrame(animate)
    }

    const stop = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      isRunning = false
    }

    const start = () => {
      if (isRunning) {
        return
      }
      if (mediaQuery.matches || document.hidden) {
        drawFrame()
        return
      }
      isRunning = true
      lastFrame = 0
      animate()
    }

    const handleVisibility = () => {
      if (mediaQuery.matches || document.hidden) {
        stop()
        drawFrame()
        return
      }
      start()
    }

    const handleResize = () => {
      resizeCanvas()
      if (!isRunning) {
        drawFrame()
      }
    }

    resizeCanvas()
    handleVisibility()

    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibility)
    mediaQuery.addEventListener('change', handleVisibility)

    return () => {
      stop()
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      mediaQuery.removeEventListener('change', handleVisibility)
    }
  }, [canvasRef, birthDate])
}
