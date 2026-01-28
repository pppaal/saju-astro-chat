import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "DestinyPal Destiny Map";

export default function OgImage() {
  return generateOgImage({
    title: "AI Destiny Map",
    subtitle: "Your comprehensive life blueprint powered by AI",
    emoji: "\uD83D\uDDFA\uFE0F",
  });
}
