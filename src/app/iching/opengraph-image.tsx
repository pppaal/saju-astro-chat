import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "DestinyPal I Ching";

export default function OgImage() {
  return generateOgImage({
    title: "AI I Ching Divination",
    subtitle: "Ancient wisdom of the 64 hexagrams meets modern AI",
    emoji: "\uD83D\uDD2E",
  });
}
