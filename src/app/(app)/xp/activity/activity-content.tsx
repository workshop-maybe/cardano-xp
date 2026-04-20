"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PUBLIC_ROUTES } from "~/config/routes";
import {
  AndamioCard,
  AndamioCardContent,
  AndamioCardHeader,
  AndamioCardTitle,
  AndamioDashboardStat,
  AndamioErrorAlert,
  AndamioPageHeader,
  AndamioPageLoading,
  AndamioTable,
  AndamioTableBody,
  AndamioTableCell,
  AndamioTableContainer,
  AndamioTableHead,
  AndamioTableHeader,
  AndamioTableRow,
  AndamioText,
} from "~/components/andamio";
import {
  AchievementIcon,
  ContributorIcon,
  PendingIcon,
  XPIcon,
} from "~/components/icons";
import { XpBadge } from "~/components/xp-badge";
import { ProjectPostingWaitlistForm } from "~/components/xp/project-posting-waitlist-form";
import { activityKeys, fetchActivity } from "~/lib/xp-activity-client";

/** Render an ISO-string date as a short relative-or-absolute string. */
function formatActivityDate(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ActivityContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: activityKeys.all,
    queryFn: fetchActivity,
  });

  if (isLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <AndamioPageHeader title="Activity" />
        <AndamioErrorAlert error={error.message} />
      </div>
    );
  }

  const stats = data;
  const contributors = stats?.contributors ?? 0;
  const tasksCompleted = stats?.tasksCompleted ?? 0;
  const xpReleased = stats?.xpReleased ?? 0;
  const xpTotalSupply = stats?.xpTotalSupply ?? 100_000;
  const pendingReviews = stats?.pendingReviews ?? 0;
  const recent = stats?.recentAccepted ?? [];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          activity
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          What&apos;s happening on{" "}
          <span className="text-secondary">Cardano XP.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Every contribution is on-chain. This page is the live shape of the
          work happening here — who&apos;s contributing, what&apos;s getting
          accepted, and where XP is going next.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AndamioDashboardStat
          icon={ContributorIcon}
          label="Contributors with XP"
          value={contributors}
          valueColor={contributors > 0 ? "success" : undefined}
          iconColor={contributors > 0 ? "success" : undefined}
        />
        <AndamioDashboardStat
          icon={AchievementIcon}
          label="Tasks completed"
          value={tasksCompleted}
          valueColor={tasksCompleted > 0 ? "success" : undefined}
          iconColor={tasksCompleted > 0 ? "success" : undefined}
        />
        <AndamioDashboardStat
          icon={XPIcon}
          label={`XP released of ${xpTotalSupply.toLocaleString()}`}
          value={xpReleased.toLocaleString()}
          valueColor={xpReleased > 0 ? "success" : undefined}
          iconColor={xpReleased > 0 ? "success" : undefined}
        />
        <AndamioDashboardStat
          icon={PendingIcon}
          label="Pending reviews"
          value={pendingReviews}
        />
      </div>

      {/* Recent accepted submissions */}
      <AndamioCard>
        <AndamioCardHeader>
          <AndamioCardTitle className="flex items-center gap-2">
            <AchievementIcon className="h-5 w-5" />
            Recent accepted submissions
          </AndamioCardTitle>
        </AndamioCardHeader>
        <AndamioCardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                <AchievementIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <AndamioText className="font-medium">
                No accepted submissions yet
              </AndamioText>
              <AndamioText variant="muted" className="mt-1 max-w-[340px]">
                Be the first — give feedback on the current assignment and earn
                your first XP.{" "}
                <Link
                  href={PUBLIC_ROUTES.projects}
                  className="text-primary hover:underline"
                >
                  Open tasks
                </Link>
              </AndamioText>
            </div>
          ) : (
            <AndamioTableContainer>
              <AndamioTable>
                <AndamioTableHeader>
                  <AndamioTableRow>
                    <AndamioTableHead>Alias</AndamioTableHead>
                    <AndamioTableHead className="text-right">XP</AndamioTableHead>
                    <AndamioTableHead className="text-right w-[120px]">
                      When
                    </AndamioTableHead>
                  </AndamioTableRow>
                </AndamioTableHeader>
                <AndamioTableBody>
                  {recent.map((entry) => (
                    <AndamioTableRow
                      key={`${entry.alias}-${entry.slot}-${entry.taskHash}`}
                    >
                      <AndamioTableCell className="font-mono font-medium">
                        {entry.alias}
                      </AndamioTableCell>
                      <AndamioTableCell className="text-right">
                        <XpBadge amount={entry.xpEarned} />
                      </AndamioTableCell>
                      <AndamioTableCell className="text-right text-muted-foreground font-mono text-xs">
                        {formatActivityDate(entry.date)}
                      </AndamioTableCell>
                    </AndamioTableRow>
                  ))}
                </AndamioTableBody>
              </AndamioTable>
            </AndamioTableContainer>
          )}
        </AndamioCardContent>
      </AndamioCard>

      {/* What's next — trajectory narrative */}
      <AndamioCard>
        <AndamioCardHeader>
          <AndamioCardTitle>Where XP is going</AndamioCardTitle>
        </AndamioCardHeader>
        <AndamioCardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">
                Step 1 · now
              </p>
              <AndamioText className="font-semibold">
                Give first feedback
              </AndamioText>
              <AndamioText variant="muted" className="text-sm">
                Complete the current assignment — review another contributor&apos;s
                work and earn XP when it&apos;s accepted.
              </AndamioText>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">
                Step 2 · soon
              </p>
              <AndamioText className="font-semibold">
                Unlock the how-to
              </AndamioText>
              <AndamioText variant="muted" className="text-sm">
                Earn enough XP and a second assignment opens — a how-to guide on
                posting your own project on Cardano XP.
              </AndamioText>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-secondary">
                Step 3 · your project
              </p>
              <AndamioText className="font-semibold">
                Mint a project token
              </AndamioText>
              <AndamioText variant="muted" className="text-sm">
                After the how-to, mint a project token to launch your own
                project on Cardano XP and start earning contributions yourself.
              </AndamioText>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <ProjectPostingWaitlistForm variant="expanded" idSuffix="activity" />
          </div>
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
