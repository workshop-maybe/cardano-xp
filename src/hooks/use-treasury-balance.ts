import { useQuery } from "@tanstack/react-query";
import { env } from "~/env";
import { CARDANO_XP } from "~/config/cardano-xp";

interface AddressAmount {
  unit: string;
  quantity: string;
}

interface TreasuryBalance {
  ada: number;
  xp: number;
}

const XP_UNIT =
  CARDANO_XP.xpToken.policyId + CARDANO_XP.xpToken.assetName;

const BLOCKFROST_BASE =
  `https://cardano-${env.NEXT_PUBLIC_CARDANO_NETWORK ?? "preprod"}.blockfrost.io/api/v0`;

async function fetchTreasuryBalance(): Promise<TreasuryBalance> {
  const key = env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID;
  if (!key) throw new Error("Blockfrost key not configured");

  const res = await fetch(
    `${BLOCKFROST_BASE}/addresses/${CARDANO_XP.projectWallet.address}`,
    { headers: { project_id: key } },
  );

  if (!res.ok) {
    if (res.status === 404) return { ada: 0, xp: 0 };
    throw new Error(`Blockfrost ${res.status}`);
  }

  const data = (await res.json()) as { amount: AddressAmount[] };

  const lovelace = data.amount.find((a) => a.unit === "lovelace");
  const xp = data.amount.find((a) => a.unit === XP_UNIT);

  return {
    ada: lovelace ? Number(lovelace.quantity) / 1_000_000 : 0,
    xp: xp ? Number(xp.quantity) : 0,
  };
}

export function useTreasuryBalance() {
  return useQuery({
    queryKey: ["treasury-balance", CARDANO_XP.projectWallet.address],
    queryFn: fetchTreasuryBalance,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
