import Link from "next/link";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { CARDANO_XP } from "~/config/cardano-xp";

export default function AboutPage() {
  return (
    <div className="space-y-16 max-w-2xl mx-auto">
      {/* Hero */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          About Cardano XP
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          Builders thrive on{" "}
          <span className="text-secondary">feedback.</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Now that anyone can build an app in a day, we have a new problem:
          how do we know what&apos;s actually good?
        </p>
      </div>

      {/* The two-sided problem */}
      <section className="space-y-8">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            problem
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            People who build need feedback. People who care
            need a way to help.
          </h2>
        </div>

        <div className="grid gap-px md:grid-cols-2 bg-border">
          <div className="bg-card p-4 sm:p-8 space-y-3">
            <span className="font-mono text-3xl font-bold text-secondary/30">01</span>
            <h3 className="font-display font-bold text-lg text-foreground">
              Builders can&apos;t improve alone
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Everyone can create now. Tools are faster than ever. But speed
              without feedback is just noise. We know that not everything we build needs
              to exist, but what if we're not sure?
            </p>
          </div>
          <div className="bg-card p-4 sm:p-8 space-y-3">
            <span className="font-mono text-3xl font-bold text-primary/30">02</span>
            <h3 className="font-display font-bold text-lg text-foreground">
              Cardano has passionate people with nowhere to contribute
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Five years of Catalyst. Thousands of people who care
              deeply about this ecosystem. Where are the receipts? If you don&apos;t write code,
              your options are: trade tokens, post on Twitter, sit on
              committees, or be an anonymous reviewer. Are you really using the blockchain you showed up to use?
            </p>
          </div>
        </div>

        <div className="border-l-4 border-secondary bg-card border border-border shadow-lg p-4 sm:p-8">
          <p className="text-lg text-foreground font-display font-semibold leading-snug">
            Cardano XP connects builders and reviewers. Builders ask for feedback.
            Anyone can give feedback. XP records the exchange.
          </p>
        </div>
      </section>

      {/* What you can give feedback on */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Feedback targets
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            What can you review?
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-2 border-secondary/40 bg-secondary/5 rounded-lg p-5 space-y-2">
            <p className="font-medium text-foreground">This app</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cardano XP itself was vibe-coded and is the first feedback target.
              Is it clear? Is it useful? What&apos;s broken? Tell us.
            </p>
          </div>
          <div className="border border-border rounded-lg p-5 space-y-2">
            <p className="font-medium text-foreground">Apps</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Developers build apps and post them here. Try them out, find bugs,
              report confusing flows, suggest improvements. Your feedback shapes
              what ships.
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
              {" "}this app is built on. Tell us how it feels to use — what&apos;s
              clear, what&apos;s confusing, what&apos;s missing.
            </p>
          </div>
          <div className="border border-border rounded-lg p-5 space-y-2">
            <p className="font-medium text-foreground">Courses</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Try a learning path and tell us where you got stuck. Where could
              it be explained better? What&apos;s missing? More paths coming soon.
            </p>
          </div>
          <div className="border border-border rounded-lg p-5 space-y-2">
            <p className="font-medium text-foreground">Proposals</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Review proposals from Andamio, Gimbalabs, and the Cardano
              Treasury. Does the scope make sense? Would you fund this?
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            The loop
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            How it works
          </h2>
        </div>
        <div className="border border-border rounded-lg p-6 space-y-5">
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">1</span>
            <div>
              <p className="font-medium text-foreground">Pick a task</p>
              <p className="text-sm text-muted-foreground">
                Browse available feedback tasks. Each one describes what to
                review and what to look for.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">2</span>
            <div>
              <p className="font-medium text-foreground">Give your feedback</p>
              <p className="text-sm text-muted-foreground">
                Use the thing. Say what you think. Screenshots, steps to
                reproduce, honest reactions — specifics help builders improve.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">3</span>
            <div>
              <p className="font-medium text-foreground">Earn XP</p>
              <p className="text-sm text-muted-foreground">
                Your contribution is reviewed by a human. When accepted, XP
                tokens are released to your wallet. You can pay XP forward to
                others — your total earned is always recorded, even after
                you give it away.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">4</span>
            <div>
              <p className="font-medium text-foreground">Build your record</p>
              <p className="text-sm text-muted-foreground">
                Claim a credential that snapshots your earned XP permanently.
                Credentials unlock new opportunities. New projects
                can require them for access, roles, or higher-stakes tasks.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <AndamioButton asChild>
            <Link href={CARDANO_XP.routes.project}>
              Browse Tasks
            </Link>
          </AndamioButton>
          <AndamioButton asChild variant="outline">
            <a
              href="https://github.com/workshop-maybe/cardano-xp/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an Issue
            </a>
          </AndamioButton>
        </div>
      </section>

      {/* Why this matters */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Why it matters
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            Check the ledger
          </h2>
        </div>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Right now, if you want to prove you&apos;ve contributed to Cardano
            and you don&apos;t have a GitHub profile, you have nothing. You
            post threads. You hope people remember. There&apos;s nothing on
            this public ledger that distinguishes a five-year builder from
            someone who showed up yesterday.
          </p>
          <p>
            XP changes that. Earned by doing, circulated by giving — you
            can send XP to someone whose work you value, and your earned
            total still stands. Every token on this ledger is backed by work
            someone actually did. Not speculation. Not governance theater.
            Contribution.
          </p>
          <p className="text-foreground font-medium">
            XP replaces &ldquo;take my word for it&rdquo; with &ldquo;check
            the ledger.&rdquo;
          </p>
        </div>
      </section>

      {/* Builder CTA */}
      <section>
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 sm:p-8 space-y-4 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary/60">
            Coming soon
          </p>
          <p className="font-display font-bold text-xl text-foreground">
            Building something? Get feedback from real people.
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Host your own project on Cardano XP. Post tasks, reward
            contributors, collect structured feedback on what you&apos;re
            building.
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

      {/* Open invitation */}
      <section className="space-y-6 pb-12">
        <div className="border-l-4 border-primary bg-card border border-border shadow-lg p-4 sm:p-8 space-y-4">
          <p className="text-foreground leading-relaxed">
            This is an experiment. It&apos;s open source, built in public, and
            designed to be outgrown by whatever the community builds next. The
            protocol is open. The tools are ready.
          </p>
          <p className="text-foreground leading-relaxed">
            We&apos;re not asking anyone to believe this will work.
            We&apos;re doing it. And you&apos;re invited to join in when
            you&apos;re ready.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <AndamioButton asChild variant="outline">
              <a
                href="https://github.com/workshop-maybe/cardano-xp"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Source
              </a>
            </AndamioButton>
            <AndamioButton asChild variant="outline">
              <a
                href="https://github.com/workshop-maybe/cardano-xp/tree/main/journal"
                target="_blank"
                rel="noopener noreferrer"
              >
                Build Journal
              </a>
            </AndamioButton>
          </div>
        </div>
      </section>
    </div>
  );
}
