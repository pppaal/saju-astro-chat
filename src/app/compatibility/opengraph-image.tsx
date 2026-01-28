import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "DestinyPal Compatibility Analysis";

export default function OgImage() {
  return generateOgImage({
    title: "AI Compatibility Analysis",
    subtitle: "Discover your relationship dynamics with AI insights",
    emoji: "\uD83D\uDC95",
  });
}
