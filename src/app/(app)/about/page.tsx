import Link from "next/link";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { CARDANO_XP } from "~/config/cardano-xp";

export default function AboutPage() {
  return (
    <div className="space-y-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          About
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          We need your{" "}
          <span className="text-secondary">feedback.</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          This app was vibe coded on a Sunday afternoon. Devs are gonna
          dev — but the way we build connections is through feedback.
        </p>
      </div>

      {/* What you can give feedback on */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Earn XP by giving feedback on
        </h2>
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-5 space-y-2">
            <p className="font-medium text-foreground">Apps</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Devs build apps and post them here. Try them out, find bugs,
              report confusing flows, suggest improvements.
            </p>
          </div>
          <div className="border border-border rounded-lg p-5 space-y-2">
            <p className="font-medium text-foreground">Andamio</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The{" "}
              <a
                href="https://andamio.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline"
              >
                platform
              </a>
              {" "}this app is built on. Tell us how it feels to use —
              what&apos;s clear, what&apos;s confusing, what&apos;s missing.
            </p>
          </div>
          <div className="border border-border rounded-lg p-5 space-y-2">
            <p className="font-medium text-foreground">Courses</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Try a learning path and tell us where you got stuck or what
              could be explained better. More examples coming soon.
            </p>
          </div>
          <div className="border border-border rounded-lg p-5 space-y-2">
            <p className="font-medium text-foreground">Proposals</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Review proposals from Andamio, Gimbalabs, and the Cardano
              Treasury. Does the scope make sense? Is anything unclear?
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          How it works
        </h2>
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">1</span>
            <div>
              <p className="font-medium text-foreground">Pick something to review</p>
              <p className="text-sm text-muted-foreground">
                Choose one of the feedback targets above, or browse available
                tasks.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">2</span>
            <div>
              <p className="font-medium text-foreground">Share what you find</p>
              <p className="text-sm text-muted-foreground">
                Open a GitHub issue with your feedback. Be specific —
                screenshots and steps to reproduce help.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">3</span>
            <div>
              <p className="font-medium text-foreground">Earn XP on-chain</p>
              <p className="text-sm text-muted-foreground">
                Complete a feedback task, link your issue, and receive XP
                tokens as permanent proof of your contribution.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <AndamioButton asChild>
            <a
              href="https://github.com/Andamio-Platform/cardano-xp/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an Issue
            </a>
          </AndamioButton>
          <AndamioButton asChild variant="outline">
            <Link href={CARDANO_XP.routes.project}>
              Browse Tasks
            </Link>
          </AndamioButton>
        </div>
      </section>

      {/* Why feedback matters */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Why this matters
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            Most projects ask for feedback after they ship. We&apos;re asking
            now, while everything is still being built. Your input shapes
            what this becomes.
          </p>
          <p>
            XP is how we track who contributed. It&apos;s on-chain,
            permanent, and yours. No one can take it away or claim your work.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AndamioButton asChild variant="outline">
            <a
              href="https://github.com/Andamio-Platform/cardano-xp"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Source
            </a>
          </AndamioButton>
        </div>
      </section>

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}
