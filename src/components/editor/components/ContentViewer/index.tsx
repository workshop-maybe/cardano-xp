"use client";

import { useEffect, useState, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { cn } from "~/lib/utils";
import { ViewerExtensionKit } from "../../extension-kits/shared";

/**
 * ContentViewer Props
 *
 * A read-only component for displaying Tiptap content.
 * Use for viewing course content, assignments, tasks, etc.
 */
export interface ContentViewerProps {
  /**
   * Content to display.
   * Can be Tiptap JSONContent, HTML string, or stringified JSON.
   */
  content: JSONContent | string | null | undefined;

  /**
   * Size variant for typography scaling.
   * @default "default"
   */
  size?: "sm" | "default" | "lg";

  /**
   * Additional CSS classes for the wrapper.
   */
  className?: string;

  /**
   * Whether to show a subtle background.
   * @default false
   */
  withBackground?: boolean;

  /**
   * Whether to add padding.
   * @default true
   */
  withPadding?: boolean;

  /**
   * Loading placeholder content.
   * If not provided, a skeleton loader is shown.
   */
  loadingContent?: React.ReactNode;

  /**
   * Content to show when there's no content to display.
   * @default null (renders nothing)
   */
  emptyContent?: React.ReactNode;
}

/**
 * Parses content into valid Tiptap JSONContent format.
 *
 * Handles various input formats:
 * - JSONContent object (passed through)
 * - Stringified JSON (parsed)
 * - HTML string (used directly)
 * - Invalid content (returns null)
 */
function parseContent(content: JSONContent | string | null | undefined): JSONContent | string | null {
  if (!content) return null;

  // Already JSONContent object
  if (typeof content === "object") {
    // Ensure it has the doc wrapper
    if (content.type === "doc") {
      return content;
    }
    // Wrap in doc if needed
    return {
      type: "doc",
      content: Array.isArray(content) ? content : [content],
    };
  }

  // String content - could be JSON or HTML
  if (typeof content === "string") {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(content) as JSONContent;
      if (parsed && typeof parsed === "object") {
        if (parsed.type === "doc") {
          return parsed;
        }
        return {
          type: "doc",
          content: Array.isArray(parsed) ? parsed : [parsed],
        };
      }
    } catch {
      // Not JSON, treat as HTML
      return content;
    }
  }

  return null;
}

/**
 * ContentViewer - Read-only display component for Tiptap content.
 *
 * Use this component for:
 * - Displaying course content (Lessons, Assignments, Introductions)
 * - Viewing project task descriptions
 * - Reading commitment evidence
 * - Any read-only content display
 *
 * Features:
 * - Handles multiple content formats (JSON, HTML, stringified JSON)
 * - Proper hydration handling for SSR
 * - Clickable links (open in new tab)
 * - Code syntax highlighting
 * - Image display with alignment
 * - Size variants for different contexts
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ContentViewer content={lesson.content_json} />
 *
 * // With size variant
 * <ContentViewer content={content} size="lg" />
 *
 * // With background and custom empty state
 * <ContentViewer
 *   content={content}
 *   withBackground
 *   emptyContent={<p>No content available</p>}
 * />
 * ```
 */
