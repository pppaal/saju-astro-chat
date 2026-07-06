/**
 * Safely serialize JSON for embedding in script tags.
 * Escapes characters that could break out of the script context.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */
function safeJsonStringify(data: unknown): string {
  return (
    JSON.stringify(data)
      // Escape closing script tags to prevent XSS
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      // Escape Unicode line/paragraph separators (can break JS parsing)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')
  )
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON-LD(application/ld+json)는 브라우저가 *실행하지 않는* 데이터 블록이라 CSP
  // script-src 대상이 아니다 → nonce 불필요. 예전엔 nonce 를 실었으나, React 19 가
  // 하이드레이션 시 nonce 를 재적용/삭제하면서 서버(nonce="")↔클라(실제 nonce)
  // 속성이 어긋나 하이드레이션 미스매치가 났다. nonce 를 아예 빼 근본 제거한다.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonStringify(data) }}
    />
  )
}
