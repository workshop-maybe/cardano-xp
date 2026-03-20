"use client";

import React from "react";
import { ExternalLinkIcon, SparkleIcon, CelebrateIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { AndamioText } from "~/components/andamio";
import { AndamioHeading } from "~/components/andamio/andamio-heading";
import { cn } from "~/lib/utils";
import type { ProvisioningConfig, ProvisioningStep } from "./types";
import { PROVISIONING_DISPLAY } from "./types";
import { ProvisioningStepIndicator } from "./provisioning-step-indicator";

interface ProvisioningOverlayProps extends ProvisioningConfig {
  /** Current step in the provisioning process */
  currentStep: ProvisioningStep;
  /** Error message if step is "error" */
  errorMessage?: string;
  /** Callback for retry on error */
  onRetry?: () => void;
  /** Callback for navigating to success path */
  onNavigate?: () => void;
  className?: string;
}

/**
 * ProvisioningOverlay
 *
 * Full-content overlay shown during blockchain entity provisioning.
 * Displays progress steps and handles success/error states.
 *
 * Usage:
 * - Rendered inside a drawer/dialog after transaction submission
 * - Shows progress through provisioning steps
 * - Auto-redirects on success (configurable)
 */
export function ProvisioningOverlay({
  entityType,
  title,
  txHash,
  currentStep,
  errorMessage,
  explorerUrl,
  onRetry,
  onNavigate,
  className,
}: ProvisioningOverlayProps) {
  const display = PROVISIONING_DISPLAY[entityType];
  const isReady = currentStep === "ready";
  const isError = currentStep === "error";

  // Truncate tx hash for display
  const truncatedTxHash = txHash
    ? `${txHash.slice(0, 8)}...${txHash.slice(-8)}`
    : "";

  return (
    <div className={cn("flex flex-col items-center py-12 px-4", className)}>
      {/* Header with icon */}
      <div className="mb-8">
        {isReady ? (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CelebrateIcon className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <SparkleIcon className="h-8 w-8 text-primary" />
          </div>
        )}
      </div>

      {/* Title */}
      <AndamioHeading level={2} size="lg" className="text-center mb-2">
        {isReady ? display.successTitle : display.provisioningTitle}
      </AndamioHeading>

      {/* Entity title */}
      <AndamioText variant="muted" className="text-center mb-10">
        {title}
      </AndamioText>

      {/* Step indicator */}
      <div className="w-full max-w-xs mb-10">
        <ProvisioningStepIndicator
          entityType={entityType}
          currentStep={currentStep}
        />
      </div>

      {/* Error message */}
      {isError && errorMessage && (
        <div className="w-full max-w-xs mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AndamioText variant="small" className="text-destructive text-center">{errorMessage}</AndamioText>
        </div>
      )}

      {/* Timing note */}
      {!isReady && !isError && (
        <AndamioText variant="small" className="text-center mb-8">
          This typically takes 20-60 seconds.
        </AndamioText>
      )}

      {/* Transaction link */}
      {txHash && explorerUrl && (
        <div className="mb-8">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <span className="font-mono text-xs">{truncatedTxHash}</span>
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Action buttons */}
      <div className="w-full max-w-xs">
        {isReady && onNavigate && (
          <Button
            onClick={() => {
              console.log("[ProvisioningOverlay] Button clicked, calling onNavigate");
              onNavigate();
            }}
            className="w-full"
            size="lg"
          >
            {display.ctaLabel}
          </Button>
        )}

        {isError && onRetry && (
          <Button onClick={onRetry} variant="outline" className="w-full">
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
