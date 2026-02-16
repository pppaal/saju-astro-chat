import { describe, expect, it } from 'vitest'

import { HOME_CORE_SERVICE_OPTIONS, filterMyJourneyCoreServices } from '@/lib/coreServices'

describe('coreServices', () => {
  it('includes personality and icp in home service options', () => {
    const paths = HOME_CORE_SERVICE_OPTIONS.map((option) => option.path)
    expect(paths).toContain('/personality')
    expect(paths).toContain('/icp')
  })

  it('keeps personality and icp service ids in myjourney core filter', () => {
    const services = ['personality', 'personality-icp', 'icp', 'tarot', 'unknown'] as const
    const filtered = filterMyJourneyCoreServices(services)
    expect(filtered).toEqual(['personality', 'personality-icp', 'icp', 'tarot'])
  })
})
