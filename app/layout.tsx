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
  title: "Voxelio",
  description: "Build, play, and share worlds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // 👇 Read the global theme flag on the server
  const isHalloween = SITE_THEME === "halloween";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme={isHalloween ? "halloween" : undefined}
    >
      <body className="min-h-full flex flex-col">
        <AuthHydrator>{children}</AuthHydrator>
      </body>
    </html>
  );
}