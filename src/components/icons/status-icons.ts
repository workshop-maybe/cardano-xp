"use client";

/**
 * Status Icons - State Indicators
 *
 * Phosphor icons for various states and statuses.
 * Import from ~/components/icons instead of @phosphor-icons/react directly.
 */

// =============================================================================
// Completion & Success States
// =============================================================================

/** Success - operation completed successfully */
export { CheckCircle as SuccessIcon } from "@phosphor-icons/react";

/** Completed - task/step is done (minimal checkmark) */
export { Check as CompletedIcon } from "@phosphor-icons/react";

/** Check - generic checkmark (alias for CompletedIcon) */
export { Check as CheckIcon } from "@phosphor-icons/react";

/** Verified - verified/validated state */
export { SealCheck as VerifiedIcon } from "@phosphor-icons/react";

// =============================================================================
// Error & Warning States
// =============================================================================

/** Error - operation failed or error state */
export { XCircle as ErrorIcon } from "@phosphor-icons/react";

/** Warning/Alert (circle) - attention needed, general alerts */
export { WarningCircle as AlertIcon } from "@phosphor-icons/react";

/** Warning (triangle) - caution, important warnings */
export { Warning as WarningIcon } from "@phosphor-icons/react";

/** Info - informational messages */
export { Info as InfoIcon } from "@phosphor-icons/react";

/** Security Alert - security-related warnings */
export { ShieldWarning as SecurityAlertIcon } from "@phosphor-icons/react";

// =============================================================================
// Progress & Loading States
// =============================================================================

/** Loading - async operation in progress */
export { CircleNotch as LoadingIcon } from "@phosphor-icons/react";

/** Pending - waiting for action or confirmation */
export { Clock as PendingIcon } from "@phosphor-icons/react";

/** Neutral/Empty - neutral state indicator */
export { Circle as NeutralIcon } from "@phosphor-icons/react";

// =============================================================================
// Availability States
// =============================================================================

/** Locked - unavailable or restricted */
export { Lock as LockedIcon } from "@phosphor-icons/react";

/** Live/Active - published and available */
export { Broadcast as LiveIcon } from "@phosphor-icons/react";

/** Draft - not yet published */
export { NotePencil as DraftIcon } from "@phosphor-icons/react";

// =============================================================================
// Activity States
// =============================================================================

/** Online/Active - system is running */
export { Pulse as ActiveIcon } from "@phosphor-icons/react";

/** Ready - system ready for input */
export { Terminal as ReadyIcon } from "@phosphor-icons/react";
