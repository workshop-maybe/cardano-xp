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
import type { TreasuryFunding } from "~/hooks/api/project/use-project";
import { cn } from "~/lib/utils";

export interface TreasuryBalanceCardProps {
  treasuryFundings: TreasuryFunding[];
  treasuryAddress?: string;
  /** API-computed treasury balance (preferred over summing fundings) */
  treasuryBalance?: number;
  className?: string;
}

export function TreasuryBalanceCard({
  treasuryAddress,
  className,
}: TreasuryBalanceCardProps) {
  // Fixed XP total supply for this experiment
  const totalSupply = 100_000;

  return (
    <AndamioCard className={cn("", className)}>
      <AndamioCardHeader className="pb-3">
        <AndamioCardTitle className="text-base flex items-center gap-2">
          <TreasuryIcon className="h-4 w-4" />
          XP Treasury
        </AndamioCardTitle>
      </AndamioCardHeader>
      <AndamioCardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-secondary">
            {totalSupply.toLocaleString()}
          </span>
          <span className="text-lg font-medium text-muted-foreground">XP</span>
        </div>
        <AndamioText variant="small" className="text-muted-foreground">
          Fixed supply — tasks are the only mint
        </AndamioText>
        {treasuryAddress && (
          <div className="pt-2 border-t">
            <AndamioText variant="small" className="text-muted-foreground">
              Treasury address
            </AndamioText>
            <AndamioText
              variant="small"
              className="font-mono break-all"
            >
              {treasuryAddress}
            </AndamioText>
          </div>
        )}
      </AndamioCardContent>
    </AndamioCard>
  );
}
