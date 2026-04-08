/**
 * Transaction Watcher Bridge
 *
 * Thin "use client" component that bridges React context to the global
 * tx-watcher-store (which has no React dependency).
 *
 * Responsibilities:
 * - Syncs the JWT from auth context into the store on every change
 * - Clears all tracked transactions on logout
 * - Runs periodic cleanup of stale entries (every 5 minutes)
 * - Recovers pending TX registrations from localStorage on mount
 *
 * Does NOT wrap children in a Context — the store is accessed via import.
 *
 * @see src/stores/tx-watcher-store.ts - The global store
 * @see src/lib/pending-tx-registrations.ts - Persistence for failed registrations
 */

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { txWatcherStore, getPersistedTxs } from "~/stores/tx-watcher-store";
import { registerTransaction } from "~/hooks/tx/use-tx-watcher";
import { pendingTxRegistrations } from "~/lib/pending-tx-registrations";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const RECOVERY_DELAY_MS = 3_000; // Wait for app to settle before recovery

export function TxWatcherBridge({ children }: { children: ReactNode }) {
  const { jwt, user } = useAndamioAuth();
  const prevJwtRef = useRef<string | null | undefined>(undefined);
  const recoveryRanRef = useRef(false);

  // Sync JWT into the store whenever it changes
  useEffect(() => {
    txWatcherStore.getState().updateJwt(jwt ?? null);

    // If JWT changed from something to null (logout), clear all tracked TXs
    // and reset recovery guard so next login triggers recovery
    if (prevJwtRef.current && !jwt) {
      txWatcherStore.getState().clearAll();
      recoveryRanRef.current = false;
    }

    prevJwtRef.current = jwt;
  }, [jwt]);

  // Sync alias into the store whenever it changes
  useEffect(() => {
    txWatcherStore.getState().updateAlias(user?.accessTokenAlias ?? null);
  }, [user?.accessTokenAlias]);

  // Rehydrate persisted transactions when JWT and alias become available (crash recovery)
  useEffect(() => {
    if (!jwt || !user?.accessTokenAlias) return;

    const persisted = getPersistedTxs(user.accessTokenAlias);
    const store = txWatcherStore.getState();

    for (const tx of persisted) {
      // register() is idempotent — skips if already tracked
      store.register(tx.txHash, tx.txType, tx.toastConfig, tx.registeredAt);
    }
  }, [jwt, user?.accessTokenAlias]);

  // Periodic cleanup of stale transaction entries
  useEffect(() => {
    const interval = setInterval(() => {
      txWatcherStore.getState().cleanup();
    }, CLEANUP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Recover pending TX registrations from localStorage on mount
  useEffect(() => {
    if (!jwt || recoveryRanRef.current) return;
    recoveryRanRef.current = true;

    let aborted = false;
    const timer = setTimeout(() => {
      if (aborted) return;

      pendingTxRegistrations.pruneExpired();
      const pending = pendingTxRegistrations.getAll();
      if (pending.length === 0) return;

      console.log(`[tx-recovery] Found ${pending.length} pending registration(s), attempting recovery`);

      // Recover each independently — don't let one failure block others
      for (const entry of pending) {
        void (async () => {
          if (aborted) return;
          try {
            await registerTransaction(entry.txHash, entry.txType, jwt, entry.metadata);
            pendingTxRegistrations.remove(entry.txHash);
            toast.success("Recovered pending transaction", {
              description: `Transaction ${entry.txHash.slice(0, 8)}... has been registered.`,
            });
            console.log(`[tx-recovery] Recovered ${entry.txHash}`);
          } catch (error) {
            console.warn(`[tx-recovery] Failed to recover ${entry.txHash}:`, error);
            // Leave in localStorage for next load — don't toast to avoid spam
          }
        })();
      }
    }, RECOVERY_DELAY_MS);

    return () => {
      aborted = true;
      clearTimeout(timer);
    };
  }, [jwt]);

  return <>{children}</>;
}
