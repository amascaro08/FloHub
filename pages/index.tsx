// pages/index.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;           // wait
    if (status === "authenticated") {
      router.replace("/dashboard");             // go to your main app
    } else {
      router.replace("/api/auth/signin");       // go to NextAuth sign‑in
    }
  }, [status, router]);

  return null;  // nothing to render while redirecting
}
