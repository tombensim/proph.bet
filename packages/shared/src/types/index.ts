// Enums matching Prisma schema - keep in sync with prisma/schema.prisma

export enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
  GLOBAL_ADMIN = "GLOBAL_ADMIN",
}

export enum ArenaRole {
  MEMBER = "MEMBER",
  ADMIN = "ADMIN",
}

export enum MarketType {
  BINARY = "BINARY",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  NUMERIC_RANGE = "NUMERIC_RANGE",
}

export enum MarketStatus {
  OPEN = "OPEN",
  PENDING_RESOLUTION = "PENDING_RESOLUTION",
  RESOLVED = "RESOLVED",
  CANCELLED = "CANCELLED",
}

export enum TransactionType {
  BET_PLACED = "BET_PLACED",
  WIN_PAYOUT = "WIN_PAYOUT",
  USER_TRANSFER = "USER_TRANSFER",
  MONTHLY_RESET = "MONTHLY_RESET",
}

export enum NotificationType {
  MARKET_RESOLVED = "MARKET_RESOLVED",
  BET_RESOLVED = "BET_RESOLVED",
  WIN_PAYOUT = "WIN_PAYOUT",
  MARKET_CREATED = "MARKET_CREATED",
  MONTHLY_WINNER = "MONTHLY_WINNER",
  POINTS_RESET = "POINTS_RESET",
  MARKET_DISPUTED = "MARKET_DISPUTED",
}

export enum AssetType {
  IMAGE = "IMAGE",
  LINK = "LINK",
  FILE = "FILE",
}

export enum MarketSource {
  NATIVE = "NATIVE",
  POLYMARKET = "POLYMARKET",
}

export enum DisputeStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED",
}

export enum ResetFrequency {
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  CUSTOM = "CUSTOM",
  MANUAL = "MANUAL",
}

export enum WinnerRule {
  HIGHEST_BALANCE = "HIGHEST_BALANCE",
  MOST_BETS_WON = "MOST_BETS_WON",
  HIGHEST_ROI = "HIGHEST_ROI",
}

export enum MarketCreationPolicy {
  EVERYONE = "EVERYONE",
  ADMIN = "ADMIN",
  APPROVED_CREATORS = "APPROVED_CREATORS",
}

export enum AMMType {
  FPMM = "FPMM",
  LMSR = "LMSR",
  FIXED_ODDS = "FIXED_ODDS",
}

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
  DECLINED = "DECLINED",
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// User types
export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
}

// Arena types
export interface Arena {
  id: string;
  name: string;
  description: string | null;
  about: string | null;
  coverImage: string | null;
  logo: string | null;
  slug: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ArenaMembership {
  id: string;
  userId: string;
  arenaId: string;
  role: ArenaRole;
  points: number;
  hidden: boolean;
  joinedAt: string;
}

// Market types
export interface Option {
  id: string;
  text: string;
  marketId: string;
  liquidity: number;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  type: MarketType;
  status: MarketStatus;
  creatorId: string;
  arenaId: string | null;
  resolutionDate: string;
  approved: boolean;
  language: string;
  minBet: number | null;
  maxBet: number | null;
  resolutionImage: string | null;
  winningOptionId: string | null;
  winningValue: number | null;
  polymarketId: string | null;
  source: MarketSource;
  createdAt: string;
  updatedAt: string;
  options?: Option[];
}

export interface Bet {
  id: string;
  amount: number;
  shares: number;
  userId: string;
  marketId: string;
  optionId: string | null;
  numericValue: number | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  content: string;
  read: boolean;
  arenaId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// API Request/Response types
export interface PlaceBetRequest {
  marketId: string;
  amount: number;
  optionId?: string;
  numericValue?: number;
  idempotencyKey?: string;
}

export interface CreateMarketRequest {
  title: string;
  description?: string;
  type: MarketType;
  resolutionDate: string;
  options?: { value: string }[];
  minBet?: number;
  maxBet?: number;
  rangeMin?: number;
  rangeMax?: number;
  rangeBins?: number;
  hiddenFromUserIds?: string[];
  hideBetsFromUserIds?: string[];
  arenaId: string;
  assets?: MarketAsset[];
}

export interface MarketAsset {
  type: AssetType;
  url: string;
  label?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
