/**
 * Provisioning Types
 *
 * Types for the "mint first" provisioning UX pattern.
 * Used when creating Courses, Projects, or other blockchain-first entities.
 */

/**
 * Entity types that support the provisioning pattern
 */
export type ProvisioningEntityType = "course" | "project";

/**
 * Steps in the provisioning process
 */
export type ProvisioningStep =
  | "submitted"   // Transaction submitted to blockchain
  | "confirming"  // Awaiting blockchain confirmation (~20-60 seconds)
  | "ready"       // Entity fully provisioned and ready to use
  | "error";      // Something went wrong

/**
 * Current provisioning state for an entity
 */
export interface ProvisioningState {
  /** Type of entity being provisioned */
  entityType: ProvisioningEntityType;
  /** On-chain identifier (courseId or treasuryNftPolicyId) */
  entityId: string;
  /** Transaction hash for tracking */
  txHash: string;
  /** Display title for the entity */
  title: string;
  /** Current step in the provisioning process */
  currentStep: ProvisioningStep;
  /** When the transaction was submitted */
  submittedAt: Date;
  /** When blockchain confirmed (if confirmed) */
  confirmedAt?: Date;
  /** Where to redirect after provisioning completes */
  successRedirectPath: string;
  /** Error message if step is "error" */
  errorMessage?: string;
}

/**
 * Configuration for the ProvisioningOverlay component
 */
export interface ProvisioningConfig {
  /** Type of entity being provisioned */
  entityType: ProvisioningEntityType;
  /** On-chain identifier */
  entityId: string;
  /** Transaction hash */
  txHash: string;
  /** Display title */
  title: string;
  /** Where to redirect on success */
  successRedirectPath: string;
  /** Auto-redirect after confirmation (default: true) */
  autoRedirect?: boolean;
  /** Delay before auto-redirect in ms (default: 2000) */
  autoRedirectDelay?: number;
  /** Callback when provisioning completes successfully */
  onComplete?: () => void;
  /** Blockchain explorer URL for the transaction */
  explorerUrl?: string;
}

/**
 * Display configuration for each entity type
 */
export interface ProvisioningEntityDisplay {
  /** Title shown during provisioning (e.g., "Building Your Course") */
  provisioningTitle: string;
  /** Success title (e.g., "Your Course is Ready!") */
  successTitle: string;
  /** Step labels */
  steps: {
    submitted: string;
    confirming: string;
    ready: string;
  };
  /** CTA button text (e.g., "Go to Course Studio") */
  ctaLabel: string;
}

/**
 * Display config for each entity type
 */
export const PROVISIONING_DISPLAY: Record<ProvisioningEntityType, ProvisioningEntityDisplay> = {
  course: {
    provisioningTitle: "Building Your Course",
    successTitle: "Your Course is Ready!",
    steps: {
      submitted: "Transaction Submitted",
      confirming: "Awaiting Blockchain",
      ready: "Course Ready",
    },
    ctaLabel: "Go to Course Studio",
  },
  project: {
    provisioningTitle: "Building Your Project",
    successTitle: "Your Project is Ready!",
    steps: {
      submitted: "Transaction Submitted",
      confirming: "Awaiting Blockchain",
      ready: "Project Ready",
    },
    ctaLabel: "Go to Project Studio",
  },
};
