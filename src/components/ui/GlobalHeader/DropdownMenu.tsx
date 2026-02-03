'use client'

import { useCallback } from 'react'
import { styles } from './styles'
import type { MenuItem, DropdownMenuItemProps } from './types'

/**
 * Individual dropdown menu item component
 */
export function DropdownMenuItem({
  index,
  focusedIndex,
  item,
  menuItemsRef,
}: DropdownMenuItemProps) {
  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      if (el) {
        menuItemsRef.current[index] = el
      }
    },
    [index, menuItemsRef]
  )

  const variantStyles = item.variant === 'blue' ? styles.blueButton : styles.redButton

  return (
    <button
      ref={setRef}
      role="menuitem"
      tabIndex={focusedIndex === index ? 0 : -1}
      onClick={item.onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
        text-sm font-medium cursor-pointer hover:-translate-y-0.5
        focus-visible:outline-none ${styles.buttonBase} ${variantStyles}`}
    >
      {item.icon}
      {item.label}
    </button>
  )
}

interface DropdownMenuProps {
  items: MenuItem[]
  focusedIndex: number
  menuItemsRef: React.RefObject<HTMLButtonElement[]>
}

/**
 * Dropdown menu container component
 */
export function DropdownMenu({ items, focusedIndex, menuItemsRef }: DropdownMenuProps) {
  return (
    <div
      id="user-menu"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="user-menu-button"
      className="absolute top-[calc(100%+8px)] right-0 min-w-[160px]
        bg-slate-900/95 backdrop-blur-xl border border-blue-400/20
        rounded-2xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        z-[9999] flex flex-col gap-1"
    >
      {items.map((item, index) => (
        <DropdownMenuItem
          key={item.id}
          index={index}
          focusedIndex={focusedIndex}
          item={item}
          menuItemsRef={menuItemsRef}
        />
      ))}
    </div>
  )
}
