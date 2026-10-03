import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthHydrator from "./AuthHydrator";
import { SITE_THEME } from "../lib/theme-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ===== Basic Metadata =====
  title: {
    default: "Voxelio — Build, play, and share worlds",
    template: "%s | Voxelio",
  },
  description:
    "Build worlds, play with friends, and share your creations. Voxelio is a voxel-based universe with avatars, worlds, and endless possibilities.",
  keywords: ["Voxelio", "voxel", "worlds", "avatars", "games", "build", "play"],

  // ===== Icons =====
  icons: {
    icon: "/favicon.ico",
  },

  // ===== Open Graph (Discord, Facebook, iMessage, Slack, LinkedIn) =====
  openGraph: {
    type: "website",
    url: "https://voxelio.vercel.app",
    siteName: "Voxelio",
    title: "Voxelio — Build, play, and share worlds",
    description:
      "Build worlds, play with friends, and share your creations. Voxelio is a voxel-based universe with avatars, worlds, and endless possibilities.",
    images: [
      {
        url: "https://voxelio.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Voxelio — Build, play, and share worlds",
      },
    ],
  },

  // ===== Twitter / X Card =====
  twitter: {
    card: "summary_large_image",
    title: "Voxelio — Build, play, and share worlds",
    description:
      "Build worlds, play with friends, and share your creations. Voxelio is a voxel-based universe with avatars, worlds, and endless possibilities.",
    images: ["https://voxelio.vercel.app/og-image.png"],
  },

  // ===== Metadata Base (resolves relative URLs) =====
  metadataBase: new URL("https://voxelio.vercel.app"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // 👇 Read the global theme flag on the server
  const isHalloween = SITE_THEME === "halloween";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // 👇 Server-rendered theme attribute — no JS, no flash, no toggle
      data-theme={isHalloween ? "halloween" : undefined}
    >
      <body className="min-h-full flex flex-col">
        <AuthHydrator>{children}</AuthHydrator>
      </body>
    </html>
  );
}