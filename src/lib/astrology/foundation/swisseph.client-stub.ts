// Browser stub for the native `swisseph` package.
// Turbopack statically traces ephe.ts's `require('swisseph')` into the
// client dependency graph even though getSwisseph() guards on `window`;
// this stub resolves the import without pulling the native .node binding.
// Any actual property access from a client bundle throws loud — but in
// practice getSwisseph() throws first, so this is defense-in-depth.

const stub = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(
        `swisseph is server-only; client bundle reached property "${String(prop)}"`
      )
    },
  }
)

export default stub
export { stub }
