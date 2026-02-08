/**
 * Animation Frame Hook
 * Consolidates duplicate canvas animation patterns across 3+ files
 *
 * Common patterns consolidated:
 * - requestAnimationFrame loop management
 * - Canvas resize handling
 * - Visibility/reduced motion detection
 * - FPS throttling
 * - Resource cleanup
 */

import { useEffect, useRef, useCallback, useState, RefObject } from 'react'

// ============ Types ============

export interface UseAnimationFrameOptions {
  /** Target FPS (default: 30) */
  fps?: number
  /** Whether animation is enabled (default: true) */
  enabled?: boolean
  /** Respect user's reduced motion preference (default: true) */
  respectReducedMotion?: boolean
  /** Pause when tab is hidden (default: true) */
  pauseOnHidden?: boolean
  /** Auto-resize canvas to window (default: true) */
  autoResize?: boolean
}

export interface AnimationFrameContext {
  /** Canvas element */
  canvas: HTMLCanvasElement
  /** 2D rendering context */
  ctx: CanvasRenderingContext2D
  /** Current time value (increments each frame) */
  time: number
  /** Delta time since last frame (in seconds) */
  deltaTime: number
  /** Canvas width */
  width: number
  /** Canvas height */
  height: number
  /** Whether reduced motion is preferred */
  prefersReducedMotion: boolean
}

export type DrawFrameCallback = (context: AnimationFrameContext) => void

export interface UseAnimationFrameReturn {
  /** Start the animation */
  start: () => void
  /** Stop the animation */
  stop: () => void
  /** Whether animation is currently running */
  isRunning: boolean
  /** Force a single frame draw */
  drawOnce: () => void
}

// ============ Main Hook ============

/**
 * Hook for managing canvas animations with proper lifecycle
 *
 * @example
 * const canvasRef = useRef<HTMLCanvasElement>(null)
 *
 * useAnimationFrame(canvasRef, ({ ctx, width, height, time }) => {
 *   ctx.clearRect(0, 0, width, height)
 *   ctx.fillStyle = `hsl(${time * 50}, 70%, 60%)`
 *   ctx.fillRect(50, 50, 100, 100)
 * }, { fps: 60 })
 */
