import { describe, expect, it } from 'vitest'

import { HOME_CORE_SERVICE_OPTIONS, filterMyJourneyCoreServices } from '@/lib/coreServices'

describe('coreServices', () => {
  it('includes only the 6 core services in home options', () => {
    const paths = HOME_CORE_SERVICE_OPTIONS.map((option) => option.path)
    expect(paths).toEqual([
      '/destiny-map',
      '/calendar',
      '/tarot',
      '/destiny-map/matrix',
      '/compatibility',
      '/report',
    ])
  })

  it('filters myjourney services to the 6 core service ids', () => {
    const services = ['premium-reports', 'destiny-matrix', 'tarot', 'unknown'] as const
    const filtered = filterMyJourneyCoreServices(services)
    expect(filtered).toEqual(['premium-reports', 'destiny-matrix', 'tarot'])
  })
})
