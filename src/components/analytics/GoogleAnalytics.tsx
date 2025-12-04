"use client";

import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gaId) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Send pageview with custom URL
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("config", gaId, {
        page_path: url,
      });
    }
  }, [pathname, searchParams, gaId]);

  if (!gaId) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

// Helper function to track custom events
export const trackEvent = (
  eventName: string,
  params?: Record<string, any>
) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
};

// Pre-defined event trackers
export const analytics = {
  // User interactions
  login: () => trackEvent("login"),
  signup: () => trackEvent("sign_up"),
  logout: () => trackEvent("logout"),

  // Content engagement
  likePost: (postId: string) =>
    trackEvent("like_post", { post_id: postId }),
  unlikePost: (postId: string) =>
    trackEvent("unlike_post", { post_id: postId }),
  commentPost: (postId: string) =>
    trackEvent("comment", { post_id: postId }),
  sharePost: (postId: string) =>
    trackEvent("share", { post_id: postId }),
  bookmarkPost: (postId: string) =>
    trackEvent("bookmark", { post_id: postId }),

  // Reading/Fortune features
  generateDestinyMap: () =>
    trackEvent("generate_destiny_map"),
  viewAstrology: () =>
    trackEvent("view_astrology"),
  drawTarot: (category: string) =>
    trackEvent("draw_tarot", { category }),
  checkSaju: () =>
    trackEvent("check_saju"),

  // Search and discovery
  search: (query: string) =>
    trackEvent("search", { search_term: query }),
  filterCategory: (category: string) =>
    trackEvent("filter_category", { category }),

  // Conversion
  viewPricing: () =>
    trackEvent("view_pricing"),
  startTrial: () =>
    trackEvent("begin_checkout"),
};