export function useAnimationFrame(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  drawFrame: DrawFrameCallback,
  options: UseAnimationFrameOptions = {}
): UseAnimationFrameReturn {
  const {
    fps = 30,
    enabled = true,
    respectReducedMotion = true,
    pauseOnHidden = true,
    autoResize = true,
  } = options

  const animationIdRef = useRef<number | null>(null)
  const isRunningRef = useRef(false)
  const timeRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const frameInterval = 1000 / fps

  // Check reduced motion preference
  const getReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Resize canvas to window
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !autoResize) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }, [canvasRef, autoResize])

  // Draw a single frame
  const drawOnce = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawFrame({
      canvas,
      ctx,
      time: timeRef.current,
      deltaTime: 0,
      width: canvas.width,
      height: canvas.height,
      prefersReducedMotion: getReducedMotion(),
    })
  }, [canvasRef, drawFrame, getReducedMotion])

  // Stop animation
  const stop = useCallback(() => {
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current)
      animationIdRef.current = null
    }
    isRunningRef.current = false
  }, [])

  // Start animation
  const start = useCallback(() => {
    if (isRunningRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Don't animate if reduced motion is preferred
    if (respectReducedMotion && getReducedMotion()) {
      drawOnce()
      return
    }

    // Don't animate if document is hidden
    if (pauseOnHidden && document.hidden) {
      drawOnce()
      return
    }

    isRunningRef.current = true
    lastFrameTimeRef.current = 0

    const animate = (timestamp: number) => {
      if (!isRunningRef.current) return

      // FPS throttling
      if (timestamp - lastFrameTimeRef.current >= frameInterval) {
        const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000
        lastFrameTimeRef.current = timestamp
        timeRef.current += 0.016 // ~60fps time increment for consistent animations

        drawFrame({
          canvas,
          ctx,
          time: timeRef.current,
          deltaTime,
          width: canvas.width,
          height: canvas.height,
          prefersReducedMotion: false,
        })
      }

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animationIdRef.current = requestAnimationFrame(animate)
  }, [canvasRef, drawFrame, frameInterval, respectReducedMotion, pauseOnHidden, getReducedMotion, drawOnce])

  // Main effect
  useEffect(() => {
    if (!enabled) {
      stop()
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    // Initial resize
    resizeCanvas()

    // Handle visibility change
    const handleVisibility = () => {
      if (document.hidden || (respectReducedMotion && getReducedMotion())) {
        stop()
        drawOnce()
      } else {
        start()
      }
    }

    // Handle resize
    const handleResize = () => {
      resizeCanvas()
      if (!isRunningRef.current) {
        drawOnce()
      }
    }

    // Handle reduced motion change
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotionChange = () => {
      if (mediaQuery.matches) {
        stop()
        drawOnce()
      } else if (!document.hidden) {
        start()
      }
    }

    // Start animation
    handleVisibility()

    // Add listeners
    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibility)
    mediaQuery.addEventListener('change', handleMotionChange)

    return () => {
      stop()
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
      mediaQuery.removeEventListener('change', handleMotionChange)
    }
  }, [enabled, canvasRef, start, stop, resizeCanvas, drawOnce, respectReducedMotion, getReducedMotion])

  // Use state for isRunning to avoid accessing ref during render
  const [isRunning, setIsRunning] = useState(false)

  // Sync ref to state when it changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunningRef.current !== isRunning) {
        setIsRunning(isRunningRef.current)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [isRunning])

  return {
    start,
    stop,
    isRunning,
    drawOnce,
  }
}

// ============ Particle System Hook ============

export interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
}

export interface UseParticleSystemOptions extends UseAnimationFrameOptions {
  /** Number of particles (default: 60) */
  particleCount?: number
  /** Maximum distance for particle connections (default: 120) */
  maxLinkDistance?: number
  /** Base particle speed (default: 0.25) */
  baseSpeed?: number
  /** Particle color (default: '#63d2ff') */
  particleColor?: string
  /** Enable particle connections (default: true) */
  enableConnections?: boolean
  /** Enable mouse interaction (default: true) */
  enableMouseInteraction?: boolean
  /** Mouse repulsion radius (default: 150) */
  mouseRadius?: number
}

/**
 * Hook for particle system animations
 *
 * @example
 * const canvasRef = useRef<HTMLCanvasElement>(null)
 * useParticleSystem(canvasRef, {
 *   particleCount: 80,
 *   particleColor: '#a855f7',
 *   maxLinkDistance: 100,
 * })
 */
