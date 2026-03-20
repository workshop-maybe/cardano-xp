"use client";

import Link from "next/link";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { RegistrationFlow } from "~/components/landing/registration-flow";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { PUBLIC_ROUTES } from "~/config/routes";

export default function AndamioAccessTokenPage() {
  const { isAuthenticated, user } = useAndamioAuth();
  const hasToken = isAuthenticated && user?.accessTokenAlias;

  return (
    <div className="space-y-16 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          Access Token
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          The Andamio{" "}
          <span className="text-secondary">access token.</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Everything in this app happens on the Cardano blockchain. Your access
          token is the key. If you already have one, connect your wallet and
          you&apos;re in. If you don&apos;t, you can mint one here.
        </p>
      </div>

      {/* ── EXPLANATION ── What it is and why */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          What it is
        </h2>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>
            An Andamio access token is an NFT that lives in your wallet. It
            proves your identity on Cardano through cryptographic ownership,
            not through a username and password. Apps built on the Andamio
            protocol recognize it automatically.
          </p>
          <p>
            When you create your token, you choose an alias. This alias is
            a unique identifier that shows up on credentials, task
            completions, and contribution records across Andamio apps.
          </p>
          <p>
            Because the token lives on-chain, no central authority manages it
            and no one can revoke it. You control your identity. We recommend
            a dedicated wallet for this experiment.
          </p>
        </div>
      </section>

      {/* ── REFERENCE ── What happens on chain */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          What happens on chain
        </h2>
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Minting costs approximately 8 ADA.</strong>{" "}
              This covers the transaction fee plus the minimum UTXO value
              required by the Cardano protocol to hold the token. The ADA is
              not &ldquo;spent&rdquo; in the traditional sense — most of it is
              locked with the token and returned if the token is ever burned.
            </p>
            <p>
              <strong className="text-foreground">Every action is a transaction.</strong>{" "}
              Completing a task, claiming a credential, earning XP — each of
              these is a real Cardano transaction with a fee (typically 0.2–0.4
              ADA). You also earn ADA and tokens back as task rewards, so the
              flow goes both ways.
            </p>
            <p>
              <strong className="text-foreground">We recommend funding a fresh wallet with about 25 ADA.</strong>{" "}
              That gives you enough to mint your token and complete several
              tasks before needing to add more. Starting a new wallet also
              keeps your main funds separate from this experiment.
            </p>
          </div>
        </div>
      </section>

      {/* ── REFERENCE ── Cost summary table */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Cost summary
        </h2>
        <div className="bg-card border border-border shadow-lg rounded-lg overflow-hidden">
          <div className="divide-y divide-border">
            {[
              { action: "Mint access token", cost: "~8 ADA", note: "One-time. Most ADA locked with the token." },
              { action: "Transaction fee", cost: "~0.2–0.4 ADA", note: "Per on-chain action (submit, claim, etc.)." },
              { action: "Task reward", cost: "+2.5 ADA + XP", note: "Earned per completed task." },
              { action: "Recommended starting balance", cost: "~25 ADA", note: "Enough to mint and complete several tasks." },
            ].map((row) => (
              <div key={row.action} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-4">
                <span className="font-medium text-foreground sm:w-48 shrink-0">{row.action}</span>
                <span className="font-mono text-sm text-secondary sm:w-32 shrink-0">{row.cost}</span>
                <span className="text-sm text-muted-foreground">{row.note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW-TO ── Mint your token */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          How to get one
        </h2>
        <div className="border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">1</span>
            <div>
              <p className="font-medium text-foreground">Set up a Cardano wallet</p>
              <p className="text-sm text-muted-foreground">
                Install a browser wallet like Nami, Eternl, or Lace. We
                recommend creating a new wallet dedicated to this experiment.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">2</span>
            <div>
              <p className="font-medium text-foreground">Fund it with about 25 ADA and set collateral</p>
              <p className="text-sm text-muted-foreground">
                Send yourself 25 ADA, then set collateral in your wallet
                settings. Alternatively, send yourself two separate UTxOs — one
                with 20 ADA and one with 5 ADA — and use the 5 ADA UTxO as
                collateral. Collateral is required for smart contract
                transactions on Cardano.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-mono text-xl font-bold text-secondary/50">3</span>
            <div>
              <p className="font-medium text-foreground">Connect and mint</p>
              <p className="text-sm text-muted-foreground">
                Connect your wallet below, choose an alias, and sign the
                minting transaction. Your access token will appear in your
                wallet within a few minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Registration flow or status */}
      <section className="space-y-4">
        {hasToken ? (
          <div className="border border-secondary/30 bg-secondary/5 rounded-lg p-6 space-y-3">
            <p className="font-medium text-foreground">
              You already have an access token.
            </p>
            <p className="text-sm text-muted-foreground">
              You&apos;re signed in as{" "}
              <span className="font-mono text-secondary">{user?.accessTokenAlias}</span>.
              Your token is in your wallet and recognized by this app.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <AndamioButton asChild>
                <Link href={PUBLIC_ROUTES.courses}>Start Learning</Link>
              </AndamioButton>
              <AndamioButton asChild variant="outline">
                <Link href={PUBLIC_ROUTES.projects}>Browse Tasks</Link>
              </AndamioButton>
            </div>
          </div>
        ) : (
          <RegistrationFlow />
        )}
      </section>

      {/* ── EXPLANATION ── Cost feedback */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Tell us about the cost
        </h2>
        <div className="border border-secondary/30 bg-secondary/5 rounded-lg p-6 space-y-3">
          <p className="text-muted-foreground leading-relaxed">
            The economics of using this app are part of the experiment. Is
            8 ADA too much for a token? Are the transaction fees noticeable?
            Does earning ADA and XP back feel like it balances out?
          </p>
          <p className="text-foreground font-medium leading-relaxed">
            This is one of the things we most want feedback on. If the cost
            doesn&apos;t feel right, tell us.
          </p>
          <div className="pt-2">
            <AndamioButton asChild variant="outline">
              <a
                href="https://github.com/Andamio-Platform/cardano-xp/issues/new"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report Cost Feedback
              </a>
            </AndamioButton>
          </div>
        </div>
      </section>

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}
