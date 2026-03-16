import Link from "next/link";
import { CARDANO_XP } from "~/config/cardano-xp";

export default function AboutPage() {
  return (
    <div className="space-y-16 max-w-2xl">
      {/* Header */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          About
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          Your feedback is{" "}
          <span className="text-secondary">the product.</span>
        </h1>
      </div>

      {/* The pitch */}
      <section className="space-y-6">
        <div className="border-l-4 border-l-secondary bg-card border border-border shadow-lg p-8 space-y-5">
          <p className="text-lg text-foreground leading-relaxed font-medium">
            This app was built in about three hours of vibe coding on a Sunday
            afternoon. It&apos;s rough. It needs your help.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Forgive the AI slop — that&apos;s the point. We shipped something
            imperfect on purpose so that the first thing you can do on Cardano
            XP is tell us what&apos;s wrong with it. Your feedback makes this
            better, and you earn XP for every piece of it.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The entire build process is documented in the{" "}
            <a
              href="https://github.com/Andamio-Platform/cardano-xp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-secondary/80 underline underline-offset-2"
            >
              build journal
            </a>
            . Every decision, every prompt, every commit — anyone can follow
            along and reproduce the whole thing.
          </p>
        </div>
      </section>

      {/* The user journey */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          How it works
        </h2>
        <div className="space-y-4">
          <div className="border-l-4 border-l-secondary bg-card border border-border shadow-lg p-6 space-y-2">
            <h3 className="font-display font-semibold text-foreground">
              1. Pick up a feedback task
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Browse the project tasks. Each one asks you to review something
              specific — a page, a flow, a feature. Try it, find what&apos;s
              confusing or broken, and write up what you think. It takes real
              effort to give good feedback, and that effort should count.
            </p>
          </div>

          <div className="border-l-4 border-l-primary bg-card border border-border shadow-lg p-6 space-y-2">
            <h3 className="font-display font-semibold text-foreground">
              2. Submit your feedback, earn XP
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Submit your evidence on-chain. A reviewer looks at what you
              submitted. If it&apos;s constructive, you earn XP — a reputation
              token minted directly to your wallet. You can&apos;t buy XP. You
              can only earn it by doing useful work.
            </p>
          </div>

          <div className="border-l-4 border-l-success bg-card border border-border shadow-lg p-6 space-y-2">
            <h3 className="font-display font-semibold text-foreground">
              3. Build a track record
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your contribution history becomes your identity. Not your Twitter
              following, not who you know, not how long you&apos;ve been around.
              What you&apos;ve demonstrated — on-chain, verifiable by anyone.
              When you claim a credential, your XP balance is snapshotted
              permanently.
            </p>
          </div>

          <div className="border-l-4 border-l-muted-foreground bg-card border border-border shadow-lg p-6 space-y-2">
            <h3 className="font-display font-semibold text-foreground">
              4. Recognize others
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once you hold XP, you can give it to other people whose work
              you respect. Reputation flows through the network — not from a
              central authority deciding who matters.
            </p>
          </div>
        </div>
      </section>

      {/* Why feedback */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          Why feedback?
        </h2>
        <div className="bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Developers have git. They can point to commits, PRs, and
            contribution graphs. But most of the work that makes an ecosystem
            run isn&apos;t code — it&apos;s testing, reviewing, explaining,
            organizing, and giving honest feedback.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            None of that shows up on-chain today. Without verifiable proof of
            what people can do and have done, ecosystems default to informal
            reputation and relationship networks. XP replaces &ldquo;take my
            word for it&rdquo; with &ldquo;check the ledger.&rdquo;
          </p>
          <p className="text-foreground font-display font-semibold text-lg">
            This experiment is scaffolding — designed to be outgrown by
            whatever the community builds next.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="space-y-6 pb-12">
        <h2 className="font-display font-bold text-2xl text-foreground">
          Start giving feedback
        </h2>
        <div className="bg-card border border-border shadow-lg p-8 space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            Connect a Cardano wallet, mint an access token, and pick up your
            first feedback task. The access token is free on preprod — you
            just need a preprod wallet with test ADA.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/"
              className="inline-flex items-center px-5 py-2.5 bg-secondary text-secondary-foreground font-display font-semibold text-sm shadow-lg hover:shadow-xl transition-all"
            >
              Connect Wallet
            </Link>
            <Link
              href={CARDANO_XP.routes.project}
              className="inline-flex items-center px-5 py-2.5 border border-border text-foreground font-display font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:bg-foreground/5"
            >
              Browse Feedback Tasks
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
