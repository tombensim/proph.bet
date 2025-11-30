import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { api } from './api';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID;

// Log the client ID for debugging (first 30 chars)
console.log('[GoogleSignIn] webClientId:', GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 30) + '...' : 'NOT SET');

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID, // Web client ID for ID token
  iosClientId: GOOGLE_CLIENT_ID_IOS,
  offlineAccess: false,
});

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Check if running in development mode (Expo dev server)
// __DEV__ is a global provided by React Native that's true when running via `npx expo start`
export function isDevMode(): boolean {
  return __DEV__;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

class AuthManager {
  private state: AuthState = {
    user: null,
    isLoading: true,
    isAuthenticated: false,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  getState() {
    return this.state;
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private setState(updates: Partial<AuthState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  async init() {
    this.setState({ isLoading: true });
    await api.init();

    if (api.isAuthenticated()) {
      // Verify token and get user profile
      const response = await api.get<User>('/auth/me');
      if (response.success && response.data) {
        this.setState({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    }

    this.setState({ isLoading: false });
  }

  async signInWithGoogle(idToken: string): Promise<boolean> {
    this.setState({ isLoading: true });

    try {
      console.log('[Auth] Calling API:', `${API_URL}/auth/token`);
      const response = await fetch(
        `${API_URL}/auth/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grantType: 'google',
            idToken,
          }),
        }
      );

      const data = await response.json();
      console.log('[Auth] API Response:', JSON.stringify(data).substring(0, 200));

      if (data.success && data.data) {
        await api.setTokens(data.data.accessToken, data.data.refreshToken);
        this.setState({
          user: data.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }

      // Return error info for debugging
      console.log('[Auth] Auth failed:', data.error || 'Unknown error');
      this.setState({ isLoading: false });
      return false;
    } catch (error: any) {
      console.error('[Auth] Sign in exception:', error?.message || error);
      this.setState({ isLoading: false });
      throw error; // Re-throw so the UI can show it
    }
  }

  async signInAsDev(email: string): Promise<boolean> {
    if (!isDevMode()) {
      console.error('Dev sign-in is only available in development mode');
      return false;
    }

    this.setState({ isLoading: true });

    try {
      const response = await fetch(
        `${API_URL}/auth/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grantType: 'dev',
            email,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.data) {
        await api.setTokens(data.data.accessToken, data.data.refreshToken);
        this.setState({
          user: data.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }

      this.setState({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Dev sign in failed:', error);
      this.setState({ isLoading: false });
      return false;
    }
  }

  async signOut() {
    await api.clearTokens();
    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }
}

export const authManager = new AuthManager();

// Google Auth hook - uses native Google Sign-In
export function useGoogleAuth() {
  const signIn = async (): Promise<{ idToken: string | null; debug: string }> => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      // Debug: show full response structure
      const debugInfo = `type: ${response.type}, hasIdToken: ${!!response.data?.idToken}, user: ${response.data?.user?.email || 'none'}, webClientId: ${GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 25) + '...' : 'NOT SET!'}`;
      
      if (response.type === 'success' && response.data.idToken) {
        return { idToken: response.data.idToken, debug: debugInfo };
      }
      return { idToken: null, debug: debugInfo };
    } catch (error: any) {
      let errorMsg = 'Unknown error';
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMsg = 'User cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMsg = 'Sign in in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMsg = 'Play services not available';
      } else {
        errorMsg = error?.message || String(error);
      }
      return { idToken: null, debug: `Error: ${errorMsg}\n\nwebClientId: ${GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0, 25) + '...' : 'NOT SET!'}` };
    }
  };

  return {
    signIn,
    isReady: true,
  };
}
