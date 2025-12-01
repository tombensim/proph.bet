import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { api } from './api';

// TODO: Fix env var loading in Expo - currently hardcoded due to workspace issues
// These should come from EXPO_PUBLIC_GOOGLE_CLIENT_ID and EXPO_PUBLIC_API_URL
const GOOGLE_CLIENT_ID = '663244529078-5kip5f6e4dir5fj32nbuj8v1k5ork7es.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID;
const API_URL = 'https://test.proph.bet/api/v1';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
  iosClientId: GOOGLE_CLIENT_ID_IOS,
  offlineAccess: false,
});

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
      console.error('Sign in failed:', error);
      this.setState({ isLoading: false });
      return false;
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
  const signIn = async (): Promise<{ idToken: string | null }> => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      if (response.type === 'success' && response.data.idToken) {
        return { idToken: response.data.idToken };
      }
      return { idToken: null };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled sign in');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play services not available');
      } else {
        console.error('Google sign in error:', error);
      }
      return { idToken: null };
    }
  };

  return {
    signIn,
    isReady: true,
  };
}
