"use client";

import React from "react";
import { cn } from "~/lib/utils";

/**
 * XP amount badge with token icon.
 * Used in task tables and reward displays.
 */
export function XpBadge({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1",
        className,
      )}
    >
      <img src="/logos/xp-token.png" alt="" className="h-5 w-5 rounded-full" />
      <span className="text-base font-bold tabular-nums text-secondary">
        {amount.toLocaleString()}
      </span>
      <span className="text-xs font-medium text-secondary/60">XP</span>
    </span>
  );
}
