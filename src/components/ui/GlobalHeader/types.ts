/**
 * Type definitions for GlobalHeader components
 */

import type { ReactNode } from 'react'

export interface MenuItem {
  id: string
  label: string
  icon: ReactNode
  variant: 'blue' | 'red'
  onClick: () => void
}

export interface HeaderWrapperProps {
  children: ReactNode
  headerRef?: React.RefObject<HTMLDivElement | null>
  onKeyDown?: (e: React.KeyboardEvent) => void
  ariaLabel: string
}

export interface DropdownMenuItemProps {
  index: number
  focusedIndex: number
  item: MenuItem
  menuItemsRef: React.RefObject<HTMLButtonElement[]>
}
