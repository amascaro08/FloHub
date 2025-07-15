import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { useUser } from "@stackframe/react";

// Accepts { Component, pageProps, isLoading }
export default function ClientSideCheck(props: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only call useUser after mount, on client
  // (avoids server-side rendering error)
  const user = mounted ? useUser() : undefined;

  if (props.isLoading) return <div>Loading...</div>;

  // Optionally: You can check user status here, or just pass down
  return <props.Component {...props.pageProps} />;
}
