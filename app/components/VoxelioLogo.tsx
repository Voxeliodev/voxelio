"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VoxelioLogo() {
  // We'll store the theme string instead of just a boolean
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    // Read the theme that the server set on <html>
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme);
  }, []);

  // Determine which image to show based on the theme
  let logoSrc = "/voxelio-logo.png"; // Default
  if (theme === "halloween") logoSrc = "/voxelio-halloween.png";
  if (theme === "christmas") logoSrc = "/voxelio-christmas.png";

  return (
    <Link href="/" className="flex items-center gap-2">
      <img
        src={logoSrc}
        alt="Voxelio Logo"
        className="h-16 w-auto object-contain transition-all duration-300"
        style={{
          filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.5))"
        }}
      />
    </Link>
  );
}