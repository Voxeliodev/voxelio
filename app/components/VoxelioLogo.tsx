"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VoxelioLogo() {
  const [isHalloween, setIsHalloween] = useState(false);

  useEffect(() => {
    // Read the theme that the server set on <html>
    const theme = document.documentElement.getAttribute("data-theme");
    setIsHalloween(theme === "halloween");
  }, []);

  return (
    <Link href="/" className="flex items-center gap-2">
      <img
        src={isHalloween ? "/voxelio-halloween.png" : "/voxelio-logo.png"}
        alt="Voxelio Logo"
        className="h-16 w-auto object-contain transition-all duration-300"
        style={{
          filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.5))"
        }}
      />
    </Link>
  );
}