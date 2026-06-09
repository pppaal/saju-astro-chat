'use client'

import { usePathname } from 'next/navigation'
import BackButton from './BackButton'

// Pages that should hide the global back button
// These pages either have their own back button or custom header navigation
const PAGES_WITHOUT_BACK_BUTTON = [
  '/', // Home page - no back button needed
  '/tarot', // Tarot pages - have their own navigation
  '/compatibility', // Uses ServicePageLayout with built-in back button
  '/about', // Has custom back button in page
  '/contact', // Has custom back button in page
  '/faq', // Has custom back button in page
  '/pricing', // Has custom navigation
  '/policy', // Has custom back button in page
  '/calendar', // 캘린더(운흐름) 5-tier view — own back affordance
  '/destinypal', // legacy alias → /calendar (308 at edge)
  '/profile', // Has custom navigation
  '/auth', // Has custom header with back button
  '/destiny-counselor', // Counselor pages have their own header/back button
  '/blog', // Has custom back button
  '/success', // Has custom back button
  '/icp', // Has custom back button
  '/admin', // Admin pages - no back button needed
]

export default function BackButtonWrapper() {
  const pathname = usePathname()

  // Always hide on home page
  if (!pathname || pathname === '/') {
    return null
  }

  // Hide on pages that have their own back button or navigation
  const shouldHide = PAGES_WITHOUT_BACK_BUTTON.some((prefix) => {
    // Exact match for root pages
    if (prefix === pathname) {
      return true
    }
    // Match child routes
    if (pathname.startsWith(prefix + '/')) {
      return true
    }
    return false
  })

  if (shouldHide) {
    return null
  }
  return <BackButton />
}
