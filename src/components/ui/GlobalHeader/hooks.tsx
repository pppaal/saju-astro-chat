'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { JourneyIcon, LogoutIcon } from './icons'
import type { MenuItem } from './types'

/**
 * Hook for managing dropdown menu state and keyboard navigation
 */
export function useDropdownMenu() {
  const { t } = useI18n()
  const router = useRouter()

  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuItemsRef = useRef<HTMLButtonElement[]>([])

  // Dynamic menu items
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        id: 'myjourney',
        label: t('nav.myJourney') || 'My Journey',
        icon: <JourneyIcon />,
        variant: 'blue',
        onClick: () => {
          setShowDropdown(false)
          router.push('/myjourney')
        },
      },
      {
        id: 'logout',
        label: t('community.logout') || 'Logout',
        icon: <LogoutIcon />,
        variant: 'red',
        onClick: () => signOut({ callbackUrl: '/' }),
      },
    ],
    [t, router]
  )

  const menuItemCount = menuItems.length

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) {
      return
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setFocusedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  // Focus menu item when focusedIndex changes
  useEffect(() => {
    if (showDropdown && focusedIndex >= 0 && menuItemsRef.current[focusedIndex]) {
      menuItemsRef.current[focusedIndex].focus()
    }
  }, [focusedIndex, showDropdown])

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!showDropdown) {
      setFocusedIndex(-1)
    }
  }, [showDropdown])

  // Keyboard navigation for dropdown (WCAG 2.1 AA compliant)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShowDropdown(true)
          setFocusedIndex(0)
        }
        return
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setShowDropdown(false)
          triggerRef.current?.focus()
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % menuItemCount)
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => (prev - 1 + menuItemCount) % menuItemCount)
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(menuItemCount - 1)
          break
        case 'Tab':
          setShowDropdown(false)
          break
      }
    },
    [showDropdown, menuItemCount]
  )

  return {
    showDropdown,
    setShowDropdown,
    focusedIndex,
    dropdownRef,
    triggerRef,
    menuItemsRef,
    menuItems,
    handleKeyDown,
  }
}
