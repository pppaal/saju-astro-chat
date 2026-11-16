# `(seo)` route group

Evergreen, English-only SEO landing pages that must **not** inherit a parent
segment's `layout.tsx` / `loading.tsx`.

Why: a `loading.tsx` above a page wraps it in a Suspense boundary, so the HTML
shell streams with status 200 before the page runs. `notFound()` then becomes a
soft 404 (200 + noindex) and `permanentRedirect()` becomes a 200 with a
`<meta http-equiv="refresh">` instead of a real 308. Crawlers prefer the real
status codes, so these families live here and get only the root layout.

Routes are unchanged (a route group adds nothing to the URL):

- `(seo)/compatibility/signs` → `/compatibility/signs`, `/compatibility/signs/<a>-<b>`

Pages here emit their own metadata and JSON-LD (WebPage/BreadcrumbList/FAQPage).
