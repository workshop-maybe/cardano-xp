import * as React from "react";
import { cn } from "~/lib/utils";
import { AndamioText } from "./andamio-text";
import { AndamioHeading } from "./andamio-heading";

interface AndamioPageHeaderProps {
  /**
   * Page title (h1)
   */
  title: string;
  /**
   * Optional page description
   */
  description?: string;
  /**
   * Optional action element (button, link, etc.) displayed on the right
   */
  action?: React.ReactNode;
  /**
   * Optional badge or indicator displayed next to the title
   */
  badge?: React.ReactNode;
  /**
   * Additional className for the container
   */
  className?: string;
  /**
   * Center the header text (useful for landing pages)
   */
  centered?: boolean;
}

/**
 * AndamioPageHeader - Responsive page header component
 *
 * Provides consistent, responsive page headers across the application.
 * Handles title, description, badges, and action buttons with proper
 * stacking behavior on mobile devices.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AndamioPageHeader
 *   title="Dashboard"
 *   description="Welcome to your personalized dashboard"
 * />
 *
 * // With action button
 * <AndamioPageHeader
 *   title="Courses"
 *   description="Manage your courses"
 *   action={<Button>Create Course</Button>}
 * />
 *
 * // Centered (for landing pages)
 * <AndamioPageHeader
 *   title="Welcome"
 *   description="Start your learning journey"
 *   centered
 * />
 * ```
 */
export function AndamioPageHeader({
  title,
  description,
  action,
  badge,
  className,
  centered = false,
}: AndamioPageHeaderProps) {
  if (centered) {
    return (
      <div className={cn("text-center max-w-3xl mx-auto space-y-2 sm:space-y-3 px-4 sm:px-0", className)}>
        <AndamioHeading level={1} size="3xl">{title}</AndamioHeading>
        {description && (
          <AndamioText variant="muted" className="text-base">
            {description}
          </AndamioText>
        )}
        {action && (
          <div className="pt-2 sm:pt-3">
            {action}
          </div>
        )}
      </div>
    );
  }

  // Layout with action: flex container that stacks on mobile
  if (action) {
    return (
      <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3", className)}>
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AndamioHeading level={1} size="2xl">{title}</AndamioHeading>
            {badge}
          </div>
          {description && (
            <AndamioText variant="small" className="text-muted-foreground">
              {description}
            </AndamioText>
          )}
        </div>
        <div className="shrink-0">
          {action}
        </div>
      </div>
    );
  }

  // Simple layout without action
  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <AndamioHeading level={1} size="2xl">{title}</AndamioHeading>
        {badge}
      </div>
      {description && (
        <AndamioText variant="small" className="text-muted-foreground">
          {description}
        </AndamioText>
      )}
    </div>
  );
}
