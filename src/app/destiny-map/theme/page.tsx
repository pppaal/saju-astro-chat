import { Suspense } from 'react'
import ThemeSelectClient from './ThemeSelectClient'
import BrandSplash from '@/components/branding/BrandSplash'

export default function ThemePage() {
  return (
    <Suspense fallback={<BrandSplash />}>
      <ThemeSelectClient />
    </Suspense>
  )
}
