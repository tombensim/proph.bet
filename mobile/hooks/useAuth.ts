import { useState, useEffect, useCallback } from 'react';
import { authManager, User } from '@/lib/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(authManager.getState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authManager.subscribe(setState);
    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    await authManager.signOut();
  }, []);

  return {
    ...state,
    signOut,
  };
}
