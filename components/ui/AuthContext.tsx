import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

type AuthContextType = {
  user: Session["user"] | null;
  login: (provider?: string) => void;
  logout: () => void;
  isLocked: boolean;
  toggleLock: () => void;
  status: "loading" | "authenticated" | "unauthenticated"; // Add status to context type
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLocked: false,
  toggleLock: () => {},
  status: "unauthenticated", // Default status
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const sessionHookResult = useSession();
  const session = sessionHookResult?.data ? sessionHookResult.data : null;
  const status = sessionHookResult?.status || "unauthenticated"; // Default to "unauthenticated" if hook result is undefined

  // Initialize state from localStorage, default to false if not found
  const [isLocked, setIsLocked] = useState<boolean>(false); // Default to false initially

  console.log("AuthContext status:", status);
  if (status === 'loading') {
    console.log("AuthContext is loading...");
    return <div>Loading...</div>; // Or any other fallback UI
  }
  
  // Load lock state from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') { // Check if window is defined (client-side)
        const savedLockState = localStorage.getItem('isLocked');
        if (savedLockState !== null) {
          setIsLocked(savedLockState === 'true');
        }
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
  }, []);

  // Save lock state to localStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') { // Check if window is defined (client-side)
        localStorage.setItem('isLocked', String(isLocked));
      }
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  }, [isLocked]);


  const login = (provider?: string) => {
    if (provider === "google") {
      signIn("google");
    } else if (provider === "credentials") {
      signIn("credentials");
    } else {
      // If no provider is specified, redirect to the login page
      window.location.href = "/login";
    }
  };
  const logout = () => signOut();
  const toggleLock = () => {
    setIsLocked(!isLocked);
  };
  
  console.log("AuthContext providing value:", { user: session?.user || null, login, logout, isLocked, toggleLock, status });
  return (
    <AuthContext.Provider value={{ user: session?.user || null, login, logout, isLocked, toggleLock, status }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
