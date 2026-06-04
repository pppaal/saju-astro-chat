/**
 * destinypal shell barrel — 4-tier 줌 컨트롤러 + chrome.
 *
 * 사용 예:
 *   import { DestinypalShell } from '@/components/destinypal/shell'
 *
 * Phase B 는 4-tier (life / year / month / day).
 * Decade 는 Phase C 에서 5-tier 로 확장 — TIER 메타 + scrollRefs 추가만 필요.
 */

export { DestinypalShell, DESTINYPAL_TIERS } from './DestinypalShell'
export type {
  DestinypalShellProps,
  DestinypalTierMeta,
  DestinypalTierRenderArgs,
} from './DestinypalShell'

export { DestinypalTopbar } from './DestinypalTopbar'
export type { DestinypalTopbarProps } from './DestinypalTopbar'

export { DestinypalRail } from './DestinypalRail'
export type { DestinypalRailProps, DestinypalRailStop } from './DestinypalRail'

export { Starfield } from './Starfield'
export type { StarfieldHandle } from './Starfield'
