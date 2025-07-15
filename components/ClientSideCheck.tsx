import { useEffect, useState } from "react";
import { useUser } from "@stackframe/react";

export default function ClientSideCheck(props: any) {
  const [mounted, setMounted] = useState(false);
  const [userSafe, setUserSafe] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        const u = useUser();
        setUserSafe(u ?? {});
      } catch (e) {
        console.error("Failed to get user:", e);
        setUserSafe({});
      }
    }
  }, [mounted]);

  if (!mounted || props.isLoading) return <div>Loading...</div>;

  return <props.Component {...props.pageProps} />;
}
