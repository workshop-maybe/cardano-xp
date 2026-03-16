const STATS = [
  { label: "Total Supply", value: "100,000", unit: "XP", prefix: "", accent: "text-secondary" },
  { label: "Distribution", value: "Tasks", unit: "only", prefix: "", accent: "text-primary" },
  { label: "Credentials", value: "Andamio", unit: "", prefix: "on", accent: "text-success" },
  { label: "Moderation", value: "Humans", unit: "", prefix: "by", accent: "text-foreground" },
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
          Whether you&apos;re a user, an expert, a tinkerer, or a curious
          ADA holder exploring what you can do on Cardano, this is for you.
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
              on-chain, verifiable by anyone. Claim a credential and your XP
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

      {/* The problem */}
      <section className="space-y-6">
        <h2 className="font-display font-bold text-2xl text-foreground">
          The problem
        </h2>
        <div className="border-l-4 border-l-secondary bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-xl text-foreground font-display font-semibold leading-snug">
            Developers have git commits. The rest of us have Twitter.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If you write code, you can point to your contribution graph. PRs,
            commits, repos — verifiable proof you showed up and did something.
            But for everyone else — community reviewers, educators, product testers,
            facilitators — there&apos;s nothing. You post threads. You hope people
            remember.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Five and a half years of Catalyst. Hundreds of funded proposals.
            Thousands of contributors. Almost nothing on-chain to show for it.
            If you want verifiable proof of contribution and you don&apos;t have
            a GitHub profile, this experiment is a place to start.
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
              { step: "2", action: "Submit your feedback", result: "Earn XP on-chain" },
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
            This is not learn-to-earn. This is not a financial token. XP has no
            market value and is not designed to be traded.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This is a feedback collection mechanism. It takes time to give good
            feedback, and that time should be rewarded. The reward is proof you
            showed up and did something useful — recorded on-chain, composable,
            permanent.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Without verifiable proof of what people can do and have done,
            ecosystems default to informal reputation and relationship networks.
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
            on-chain reputation means something in practice.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If it does, we continue with V2 of this token. The people who
            earned XP in V1 will have a say in what that looks like.
          </p>
        </div>
      </section>

      {/* CTA for devs */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            For developers
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            Want feedback on what you&apos;re building?
          </h2>
        </div>
        <div className="bg-card border border-border shadow-lg p-8 space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            Set up a project on the Andamio protocol, create feedback tasks,
            and distribute XP to the people who help you improve your work.
            You get real, structured feedback from the community. They get
            on-chain proof they contributed.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            This experiment is scaffolding — designed to be outgrown by
            whatever the community builds next. The protocol is open. The
            tools are ready. If you&apos;re building on Cardano and want
            community input, this is a way to make that exchange real.
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