export function ContentViewer({
  content,
  size = "default",
  className,
  withBackground = false,
  withPadding = true,
  loadingContent,
  emptyContent = null,
}: ContentViewerProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Parse content once
  const parsedContent = useMemo(() => parseContent(content), [content]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize read-only editor with polished styling
  const editor = useEditor({
    extensions: ViewerExtensionKit(),
    content: parsedContent ?? undefined,
    editable: false,
    editorProps: {
      attributes: {
        class: cn(
          "andamio-viewer-content",
          "focus:outline-none",
          // Size variants
          size === "sm" && "prose-sm",
          size === "default" && "prose",
          size === "lg" && "prose-lg",
          "max-w-none dark:prose-invert",

          // Headings - distinct size hierarchy with proper spacing (matches editor)
          "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
          "prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-8 first:prose-h1:mt-0",
          "prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-8 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/50",
          "prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-6",
          "prose-h4:text-lg prose-h4:font-medium prose-h4:mb-2 prose-h4:mt-6",
          "prose-h5:text-base prose-h5:font-medium prose-h5:mb-2 prose-h5:mt-4 prose-h5:text-foreground/90",
          "prose-h6:text-sm prose-h6:font-medium prose-h6:uppercase prose-h6:tracking-wide prose-h6:mb-2 prose-h6:mt-4 prose-h6:text-muted-foreground",

          // Paragraphs and text
          "prose-p:leading-relaxed prose-p:mb-4",
          "prose-strong:font-semibold prose-strong:text-foreground",
          "prose-em:italic",

          // Links
          "prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-a:transition-colors",

          // Blockquotes - accent border with subtle background
          "prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30",
          "prose-blockquote:py-2 prose-blockquote:pl-4 prose-blockquote:pr-4 prose-blockquote:my-6",
          "prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:not-italic",

          // Code - inline and blocks
          "prose-code:bg-muted/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
          "prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
          "prose-code:border prose-code:border-border/30",
          "prose-pre:bg-muted/70 prose-pre:border prose-pre:border-border/50 prose-pre:shadow-sm",

          // Images
          "prose-img:rounded-lg prose-img:shadow-md",

          // Lists - proper spacing
          "prose-ul:my-4 prose-ol:my-4",
          "prose-li:my-1 prose-li:leading-relaxed",

          // Tables - visible borders (matches editor)
          "prose-table:border prose-table:border-border prose-table:rounded-lg prose-table:overflow-hidden prose-table:shadow-sm",
          "prose-thead:bg-muted/70",
          "prose-th:border prose-th:border-border/50 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold",
          "prose-td:border prose-td:border-border/50 prose-td:px-4 prose-td:py-3",
          "prose-tr:border-b prose-tr:border-border/50",

          // Horizontal rule
          "prose-hr:border-border prose-hr:my-8",
        ),
      },
    },
    immediatelyRender: false,
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && parsedContent && isMounted) {
      // Use queueMicrotask to avoid hydration issues
      queueMicrotask(() => {
        try {
          editor.commands.setContent(parsedContent);
        } catch (error) {
          console.error("ContentViewer: Error setting content", error);
        }
      });
    }
  }, [editor, parsedContent, isMounted]);

  // SSR loading state - elegant skeleton
  if (!isMounted) {
    if (loadingContent) {
      return <>{loadingContent}</>;
    }
    return (
      <div className={cn("rounded-lg", withBackground && "bg-muted/30", className)}>
        <div className={cn("space-y-3 animate-pulse", withPadding && "p-4")}>
          <div className="h-4 bg-muted/50 rounded w-3/4" />
          <div className="h-4 bg-muted/50 rounded w-full" />
          <div className="h-4 bg-muted/50 rounded w-5/6" />
          <div className="h-4 bg-muted/50 rounded w-2/3" />
        </div>
      </div>
    );
  }

  // No content state
  if (!parsedContent) {
    return <>{emptyContent}</>;
  }

  // Editor still loading
  if (!editor) {
    if (loadingContent) {
      return <>{loadingContent}</>;
    }
    return (
      <div className={cn("rounded-lg", withBackground && "bg-muted/30", className)}>
        <div className={cn("space-y-3 animate-pulse", withPadding && "p-4")}>
          <div className="h-4 bg-muted/50 rounded w-3/4" />
          <div className="h-4 bg-muted/50 rounded w-full" />
          <div className="h-4 bg-muted/50 rounded w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg transition-colors",
        withBackground && "bg-muted/20",
        className,
      )}
    >
      <div className={withPadding ? "px-1" : undefined}>
        <EditorContent editor={editor} />
      </div>
      {/* Table styles for responsive display */}
      <style jsx global>{`
        .andamio-viewer-content .tableWrapper {
          overflow-x: auto;
          margin: 1rem 0;
        }
        .andamio-viewer-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 0;
        }
        .andamio-viewer-content th,
        .andamio-viewer-content td {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
          min-width: 100px;
          vertical-align: top;
        }
        .andamio-viewer-content th {
          background-color: hsl(var(--muted));
          font-weight: 600;
          text-align: left;
        }
      `}</style>
    </div>
  );
}

/**
 * ContentViewerSm - Small variant of ContentViewer
 *
 * Convenience component for smaller text contexts.
 */
export function ContentViewerSm({
  content,
  className,
  ...props
}: Omit<ContentViewerProps, "size">) {
  return <ContentViewer content={content} className={className} size="sm" {...props} />;
}

/**
 * ContentViewerLg - Large variant of ContentViewer
 *
 * Convenience component for larger text contexts.
 */
export function ContentViewerLg({
  content,
  className,
  ...props
}: Omit<ContentViewerProps, "size">) {
  return <ContentViewer content={content} className={className} size="lg" {...props} />;
}

/**
 * ContentViewerCompact - Compact variant without padding or background
 *
 * Use for inline content display.
 */
export function ContentViewerCompact({
  content,
  className,
  ...props
}: Omit<ContentViewerProps, "withBackground" | "withPadding">) {
  return (
    <ContentViewer
      content={content}
      className={className}
      withBackground={false}
      withPadding={false}
      {...props}
    />
  );
}

export default ContentViewer;
