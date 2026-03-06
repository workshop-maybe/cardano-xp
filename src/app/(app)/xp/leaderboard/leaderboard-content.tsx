"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PUBLIC_ROUTES } from "~/config/routes";
import {
  AndamioBadge,
  AndamioCard,
  AndamioCardContent,
  AndamioCardHeader,
  AndamioCardTitle,
  AndamioPageHeader,
  AndamioPageLoading,
  AndamioTable,
  AndamioTableBody,
  AndamioTableCell,
  AndamioTableHead,
  AndamioTableHeader,
  AndamioTableRow,
  AndamioTableContainer,
  AndamioErrorAlert,
  AndamioText,
  AndamioDashboardStat,
} from "~/components/andamio";
import { AchievementIcon, XPIcon, ContributorIcon } from "~/components/icons";
import { XpBadge } from "~/components/xp-badge";
import type { LeaderboardResponse } from "~/types/xp-leaderboard";
export type { LeaderboardEntry } from "~/types/xp-leaderboard";

export const leaderboardKeys = {
  all: ["xp-leaderboard"] as const,
};

async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const response = await fetch("/api/xp-leaderboard");

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
      details?: string;
    };
    throw new Error(
      errorData.error ?? `Failed to fetch leaderboard: ${response.statusText}`
    );
  }

  return response.json() as Promise<LeaderboardResponse>;
}

export function LeaderboardContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: leaderboardKeys.all,
    queryFn: fetchLeaderboard,
  });

  const leaderboard = data?.entries ?? [];
  const totalXpDistributed = data?.stats.totalXp ?? 0;

  if (isLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <AndamioPageHeader title="Leaderboard" />
        <AndamioErrorAlert error={error.message} />
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Hero header */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          Leaderboard
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          Who&apos;s earning{" "}
          <span className="text-secondary">XP?</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Every alias that has completed a task and earned XP — ranked by total
          contribution. Transparent and verifiable.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <AndamioDashboardStat
          icon={ContributorIcon}
          label="Contributors with XP"
          value={leaderboard.length}
          valueColor={leaderboard.length > 0 ? "success" : undefined}
          iconColor={leaderboard.length > 0 ? "success" : undefined}
        />
        <AndamioDashboardStat
          icon={XPIcon}
          label="Total XP Distributed"
          value={totalXpDistributed.toLocaleString()}
          valueColor={totalXpDistributed > 0 ? "success" : undefined}
          iconColor={totalXpDistributed > 0 ? "success" : undefined}
        />
      </div>

      {/* Leaderboard table */}
      <AndamioCard>
        <AndamioCardHeader>
          <AndamioCardTitle className="flex items-center gap-2">
            <AchievementIcon className="h-5 w-5" />
            XP Rankings
          </AndamioCardTitle>
        </AndamioCardHeader>
        <AndamioCardContent>
          {leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                <AchievementIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <AndamioText className="font-medium">No XP earned yet</AndamioText>
              <AndamioText variant="muted" className="mt-1 max-w-[320px]">
                Complete tasks to earn XP and appear on the leaderboard.{" "}
                <Link href={PUBLIC_ROUTES.projects} className="text-primary hover:underline">
                  View available tasks
                </Link>
              </AndamioText>
            </div>
          ) : (
            <AndamioTableContainer>
              <AndamioTable>
                <AndamioTableHeader>
                  <AndamioTableRow>
                    <AndamioTableHead className="w-[60px]">#</AndamioTableHead>
                    <AndamioTableHead>Alias</AndamioTableHead>
                    <AndamioTableHead className="text-right">XP</AndamioTableHead>
                    <AndamioTableHead className="w-[100px] text-center hidden md:table-cell">
                      Status
                    </AndamioTableHead>
                  </AndamioTableRow>
                </AndamioTableHeader>
                <AndamioTableBody>
                  {leaderboard.map((entry) => (
                    <AndamioTableRow key={entry.alias}>
                      <AndamioTableCell className="font-mono text-muted-foreground">
                        {entry.rank}
                      </AndamioTableCell>
                      <AndamioTableCell className="font-mono font-medium">
                        {entry.alias}
                      </AndamioTableCell>
                      <AndamioTableCell className="text-right">
                        <XpBadge amount={entry.totalXp} />
                      </AndamioTableCell>
                      <AndamioTableCell className="text-center hidden md:table-cell">
                        {entry.status === "enrolled" && (
                          <AndamioBadge status="live">Enrolled</AndamioBadge>
                        )}
                        {entry.status === "claimed" && (
                          <AndamioBadge status="success">Claimed</AndamioBadge>
                        )}
                      </AndamioTableCell>
                    </AndamioTableRow>
                  ))}
                </AndamioTableBody>
              </AndamioTable>
            </AndamioTableContainer>
          )}
        </AndamioCardContent>
      </AndamioCard>

      {/* Back link */}
      <div className="pb-12">
        <Link
          href="/xp"
          className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Tokenomics
        </Link>
      </div>
    </div>
  );
}
