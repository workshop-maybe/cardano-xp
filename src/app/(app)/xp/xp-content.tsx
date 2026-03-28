"use client";

import Link from "next/link";
import { CARDANO_XP } from "~/config/cardano-xp";
import { PUBLIC_ROUTES } from "~/config/routes";
import { useProject } from "~/hooks/api/project/use-project";
import { AndamioPageLoading, AndamioErrorAlert } from "~/components/andamio";

const STATS = [
  { label: "Total Supply", value: "100,000", unit: "XP", prefix: "", accent: "text-secondary" },
  { label: "Distribution", value: "Tasks", unit: "only", prefix: "", accent: "text-primary" },
  { label: "Credentials", value: "Andamio", unit: "", prefix: "on", accent: "text-success" },
  { label: "Moderation", value: "Humans", unit: "", prefix: "by", accent: "text-foreground" },
] as const;

export function XPContent() {
  const { data: project, isLoading, error } = useProject(CARDANO_XP.projectId);

  if (isLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (error) {
    return <AndamioErrorAlert error={error.message ?? "Failed to load project data"} />;
  }

  const xpBalance = project?.treasuryAssets?.find(
    (t) => t.policyId === CARDANO_XP.xpToken.policyId
  )?.quantity ?? 0;
  const adaBalance = project?.treasuryBalance != null
    ? project.treasuryBalance / 1_000_000
    : 0;
  return (
    <div className="space-y-16">
      {/* Hero header */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          Tokenomics
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          A token you can only earn by{" "}
          <span className="text-secondary">doing real work.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Not DeFi yield. Not learn-to-earn. XP is proof you showed up and
          did something useful — recorded, composable, permanent.
          While everyone else is trading tokens, we built one that means
          something because it&apos;s backed by contribution, not speculation.
        </p>
      </div>

      {/* The mechanism — framed as a feedback journey */}
      <section className="space-y-6">
        <div className="grid gap-px md:grid-cols-3 bg-border">
          <div className="bg-card p-8 space-y-3">
            <span className="font-mono text-3xl font-bold text-secondary/30">01</span>
            <h3 className="font-display font-bold text-xl text-foreground">
              Give feedback, earn XP
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pick up a feedback task. Review a feature, test a flow, tell us
              what&apos;s broken. It takes real effort to give good feedback —
              XP is released to your wallet as proof that effort happened.
            </p>
          </div>
          <div className="bg-card p-8 space-y-3">
            <span className="font-mono text-3xl font-bold text-primary/30">02</span>
            <h3 className="font-display font-bold text-xl text-foreground">
              Build a track record
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your contribution history becomes your identity. Not your Twitter
              following, not who you know. What you&apos;ve demonstrated —
              verifiable by anyone. Claim a credential and your XP
              balance is snapshotted permanently.
            </p>
          </div>
          <div className="bg-card p-8 space-y-3">
            <span className="font-mono text-3xl font-bold text-success/30">03</span>
            <h3 className="font-display font-bold text-xl text-foreground">
              Let others earn it too
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once you hold XP, you can give it to others. See someone doing
              good work? Recognize them. Reputation flows through the network,
              not from a central authority deciding who matters.
            </p>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 bg-border">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-card p-6 space-y-2"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="flex items-baseline gap-1.5">
              {stat.prefix && (
                <span className="text-sm font-mono text-muted-foreground">{stat.prefix}</span>
              )}
              <span className={`text-3xl font-display font-bold ${stat.accent}`}>
                {stat.value}
              </span>
              {stat.unit && (
                <span className="text-sm font-mono text-muted-foreground">{stat.unit}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Live treasury balance */}
      {project && (
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-display font-bold text-2xl text-foreground">
              Treasury
            </h2>
          </div>
          <div className="grid gap-px sm:grid-cols-2 bg-border">
            <div className="bg-card p-6 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                XP in Treasury
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-3xl font-display font-bold text-secondary">
                  {xpBalance.toLocaleString()}
                </span>
                <span className="text-sm font-mono text-muted-foreground">XP</span>
              </p>
            </div>
            <div className="bg-card p-6 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                ADA in Treasury
              </p>
              <p className="flex items-baseline gap-1.5">
                <span className="text-3xl font-display font-bold text-primary">
                  {adaBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-mono text-muted-foreground">ADA</span>
              </p>
            </div>
          </div>
          {project.treasuryAddress && (
            <p className="font-mono text-xs text-muted-foreground break-all">
              {project.treasuryAddress}
            </p>
          )}
        </section>
      )}

      {/* Leaderboard CTA */}
      <section>
        <Link
          href={PUBLIC_ROUTES.leaderboard}
          className="group flex items-center justify-between rounded-xl border border-secondary/30 bg-secondary/5 p-6 transition-colors hover:bg-secondary/10"
        >
          <div className="space-y-1">
            <p className="font-display font-bold text-lg text-foreground">
              XP Leaderboard
            </p>
            <p className="text-sm text-muted-foreground">
              See who&apos;s earning XP by completing tasks
            </p>
          </div>
          <span className="text-secondary text-2xl transition-transform group-hover:translate-x-1">
            &rarr;
          </span>
        </Link>
      </section>

      {/* The problem */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          The problem
        </h2>
        <div className="border-l-4 border-l-secondary bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-xl text-foreground font-display font-semibold leading-snug">
            There&apos;s nothing on this public ledger that distinguishes
            a five-year builder from someone who showed up yesterday.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Developers have git commits. Designers have portfolios. But
            community reviewers, educators, product testers, facilitators —
            you post threads. You hope people remember. Five and a half years
            of Catalyst. Thousands of contributors. Almost nothing to show
            for any of it.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            As long as we&apos;re on Twitter, we&apos;ve changed nothing.
            XP is the commit graph for non-code contributions. Devs
            recognize the model immediately. Everyone else gets access to
            what made open source culture work — without needing to learn git.
          </p>
        </div>
      </section>

      {/* The loop */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            The cycle
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            The loop
          </h2>
        </div>
        <div className="bg-card border border-border shadow-lg p-8">
          <div className="flex flex-col gap-4 font-mono text-sm">
            {[
              { step: "1", action: "Pick up a feedback task", result: "Review something real" },
              { step: "2", action: "Submit your feedback", result: "Earn XP" },
              { step: "3", action: "Accumulate XP", result: "Claim a credential" },
              { step: "4", action: "Hold XP", result: "Give it to others" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-4">
                <span className="text-2xl font-bold text-secondary/30 w-8">
                  {item.step}
                </span>
                <span className="text-muted-foreground flex-1">{item.action}</span>
                <span className="text-secondary">→</span>
                <span className="text-foreground font-semibold flex-1">{item.result}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What XP is not */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          What this is not
        </h2>
        <div className="bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Not learn-to-earn. Not a financial token. Not governance (yet).
            XP has no market value and is not designed to be traded.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Cardano doesn&apos;t need another token to trade. It needs a token
            that makes people want to <em>do things</em>. XP gives the
            ecosystem something to point to: this is what Cardano is
            actually for.
          </p>
          <p className="text-foreground font-medium">
            XP replaces &ldquo;take my word for it&rdquo; with &ldquo;check
            the ledger.&rdquo;
          </p>
        </div>
      </section>

      {/* What happens when it runs out */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          What happens when the 100,000 XP are used?
        </h2>
        <div className="bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Let&apos;s not get ahead of ourselves. Let&apos;s run this experiment
            first — see if the mechanics work, if people actually use it, if
            reputation means something in practice.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If it does, we continue with V2 of this token. The people who
            earned XP in V1 will have a say in what that looks like.
          </p>
        </div>
      </section>

      {/* For builders */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            For builders
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            Want feedback on what you&apos;re building?
          </h2>
        </div>
        <div className="bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Create a project, post feedback tasks, distribute XP. You get
            structured feedback from real people. They get proof they
            contributed. No one needs to approve you — the protocol enforces it.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            XP earned on any project is composable. Other projects can set
            prerequisites based on your XP balance. Strangers build on each
            other&apos;s credentials without coordination. That&apos;s the
            difference between a public ledger and a better database.
          </p>
        </div>
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-8 space-y-4 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/60">
            Coming soon
          </p>
          <p className="font-display font-bold text-xl text-foreground">
            Host your own project on Cardano XP
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Post tasks, reward contributors with XP, and collect structured
            feedback on what you&apos;re building. If you&apos;re interested
            in being one of the first projects, reach out.
          </p>
          <a
            href="https://x.com/andaborocardano"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            Let&apos;s talk
          </a>
        </div>
      </section>

      {/* Invitation */}
      <section className="space-y-6 pb-12">
        <div className="border-l-4 border-primary bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-foreground leading-relaxed">
            This is scaffolding — designed to be outgrown by whatever the
            community builds next. If it works, the people who earned XP in
            V1 decide what V2 looks like. If it doesn&apos;t, we learned
            something. Either way, it&apos;s permanent.
          </p>
          <p className="text-foreground font-medium leading-relaxed">
            We&apos;re not asking anyone to believe this will work.
            We&apos;re doing it. You&apos;re invited to join in when
            you&apos;re ready.
          </p>
        </div>
      </section>
    </div>
  );
}
