/**
 * Andamio Editor Components
 *
 * This module provides two primary components for content editing and viewing:
 *
 * - ContentEditor: Full-featured rich text editor for creating content
 * - ContentViewer: Read-only display for viewing content
 *
 * Both components use a shared extension configuration to ensure
 * content created in the editor renders identically in the viewer.
 */

// =============================================================================
// PRIMARY COMPONENTS - Use these for all content editing and viewing
// =============================================================================

// ContentEditor - The main editing component
export {
  ContentEditor,
  useContentEditor,
  type ContentEditorProps,
} from "./components/ContentEditor";

// ContentViewer - The main viewing component
export {
  ContentViewer,
  ContentViewerSm,
  ContentViewerLg,
  ContentViewerCompact,
  type ContentViewerProps,
} from "./components/ContentViewer";

// EditorToolbar - For custom editor implementations
export {
  EditorToolbar,
  type ToolbarConfig,
  type ToolbarButtons,
} from "./components/ContentEditor/EditorToolbar";

// =============================================================================
// LEGACY COMPONENTS - Deprecated, use ContentEditor/ContentViewer instead
// =============================================================================

/**
 * @deprecated Use ContentViewer instead
 */
export {
  RenderEditor,
  RenderEditorSm,
  RenderEditorLg,
} from "./components/RenderEditor";

/**
 * @deprecated Use EditorToolbar instead
 */
export { AndamioFixedToolbar } from "./components/menus/AndamioFixedToolbar";

/**
 * @deprecated Bubble menus not currently used
 */
export { AndamioBubbleMenus } from "./components/menus/AndamioBubbleMenus";

// =============================================================================
// EXTENSION KITS
// =============================================================================

// New unified extension kits (recommended)
export {
  SharedExtensionKit,
  EditorExtensionKit,
  ViewerExtensionKit,
  EDITOR_STYLES,
  type ExtensionConfig,
} from "./extension-kits";

// Legacy extension kits (deprecated)
export {
  BaseExtensionKit,
  BasicEditorKit,
  ReadOnlyExtensionKit,
  FullEditorKit,
} from "./extension-kits";

// =============================================================================
// HOOKS
// =============================================================================

/**
 * @deprecated Use useContentEditor hook from ContentEditor instead
 */
export { useAndamioEditor } from "./hooks";

// =============================================================================
// UTILITIES
// =============================================================================

export {
  cn,
  extractPlainText,
  proseMirrorToHtml,
  getWordCount,
  getCharacterCount,
  isEditorEmpty,
} from "./utils";
