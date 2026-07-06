/* ============================================================
   캘린더 캐시 blob 코덱 — brotli 압축 래퍼
   ───────────────────────────────────────────────────────────
   CalendarBuildCache.data(월 cells)는 evidence 를 빼도 ~2.7MB 다: 31일 ×
   평균 ~180 신호 × (id·korean·english·active window …)가 셀마다 반복돼
   극도로 중복적이다. 이 blob 을 매 /calendar 로드마다 Postgres(Supabase)에서
   통째로 읽어 오는 게 웜 캐시의 최대 비용이었다(로컬 JSON.parse 는 ~9ms 인데
   2.7MB 왕복은 네트워크에서 수백 ms).

   데이터가 반복적이라 압축이 극적으로 먹힌다 — brotli q5 로 ~2.7MB → ~65KB
   (≈50×). 압축 ~22ms(콜드 write 만)·해제 ~4ms(read)로 둘 다 사소하다.

   저장 포맷: 기존 `Json` 컬럼을 그대로 쓰되(마이그레이션 불필요) 압축 바이트를
   base64 문자열로 감싼 래퍼 객체 `{ __c: 'br1', d: '<base64>' }` 로 넣는다.
   base64 세(≈+33%)를 물어도 ~87KB 로 여전히 원본의 ~1/30.

   하위 호환: 옛 행은 평문 배열(cells)/객체(natal)라 __c 태그가 없다 —
   decodeBlob 이 그대로 통과시켜 재빌드 없이 읽힌다. 엔진 버전 bump 로 자연
   교체되면 새 행은 전부 압축본이 된다.
   ============================================================ */

import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib'
import type { Prisma } from '@/lib/db/prisma'

const TAG = 'br1' as const
// q5 — 압축비(≈50×)와 속도(compress ~22ms / decompress ~4ms @ 2.7MB)의 균형점.
// q6+ 는 이득 미미(<2%)한데 압축이 느려지고, q3 은 비율이 눈에 띄게 떨어진다.
const QUALITY = 5

interface CompressedBlob {
  __c: typeof TAG
  /** base64(brotli(utf8 JSON)) */
  d: string
}

function isCompressed(v: unknown): v is CompressedBlob {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    (v as { __c?: unknown }).__c === TAG &&
    typeof (v as { d?: unknown }).d === 'string'
  )
}

/**
 * 값 → 압축 래퍼(Prisma `Json` 컬럼에 넣을 수 있는 형태).
 * 압축이 실패할 이유는 사실상 없지만, 방어적으로 실패 시 평문 JSON 그대로
 * 저장(하위 호환 경로 재사용)해 캐시 write 가 절대 throw 하지 않게 한다.
 */
export function encodeBlob(value: unknown): Prisma.InputJsonValue {
  try {
    const json = Buffer.from(JSON.stringify(value), 'utf8')
    const compressed = brotliCompressSync(json, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: json.length,
      },
    })
    return { __c: TAG, d: compressed.toString('base64') }
  } catch {
    return value as Prisma.InputJsonValue
  }
}

/**
 * `Json` 컬럼 값 → 원본. 압축 래퍼면 해제하고, 옛 평문 행(배열/객체)은 그대로
 * 통과시킨다(하위 호환). 해제 실패 시엔 저장값을 그대로 반환(fail-soft).
 */
export function decodeBlob<T>(stored: unknown): T {
  if (isCompressed(stored)) {
    const buf = brotliDecompressSync(Buffer.from(stored.d, 'base64'))
    return JSON.parse(buf.toString('utf8')) as T
  }
  return stored as T
}
