import { NextResponse } from "next/server";
import { computeLeaderboard } from "~/lib/xp-leaderboard";
import type {
  LeaderboardResponse,
  LeaderboardErrorResponse,
} from "~/types/xp-leaderboard";

/**
 * XP Leaderboard API Route
 *
 * Thin wrapper around computeLeaderboard() — delegates all computation
 * to ~/lib/xp-leaderboard.ts and handles error → HTTP response mapping.
 *
 * Cached for 5 minutes (matches client-side staleTime).
 */

export const revalidate = 300;

export async function GET(): Promise<NextResponse<LeaderboardResponse | LeaderboardErrorResponse>> {
  try {
    const result = await computeLeaderboard();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[xp-leaderboard] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to compute leaderboard",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
