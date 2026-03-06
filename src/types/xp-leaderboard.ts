/**
 * Shared types for the XP leaderboard API route and client components.
 * Single source of truth — imported by route.ts, leaderboard-content.tsx, and page.tsx.
 */

export interface LeaderboardEntry {
  rank: number;
  alias: string;
  totalXp: number;
  status: "enrolled" | "claimed" | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  stats: {
    totalXp: number;
    uniqueContributors: number;
  };
}

export interface LeaderboardErrorResponse {
  error: string;
  details?: string;
}
