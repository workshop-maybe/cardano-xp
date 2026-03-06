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
 *
 * Does NOT wrap children in a Context — the store is accessed via import.
 *
 * @see src/stores/tx-watcher-store.ts - The global store
 */

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { txWatcherStore, getPersistedTxs } from "~/stores/tx-watcher-store";

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function TxWatcherBridge({ children }: { children: ReactNode }) {
  const { jwt, user } = useAndamioAuth();
  const prevJwtRef = useRef<string | null | undefined>(undefined);

  // Sync JWT into the store whenever it changes
  useEffect(() => {
    txWatcherStore.getState().updateJwt(jwt ?? null);

    // If JWT changed from something to null (logout), clear all tracked TXs
    if (prevJwtRef.current && !jwt) {
      txWatcherStore.getState().clearAll();
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

  return <>{children}</>;
}
