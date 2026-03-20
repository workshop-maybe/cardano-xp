"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import { AndamioCardTitle } from "./andamio-card";
import { AndamioCardDescription } from "./andamio-card";
import type { IconComponent } from "~/types/ui";

export interface AndamioCardIconHeaderProps {
  /** Icon component from ~/components/icons */
  icon: IconComponent;
  /** Card title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Icon color class (defaults to text-muted-foreground) */
  iconColor?: string;
  /** Additional className for the container */
  className?: string;
}

/**
 * Card header with icon and title
 *
 * Use inside AndamioCardHeader for consistent card header styling.
 *
 * @example
 * ```tsx
 * <AndamioCardHeader>
 *   <AndamioCardIconHeader
 *     icon={DatabaseIcon}
 *     title="On-Chain Data"
 *   />
 * </AndamioCardHeader>
 * ```
 *
 * @example With description
 * ```tsx
 * <AndamioCardHeader>
 *   <AndamioCardIconHeader
 *     icon={CourseIcon}
 *     title="Course Progress"
 *     description="Track your learning journey"
 *   />
 * </AndamioCardHeader>
 * ```
 */
export function AndamioCardIconHeader({
  icon: Icon,
  title,
  description,
  iconColor = "text-muted-foreground",
  className,
}: AndamioCardIconHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn("h-5 w-5 shrink-0", iconColor)} />
      {description ? (
        <div>
          <AndamioCardTitle className="text-base">{title}</AndamioCardTitle>
          <AndamioCardDescription>{description}</AndamioCardDescription>
        </div>
      ) : (
        <AndamioCardTitle className="text-base">{title}</AndamioCardTitle>
      )}
    </div>
  );
}
