/**
 * @deprecated V1 PATTERN - Replaced by V2 TX State Machine
 *
 * The provisioning overlay system was designed for V1's client-side TX confirmation.
 * With V2 TX State Machine, the Gateway handles confirmation server-side and updates
 * the DB automatically. TX components now show inline status via `useTxWatcher`.
 *
 * This folder will be removed in a future release.
 *
 * @see ~/hooks/tx/use-tx-watcher.ts - V2 pattern
 * @see ~/components/tx/transaction-status.tsx - V2 inline status display
 *
 * ---
 * Original description:
 *
 * Provisioning Components
 *
 * Components and hooks for the "mint first" provisioning UX pattern.
 * Used when creating Courses, Projects, or other blockchain-first entities.
 */

// Types
export type {
  ProvisioningEntityType,
  ProvisioningStep,
  ProvisioningState,
  ProvisioningConfig,
  ProvisioningEntityDisplay,
} from "./types";

export { PROVISIONING_DISPLAY } from "./types";

// Components
export { ProvisioningOverlay } from "./provisioning-overlay";
export { ProvisioningStepIndicator } from "./provisioning-step-indicator";

// Hooks
export { useProvisioningState } from "./use-provisioning-state";
export type {
  UseProvisioningStateConfig,
  UseProvisioningStateReturn,
} from "./use-provisioning-state";
