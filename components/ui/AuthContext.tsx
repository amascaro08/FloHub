import { createContext, useContext, ReactNode, useState, useEffect } from "react";

type User = {
  id: string;
  email: string;
  name?: string;
} | null;

type AuthContextType = {
  user: User;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>; // Add signup to AuthContextType
  isLocked: boolean;
  toggleLock: () => void;
  status: "loading" | "authenticated" | "unauthenticated";
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  signup: async () => {}, // Add signup to default context value
  isLocked: false,
  toggleLock: () => {},
  status: "unauthenticated"
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [isLocked, setIsLocked] = useState(false);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        throw new Error('Session check failed');
      }
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setStatus("authenticated");
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setStatus("unauthenticated");
      }
    } catch (error) {
      console.error("Session check error:", error);
      setUser(null);
      setIsAuthenticated(false);
      setStatus("unauthenticated");
    } finally {
      setIsLoading(false);
    }
  };

  // Check session on mount
  useEffect(() => {
    checkSession();
    loadLockState();
  }, []);

  const loadLockState = () => {
    try {
      if (typeof window !== 'undefined') {
        const savedLockState = localStorage.getItem('isLocked');
        if (savedLockState !== null) {
          setIsLocked(savedLockState === 'true');
        }
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      setIsAuthenticated(true);
      setStatus("authenticated");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      setUser(null);
      setIsAuthenticated(false);
      setStatus("unauthenticated");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLock = () => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('isLocked', String(newLockState));
      }
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    signup: async (email: string, password: string) => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Signup failed');
        }

        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
        setStatus("authenticated");
      } catch (error) {
        console.error("Signup error:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    isLocked,
    toggleLock,
    status
  };

  console.log("AuthContext providing value:", value);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
