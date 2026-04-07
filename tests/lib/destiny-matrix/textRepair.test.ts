import { describe, expect, it } from 'vitest'

import { repairPossiblyMojibakeText } from '@/lib/destiny-matrix/textRepair'

describe('repairPossiblyMojibakeText', () => {
  it('repairs utf8 text that was decoded as latin1', () => {
    expect(repairPossiblyMojibakeText('ì»¤ë¦¬ì–´')).toBe('커리어')
    expect(repairPossiblyMojibakeText('ê´€ê³„')).toBe('관계')
  })

  it('leaves already-correct korean text unchanged', () => {
    expect(repairPossiblyMojibakeText('건강')).toBe('건강')
    expect(repairPossiblyMojibakeText('지금은 검토 우선입니다.')).toBe('지금은 검토 우선입니다.')
  })
})
