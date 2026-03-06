/**
 * Semantic Selectors for E2E Testing
 *
 * Centralized selector definitions for Andamio UI components.
 * Uses accessible selectors where possible (text, roles, labels)
 * to make tests more resilient to implementation changes.
 */

/**
 * Authentication selectors
 */
export const auth = {
  // Landing page
  loginCard: {
    container: 'text="Connect your Cardano wallet"',
    title: 'h2:has-text("Connect your Cardano wallet")',
  },

  // Wallet connection
  walletSelector: {
    button: 'button:has-text("Connect Wallet")',
    dropdown: '[role="menu"]',
    walletOption: (name: string) => `[role="menuitem"]:has-text("${name}")`,
    eternl: '[role="menuitem"]:has-text("Eternl")',
    nami: '[role="menuitem"]:has-text("Nami")',
    lode: '[role="menuitem"]:has-text("Lode")',
  },

  // Status bar
  statusBar: {
    container: ".h-10.border-b",
    walletStatus: 'text=/Eternl|Lode|Vespr|Nami|Not connected/',
    authBadge: {
      authenticated: 'text="Auth"',
      unauthenticated: 'text="Unauth"',
      error: 'text="Error"',
    },
    jwtTimer: '[class*="font-mono"]',
    accessTokenAlias: '[class*="bg-primary-foreground/15"]',
    logoutButton: 'button:has-text("Logout")',
    themeToggle: 'button[aria-label="Toggle theme"]',
  },

  // Auth states
  states: {
    authenticated: 'text="Auth"',
    unauthenticated: 'text="Unauth"',
    authenticating: 'text="Authenticating"',
  },
};

/**
 * Transaction UI selectors
 */
export const transaction = {
  // Transaction button states
  button: {
    idle: (label: string) => `button:has-text("${label}")`,
    preparing: 'button:has-text("Preparing Transaction")',
    signing: 'button:has-text("Sign in Wallet")',
    submitting: 'button:has-text("Submitting")',
    confirming: 'button:has-text("Awaiting Confirmation")',
    success: 'button:has-text("Transaction Successful")',
    failed: 'button:has-text("Transaction Failed")',
    disabled: "button:disabled",
  },

  // Transaction status component
  status: {
    container: '[class*="rounded-xl"]',
    success: {
      container: '[class*="border-primary/30"]',
      message: 'text="Transaction submitted successfully!"',
      viewLink: 'a:has-text("View")',
    },
    error: {
      container: '[class*="border-destructive/30"]',
      message: 'text="Transaction failed"',
      retryButton: 'button:has-text("Try again")',
    },
    loading: {
      container: '[class*="bg-muted/30"]',
      preparing: 'text="Preparing your transaction"',
      signing: 'text="Please sign the transaction in your wallet"',
      submitting: 'text="Submitting transaction"',
      confirming: 'text="Waiting for blockchain confirmation"',
    },
  },

  // Task commit component
  taskCommit: {
    card: {
      enrollAndCommit: 'heading:has-text("Enroll & Commit")',
      commitTask: 'heading:has-text("Commit to Task")',
      commitAndClaim: 'heading:has-text("Commit Task & Claim Rewards")',
    },
    taskBadge: "[class*='AndamioBadge']",
    rewardsBadge: 'span:has-text("+ Claim Rewards")',
    enrollWarning: 'text="This transaction enrolls you in the project"',
    button: {
      enrollAndCommit: 'button:has-text("Enroll & Commit")',
      commit: 'button:has-text("Commit to Task")',
      commitAndClaim: 'button:has-text("Commit & Claim Rewards")',
    },
    success: {
      enrolled: 'text="Welcome to the Project!"',
      committed: 'text="Task Commitment Recorded!"',
    },
  },

  // Tasks manage component
  tasksManage: {
    addTaskButton: 'button:has-text("Add Task")',
    removeTaskButton: 'button:has-text("Remove Task")',
    form: {
      taskCode: 'input#taskCode',
      taskHash: 'input#taskHash',
      expiration: 'input#expiration',
      reward: 'input#reward',
    },
    charCounter: "text=/\\d+\\/140/",
    success: {
      added: 'text="Tasks Added!"',
      removed: 'text="Tasks Removed!"',
    },
  },
};

/**
 * Navigation selectors
 */
export const navigation = {
  // App sidebar
  sidebar: {
    container: "[data-sidebar]",
    toggle: 'button[aria-label="Toggle sidebar"]',
    menuItem: (label: string) => `[data-sidebar] a:has-text("${label}")`,
    dashboard: '[data-sidebar] a:has-text("Dashboard")',
    courses: '[data-sidebar] a:has-text("Courses")',
    projects: '[data-sidebar] a:has-text("Projects")',
    settings: '[data-sidebar] a:has-text("Settings")',
  },

  // Breadcrumbs
  breadcrumbs: {
    container: '[aria-label="breadcrumb"]',
    item: (label: string) => `[aria-label="breadcrumb"] a:has-text("${label}")`,
    current: '[aria-label="breadcrumb"] [aria-current="page"]',
  },

  // Tabs
  tabs: {
    list: '[role="tablist"]',
    tab: (label: string) => `[role="tab"]:has-text("${label}")`,
    activeTab: '[role="tab"][aria-selected="true"]',
    panel: '[role="tabpanel"]',
  },
};

/**
 * Course UI selectors
 */
