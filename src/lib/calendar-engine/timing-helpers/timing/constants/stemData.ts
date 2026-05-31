/**
 * stemData.ts - 천간 데이터
 *
 * 천간의 오행/음양/이름은 saju/constants 의 정본(STEMS)을 단일 소스로 삼고,
 * 여기서는 타이밍 레이어가 쓰는 형태(이름키 Record + camelCase yinYang)로
 * 변환만 한다. 값을 다시 적지 않으므로 정본과 절대 갈라지지 않는다.
 */

import { STEMS as CANON_STEMS } from '@/lib/saju/constants';
import type { StemInfo } from '../types';

export const STEMS: Record<string, StemInfo> = Object.fromEntries(
  CANON_STEMS.map((s): [string, StemInfo] => [
    s.name,
    { name: s.name, element: s.element, yinYang: s.yin_yang },
  ])
);
