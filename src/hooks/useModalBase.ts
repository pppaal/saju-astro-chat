/**
 * Modal Base Hook
 * Consolidates duplicate modal logic across 6+ modal components
 *
 * Common patterns consolidated:
 * - Escape key handling
 * - Body scroll lock
 * - Focus trap
 * - Overlay click handling
 * - Animation state management
 */

import { useEffect, useRef, useCallback, useState } from 'react'

// ============ Types ============

export interface UseModalBaseOptions {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Enable focus trap (default: true) */
  enableFocusTrap?: boolean
  /** Enable escape key close (default: true) */
  enableEscapeClose?: boolean
  /** Enable body scroll lock (default: true) */
  enableScrollLock?: boolean
  /** Animation duration in ms (default: 300) */
  animationDuration?: number
  /** Initial focus ref */
  initialFocusRef?: React.RefObject<HTMLElement>
}

export interface UseModalBaseReturn {
  /** Ref to attach to modal container for focus trap */
  modalRef: React.RefObject<HTMLDivElement | null>
  /** Whether animation is active (for CSS transitions) */
  isAnimating: boolean
  /** Whether modal should be in DOM */
  isVisible: boolean
  /** Handler for overlay click */
  handleOverlayClick: (e: React.MouseEvent) => void
  /** Handler to stop propagation for modal content click */
  handleContentClick: (e: React.MouseEvent) => void
  /** ARIA props for dialog */
  ariaProps: {
    role: 'dialog'
    'aria-modal': true
  }
}

// ============ Main Hook ============

/**
 * Base hook for modal functionality
 *
 * @example
 * function MyModal({ isOpen, onClose }) {
 *   const {
 *     modalRef,
 *     isAnimating,
 *     isVisible,
 *     handleOverlayClick,
 *     handleContentClick,
 *     ariaProps,
 *   } = useModalBase({ isOpen, onClose })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <div
 *       className={`overlay ${isAnimating ? 'visible' : ''}`}
 *       onClick={handleOverlayClick}
 *       {...ariaProps}
 *     >
 *       <div ref={modalRef} onClick={handleContentClick}>
 *         Modal content
 *       </div>
 *     </div>
 *   )
 * }
 */
export function useModalBase(options: UseModalBaseOptions): UseModalBaseReturn {
  const {
    isOpen,
    onClose,
    enableFocusTrap = true,
    enableEscapeClose = true,
    enableScrollLock = true,
    animationDuration = 300,
    initialFocusRef,
  } = options

  const modalRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Use requestAnimationFrame for smooth animation start
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true)
        })
      })
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, animationDuration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, animationDuration])

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !enableEscapeClose) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, enableEscapeClose])

  // Body scroll lock
  useEffect(() => {
    if (!enableScrollLock) return

    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen, enableScrollLock])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !enableFocusTrap) return

    // Set initial focus
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus()
    } else {
      // Focus first focusable element
      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusableElements?.[0]?.focus()
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen, enableFocusTrap, initialFocusRef])

  // Click handlers
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return {
    modalRef,
    isAnimating,
    isVisible,
    handleOverlayClick,
    handleContentClick,
    ariaProps: {
      role: 'dialog',
      'aria-modal': true,
    },
  }
}

// ============ Simple Modal Hook ============

/**
 * Simple hook for basic modal open/close state
 * Previously duplicated in multiple components
 */
export function useModalState(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, open, close, toggle, setIsOpen }
}

// ============ Confirm Dialog Hook ============

export interface UseConfirmDialogOptions {
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
}

export interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  type: 'danger' | 'warning' | 'info'
  confirmText: string
  cancelText: string
}

/**
 * Hook for managing confirm dialog state
 *
 * @example
 * const { dialogState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog()
 *
 * // Show dialog
 * showConfirm({
 *   title: 'Delete item?',
 *   message: 'This action cannot be undone.',
 *   type: 'danger',
 *   onConfirm: () => deleteItem(id),
 * })
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  })

  const confirmCallbackRef = useRef<(() => void | Promise<void>) | undefined>(undefined)
  const cancelCallbackRef = useRef<(() => void) | undefined>(undefined)

  const showConfirm = useCallback(
    (options: {
      title: string
      message: string
      type?: 'danger' | 'warning' | 'info'
      confirmText?: string
      cancelText?: string
      onConfirm?: () => void | Promise<void>
      onCancel?: () => void
    }) => {
      confirmCallbackRef.current = options.onConfirm
      cancelCallbackRef.current = options.onCancel

      setDialogState({
        isOpen: true,
        title: options.title,
        message: options.message,
        type: options.type || 'info',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
      })
    },
    []
  )

  const handleConfirm = useCallback(async () => {
    await confirmCallbackRef.current?.()
    setDialogState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleCancel = useCallback(() => {
    cancelCallbackRef.current?.()
    setDialogState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return {
    dialogState,
    showConfirm,
    handleConfirm,
    handleCancel,
  }
}
