"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PUBLIC_ROUTES } from "~/config/routes";
import { LandingHero } from "~/components/landing/landing-hero";
import { FirstLoginCard } from "~/components/landing/first-login-card";
import { AppNavBar } from "~/components/layout/app-nav-bar";
import { AppFooter } from "~/components/layout/app-footer";
import {
  AndamioDashboardStat,
  AndamioText,
} from "~/components/andamio";
import {
  AchievementIcon,
  ContributorIcon,
  XPIcon,
} from "~/components/icons";
import { ProjectPostingWaitlistForm } from "~/components/xp/project-posting-waitlist-form";
import { activityKeys, fetchActivity } from "~/lib/xp-activity-client";

interface MintedInfo {
  alias: string;
  txHash: string;
}

export function HomeContent() {
  const [mintedInfo, setMintedInfo] = useState<MintedInfo | null>(null);

  const handleMinted = useCallback((info: MintedInfo) => {
    setMintedInfo(info);
  }, []);

  const showFirstLogin = !!mintedInfo;

  const { data: stats } = useQuery({
    queryKey: activityKeys.all,
    queryFn: fetchActivity,
  });

  const contributors = stats?.contributors ?? 0;
  const tasksCompleted = stats?.tasksCompleted ?? 0;
  const xpReleased = stats?.xpReleased ?? 0;
  const xpTotalSupply = stats?.xpTotalSupply ?? 100_000;

  return (
    <main className="relative bg-background text-foreground min-h-dvh flex flex-col">
      {/* Layered background: grid → mesh → glow → vignette */}
      <div className="pointer-events-none fixed inset-0 xp-grid" aria-hidden />
      <div className="pointer-events-none fixed inset-0 xp-mesh-deep" aria-hidden />
      <div className="pointer-events-none fixed inset-0 xp-glow-spot" aria-hidden />
      <div className="pointer-events-none fixed inset-0 xp-vignette" aria-hidden />

      <AppNavBar />

      {/* Hero — min-h-dvh keeps the visual centering of the existing panel
          while allowing the activity strip to be scrollable into view below. */}
      <section className="relative z-10 flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          {showFirstLogin ? (
            <FirstLoginCard
              alias={mintedInfo.alias}
              txHash={mintedInfo.txHash}
            />
          ) : (
            <LandingHero onMinted={handleMinted} />
          )}
        </div>
      </section>

      {/* Activity strip — "declare trajectory" section */}
      <section className="relative z-10 px-6 py-16 border-t border-border/30 bg-background/50 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-3 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
              Where XP is going
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-foreground leading-tight">
              Earn XP by giving feedback.
              <br />
              <span className="text-secondary">
                Soon, post your own project.
              </span>
            </h2>
            <AndamioText
              variant="muted"
              className="mx-auto max-w-xl text-base"
            >
              Contribute to the current project, earn XP, and unlock the next
              assignment — a how-to guide on posting your own project on
              Cardano XP.
            </AndamioText>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <AndamioDashboardStat
              icon={ContributorIcon}
              label="Contributors"
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
              label={`XP of ${xpTotalSupply.toLocaleString()} released`}
              value={xpReleased.toLocaleString()}
              valueColor={xpReleased > 0 ? "success" : undefined}
              iconColor={xpReleased > 0 ? "success" : undefined}
            />
          </div>

          <div className="flex flex-col items-center gap-4 pt-2">
            <ProjectPostingWaitlistForm
              variant="inline"
              idSuffix="landing"
            />
            <Link
              href="/xp/activity"
              className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              See all activity &rarr;
            </Link>
          </div>
        </div>
      </section>

      <AppFooter />
    </main>
  );
}
