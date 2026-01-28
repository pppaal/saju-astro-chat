"use client";

import Script from "next/script";
import { useConsent } from "@/contexts/ConsentContext";

const CLARITY_ID_RE = /^[a-z0-9]+$/i;

export function MicrosoftClarity({ clarityId, nonce }: { clarityId: string; nonce?: string }) {
  const { status } = useConsent();
  const consentGranted = status === "granted";

  if (!clarityId || !consentGranted || !CLARITY_ID_RE.test(clarityId)) {return null;}

  return (
    <Script
      id="microsoft-clarity"
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarityId}");
        `,
      }}
    />
  );
}
