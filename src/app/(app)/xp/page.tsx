const STATS = [
  { label: "Total Supply", value: "100,000", unit: "XP", detail: "Fixed. One-time mint.", accent: "text-secondary" },
  { label: "Mint Mechanism", value: "Tasks", unit: "only", detail: "No buying. No airdrops.", accent: "text-primary" },
  { label: "Credentials", value: "On-chain", unit: "", detail: "Composable, verifiable, permanent.", accent: "text-success" },
  { label: "Platform", value: "Permissionless", unit: "", detail: "Host a project, distribute XP.", accent: "text-foreground" },
] as const;

export default function XPPage() {
  return (
    <div className="space-y-16">
      {/* Hero header */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          Tokenomics
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          Let&apos;s try something{" "}
          <span className="text-secondary">different</span> with tokens.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          This is not for everybody. But if you want to start really using
          Cardano — and to leave social media behind for real collaboration —
          this is for you.
        </p>
      </div>

      {/* The mechanism */}
      <section className="space-y-6">
        <div className="grid gap-px md:grid-cols-3 bg-border">
          <div className="bg-card p-8 space-y-3">
            <span className="font-mono text-3xl font-bold text-secondary/30">01</span>
            <h3 className="font-display font-bold text-xl text-foreground">
              Earn XP
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Do real work. Give feedback, submit improvements, complete tasks.
              XP is minted to your wallet — you can&apos;t buy it, only earn it.
            </p>
          </div>
          <div className="bg-card p-8 space-y-3">
            <span className="font-mono text-3xl font-bold text-primary/30">02</span>
            <h3 className="font-display font-bold text-xl text-foreground">
              Build reputation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your XP balance is your track record. Claim a credential and your
              balance is snapshotted permanently on-chain. That credential is
              yours — it doesn&apos;t depend on this app.
            </p>
          </div>
          <div className="bg-card p-8 space-y-3">
            <span className="font-mono text-3xl font-bold text-success/30">03</span>
            <h3 className="font-display font-bold text-xl text-foreground">
              Let others earn it too
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once you hold XP, you can give it to others. Recognize people
              who are doing good work. Reputation flows through the network,
              not from a central authority.
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
              <span className={`text-3xl font-display font-bold ${stat.accent}`}>
                {stat.value}
              </span>
              {stat.unit && (
                <span className="text-sm font-mono text-muted-foreground">{stat.unit}</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{stat.detail}</p>
          </div>
        ))}
      </div>

      {/* The problem */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          The problem
        </h2>
        <div className="border-l-4 border-l-secondary bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-lg text-muted-foreground leading-relaxed">
            Five and a half years of Catalyst. Hundreds of funded proposals. Thousands of
            contributors. Nothing on-chain to show for any of it.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Developers have git. They can point to commits, PRs, and
            contribution graphs. But for everyone who isn&apos;t a developer —
            designers, educators, community builders, operators — there&apos;s
            nothing. You tell stories. You say &ldquo;take my word for it.&rdquo;
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If you want to build up a history of contribution on Cardano
            and you don&apos;t have a GitHub profile to point to, this experiment
            is a place to start.
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
              { step: "1", action: "Complete a task", result: "Earn XP" },
              { step: "2", action: "Hit a threshold", result: "Claim credential" },
              { step: "3", action: "Credential recognized", result: "Unlock prerequisites" },
              { step: "4", action: "Hold XP", result: "Give to others" },
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
            This is not learn-to-earn. This is not a financial token. XP has no
            market value and is not designed to be traded.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            XP is a reputation token. The reward is proof you showed up and did
            something useful — recorded on-chain, composable, permanent.
          </p>
          <p className="font-display font-semibold text-secondary text-lg">
            Put your track record on-chain.
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
            on-chain reputation means something in practice.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If it does, we continue with V2 of this token. The people who
            earned XP in V1 will have a say in what that looks like.
          </p>
        </div>
      </section>

      {/* Permissionless */}
      <section className="space-y-6 pb-12">
        <h2 className="font-display font-bold text-2xl text-foreground">
          Permissionless
        </h2>
        <div className="bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Anyone can set up a project on the Andamio protocol and distribute
            XP to contributors. It takes a few steps, but no one needs to
            approve you.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            XP earned on any project is composable — other projects can set
            prerequisites based on your XP balance. Strangers build on each
            other&apos;s credentials without coordination.
          </p>
        </div>
      </section>
    </div>
  );
}
