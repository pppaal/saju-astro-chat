import { useCallback } from 'react'

/**
 * Toast 알림 관리
 *
 * @returns showToast - Toast를 표시하는 함수
 *
 * @example
 * const showToast = useToast();
 *
 * showToast('저장되었습니다!', 'success');
 */
export function useToast() {
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3000) => {
      const container =
        document.querySelector('.toast-container') ||
        (() => {
          const div = document.createElement('div')
          div.className = 'toast-container'
          document.body.appendChild(div)
          return div
        })()

      const toast = document.createElement('div')
      toast.className = `toast ${type}`

      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
      }

      toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
      `

      container.appendChild(toast)

      // 애니메이션을 위한 지연
      requestAnimationFrame(() => {
        toast.classList.add('show')
      })

      // 자동 제거
      setTimeout(() => {
        toast.classList.remove('show')
        setTimeout(() => toast.remove(), 300)
      }, duration)

      return toast
    },
    []
  )

  return showToast
}
