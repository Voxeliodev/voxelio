"use client";

import { useEffect, useState } from "react";
import { hydrateAuth } from "../lib/auth";

export default function AuthHydrator({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateAuth().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: 60, textAlign: "center", fontFamily: "sans-serif" }}>
        Loading Voxelio…
      </div>
    );
  }
  return <>{children}</>;
}