import { useEffect, useState } from "react";
import { useUser } from "@stackframe/react";

export default function ClientSideCheck(props: any) {
  const [mounted, setMounted] = useState(false);
  const user = mounted ? useUser() : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || props.isLoading) return <div>Loading...</div>;

  return <props.Component {...props.pageProps} />;
}
