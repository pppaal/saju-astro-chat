import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { RelationHit } from '@/lib/Saju/types'

const SHINSAL_ALIASES: Array<[RegExp, string]> = [
  [/\uD654\uAC1C|華蓋/giu, '\uD654\uAC1C'],
  [/\uC5ED\uB9C8|驛馬/giu, '\uC5ED\uB9C8'],
  [/\uB3C4\uD654/giu, '\uB3C4\uD654'],
  [/\uD64D\uC5FC/giu, '\uD64D\uC5FC'],
  [/\uCC9C\uC744\uADC0\uC778/giu, '\uCC9C\uC744\uADC0\uC778'],
  [/\uD0DC\uADF9\uADC0\uC778/giu, '\uD0DC\uADF9\uADC0\uC778'],
  [/\uBB38\uCC3D\uADC0\uC778/giu, '\uBB38\uCC3D\uADC0\uC778'],
  [/\uD559\uB2F9\uADC0\uC778/giu, '\uD559\uB2F9\uADC0\uC778'],
  [/\uAE08\uC5EC\uB85D/giu, '\uAE08\uC5EC\uB85D'],
  [/\uC554\uB85D/giu, '\uC554\uB85D'],
  [/\uAC74\uB85D/giu, '\uAC74\uB85D'],
  [/\uC81C\uC655/giu, '\uC81C\uC655'],
  [/\uBC31\uD638/giu, '\uBC31\uD638'],
  [/\uB9DD\uC2E0/giu, '\uB9DD\uC2E0'],
  [/\uACE0\uC2E0/giu, '\uACE0\uC2E0'],
  [/\uAD34\uAC15/giu, '\uAD34\uAC15'],
  [/\uD604\uCE68/giu, '\uD604\uCE68'],
  [/\uADC0\uBB38\uAD00/giu, '\uADC0\uBB38\uAD00'],
  [/\uBCD1\uBD80/giu, '\uBCD1\uBD80'],
  [/\uC0C1\uBB38/giu, '\uC0C1\uBB38'],
  [/\uACF5\uB9DD/giu, '\uACF5\uB9DD'],
  [/\uC591\uC778/giu, '\uC591\uC778'],
]

function normalizeText(value: string): string {
  let next = value
  for (const [pattern, replacement] of SHINSAL_ALIASES) {
    next = next.replace(pattern, replacement)
  }
  return next.trim()
}

function normalizeShinsalList(
  shinsalList: MatrixCalculationInput['shinsalList']
): MatrixCalculationInput['shinsalList'] {
  if (!Array.isArray(shinsalList)) return shinsalList
  return shinsalList.map((item) => normalizeText(String(item))) as MatrixCalculationInput['shinsalList']
}

function normalizeRelations(
  relations: MatrixCalculationInput['relations']
): MatrixCalculationInput['relations'] {
  if (!Array.isArray(relations)) return relations
  return relations.map((relation): RelationHit => {
    if (!relation || typeof relation !== 'object') return relation
    const detail = typeof relation.detail === 'string' ? normalizeText(relation.detail) : undefined
    const note = typeof relation.note === 'string' ? normalizeText(relation.note) : undefined

    return {
      ...relation,
      detail,
      note,
    }
  })
}

export function normalizeMatrixInput(input: MatrixCalculationInput): MatrixCalculationInput {
  return {
    ...input,
    shinsalList: normalizeShinsalList(input.shinsalList),
    relations: normalizeRelations(input.relations),
  }
}
