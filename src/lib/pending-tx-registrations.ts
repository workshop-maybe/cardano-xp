/**
 * Persistence layer for TX registrations that failed after on-chain submission.
 *
 * When registerTransaction() fails (network blip, gateway cold start), the
 * registration payload is saved here so TxWatcherBridge can retry on next load.
 *
 * @see ~/components/providers/tx-watcher-provider.tsx - Recovery-on-load
 * @see ~/hooks/tx/use-tx-watcher.ts - registerTransaction with retry
 */

const STORAGE_KEY = "pendingTxRegistrations";
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface PendingTxRegistration {
  txHash: string;
  txType: string; // Gateway-mapped type (e.g., "project_join"), not frontend type
  metadata?: Record<string, string>;
  createdAt: number; // Date.now() timestamp
}

function readAll(): PendingTxRegistration[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingTxRegistration[];
  } catch {
    console.warn("[pending-tx-registrations] Failed to read localStorage, clearing");
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    return [];
  }
}

function writeAll(entries: PendingTxRegistration[]): void {
  if (typeof window === "undefined") return;
  try {
    if (entries.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  } catch (error) {
    console.warn("[pending-tx-registrations] Failed to write localStorage:", error);
  }
}

export const pendingTxRegistrations = {
  /** Get all pending registrations (safe for SSR, corrupted data, quota errors) */
  getAll: (): PendingTxRegistration[] => readAll(),

  /** Add a failed registration for later recovery */
  add: (entry: Omit<PendingTxRegistration, "createdAt">): void => {
    const entries = readAll();
    // Deduplicate by txHash
    const existing = entries.findIndex((e) => e.txHash === entry.txHash);
    if (existing !== -1) return;
    entries.push({ ...entry, createdAt: Date.now() });
    writeAll(entries);
  },

  /** Remove a registration after successful recovery */
  remove: (txHash: string): void => {
    const entries = readAll();
    writeAll(entries.filter((e) => e.txHash !== txHash));
  },

  /** Remove entries older than TTL (2 hours) */
  pruneExpired: (): void => {
    const entries = readAll();
    const cutoff = Date.now() - TTL_MS;
    const fresh = entries.filter((e) => e.createdAt > cutoff);
    if (fresh.length !== entries.length) {
      writeAll(fresh);
    }
  },
};
