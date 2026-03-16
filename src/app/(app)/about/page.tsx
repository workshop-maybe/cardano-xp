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
          A tiny experiment in{" "}
          <span className="text-secondary">getting feedback.</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          This is a mini-app built on the Andamio protocol. We&apos;re testing
          whether on-chain reputation tokens can make feedback loops work better.
        </p>
      </div>

      {/* What this is */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          What this is
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">100,000 XP tokens.</strong>{" "}
            Fixed supply. Distributed through feedback tasks.
          </p>
          <p>
            <strong className="text-foreground">No buying, no airdrops.</strong>{" "}
            You earn XP by reviewing what we&apos;re building and telling us
            what&apos;s broken.
          </p>
          <p>
            <strong className="text-foreground">On-chain proof.</strong>{" "}
            Your contribution history is permanent and verifiable. No
            &ldquo;take my word for it.&rdquo;
          </p>
        </div>
      </section>

      {/* How to give feedback */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          How to give feedback
        </h2>
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">1</span>
            <div>
              <p className="font-medium text-foreground">Find something broken</p>
              <p className="text-sm text-muted-foreground">
                Use the app. Click around. Find bugs, confusing flows, missing features.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">2</span>
            <div>
              <p className="font-medium text-foreground">Log an issue on GitHub</p>
              <p className="text-sm text-muted-foreground">
                Go to the repo and create an issue. Be specific — screenshots help.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">3</span>
            <div>
              <p className="font-medium text-foreground">Submit proof on-chain</p>
              <p className="text-sm text-muted-foreground">
                Pick up a feedback task, link your GitHub issue, and claim your XP.
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

      {/* Built on Andamio */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Built on Andamio
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            Cardano XP runs on the{" "}
            <a
              href="https://andamio.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              Andamio protocol
            </a>
            {" "}— an open infrastructure for on-chain credentials, tasks, and
            contribution tracking.
          </p>
          <p>
            This experiment is scaffolding. The protocol is designed to be
            used by anyone building contribution-based systems on Cardano.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AndamioButton asChild variant="outline">
            <a
              href="https://andamio.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn about Andamio
            </a>
          </AndamioButton>
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
