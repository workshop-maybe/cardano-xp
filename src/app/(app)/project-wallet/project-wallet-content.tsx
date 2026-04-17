"use client";

import Link from "next/link";
import { CARDANO_XP } from "~/config/cardano-xp";
import { PUBLIC_ROUTES } from "~/config/routes";
import { useProject } from "~/hooks/api/project/use-project";
import { useProjectWallet } from "~/hooks/api/use-project-wallet";
import type { TxDirection } from "~/hooks/api/use-project-wallet";
import { AndamioPageLoading, AndamioErrorAlert } from "~/components/andamio";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { TreasuryBalanceCard } from "~/components/studio/treasury-balance-card";
import { formatAda } from "~/lib/cardano-utils";
import { getAddressExplorerUrl } from "~/lib/constants";

const DIRECTION_LABELS: Record<TxDirection, { label: string; color: string }> = {
  received: { label: "Received", color: "text-emerald-500" },
  sent: { label: "Sent", color: "text-red-400" },
  internal: { label: "Internal", color: "text-muted-foreground" },
};

export function ProjectWalletContent() {
  const { data: project, isLoading, error } = useProject(CARDANO_XP.projectId);
  const wallet = useProjectWallet();

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
          project wallet
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

      {/* Transaction history */}
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            ledger
          </p>
          <h2 className="font-display font-bold text-2xl text-foreground">
            Transaction history
          </h2>
        </div>
        {wallet.isLoading ? (
          <div className="border border-border rounded-lg p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : wallet.error ? (
          <div className="border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">
              Unable to load transactions. The Koios API may be temporarily unavailable.
            </p>
          </div>
        ) : wallet.transactions.length === 0 ? (
          <div className="border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">
              No transactions yet.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Mobile: stacked card list */}
            <ul className="divide-y divide-border sm:hidden">
              {wallet.transactions.map((tx) => {
                const { label, color } = DIRECTION_LABELS[tx.direction];
                return (
                  <li key={tx.txHash} className="p-3 space-y-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`font-medium ${color}`}>{label}</span>
                      <span className="font-mono text-foreground whitespace-nowrap">
                        {tx.adaAmount >= 0 ? "+" : ""}
                        {formatAda(Math.abs(tx.adaAmount))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        {tx.timestamp.toLocaleDateString()}
                      </span>
                      <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-secondary hover:underline"
                      >
                        {tx.txHash.slice(0, 8)}...
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop/tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground font-mono text-xs uppercase tracking-wider">
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-right">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.transactions.map((tx) => {
                    const { label, color } = DIRECTION_LABELS[tx.direction];
                    return (
                      <tr
                        key={tx.txHash}
                        className="border-b border-border last:border-0"
                      >
                        <td className="p-4 text-muted-foreground">
                          {tx.timestamp.toLocaleDateString()}
                        </td>
                        <td className={`p-4 font-medium ${color}`}>
                          {label}
                        </td>
                        <td className="p-4 text-right font-mono text-foreground whitespace-nowrap">
                          {tx.adaAmount >= 0 ? "+" : ""}
                          {formatAda(Math.abs(tx.adaAmount))}
                        </td>
                        <td className="p-4 text-right">
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-secondary hover:underline"
                          >
                            {tx.txHash.slice(0, 8)}...
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {project.treasuryAddress && (
          <AndamioButton asChild variant="outline">
            <a
              href={getAddressExplorerUrl(project.treasuryAddress)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on block explorer &rarr;
            </a>
          </AndamioButton>
        )}
      </section>

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
