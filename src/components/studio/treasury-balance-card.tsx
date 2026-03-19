"use client";

import React from "react";
import {
  AndamioCard,
  AndamioCardContent,
  AndamioCardHeader,
  AndamioCardTitle,
} from "~/components/andamio/andamio-card";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioSkeleton } from "~/components/andamio";
import { TreasuryIcon } from "~/components/icons";
import { useTreasuryBalance } from "~/hooks/use-treasury-balance";
import { CARDANO_XP } from "~/config/cardano-xp";
import { cn } from "~/lib/utils";

export function TreasuryBalanceCard({ className }: { className?: string }) {
  const { data: balance, isLoading } = useTreasuryBalance();

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
            {isLoading ? (
              <AndamioSkeleton className="h-8 w-24 mt-1" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-secondary">
                  {(balance?.xp ?? 0).toLocaleString()}
                </span>
                <span className="text-sm font-medium text-muted-foreground">XP</span>
              </div>
            )}
          </div>
          <div>
            <AndamioText variant="small" className="text-muted-foreground">
              ADA Balance
            </AndamioText>
            {isLoading ? (
              <AndamioSkeleton className="h-8 w-24 mt-1" />
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-primary">
                  {(balance?.ada ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-sm font-medium text-muted-foreground">ADA</span>
              </div>
            )}
          </div>
        </div>

        <AndamioText variant="small" className="text-muted-foreground">
          Fixed supply — tasks are the only mint
        </AndamioText>

        <div className="pt-2 border-t">
          <AndamioText variant="small" className="text-muted-foreground">
            Treasury address
          </AndamioText>
          <AndamioText variant="small" className="font-mono break-all">
            {CARDANO_XP.projectWallet.address}
          </AndamioText>
        </div>
      </AndamioCardContent>
    </AndamioCard>
  );
}
