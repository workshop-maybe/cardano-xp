"use client";

import React from "react";
import {
  AndamioCard,
  AndamioCardContent,
  AndamioCardHeader,
  AndamioCardTitle,
} from "~/components/andamio/andamio-card";
import { AndamioText } from "~/components/andamio/andamio-text";
import { TreasuryIcon } from "~/components/icons";
import { CARDANO_XP } from "~/config/cardano-xp";
import { cn } from "~/lib/utils";
import type { TaskToken } from "~/hooks/api/project/use-project";

export interface TreasuryBalanceCardProps {
  /** Spendable lovelace in the treasury (from API) */
  treasuryBalance?: number;
  /** Native assets in the treasury UTxO */
  treasuryAssets?: TaskToken[];
  /** On-chain treasury address */
  treasuryAddress?: string;
  className?: string;
}

export function TreasuryBalanceCard({
  treasuryBalance,
  treasuryAssets,
  treasuryAddress,
  className,
}: TreasuryBalanceCardProps) {
  const xpBalance = treasuryAssets?.find(
    (t) => t.policyId === CARDANO_XP.xpToken.policyId
  )?.quantity ?? 0;

  const adaBalance = treasuryBalance != null ? treasuryBalance / 1_000_000 : 0;

  return (
    <AndamioCard className={cn("", className)}>
      <AndamioCardHeader className="pb-3">
        <AndamioCardTitle className="text-base flex items-center gap-2">
          <TreasuryIcon className="h-4 w-4" />
          XP Treasury
        </AndamioCardTitle>
      </AndamioCardHeader>
      <AndamioCardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <AndamioText variant="small" className="text-muted-foreground">
              XP Balance
            </AndamioText>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-secondary">
                {xpBalance.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-muted-foreground">XP</span>
            </div>
          </div>
          <div>
            <AndamioText variant="small" className="text-muted-foreground">
              ADA Balance
            </AndamioText>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-primary">
                {adaBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-sm font-medium text-muted-foreground">ADA</span>
            </div>
          </div>
        </div>

        <AndamioText variant="small" className="text-muted-foreground">
          Fixed supply — tasks are the only mint
        </AndamioText>

        {treasuryAddress && (
          <div className="pt-2 border-t">
            <AndamioText variant="small" className="text-muted-foreground">
              Treasury address
            </AndamioText>
            <AndamioText variant="small" className="font-mono break-all">
              {treasuryAddress}
            </AndamioText>
          </div>
        )}
      </AndamioCardContent>
    </AndamioCard>
  );
}
