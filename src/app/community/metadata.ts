import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community",
  description: "Join the Destiny Tracker community. Share your tarot readings, astrology insights, and connect with fellow seekers.",
  keywords: ["community", "tarot community", "astrology forum", "destiny sharing", "fortune telling community"],
  openGraph: {
    title: "Community | Destiny Tracker",
    description: "Join the Destiny Tracker community. Share your tarot readings, astrology insights, and connect with fellow seekers.",
    type: "website",
    images: [
      {
        url: "/og-community.png",
        width: 1200,
        height: 630,
        alt: "Destiny Tracker Community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Community | Destiny Tracker",
    description: "Join the Destiny Tracker community. Share your tarot readings, astrology insights, and connect with fellow seekers.",
    images: ["/og-community.png"],
  },
};
