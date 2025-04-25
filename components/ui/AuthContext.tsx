import { createContext, useContext, ReactNode, useState } from "react";
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
  const [isLocked, setIsLocked] = useState(false);

  const login = () => signIn("google");
  const logout = () => signOut();
  const toggleLock = () => setIsLocked(!isLocked);

  return (
    <AuthContext.Provider value={{ user: session?.user || null, login, logout, isLocked, toggleLock }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
