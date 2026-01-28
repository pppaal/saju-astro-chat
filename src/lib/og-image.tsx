import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

interface OgImageOptions {
  title: string;
  subtitle?: string;
  emoji?: string;
}

export function generateOgImage({ title, subtitle, emoji }: OgImageOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {emoji && (
          <div style={{ fontSize: 80, marginBottom: 20 }}>{emoji}</div>
        )}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            maxWidth: "80%",
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 28,
              color: "#a78bfa",
              marginTop: 16,
              textAlign: "center",
              maxWidth: "70%",
            }}
          >
            {subtitle}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 24,
            color: "#9ca3af",
          }}
        >
          DestinyPal
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
