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
          What is this?
        </h1>
      </div>

      {/* The story */}
      <section className="space-y-6">
        <div className="border-l-4 border-l-secondary bg-card border border-border shadow-lg p-8 space-y-5">
          <p className="text-lg text-foreground leading-relaxed font-medium">
            This app was built in about three hours of vibe coding on a Sunday afternoon.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            It runs on the Andamio protocol and it was built with Claude Code.
            The entire process is documented in the{" "}
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
          <p className="text-muted-foreground leading-relaxed">
            Forgive the AI slop. That&apos;s the point.
          </p>
        </div>
      </section>

      {/* What you can do */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          What you can do here
        </h2>
        <div className="space-y-4">
          <div className="border-l-4 border-l-secondary bg-card border border-border shadow-lg p-6 space-y-2">
            <h3 className="font-display font-semibold text-foreground">
              Give feedback
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              See something broken? Something confusing? Something that could be
              better? Pick up a feedback task and tell us what you think. Every
              piece of feedback improves this app.
            </p>
          </div>

          <div className="border-l-4 border-l-primary bg-card border border-border shadow-lg p-6 space-y-2">
            <h3 className="font-display font-semibold text-foreground">
              Earn XP
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Complete feedback tasks and earn XP — a reputation token on
              Cardano. XP is not a financial instrument. It&apos;s proof that
              you showed up and did something useful, recorded permanently
              on-chain.
            </p>
          </div>

          <div className="border-l-4 border-l-success bg-card border border-border shadow-lg p-6 space-y-2">
            <h3 className="font-display font-semibold text-foreground">
              Build your track record
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you claim a credential, your XP balance is snapshotted
              permanently. That credential lives on-chain — composable,
              verifiable, independent of this app. Your reputation is yours.
            </p>
          </div>
        </div>
      </section>

      {/* Why this exists */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          Why this exists
        </h2>
        <div className="bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Five and a half years of Catalyst. Hundreds of funded proposals.
            Thousands of contributors. Nothing on-chain to show for any of it.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If you want to prove you&apos;ve been building on Cardano, you share
            screenshots of your git commit history. You tell stories. You
            say &ldquo;take my word for it.&rdquo;
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We have a public ledger. We should use it. XP is the experiment —
            can we use Cardano to build real, verifiable reputation for
            non-financial work?
          </p>
          <p className="text-foreground font-display font-semibold text-lg">
            Not DeFi. Not NFTs. Proof that you did something useful.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="space-y-6 pb-12">
        <h2 className="font-display font-bold text-2xl text-foreground">
          Get started
        </h2>
        <div className="bg-card border border-border shadow-lg p-8 space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            Connect a Cardano wallet, mint an access token, and start
            contributing. The access token is free to mint on preprod — you
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
              View Tasks
            </Link>
            <Link
              href="/xp"
              className="inline-flex items-center px-5 py-2.5 border border-border text-foreground font-display font-semibold text-sm shadow-lg hover:shadow-xl transition-all hover:bg-foreground/5"
            >
              Read Tokenomics
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
