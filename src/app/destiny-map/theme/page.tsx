import { Suspense } from 'react'
import ThemeSelectClient from './ThemeSelectClient'
import LoadingTimeout from '@/components/ui/LoadingTimeout'

export default function ThemePage() {
  return (
    <Suspense
      fallback={<LoadingTimeout timeoutMs={10000} loadingText="Loading theme selector..." />}
    >
      <ThemeSelectClient />
    </Suspense>
  )
}
