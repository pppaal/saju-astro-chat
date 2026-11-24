/**
 * 오행 → 색 클래스(IntegratedReport.module.css 의 .elWood 등). CSS 모듈 의존이라
 * 순수 라벨 사전(@/lib/report/integratedReportLabels)과 분리해 components 쪽에 둔다.
 */
import s from './IntegratedReport.module.css'

export const elClass: Record<string, string> = {
  wood: s.elWood,
  fire: s.elFire,
  earth: s.elEarth,
  metal: s.elMetal,
  water: s.elWater,
}
