"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CARDANO_XP } from "~/config/cardano-xp";
import { PUBLIC_ROUTES } from "~/config/routes";
import { useProject } from "~/hooks/api/project/use-project";
import type { ProjectDetail } from "~/hooks/api/project/use-project";
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

interface LeaderboardEntry {
  rank: number;
  alias: string;
  totalXp: number;
  status: "enrolled" | "claimed" | null;
}

/**
 * Compute XP leaderboard from project data.
 *
 * For each submission with a matching ACCEPTED assessment (by taskHash),
 * credit the submitter with the task's XP token reward.
 *
 * Note: Match XP tokens on policyId only, not assetName, because the
 * gateway API returns decoded names ("XP") while on-chain uses hex ("5850").
 *
 * Limitation: Joins submissions to assessments by taskHash alone. If multiple
 * contributors submit the same task type (grouped tasks), all submitters are
 * credited when any one is accepted. Accurate when submissions are 1:1 with
 * assessments per taskHash, which is the common case.
 */
function computeLeaderboard(project: ProjectDetail): LeaderboardEntry[] {
  const submissions = project.submissions ?? [];
  const assessments = project.assessments ?? [];
  const tasks = project.tasks ?? [];
  const contributors = project.contributors ?? [];
  const credentialClaims = project.credentialClaims ?? [];

  const xpPolicyId = CARDANO_XP.xpToken.policyId;

  // Build lookup: taskHash → XP reward amount
  const taskXpMap = new Map<string, number>();
  for (const task of tasks) {
    if (taskXpMap.has(task.taskHash)) continue; // same content hash, same reward
    const xpToken = task.tokens?.find((t) => t.policyId === xpPolicyId);
    if (xpToken) {
      taskXpMap.set(task.taskHash, xpToken.quantity);
    }
  }

  // Build set: taskHashes with at least one ACCEPTED assessment
  const acceptedTaskHashes = new Set<string>();
  for (const a of assessments) {
    if (a.decision === "ACCEPTED") {
      acceptedTaskHashes.add(a.taskHash);
    }
  }

  // Sum XP per alias: for each submission where there's an ACCEPTED assessment
  // for the same taskHash, credit the submitter
  const xpByAlias = new Map<string, number>();
  for (const sub of submissions) {
    if (!acceptedTaskHashes.has(sub.taskHash)) continue;
    const xpReward = taskXpMap.get(sub.taskHash) ?? 0;
    if (xpReward === 0) continue;
    xpByAlias.set(sub.submittedBy, (xpByAlias.get(sub.submittedBy) ?? 0) + xpReward);
  }

  // Build status lookups
  const enrolledSet = new Set(contributors.map((c) => c.alias));
  const claimedSet = new Set(credentialClaims.map((c) => c.alias));

  // Build sorted entries (only >0 XP)
  const entries = Array.from(xpByAlias.entries())
    .filter(([, xp]) => xp > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // XP descending
      return a[0].localeCompare(b[0]); // alias ascending for ties
    })
    .map(([alias, totalXp], index) => ({
      rank: index + 1,
      alias,
      totalXp,
      // Current state wins: if re-enrolled after claim, show "enrolled"
      status: enrolledSet.has(alias)
        ? ("enrolled" as const)
        : claimedSet.has(alias)
          ? ("claimed" as const)
          : null,
    }));

  return entries;
}

export default function LeaderboardPage() {
  const { data: project, isLoading, error } = useProject(CARDANO_XP.projectId);

  const leaderboard = useMemo(() => {
    if (!project) return [];
    return computeLeaderboard(project);
  }, [project]);

  const totalXpDistributed = leaderboard.reduce((sum, entry) => sum + entry.totalXp, 0);

  if (isLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <AndamioPageHeader title="Leaderboard" />
        <AndamioErrorAlert error={error?.message ?? "Failed to load project data"} />
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
          contribution. On-chain, transparent, verifiable.
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
