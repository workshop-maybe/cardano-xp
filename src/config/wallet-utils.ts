/**
 * Wallet address display truncation.
 * Shows first 8 and last 4 characters: "addr1q2x...y7z9"
 */
export const WALLET_TRUNCATION = {
  start: 8,
  end: 4,
} as const;

/**
 * Helper to truncate a wallet address consistently.
 */
export function truncateWalletAddress(address: string | undefined): string {
  if (!address) return "";
  const { start, end } = WALLET_TRUNCATION;
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
