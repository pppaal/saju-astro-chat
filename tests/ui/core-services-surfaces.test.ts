import { describe, expect, it } from 'vitest'
import { coreServiceKeys, HOME_CORE_SERVICE_OPTIONS } from '@/lib/coreServices'

describe('core service visibility surfaces', () => {
  it('home discovery service options include only the 6 core services', () => {
    expect(HOME_CORE_SERVICE_OPTIONS).toHaveLength(6)
    expect(HOME_CORE_SERVICE_OPTIONS.map((service) => service.coreKey)).toEqual([
      ...coreServiceKeys,
    ])
  })
})
