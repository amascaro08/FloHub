import { useEffect, useState } from "react";
import { useUser } from "@stackframe/stack";

export default function ClientSideCheck(props: any) {
  const user = useUser(); // ✅ must always be top-level
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || props.isLoading) return <div>Loading...</div>;

  return <props.Component {...props.pageProps} />;
}
