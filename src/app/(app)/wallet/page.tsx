"use client";

import Image from "next/image";
import { CopyId } from "~/components/andamio/copy-id";
import { useProjectWallet } from "~/hooks/api/use-project-wallet";
import { formatAda } from "~/lib/cardano-utils";
import type { TxDirection } from "~/hooks/api/use-project-wallet";

const DIRECTION_LABELS: Record<TxDirection, { label: string; color: string }> = {
  received: { label: "Received", color: "text-emerald-500" },
  sent: { label: "Sent", color: "text-red-400" },
  internal: { label: "Internal", color: "text-muted-foreground" },
};

export default function WalletPage() {
  const { address, balanceAda, transactions, isLoading, error } =
    useProjectWallet();

  return (
    <div className="space-y-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-4">
          <Image
            src="/logos/xp-token.png"
            alt="XP Token"
            width={64}
            height={64}
            className="rounded-full"
          />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
              Wallet
            </p>
            <h1 className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-foreground leading-[1.1]">
              Project{" "}
              <span className="text-secondary">transparency.</span>
            </h1>
          </div>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Every ADA spent on this project and every donation from the
          community is recorded on-chain. This is the wallet.
        </p>
      </div>

      {/* Address + Donate */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Project address
        </h2>
        <div className="border border-border rounded-lg p-6 space-y-4">
          <CopyId id={address} label="Project wallet address" className="text-xs" />
          <p className="text-sm text-muted-foreground">
            Click the address to copy it. Send ADA from your own wallet to
            support the project.
          </p>
        </div>
      </section>

      {/* Balance stats */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Balance
        </h2>
        {isLoading ? (
          <div className="border border-border rounded-lg p-6">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">
              Unable to load balance. The Koios API may be temporarily
              unavailable.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg p-6">
            <p className="font-display font-bold text-3xl text-foreground">
              {formatAda(balanceAda)}
            </p>
          </div>
        )}
      </section>

      {/* Transaction log */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
          Transactions
        </h2>
        {isLoading ? (
          <div className="border border-border rounded-lg p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : error ? (
          <div className="border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">
              Unable to load transactions.
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">
              No transactions yet. This wallet will record all project
              spending and community donations.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
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
                {transactions.map((tx) => {
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
                      <td className="p-4 text-right font-mono text-foreground">
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
        )}
      </section>

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}
