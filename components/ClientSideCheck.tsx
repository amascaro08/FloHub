import { useEffect, useState } from "react";
import { useUser } from "@stackframe/stack";

function AuthenticatedApp(props: any) {
  const user = useUser(); // Call the hook here, only after client-side mount

  if (props.isLoading) {
    return <div>Loading...</div>;
  }

  return <props.Component {...props.pageProps} />;
}

export default function ClientSideCheck(props: any) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || props.isLoading) {
    return <div>Loading...</div>;
  }

  return <AuthenticatedApp {...props} />;
}
