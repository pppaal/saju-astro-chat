import { describe, expect, it } from 'vitest'
import {
  coreServiceKeys,
  HOME_CORE_SERVICE_OPTIONS,
  filterMyJourneyCoreServices,
} from '@/lib/coreServices'
import { ALL_SERVICES_ORDER } from '@/app/myjourney/history/lib/constants'

describe('core service visibility surfaces', () => {
  it('home discovery service options include only the 6 core services', () => {
    expect(HOME_CORE_SERVICE_OPTIONS).toHaveLength(6)
    expect(HOME_CORE_SERVICE_OPTIONS.map((service) => service.coreKey)).toEqual([
      ...coreServiceKeys,
    ])
  })

  it('myjourney service list includes only the 6 core services', () => {
    const visibleServices = filterMyJourneyCoreServices(ALL_SERVICES_ORDER)
    expect(visibleServices).toEqual([
      'tarot',
      'compatibility',
      'destiny-map',
      'destiny-calendar',
      'personality-icp',
      'destiny-matrix',
    ])
  })
})
