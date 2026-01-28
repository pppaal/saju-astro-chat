import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "DestinyPal Saju Analysis";

export default function OgImage() {
  return generateOgImage({
    title: "AI Saju Analysis",
    subtitle: "Korean Four Pillars destiny reading powered by AI",
    emoji: "\u2615",
  });
}
