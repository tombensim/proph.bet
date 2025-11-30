import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async init() {
    this.accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    this.refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }

  async setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grantType: 'refresh_token',
          refreshToken: this.refreshToken,
        }),
      });

      const data: ApiResponse<{ accessToken: string }> = await response.json();

      if (data.success && data.data?.accessToken) {
        this.accessToken = data.data.accessToken;
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.data.accessToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      let response = await fetch(url, { ...options, headers });

      // If unauthorized, try to refresh token
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, { ...options, headers });
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Convenience methods
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// API function exports for react-query
export const arenaApi = {
  getArenas: () => api.get<any[]>('/arenas'),
  getArena: (arenaId: string) => api.get<any>(`/arenas/${arenaId}`),
  getLeaderboard: (arenaId: string, limit = 50) => 
    api.get<any[]>(`/arenas/${arenaId}/leaderboard?limit=${limit}`),
  getMarkets: (arenaId: string, status?: string) => 
    api.get<any[]>(`/arenas/${arenaId}/markets${status ? `?status=${status}` : ''}`),
  createMarket: (arenaId: string, data: any) => 
    api.post<any>(`/arenas/${arenaId}/markets`, data),
};

export const marketApi = {
  getMarket: (marketId: string) => api.get<any>(`/markets/${marketId}`),
  resolveMarket: (marketId: string, data: any) => 
    api.post<any>(`/markets/${marketId}/resolve`, data),
};

export const betApi = {
  getBets: (arenaId?: string) => 
    api.get<any[]>(`/bets${arenaId ? `?arenaId=${arenaId}` : ''}`),
  placeBet: (data: any) => api.post<any>('/bets', data),
};

export const notificationApi = {
  getNotifications: (arenaId?: string) => 
    api.get<any[]>(`/notifications${arenaId ? `?arenaId=${arenaId}` : ''}`),
  markRead: (notificationIds?: string[]) => 
    api.patch<any>('/notifications', { notificationIds }),
};

export const userApi = {
  getProfile: () => api.get<any>('/auth/me'),
  getTransactions: (arenaId?: string) => 
    api.get<any[]>(`/users/transactions${arenaId ? `?arenaId=${arenaId}` : ''}`),
};

export const transferApi = {
  transfer: (data: { toUserEmail: string; amount: number; arenaId: string }) => 
    api.post<any>('/transfers', data),
};
