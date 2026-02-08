/**
 * Safely serialize JSON for embedding in script tags.
 * Escapes characters that could break out of the script context.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */
function safeJsonStringify(data: unknown): string {
  return JSON.stringify(data)
    // Escape closing script tags to prevent XSS
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    // Escape Unicode line/paragraph separators (can break JS parsing)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function JsonLd({
  data,
  nonce,
}: {
  data: Record<string, unknown>
  nonce?: string
}) {
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: safeJsonStringify(data) }}
    />
  );
}
