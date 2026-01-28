import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "DestinyPal Tarot Reading";

export default function OgImage() {
  return generateOgImage({
    title: "AI Tarot Reading",
    subtitle: "Discover your path with AI-powered tarot insights",
    emoji: "\uD83C\uDCCF",
  });
}
