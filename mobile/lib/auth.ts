import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { api } from './api';

// Complete auth session for web browser redirects
WebBrowser.maybeCompleteAuthSession();

// Get config from app.config.js extra (loaded via dotenv)
const config = Constants.expoConfig?.extra ?? {};
const GOOGLE_CLIENT_ID = config.googleClientId ?? '';
const GOOGLE_CLIENT_ID_IOS = config.googleClientIdIos ?? GOOGLE_CLIENT_ID;
const API_URL = config.apiUrl ?? 'https://test.proph.bet/api/v1';

// Detect if running in Expo Go vs standalone build
const isExpoGo = Constants.appOwnership === 'expo';

// Configure native Google Sign-In (only used in standalone builds)
if (!isExpoGo) {
  GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    offlineAccess: false,
  });
}

// Google OAuth discovery document
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Check if running in development mode
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
      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantType: 'google',
          idToken,
        }),
      });

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
      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantType: 'dev',
          email,
        }),
      });

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

/**
 * Hook for Expo Go - uses expo-auth-session with Expo's auth proxy
 */
function useExpoGoAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'prophbet',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
    },
    discovery
  );

  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setIdToken(id_token);
    }
  }, [response]);

  const signIn = async (): Promise<{ idToken: string | null }> => {
    const result = await promptAsync();
    if (result?.type === 'success') {
      return { idToken: result.params.id_token };
    }
    return { idToken: null };
  };

  return {
    signIn,
    isReady: !!request,
  };
}

/**
 * Hook for standalone builds - uses native Google Sign-In SDK
 */
function useNativeGoogleAuth() {
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

/**
 * Google Auth hook - automatically selects the right implementation
 * - Expo Go: Uses expo-auth-session (web-based OAuth flow)
 * - Standalone build: Uses native Google Sign-In SDK
 */
export function useGoogleAuth() {
  if (isExpoGo) {
    return useExpoGoAuth();
  }
  return useNativeGoogleAuth();
}