export const course = {
  // Course catalog
  catalog: {
    container: "[data-testid='course-catalog']",
    grid: "[class*='grid']",
    courseCard: "[data-testid='course-card']",
    courseTitle: (title: string) => `[data-testid='course-card']:has-text("${title}")`,
    enrollButton: 'button:has-text("Enroll")',
    viewButton: 'button:has-text("View Course")',
  },

  // Course detail
  detail: {
    title: "h1",
    description: "[class*='prose']",
    moduleList: "[data-testid='module-list']",
    moduleCard: "[data-testid='module-card']",
    lessonList: "[data-testid='lesson-list']",
    assignmentList: "[data-testid='assignment-list']",
  },

  // Module navigation
  module: {
    card: (title: string) => `[data-testid='module-card']:has-text("${title}")`,
    expandButton: 'button[aria-expanded]',
    lessonLink: (title: string) => `a:has-text("${title}")`,
    assignmentLink: (title: string) => `a:has-text("${title}")`,
  },

  // Assignment
  assignment: {
    title: "h1",
    description: "[class*='prose']",
    sltBadge: "[data-testid='slt-badge']",
    commitButton: 'button:has-text("Commit")',
    submitButton: 'button:has-text("Submit")',
  },

  // Credential
  credential: {
    card: "[data-testid='credential-card']",
    claimButton: 'button:has-text("Claim Credential")',
    viewButton: 'button:has-text("View Credential")',
  },
};

/**
 * Project UI selectors
 */
export const project = {
  // Project catalog
  catalog: {
    container: "[data-testid='project-catalog']",
    projectCard: "[data-testid='project-card']",
    projectTitle: (title: string) => `[data-testid='project-card']:has-text("${title}")`,
    viewButton: 'button:has-text("View Project")',
  },

  // Project detail
  detail: {
    title: "h1",
    description: "[class*='prose']",
    taskList: "[data-testid='task-list']",
    taskCard: "[data-testid='task-card']",
  },

  // Task
  task: {
    card: (code: string) => `[data-testid='task-card']:has-text("${code}")`,
    commitButton: 'button:has-text("Commit to Task")',
    status: {
      available: 'text="Available"',
      committed: 'text="Committed"',
      completed: 'text="Completed"',
    },
  },

  // Contributor dashboard
  contributor: {
    container: "[data-testid='contributor-dashboard']",
    taskList: "[data-testid='my-tasks']",
    rewardsSummary: "[data-testid='rewards-summary']",
  },
};

/**
 * Form selectors
 */
export const form = {
  // Input fields
  input: {
    byId: (id: string) => `input#${id}`,
    byName: (name: string) => `input[name="${name}"]`,
    byLabel: (label: string) => `input[aria-label="${label}"]`,
    byPlaceholder: (placeholder: string) => `input[placeholder="${placeholder}"]`,
  },

  // Select fields
  select: {
    byId: (id: string) => `[id="${id}"]`,
    trigger: '[role="combobox"]',
    option: (value: string) => `[role="option"]:has-text("${value}")`,
  },

  // Buttons
  button: {
    submit: 'button[type="submit"]',
    cancel: 'button:has-text("Cancel")',
    save: 'button:has-text("Save")',
    confirm: 'button:has-text("Confirm")',
  },

  // Validation
  validation: {
    error: '[class*="text-destructive"]',
    errorMessage: (message: string) => `text="${message}"`,
  },
};

/**
 * Modal/Dialog selectors
 */
export const dialog = {
  container: '[role="dialog"]',
  title: '[role="dialog"] h2',
  description: '[role="dialog"] p',
  closeButton: '[role="dialog"] button[aria-label="Close"]',
  confirmButton: '[role="dialog"] button:has-text("Confirm")',
  cancelButton: '[role="dialog"] button:has-text("Cancel")',
};

/**
 * Alert/Toast selectors
 */
export const alert = {
  container: '[role="alert"]',
  toast: '[data-sonner-toast]',
  success: '[data-type="success"]',
  error: '[data-type="error"]',
  warning: '[data-type="warning"]',
  info: '[data-type="info"]',
  closeButton: '[data-sonner-toast] button',
};

/**
 * Loading state selectors
 */
export const loading = {
  spinner: '[class*="animate-spin"]',
  skeleton: '[class*="animate-pulse"]',
  overlay: '[class*="loading-overlay"]',
};

/**
 * Accessibility selectors
 */
export const a11y = {
  // Skip links
  skipLink: 'a[href="#main-content"]',
  mainContent: "#main-content",

  // Landmarks
  landmarks: {
    header: 'header, [role="banner"]',
    main: 'main, [role="main"]',
    nav: 'nav, [role="navigation"]',
    footer: 'footer, [role="contentinfo"]',
  },

  // Headings
  headings: {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    any: "h1, h2, h3, h4, h5, h6",
  },

  // Focus indicators
  focus: {
    visible: ":focus-visible",
    within: ":focus-within",
  },
};

/**
 * Utility function to create a selector with text matching
 */
export function withText(baseSelector: string, text: string): string {
  return `${baseSelector}:has-text("${text}")`;
}

/**
 * Utility function to create a test ID selector
 */
export function testId(id: string): string {
  return `[data-testid="${id}"]`;
}

/**
 * Utility function to create an exact text match
 */
export function exactText(text: string): string {
  return `text="${text}"`;
}

/**
 * Utility function to create a regex text match
 */
export function matchText(pattern: string): string {
  return `text=/${pattern}/`;
}
