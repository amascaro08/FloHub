import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";

type AuthContextType = {
  user: Session["user"] | null;
  login: () => void;
  logout: () => void;
  isLocked: boolean;
  toggleLock: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLocked: false,
  toggleLock: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  // Initialize state from localStorage, default to false if not found
  const [isLocked, setIsLocked] = useState(() => {
    if (typeof window !== 'undefined') { // Check if window is defined (client-side)
      const savedLockState = localStorage.getItem('isLocked');
      return savedLockState === 'true';
    }
    return false; // Default to false on server-side render
  });

  // Save lock state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') { // Check if window is defined (client-side)
      localStorage.setItem('isLocked', String(isLocked));
    }
  }, [isLocked]);


  const login = () => signIn("google");
  const logout = () => signOut();
  const toggleLock = () => {
    console.log("Toggle lock called");
    setIsLocked(!isLocked);
  };

  return (
    <AuthContext.Provider value={{ user: session?.user || null, login, logout, isLocked, toggleLock }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
