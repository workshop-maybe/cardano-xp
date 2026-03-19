/**
 * Config Exports
 *
 * Centralized configuration for the application.
 */

// Branding configuration
export { BRANDING, getPageTitle, getDocsUrl, getPageMetadata, type Branding } from "./branding";

// Marketing configuration
export { MARKETING, type Marketing } from "./marketing";

// Feature flags
export {
  FEATURES,
  isFeatureEnabled,
  getEnabledFeatures,
  type Features,
} from "./features";

// Navigation configuration
export { APP_NAVIGATION, isNavItemActive } from "./navigation";

// Route definitions
export {
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  ADMIN_ROUTES,
  API_ROUTES,
} from "./routes";

// UI constants
export {
  UI_TIMEOUTS,
  POLLING_INTERVALS,
  PAGINATION,
  FORM_LIMITS,
  LAYOUT,
  ANIMATIONS,
  Z_INDEX,
} from "./ui-constants";

// Transaction UI configuration
export {
  TRANSACTION_UI,
  TRANSACTION_ENDPOINTS,
  getTransactionUI,
  getTransactionEndpoint,
  isTransactionType,
  type TransactionType,
  type TransactionUIConfig,
} from "./transaction-ui";

// Transaction validation schemas
export {
  txSchemas,
  validateTxParams,
  getTxSchema,
  parseTxParams,
  // Common schema building blocks
  aliasSchema,
  policyIdSchema,
  hashSchema,
  shortTextSchema,
  walletDataSchema,
  valueSchema,
  type TxParams,
} from "./transaction-schemas";

// Cardano XP — single course and project
export { CARDANO_XP } from "./cardano-xp";

// Wallet address truncation (moved from deleted sidebar config)
export { WALLET_TRUNCATION, truncateWalletAddress } from "./wallet-utils";
