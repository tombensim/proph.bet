import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || GOOGLE_CLIENT_ID;

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
        `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/auth/token`,
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

// Google Auth hook configuration
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
  });

  return {
    request,
    response,
    promptAsync,
    isReady: !!request,
  };
}
