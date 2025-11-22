export interface RateLimitConfig {
  dailyLimit: number;
  weeklyLimit: number;
}

export interface RateLimitUsage {
  dailyCount: number;
  weeklyCount: number;
  dailyRemaining: number;
  weeklyRemaining: number;
  dailyResetAt: Date;
  weeklyResetAt: Date;
}

export interface RateLimitCheck {
  allowed: boolean;
  usage: RateLimitUsage;
  reason?: string;
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  dailyLimit: 10,
  weeklyLimit: 50,
};
