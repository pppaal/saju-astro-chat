import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "DestinyPal Numerology";

export default function OgImage() {
  return generateOgImage({
    title: "AI Numerology Analysis",
    subtitle: "Discover the hidden power of your numbers",
    emoji: "\uD83D\uDD22",
  });
}
