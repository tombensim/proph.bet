import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type {
  Arena,
  ArenaMembership,
  Market,
  Bet,
  Notification,
  User,
  PlaceBetRequest,
  CreateMarketRequest,
  ApiResponse,
  ArenaRole,
} from '@proph-bet/shared';

// Get API URL from app.config.js extra (loaded via dotenv)
const config = Constants.expoConfig?.extra ?? {};
const API_BASE_URL = config.apiUrl ?? 'http://localhost:3000/api/v1';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Extended types for API responses
export interface ArenaWithMembership extends Arena {
  membership?: {
    role: ArenaRole;
    points: number;
    joinedAt: string;
  };
  _count?: {
    members: number;
    markets: number;
  };
}

export interface MarketWithDetails extends Market {
  creator?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count?: {
    bets: number;
    comments: number;
  };
}

export interface BetWithDetails extends Bet {
  market?: {
    id: string;
    title: string;
    status: string;
    arenaId: string | null;
    winningOptionId: string | null;
  };
  option?: {
    id: string;
    text: string;
  } | null;
  won?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
  points: number;
  role: ArenaRole;
}

export interface TransactionWithDetails {
  id: string;
  amount: number;
  type: string;
  createdAt: string;
  fromUser?: { id: string; name: string | null; image: string | null } | null;
  toUser?: { id: string; name: string | null; image: string | null } | null;
  market?: { id: string; title: string } | null;
  arena?: { id: string; name: string } | null;
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
  getArenas: () => api.get<ArenaWithMembership[]>('/arenas'),
  getArena: (arenaId: string) => api.get<ArenaWithMembership>(`/arenas/${arenaId}`),
  getLeaderboard: (arenaId: string, limit = 50) => 
    api.get<LeaderboardEntry[]>(`/arenas/${arenaId}/leaderboard?limit=${limit}`),
  getMarkets: (arenaId: string, status?: string) => 
    api.get<MarketWithDetails[]>(`/arenas/${arenaId}/markets${status ? `?status=${status}` : ''}`),
  createMarket: (arenaId: string, data: CreateMarketRequest) => 
    api.post<{ success: boolean; marketId: string }>(`/arenas/${arenaId}/markets`, data),
};

export const marketApi = {
  getMarket: (marketId: string) => api.get<MarketWithDetails>(`/markets/${marketId}`),
  resolveMarket: (marketId: string, data: { winningOptionId?: string; winningValue?: number; resolutionImage?: string }) => 
    api.post<{ success: boolean }>(`/markets/${marketId}/resolve`, data),
};

export const betApi = {
  getBets: (arenaId?: string) => 
    api.get<BetWithDetails[]>(`/bets${arenaId ? `?arenaId=${arenaId}` : ''}`),
  placeBet: (data: PlaceBetRequest) => 
    api.post<{ success: boolean; betId?: string; shares?: number }>('/bets', data),
};

export const notificationApi = {
  getNotifications: (arenaId?: string) => 
    api.get<Notification[]>(`/notifications${arenaId ? `?arenaId=${arenaId}` : ''}`),
  markRead: (notificationIds?: string[]) => 
    api.patch<{ success: boolean }>('/notifications', { notificationIds }),
};

export const userApi = {
  getProfile: () => api.get<User>('/auth/me'),
  getTransactions: (arenaId?: string) => 
    api.get<TransactionWithDetails[]>(`/users/transactions${arenaId ? `?arenaId=${arenaId}` : ''}`),
};

export const transferApi = {
  transfer: (data: { toUserEmail: string; amount: number; arenaId: string }) => 
    api.post<{ success: boolean }>('/transfers', data),
};

export const aiApi = {
  generateDescription: (data: {
    title: string;
    type: 'BINARY' | 'MULTIPLE_CHOICE' | 'NUMERIC_RANGE';
    options?: string[];
    resolutionDate?: string;
    arenaId?: string;
  }) => api.post<{ description: string }>('/ai/generate-description', data),
};

export const storageApi = {
  getUploadUrl: (contentType: string, folder: string = 'market-assets') =>
    api.post<{ uploadUrl: string; publicUrl: string; fileKey: string }>(
      '/storage/upload-url',
      { contentType, folder }
    ),
};

export interface InvitationDetails {
  arena: {
    id: string;
    name: string;
    description: string | null;
    coverImage: string | null;
    logo: string | null;
  };
  inviter: {
    name: string;
    image: string | null;
  };
  email: string | null; // null for public invites
}

export interface AcceptInvitationResponse {
  message: string;
  arena: {
    id: string;
    name: string;
  };
}

export const invitationApi = {
  getInvitation: (token: string) =>
    api.get<InvitationDetails>(`/invitations/${token}`),
  acceptInvitation: (token: string) =>
    api.post<AcceptInvitationResponse>(`/invitations/${token}`, {}),
};
