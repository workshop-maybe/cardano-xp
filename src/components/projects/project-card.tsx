"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ProjectIcon,
  OnChainIcon,
  SuccessIcon,
  PendingIcon,
  NextIcon,
  UserIcon,
  ManagerIcon,
  CredentialIcon,
} from "~/components/icons";
import { AndamioBadge } from "~/components/andamio/andamio-badge";
import { AndamioText } from "~/components/andamio/andamio-text";
import { PUBLIC_ROUTES } from "~/config/routes";
import {
  AndamioCard,
  AndamioCardContent,
  AndamioCardHeader,
  AndamioCardTitle,
  AndamioCardDescription,
  AndamioCardFooter,
} from "~/components/andamio/andamio-card";
import {
  AndamioTooltip,
  AndamioTooltipContent,
  AndamioTooltipTrigger,
} from "~/components/andamio/andamio-tooltip";
import type { Project } from "~/hooks/api";
import type { EligibilityResult } from "~/lib/project-eligibility";

interface ProjectCardProps {
  project: Project;
  /** Eligibility result for authenticated users */
  eligibility?: EligibilityResult;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
}

/**
 * Eligibility badge with tooltip
 */
function EligibilityBadge({
  eligibility,
  isAuthenticated,
}: {
  eligibility?: EligibilityResult;
  isAuthenticated?: boolean;
}) {
  if (!isAuthenticated) {
    return null;
  }

  if (!eligibility) {
    return null;
  }

  if (eligibility.eligible) {
    if (eligibility.totalRequired === 0) {
      return (
        <AndamioTooltip>
          <AndamioTooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <AndamioBadge
                variant="outline"
                className="text-primary border-primary/30"
              >
                <SuccessIcon className="h-3 w-3 mr-1" />
                Open
              </AndamioBadge>
            </div>
          </AndamioTooltipTrigger>
          <AndamioTooltipContent>
            No prerequisites required — anyone can contribute
          </AndamioTooltipContent>
        </AndamioTooltip>
      );
    }
    return (
      <AndamioTooltip>
        <AndamioTooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <AndamioBadge
              variant="outline"
              className="text-primary border-primary/30"
            >
              <CredentialIcon className="h-3 w-3 mr-1" />
              Qualified
            </AndamioBadge>
          </div>
        </AndamioTooltipTrigger>
        <AndamioTooltipContent>
          You meet all {eligibility.totalRequired} prerequisite
          requirement{eligibility.totalRequired !== 1 ? "s" : ""}
        </AndamioTooltipContent>
      </AndamioTooltip>
    );
  }

  const progress =
    eligibility.totalRequired > 0
      ? Math.round(
          (eligibility.totalCompleted / eligibility.totalRequired) * 100,
        )
      : 0;

  return (
    <AndamioTooltip>
      <AndamioTooltipTrigger asChild>
        <div className="flex items-center gap-1.5">
          <AndamioBadge
            variant="outline"
            className="text-muted-foreground border-muted-foreground/30"
          >
            <PendingIcon className="h-3 w-3 mr-1" />
            {eligibility.totalCompleted}/{eligibility.totalRequired}
          </AndamioBadge>
        </div>
      </AndamioTooltipTrigger>
      <AndamioTooltipContent>
        <div className="space-y-1">
          <div>
            Prerequisites: {eligibility.totalCompleted} of{" "}
            {eligibility.totalRequired} completed ({progress}%)
          </div>
          {eligibility.missingPrerequisites.length > 0 && (
            <div className="text-xs">
              Complete {eligibility.missingPrerequisites.length} more course
              {eligibility.missingPrerequisites.length !== 1 ? "s" : ""} to
              qualify
            </div>
          )}
        </div>
      </AndamioTooltipContent>
    </AndamioTooltip>
  );
}

/**
 * ProjectCard - Display a project in a card format matching CourseCard style
 */
export function ProjectCard({
  project,
  eligibility,
  isAuthenticated,
}: ProjectCardProps) {
  const {
    projectId,
    title,
    description,
    imageUrl,
    ownerAlias,
    managers,
    prerequisites,
  } = project;

  const displayTitle = title || projectId?.slice(0, 24) || "Untitled Project";
  const managerCount = managers?.length ?? 0;
  const prereqCount = prerequisites?.length ?? 0;

  return (
    <Link
      href={PUBLIC_ROUTES.projectDetail(projectId)}
      className="block group"
      data-testid="project-card"
    >
      <AndamioCard className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 group-hover:bg-accent/5">
        {/* Image or Gradient Header */}
        <div className="relative h-32 sm:h-40 overflow-hidden rounded-t-xl -mt-6 -mx-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={displayTitle}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary/20 via-secondary/10 to-accent/20 flex items-center justify-center">
              <ProjectIcon className="h-12 w-12 text-secondary/40" />
            </div>
          )}
          {/* Status & eligibility badge overlay */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <AndamioBadge
              variant="outline"
              className="text-primary-foreground border-primary/80 bg-primary/80 shadow-sm"
            >
              <OnChainIcon className="h-3 w-3 mr-1" />
              Active
            </AndamioBadge>
          </div>
        </div>

        <AndamioCardHeader className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <AndamioCardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {displayTitle}
            </AndamioCardTitle>
            <NextIcon className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
          </div>
          {/* Eligibility badge */}
          <EligibilityBadge
            eligibility={eligibility}
            isAuthenticated={isAuthenticated}
          />
        </AndamioCardHeader>

        <AndamioCardContent className="flex-1">
          {description ? (
            <AndamioCardDescription className="line-clamp-3">
              {description}
            </AndamioCardDescription>
          ) : (
            <AndamioText
              variant="small"
              className="text-muted-foreground italic"
            >
              No description available
            </AndamioText>
          )}
        </AndamioCardContent>

        <AndamioCardFooter className="border-t pt-4 mt-auto">
          <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
            {/* Owner info */}
            {ownerAlias && (
              <div className="flex items-center gap-1.5 truncate">
                <UserIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-mono text-xs">
                  {ownerAlias}
                </span>
              </div>
            )}

            {/* Manager count */}
            {managerCount > 0 && (
              <div className="flex items-center gap-1.5">
                <ManagerIcon className="h-3.5 w-3.5" />
                <span>
                  {managerCount} {managerCount === 1 ? "manager" : "managers"}
                </span>
              </div>
            )}

            {/* Prerequisite count */}
            {prereqCount > 0 && (
              <div className="flex items-center gap-1.5">
                <CredentialIcon className="h-3.5 w-3.5" />
                <span>
                  {prereqCount}{" "}
                  {prereqCount === 1 ? "prerequisite" : "prerequisites"}
                </span>
              </div>
            )}
          </div>
        </AndamioCardFooter>
      </AndamioCard>
    </Link>
  );
}
