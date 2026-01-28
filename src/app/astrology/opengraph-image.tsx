import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "DestinyPal Astrology Chart";

export default function OgImage() {
  return generateOgImage({
    title: "AI Astrology Chart",
    subtitle: "Birth chart analysis with advanced Western astrology",
    emoji: "\u2728",
  });
}