export function useParticleSystem(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: UseParticleSystemOptions = {}
) {
  const {
    particleCount = 60,
    maxLinkDistance = 120,
    baseSpeed = 0.25,
    particleColor = '#63d2ff',
    enableConnections = true,
    enableMouseInteraction = true,
    mouseRadius = 150,
    ...animationOptions
  } = options

  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef<{ x?: number; y?: number }>({})

  // Initialize particles
  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.min(particleCount, Math.floor((width * height) / 18000))
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() * 2 - 1) * baseSpeed,
      speedY: (Math.random() * 2 - 1) * baseSpeed,
      color: particleColor,
    }))
  }, [particleCount, baseSpeed, particleColor])

  // Mouse event handlers
  useEffect(() => {
    if (!enableMouseInteraction) return

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.x, y: e.y }
    }

    const handleMouseOut = () => {
      mouseRef.current = {}
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseout', handleMouseOut)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseout', handleMouseOut)
    }
  }, [enableMouseInteraction])

  // Draw frame callback
  const drawFrame = useCallback(({ ctx, width, height }: AnimationFrameContext) => {
    // Initialize particles if needed
    if (particlesRef.current.length === 0) {
      initParticles(width, height)
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const particles = particlesRef.current
    const mouse = mouseRef.current

    // Update and draw particles
    for (const p of particles) {
      // Bounce off edges
      if (p.x > width || p.x < 0) p.speedX = -p.speedX
      if (p.y > height || p.y < 0) p.speedY = -p.speedY

      // Move particle
      p.x += p.speedX
      p.y += p.speedY

      // Mouse interaction
      if (enableMouseInteraction && mouse.x !== undefined && mouse.y !== undefined) {
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < mouseRadius) {
          const force = (mouseRadius - distance) / mouseRadius
          p.x -= (dx / distance) * force * 2
          p.y -= (dy / distance) * force * 2
        }
      }

      // Draw particle
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw connections
    if (enableConnections) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxLinkDistance) {
            const opacity = (1 - distance / maxLinkDistance) * 0.4
            ctx.strokeStyle = `rgba(99, 210, 255, ${opacity})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }
  }, [initParticles, maxLinkDistance, enableConnections, enableMouseInteraction, mouseRadius])

  return useAnimationFrame(canvasRef, drawFrame, animationOptions)
}

// ============ Starfield Hook ============

export interface UseStarfieldOptions extends UseAnimationFrameOptions {
  /** Number of stars (default: auto based on screen size) */
  starCount?: number
  /** Include moon (default: true) */
  showMoon?: boolean
  /** Moon phase (0-1, 0.5 = full moon) */
  moonPhase?: number
}

/**
 * Hook for starfield/night sky animations
 */
export function useStarfield(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: UseStarfieldOptions = {}
) {
  const { starCount, showMoon = true, moonPhase = 0.5, ...animationOptions } = options

  const drawFrame = useCallback(
    ({ ctx, width, height, time }: AnimationFrameContext) => {
      const effectiveStarCount = starCount ?? (width < 640 ? 50 : width < 1024 ? 65 : 80)

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, 'rgba(10, 8, 24, 1)')
      gradient.addColorStop(0.5, 'rgba(20, 15, 45, 1)')
      gradient.addColorStop(1, 'rgba(8, 12, 30, 1)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Stars
      for (let i = 0; i < effectiveStarCount; i++) {
        const x = (Math.sin(time * 0.3 + i * 1.5) * 0.5 + 0.5) * width
        const y = (Math.cos(time * 0.2 + i * 0.9) * 0.5 + 0.5) * height
        const opacity = 0.15 + Math.sin(time * 2 + i) * 0.1
        const hue = 180 + Math.sin(time + i) * 30

        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${hue}, 70%, 80%, ${opacity})`
        ctx.fill()
      }

      // Moon
      if (showMoon) {
        const moonX = width * (0.7 + moonPhase * 0.2)
        const moonY = height * (0.15 + Math.abs(moonPhase - 0.5) * 0.1)
        const baseRadius = width < 640 ? 40 : 60
        const moonRadius = baseRadius + Math.sin(time) * 5

        // Moon glow
        const glowIntensity = 0.1 + (1 - Math.abs(moonPhase - 0.5) * 2) * 0.15
        const moonGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius * 2)
        moonGradient.addColorStop(0, `rgba(168, 237, 234, ${glowIntensity})`)
        moonGradient.addColorStop(0.5, `rgba(168, 237, 234, ${glowIntensity * 0.3})`)
        moonGradient.addColorStop(1, 'transparent')

        ctx.beginPath()
        ctx.arc(moonX, moonY, moonRadius * 2, 0, Math.PI * 2)
        ctx.fillStyle = moonGradient
        ctx.fill()

        // Moon body
        ctx.beginPath()
        ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220, 240, 250, ${0.85 + Math.sin(time * 0.5) * 0.1})`
        ctx.fill()
      }
    },
    [starCount, showMoon, moonPhase]
  )

  return useAnimationFrame(canvasRef, drawFrame, animationOptions)
}
