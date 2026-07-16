import localFont from "next/font/local";

export const ppNeueMontreal = localFont({
  src: [
    {
      path: "../assets/fonts/pp-neue-montreal/PPNeueMontreal-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/pp-neue-montreal/PPNeueMontreal-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/pp-neue-montreal/PPNeueMontreal-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-pp-neue-montreal",
  display: "swap",
  preload: true,
  fallback: ["Arial", "sans-serif"],
});

export const fedro = localFont({
  src: [
    {
      path: "../assets/fonts/fedro/Fedro-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/fedro/Fedro-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-fedro",
  display: "swap",
  preload: false,
  fallback: ["Arial", "sans-serif"],
});