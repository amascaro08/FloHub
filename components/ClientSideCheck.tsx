import { useEffect, useState } from "react";
import { useUser } from "@stackframe/react";

export default function ClientSideCheck(props: any) {
  const [mounted, setMounted] = useState(false);
  const user = useUser();  // Always call this!

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || props.isLoading) return <div>Loading...</div>;

  // You could redirect based on user here if you want
  // Or just render the page
  return <props.Component {...props.pageProps} />;
}
