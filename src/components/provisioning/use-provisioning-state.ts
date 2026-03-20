"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
// V1 PendingTxContext removed — provisioning system is unused and pending removal
import type { ProvisioningStep, ProvisioningConfig, ProvisioningState } from "./types";

export interface UseProvisioningStateConfig extends ProvisioningConfig {
  /** Called when the entity is ready */
  onReady?: () => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

export interface UseProvisioningStateReturn {
  /** Current provisioning state */
  state: ProvisioningState | null;
  /** Current step in the provisioning process */
  currentStep: ProvisioningStep;
  /** Error message if any */
  errorMessage: string | null;
  /** Start provisioning by adding tx to watcher */
  startProvisioning: () => void;
  /** Navigate to the success path */
  navigateToEntity: () => void;
  /** Retry after an error */
  retry: () => void;
  /** Whether provisioning is active */
  isProvisioning: boolean;
}

/**
 * useProvisioningState
 *
 * Hook for managing the provisioning state of a blockchain entity.
 * Integrates with PendingTxWatcher for transaction confirmation.
 *
 * @example
 * ```tsx
 * const { currentStep, navigateToEntity, isProvisioning } = useProvisioningState({
 *   entityType: "course",
 *   entityId: courseId,
 *   txHash: result.txHash,
 *   title: "My New Course",
 *   successRedirectPath: `/studio/course/${courseId}`,
 *   onReady: () => console.log("Course is ready!"),
 * });
 * ```
 */
export function useProvisioningState(
  config: UseProvisioningStateConfig | null
): UseProvisioningStateReturn {
  // Stubbed — V1 PendingTxContext has been removed
  const pendingTransactions = useMemo<Array<{ id: string }>>(() => [], []);
  const addPendingTx = useCallback((_tx: Record<string, unknown>) => { /* noop */ }, []);
  const removePendingTx = useCallback((_id: string) => { /* noop */ }, []);

  const [state, setState] = useState<ProvisioningState | null>(null);
  const [currentStep, setCurrentStep] = useState<ProvisioningStep>("submitted");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Track if we've already handled the confirmation
  const hasConfirmed = useRef(false);
  // Track auto-redirect timeout
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start the provisioning process
   */
  const startProvisioning = useCallback(() => {
    if (!config) return;

    const {
      entityType,
      entityId,
      txHash,
      title,
      successRedirectPath,
    } = config;

    // Create the provisioning state
    const provisioningState: ProvisioningState = {
      entityType,
      entityId,
      txHash,
      title,
      currentStep: "submitted",
      submittedAt: new Date(),
      successRedirectPath,
    };

    setState(provisioningState);
    setCurrentStep("submitted");
    setErrorMessage(null);
    setIsProvisioning(true);
    hasConfirmed.current = false;

    // Add to pending tx watcher
    addPendingTx({
      id: `${entityType}-${entityId}`,
      txHash,
      entityType,
      entityId,
      context: {
        // Course-specific context
        courseId: entityType === "course" ? entityId : undefined,
        // Project-specific context
        treasuryNftPolicyId: entityType === "project" ? entityId : undefined,
        // Title for display
        title,
      },
      submittedAt: new Date(),
    });

    // Move to confirming step after a brief delay
    setTimeout(() => {
      setCurrentStep("confirming");
      if (state) {
        setState((prev) =>
          prev ? { ...prev, currentStep: "confirming" } : null
        );
      }
    }, 500);
  }, [config, addPendingTx, state]);

  /**
   * Navigate to the entity page
   */
  const navigateToEntity = useCallback(() => {
    console.log("[Provisioning] navigateToEntity called", {
      hasConfig: !!config,
      successRedirectPath: config?.successRedirectPath,
      stateSuccessPath: state?.successRedirectPath,
    });

    // Use state.successRedirectPath as fallback (more stable reference)
    const redirectPath = config?.successRedirectPath ?? state?.successRedirectPath;
    if (!redirectPath) {
      console.error("[Provisioning] No redirect path available");
      return;
    }

    // Clear any pending redirect timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Remove from pending tx watcher
    if (config) {
      removePendingTx(`${config.entityType}-${config.entityId}`);
    }

    // Navigate to success path
    // Use window.location for more reliable navigation from within drawers/modals
    console.log("[Provisioning] Navigating to:", redirectPath);
    window.location.href = redirectPath;
  }, [config, state, removePendingTx]);

  /**
   * Retry after an error
   */
  const retry = useCallback(() => {
    setErrorMessage(null);
    setCurrentStep("submitted");
    config?.onReady?.();
  }, [config]);

  /**
   * Watch for transaction confirmation
   */
  useEffect(() => {
    if (!config || !isProvisioning || hasConfirmed.current) return;

    const txId = `${config.entityType}-${config.entityId}`;
    const pendingTx = pendingTransactions.find((tx) => tx.id === txId);

    // If the transaction is no longer in the pending list, it's been confirmed
    // (PendingTxWatcher removes it after confirmation)
    if (state && currentStep === "confirming" && !pendingTx) {
      hasConfirmed.current = true;

      // Update to ready state
      setCurrentStep("ready");
      setState((prev) =>
        prev
          ? { ...prev, currentStep: "ready", confirmedAt: new Date() }
          : null
      );

      // Call onReady callback
      config.onReady?.();

      // Auto-redirect if enabled
      const autoRedirect = config.autoRedirect ?? true;
      const autoRedirectDelay = config.autoRedirectDelay ?? 2000;

      if (autoRedirect && config.successRedirectPath) {
        redirectTimeoutRef.current = setTimeout(() => {
          navigateToEntity();
        }, autoRedirectDelay);
      }
    }
  }, [
    config,
    isProvisioning,
    pendingTransactions,
    state,
    currentStep,
    navigateToEntity,
  ]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    currentStep,
    errorMessage,
    startProvisioning,
    navigateToEntity,
    retry,
    isProvisioning,
  };
}
