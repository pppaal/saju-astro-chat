import { useEffect, useRef } from 'react'

/**
 * Canvas background animation hook for tarot home page
 */
export function useCanvasAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let animationId: number
    let time = 0
    let lastFrame = 0
    const frameInterval = 1000 / 30 // 30 FPS

    const animate = (timestamp = 0) => {
      if (timestamp - lastFrame < frameInterval) {
        animationId = requestAnimationFrame(animate)
        return
      }
      lastFrame = timestamp
      time += 0.002

      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, 'rgba(10, 10, 26, 1)')
      gradient.addColorStop(0.5, 'rgba(13, 31, 45, 1)')
      gradient.addColorStop(1, 'rgba(22, 33, 62, 1)')

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Star effect
      for (let i = 0; i < 60; i++) {
        const x = (Math.sin(time * 0.3 + i * 1.5) * 0.5 + 0.5) * canvas.width
        const y = (Math.cos(time * 0.2 + i * 0.9) * 0.5 + 0.5) * canvas.height
        const opacity = 0.15 + Math.sin(time * 2 + i) * 0.1

        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99, 210, 255, ${opacity})`
        ctx.fill()
      }

      // Large glow circles
      for (let i = 0; i < 4; i++) {
        const x = (Math.sin(time + i * 1.5) * 0.25 + 0.5) * canvas.width
        const y = (Math.cos(time * 0.5 + i * 1.2) * 0.25 + 0.5) * canvas.height
        const radius = 80 + Math.sin(time + i) * 40

        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99, 210, 255, ${0.015 + Math.sin(time + i) * 0.01})`
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return canvasRef
}
