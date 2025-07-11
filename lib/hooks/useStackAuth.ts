import { useState, useEffect } from 'react';

interface StackUser {
  id: string;
  email?: string;
  // Add other user properties as needed
}

interface StackAuthState {
  user: StackUser | null;
  loading: boolean;
  error: Error | null;
}

interface UseStackAuthReturn extends StackAuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
}

export function useStackAuth(): UseStackAuthReturn {
  const [state, setState] = useState<StackAuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Check session on mount
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        throw new Error('Failed to get session');
      }
      const data = await response.json();
      setState(prev => ({ ...prev, user: data.user, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Unknown error'), 
        loading: false 
      }));
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      await checkSession();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Login failed'), 
        loading: false 
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      setState(prev => ({ ...prev, user: null, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Logout failed'), 
        loading: false 
      }));
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      await checkSession();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Signup failed'), 
        loading: false 
      }));
      throw error;
    }
  };

  return {
    ...state,
    login,
    logout,
    signup,
  };
}
