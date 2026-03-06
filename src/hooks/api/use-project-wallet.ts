"use client";

import { useQuery } from "@tanstack/react-query";
import { CARDANO_XP } from "~/config/cardano-xp";
import { env } from "~/env";

// =============================================================================
// Types
// =============================================================================

export type TxDirection = "received" | "sent" | "internal";

export interface WalletTransaction {
  txHash: string;
  direction: TxDirection;
  /** Net ADA movement (positive = received, negative = sent) */
  adaAmount: number;
  timestamp: Date;
  explorerUrl: string;
}

// =============================================================================
// Koios response types
// =============================================================================

interface KoiosAddressInfo {
  balance: string;
}

interface KoiosAddressTx {
  tx_hash: string;
  block_height: number;
}

interface KoiosTxOutput {
  payment_addr: { bech32: string };
  value: string;
}

interface KoiosTxInput {
  payment_addr: { bech32: string };
  value: string;
}

interface KoiosTxInfo {
  tx_hash: string;
  tx_timestamp: number;
  inputs: KoiosTxInput[];
  outputs: KoiosTxOutput[];
}

// =============================================================================
// Helpers
// =============================================================================

const KOIOS_PROXY = "/api/koios";
const PAGE_SIZE = 20;

function safeParseLovelace(value: string): number {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getExplorerBaseUrl(): string {
  const network = env.NEXT_PUBLIC_CARDANO_NETWORK;
  if (network === "mainnet") return "https://cardanoscan.io";
  return `https://${network}.cardanoscan.io`;
}

function classifyTx(
  tx: KoiosTxInfo,
  address: string,
): { direction: TxDirection; adaAmount: number } {
  const inputSum = tx.inputs
    .filter((i) => i.payment_addr.bech32 === address)
    .reduce((sum, i) => sum + safeParseLovelace(i.value), 0);

  const outputSum = tx.outputs
    .filter((o) => o.payment_addr.bech32 === address)
    .reduce((sum, o) => sum + safeParseLovelace(o.value), 0);

  const netLovelace = outputSum - inputSum;
  const adaAmount = netLovelace / 1_000_000;

  if (inputSum === 0) return { direction: "received", adaAmount };
  if (outputSum === 0 || netLovelace < 0) return { direction: "sent", adaAmount };
  return { direction: "internal", adaAmount };
}

// =============================================================================
// Fetchers
// =============================================================================

async function fetchBalance(address: string): Promise<number> {
  const res = await fetch(`${KOIOS_PROXY}/address_info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _addresses: [address] }),
  });

  if (!res.ok) throw new Error(`Failed to fetch balance: ${res.statusText}`);

  const data = (await res.json()) as KoiosAddressInfo[];
  const info = data[0];
  if (!info) return 0;

  return safeParseLovelace(info.balance) / 1_000_000;
}

async function fetchTransactions(
  address: string,
  limit: number,
): Promise<WalletTransaction[]> {
  // Step 1: Get tx hashes
  const txListRes = await fetch(`${KOIOS_PROXY}/address_txs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _addresses: [address], _after_block_height: 0 }),
  });

  if (!txListRes.ok) throw new Error(`Failed to fetch tx list: ${txListRes.statusText}`);

  const txList = (await txListRes.json()) as KoiosAddressTx[];
  if (!txList.length) return [];

  // Sort by block height descending (newest first) to pick the most recent batch
  const batch = [...txList]
    .sort((a, b) => b.block_height - a.block_height)
    .slice(0, limit);

  // Step 2: Get full tx info
  const txInfoRes = await fetch(`${KOIOS_PROXY}/tx_info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _tx_hashes: batch.map((t) => t.tx_hash) }),
  });

  if (!txInfoRes.ok) throw new Error(`Failed to fetch tx info: ${txInfoRes.statusText}`);

  const txInfos = (await txInfoRes.json()) as KoiosTxInfo[];
  const explorerBase = getExplorerBaseUrl();

  return [...txInfos]
    .sort((a, b) => b.tx_timestamp - a.tx_timestamp)
    .map((tx) => {
      const { direction, adaAmount } = classifyTx(tx, address);
      return {
        txHash: tx.tx_hash,
        direction,
        adaAmount,
        timestamp: new Date(tx.tx_timestamp * 1000),
        explorerUrl: `${explorerBase}/transaction/${tx.tx_hash}`,
      };
    });
}

// =============================================================================
// Hook
// =============================================================================

export function useProjectWallet() {
  const address = CARDANO_XP.projectWallet.address;

  const balanceQuery = useQuery({
    queryKey: ["projectWallet", "balance"],
    queryFn: () => fetchBalance(address),
    staleTime: 30_000,
  });

  const txQuery = useQuery({
    queryKey: ["projectWallet", "transactions"],
    queryFn: () => fetchTransactions(address, PAGE_SIZE),
    staleTime: 30_000,
  });

  return {
    address,
    balanceAda: balanceQuery.data ?? 0,
    transactions: txQuery.data ?? [],
    isLoading: balanceQuery.isLoading || txQuery.isLoading,
    error: balanceQuery.error ?? txQuery.error,
  };
}
