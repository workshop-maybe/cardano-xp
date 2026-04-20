import { NextResponse } from "next/server";
import { computeActivityStats } from "~/lib/xp-activity";
import type {
  ActivityStats,
  ActivityErrorResponse,
} from "~/types/xp-activity";

/**
 * XP Activity API route.
 *
 * Thin wrapper around computeActivityStats() — delegates all computation
 * to ~/lib/xp-activity.ts and handles error → HTTP response mapping.
 * Mirrors the /api/xp-leaderboard pattern.
 */

export const revalidate = 300;

export async function GET(): Promise<
  NextResponse<ActivityStats | ActivityErrorResponse>
> {
  try {
    const result = await computeActivityStats();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[xp-activity] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to compute activity stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
