/**
 * ContentDisplay Component
 *
 * A styled wrapper around ContentViewer for displaying read-only content.
 * Handles Tiptap JSON, HTML strings, and stringified JSON automatically.
 *
 * NOTE: Consider using ContentViewer directly for simpler use cases.
 * ContentDisplay adds container styling (border, background, padding).
 *
 * @example
 * ```tsx
 * // Display Tiptap JSON content with default styling
 * <ContentDisplay content={jsonContent} />
 *
 * // Display with custom variant
 * <ContentDisplay content={content} variant="accent" />
 *
 * // For simple display without container, use ContentViewer directly:
 * import { ContentViewer } from "~/components/editor";
 * <ContentViewer content={content} />
 * ```
 */

import React from "react";
import { ContentViewerCompact } from "~/components/editor";
import type { JSONContent } from "@tiptap/core";
import { cn } from "~/lib/utils";

export interface ContentDisplayProps {
  /**
   * Content to display - can be:
   * - Tiptap JSONContent object
   * - HTML string
   * - Stringified JSON
   */
  content: string | JSONContent | Record<string, unknown> | null | undefined;

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * Whether to show a border around the content
   * @default true
   */
  showBorder?: boolean;

  /**
   * Background variant
   * @default "muted"
   */
  variant?: "muted" | "default" | "accent";
}

export function ContentDisplay({
  content,
  className = "",
  showBorder = true,
  variant = "muted",
}: ContentDisplayProps) {
  // Determine background based on variant
  const bgClass = {
    muted: "bg-muted/20",
    default: "bg-background",
    accent: "bg-accent/10",
  }[variant];

  return (
    <div
      className={cn(
        showBorder && "border rounded-lg",
        "p-4",
        bgClass,
        className,
      )}
    >
      <ContentViewerCompact content={content as JSONContent} />
    </div>
  );
}

/**
 * Lightweight wrapper for displaying content without any container styling.
 *
 * @deprecated Use ContentViewer or ContentViewerCompact directly instead:
 * ```tsx
 * import { ContentViewer, ContentViewerCompact } from "~/components/editor";
 * <ContentViewerCompact content={content} />
 * ```
 */
export function ContentDisplayInline({
  content,
}: Pick<ContentDisplayProps, "content">) {
  return <ContentViewerCompact content={content as JSONContent} />;
}
