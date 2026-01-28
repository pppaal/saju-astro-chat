import { generateOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-image";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "DestinyPal Dream Interpretation";

export default function OgImage() {
  return generateOgImage({
    title: "AI Dream Interpretation",
    subtitle: "Unlock the meaning behind your dreams with AI",
    emoji: "\uD83C\uDF19",
  });
}
