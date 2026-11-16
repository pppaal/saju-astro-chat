/* ============================================================
   DestinypalFontsShell — the shared font shell for the hanji/ink
   "destinypal" surfaces (/calendar, /destiny). Fonts only, no metadata and
   no JSON-LD, so each route layout can emit its own WebPage schema without
   a second block leaking in from /calendar.
   ============================================================ */

import type { ReactNode } from 'react'

export default function DestinypalFontsShell({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href={
          'https://fonts.googleapis.com/css2?' +
          [
            'family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400',
            'family=Gowun+Batang:wght@400;700',
            'family=Gowun+Dodum',
            'family=IBM+Plex+Mono:wght@400;500;600',
            'display=swap',
          ].join('&')
        }
      />
      {children}
    </>
  )
}
