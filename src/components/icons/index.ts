"use client";

/**
 * Centralized Icon System — Phosphor Icons
 *
 * All icons should be imported from this module, not directly from @phosphor-icons/react.
 * This enables:
 * 1. Easy customization of icon sets
 * 2. Consistent semantic naming across the app
 * 3. Single source of truth for all icons
 *
 * @example
 * ```tsx
 * // ✅ CORRECT - Import from centralized icons
 * import { TaskIcon, XPIcon, FeedbackIcon } from "~/components/icons";
 *
 * // ❌ WRONG - Direct phosphor imports
 * import { Lightning, ChatCircleText } from "@phosphor-icons/react";
 * ```
 */

// =============================================================================
// Entity Icons - XP Domain Concepts
// =============================================================================
export {
  // Course & Learning
  CourseIcon,
  ModuleIcon,
  CredentialIcon,
  AchievementIcon,
  SLTIcon,
  LessonIcon,
  AssignmentIcon,
  IntroductionIcon,
  DiplomaIcon,
  // Users & Roles
  LearnerIcon,
  TeacherIcon,
  EditorIcon,
  InstructorIcon,
  OwnerIcon,
  AccessTokenIcon,
  KeyIcon,
  WalletIcon,
  UserIcon,
  ManagerIcon,
  ContributorIcon,
  BlockIcon,
  MailIcon,
  PaymentIcon,
  DeveloperIcon,
  // Projects & Contributions
  ProjectIcon,
  TaskIcon,
  TreasuryIcon,
  // Blockchain
  OnChainIcon,
  TransactionIcon,
  TokenIcon,
  SignatureIcon,
  // XP-Specific
  XPIcon,
  FeedbackIcon,
  IssueIcon,
  GitHubIcon,
} from "./entity-icons";

// =============================================================================
// Status Icons - State Indicators
// =============================================================================
export {
  // Completion & Success
  SuccessIcon,
  CompletedIcon,
  CheckIcon,
  VerifiedIcon,
  // Errors & Warnings
  ErrorIcon,
  AlertIcon,
  WarningIcon,
  InfoIcon,
  SecurityAlertIcon,
  // Progress & Loading
  LoadingIcon,
  PendingIcon,
  NeutralIcon,
  // Availability
  LockedIcon,
  LiveIcon,
  DraftIcon,
  // Activity
  ActiveIcon,
  ReadyIcon,
} from "./status-icons";

// =============================================================================
// Action Icons - User Operations
// =============================================================================
export {
  // CRUD
  AddIcon,
  EditIcon,
  DeleteIcon,
  SaveIcon,
  UndoIcon,
  // Content Actions
  SendIcon,
  CopyIcon,
  DownloadIcon,
  UploadIcon,
  FolderIcon,
  ShareIcon,
  StarIcon,
  RefreshIcon,
  PreviewIcon,
  // Reordering
  DragHandleIcon,
  SkipIcon,
  // Special Actions
  SparkleIcon,
  CelebrateIcon,
  TipIcon,
  AssessIcon,
  // Session Actions
  LogOutIcon,
  // Feedback Actions
  ReportIcon,
  CommentIcon,
} from "./action-icons";

// =============================================================================
// Navigation Icons - Direction & Navigation
// =============================================================================
export {
  // Directional
  BackIcon,
  ForwardIcon,
  NextIcon,
  PreviousIcon,
  // Expand & Collapse
  ExpandIcon,
  CollapseIcon,
  // External & Links
  ExternalLinkIcon,
  MoreIcon,
  // Close
  CloseIcon,
} from "./navigation-icons";

// =============================================================================
// UI Icons - General Interface
// =============================================================================
export {
  // Search & Filter
  SearchIcon,
  FilterIcon,
  // Settings
  SettingsIcon,
  ShieldIcon,
  // View Options
  ListViewIcon,
  TableViewIcon,
  GridViewIcon,
  // Empty States
  EmptyIcon,
  ImagePlaceholderIcon,
  VideoIcon,
  // Data & Analytics
  ChartIcon,
  HistoryIcon,
  // Layout
  DashboardIcon,
  LayoutIcon,
  MenuIcon,
  SidebarIcon,
  MonitorIcon,
  // Theme & Display Mode
  LightModeIcon,
  DarkModeIcon,
  ThemeIcon,
  // Navigation & Discovery
  SitemapIcon,
  GlobalIcon,
  ExploreIcon,
  // Data & System
  DatabaseIcon,
  ServerIcon,
  SortIcon,
  LinkIcon,
  // Special & Misc
  TestIcon,
  CalendarIcon,
  TerminalIcon,
  CodeIcon,
} from "./ui-icons";

// =============================================================================
// Type Export for Icon Components
// =============================================================================
export type { Icon as PhosphorIcon } from "@phosphor-icons/react";
