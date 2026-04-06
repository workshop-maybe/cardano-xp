"use client";

import Link from "next/link";
import { CARDANO_XP } from "~/config/cardano-xp";
import { PUBLIC_ROUTES } from "~/config/routes";
import { useProject } from "~/hooks/api/project/use-project";
import { AndamioPageLoading, AndamioErrorAlert } from "~/components/andamio";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { TreasuryBalanceCard } from "~/components/studio/treasury-balance-card";
import { getAddressExplorerUrl } from "~/lib/constants";

export function TransparencyContent() {
  const { data: project, isLoading, error } = useProject(CARDANO_XP.projectId);

  if (isLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (error) {
    return <AndamioErrorAlert error={error.message ?? "Failed to load project data"} />;
  }

  if (!project) {
    return <AndamioErrorAlert error="Project data not available" />;
  }

  return (
    <div className="space-y-16 max-w-2xl mx-auto">
      {/* Hero */}
      <div className="space-y-4 pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          transparency
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
          Every ada is on the{" "}
          <span className="text-secondary">ledger.</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          All sponsor funds land in the project treasury. The ledger is the
          receipt.
        </p>
      </div>

      {/* Treasury balance */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            treasury
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            Current balance
          </h2>
        </div>
        <TreasuryBalanceCard
          treasuryBalance={project.treasuryBalance}
          treasuryAssets={project.treasuryAssets}
          treasuryAddress={project.treasuryAddress}
        />
      </section>

      {/* Block explorer link */}
      {project.treasuryAddress && (
        <section className="space-y-4">
          <AndamioButton asChild variant="outline">
            <a
              href={getAddressExplorerUrl(project.treasuryAddress)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View full transaction history &rarr;
            </a>
          </AndamioButton>
        </section>
      )}

      {/* Footer link */}
      <section className="pb-12">
        <div className="border-l-4 border-secondary bg-card border border-border shadow-lg p-4 sm:p-8">
          <p className="text-foreground leading-relaxed">
            Want to support this project?{" "}
            <Link
              href={PUBLIC_ROUTES.sponsors}
              className="text-secondary hover:underline"
            >
              Become a sponsor &rarr;
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
