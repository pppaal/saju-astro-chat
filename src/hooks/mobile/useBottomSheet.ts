import { useEffect, useState, useCallback } from 'react'

/**
 * Bottom Sheet 관리
 *
 * @returns [isOpen, open, close] - 상태와 제어 함수들
 *
 * @example
 * const [isOpen, openSheet, closeSheet] = useBottomSheet();
 *
 * return (
 *   <>
 *     <button onClick={openSheet}>Open</button>
 *     {isOpen && <BottomSheet onClose={closeSheet}>...</BottomSheet>}
 *   </>
 * )
 */
export function useBottomSheet(): [boolean, () => void, () => void] {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => {
    setIsOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    document.body.style.overflow = ''
  }, [])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return [isOpen, open, close]
}
