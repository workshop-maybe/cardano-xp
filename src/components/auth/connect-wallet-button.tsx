"use client";

import React from "react";
import Image from "next/image";
import { useWallet, useWalletList } from "@meshsdk/react";
import type { Wallet } from "@meshsdk/common";
import { WalletIcon, LoadingIcon, SecurityAlertIcon } from "~/components/icons";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { useAndamioAuth } from "~/contexts/andamio-auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Mesh SDK logo SVG (kept for "Powered by" attribution)                     */
/* -------------------------------------------------------------------------- */

function MeshLogo({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      fill="currentColor"
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m289 127-45-60-45-60c-.9-1.3-2.4-2-4-2s-3.1.7-4 2l-37 49.3c-2 2.7-6 2.7-8 0l-37-49.3c-.9-1.3-2.4-2-4-2s-3.1.7-4 2l-45 60-45 60c-1.3 1.8-1.3 4.2 0 6l45 60c.9 1.3 2.4 2 4 2s3.1-.7 4-2l37-49.3c2-2.7 6-2.7 8 0l37 49.3c.9 1.3 2.4 2 4 2s3.1-.7 4-2l37-49.3c2-2.7 6-2.7 8 0l37 49.3c.9 1.3 2.4 2 4 2s3.1-.7 4-2l45-60c1.3-1.8 1.3-4.2 0-6zm-90-103.3 32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0l-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0zm-90 0 32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0l-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0zm-53 152.6-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0l32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0zm90 0-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0l32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0zm90 0-32.5-43.3c-1.3-1.8-1.3-4.2 0-6l32.5-43.3c2-2.7 6-2.7 8 0l32.5 43.3c1.3 1.8 1.3 4.2 0 6l-32.5 43.3c-2 2.7-6 2.7-8 0z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Single wallet icon button (matches Mesh's grid-of-icons layout)           */
/* -------------------------------------------------------------------------- */

function WalletIconButton({
  wallet,
  onClick,
  loading = false,
}: {
  wallet: Wallet;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center rounded-lg w-12 h-12",
            "border border-border bg-muted/50",
            "hover:bg-accent hover:border-foreground/20",
            "transition-colors cursor-pointer",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            loading && "border-primary/50 bg-primary/5"
          )}
          onClick={onClick}
          disabled={loading}
          aria-label={`Connect ${wallet.name} wallet`}
        >
          {loading ? (
            <LoadingIcon className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Image
              src={wallet.icon}
              alt={wallet.name}
              width={28}
              height={28}
              className="rounded-sm"
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{wallet.name}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/* -------------------------------------------------------------------------- */
/*  Connected button with dropdown (copy address, disconnect)                 */
/* -------------------------------------------------------------------------- */

function ConnectedDropdown() {
  const { address, name, disconnect } = useWallet();
  const wallets = useWalletList();
  const connectedWallet = wallets.find((w) => w.id === name);
  const { networkMismatch } = useAndamioAuth();
  const hasMismatch = networkMismatch !== null && !networkMismatch.match;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AndamioButton
          variant={hasMismatch ? "destructive" : "outline"}
          size="sm"
        >
          {hasMismatch ? (
            <SecurityAlertIcon className="h-4 w-4" />
          ) : connectedWallet?.icon ? (
            <Image
              src={connectedWallet.icon}
              alt={connectedWallet.name}
              width={20}
              height={20}
              className="rounded-sm"
            />
          ) : (
            <WalletIcon className="h-4 w-4" />
          )}
          <span>
            {hasMismatch
              ? "Wrong network"
              : `${address.slice(0, 6)}...${address.slice(-6)}`}
          </span>
        </AndamioButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Wallet</DropdownMenuLabel>
        {hasMismatch && networkMismatch ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground max-w-[260px]">
            Expected <strong>{networkMismatch.expected}</strong>, wallet on{" "}
            <strong>
              {networkMismatch.actualIsTestnet ? "a testnet" : "mainnet"}
            </strong>
            . Switch your wallet network and reconnect.
          </div>
        ) : null}
        {hasMismatch ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem
          onClick={() => void navigator.clipboard.writeText(address)}
        >
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()}>
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main export                                                                */
/* -------------------------------------------------------------------------- */

interface ConnectWalletButtonProps {
  className?: string;
  label?: string;
  onConnected?: () => void;
  persist?: boolean;
}

/**
 * Drop-in replacement for Mesh's CardanoWallet.
 *
 * Uses Mesh's useWallet + useWalletList hooks with our own design system.
 * Matches the original component structure: icon grid, tooltip names,
 * connected dropdown with copy address & disconnect.
 */
export function ConnectWalletButton({
  className,
  label = "Connect Wallet",
  onConnected,
  persist = true,
}: ConnectWalletButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [connectingId, setConnectingId] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const wallets = useWalletList();
  const { connect, connected, setPersist } = useWallet();

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => { setPersist(persist); }, [persist, setPersist]);
  React.useEffect(() => {
    if (connected) onConnected?.();
  }, [connected, onConnected]);

  const handleConnect = React.useCallback(
    async (walletId: string) => {
      setConnectingId(walletId);
      try {
        await connect(walletId, persist);
        setOpen(false);
      } catch {
        // User cancelled or wallet errored — stay on dialog
      } finally {
        setConnectingId(null);
      }
    },
    [connect, persist]
  );

  if (connected) {
    return <ConnectedDropdown />;
  }

  // Defer Dialog rendering until after hydration to prevent radix ID mismatch
  if (!mounted) {
    return (
      <AndamioButton size="sm" className={className}>
        {label}
      </AndamioButton>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AndamioButton size="sm" className={className}>
          {label}
        </AndamioButton>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[425px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">Connect Wallet</DialogTitle>
          <DialogDescription className="text-center">
            Select a Cardano wallet to connect
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          {wallets.length === 0 ? (
            <div className="py-8 text-center">
              <WalletIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No wallets found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Install a Cardano wallet browser extension to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 place-items-center gap-3 gap-y-5 sm:gap-4 sm:gap-y-6 py-4">
              {wallets.map((wallet) => (
                <WalletIconButton
                  key={wallet.id}
                  wallet={wallet}
                  loading={connectingId === wallet.id}
                  onClick={() => void handleConnect(wallet.id)}
                />
              ))}
            </div>
          )}
        </TooltipProvider>

        {/* Mesh SDK attribution */}
        <DialogFooter className="justify-center sm:justify-center">
          <a
            href="https://meshjs.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Powered by</span>
            <MeshLogo className="h-4 w-4" />
            <span className="font-medium">Mesh SDK</span>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
