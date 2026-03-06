"use client";

import React from "react";
import Link from "next/link";
import { useCourseModules } from "~/hooks/api/course/use-course-module";
import type { ProjectPrerequisite } from "~/hooks/api/project/use-project";
import type { StudentCompletionInput } from "~/lib/project-eligibility";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioBadge } from "~/components/andamio/andamio-badge";
import { SuccessIcon, NextIcon, PendingIcon } from "~/components/icons";
import { PUBLIC_ROUTES } from "~/config/routes";

/**
 * Simple checklist of onboarding modules.
 * Shows module titles with checkmarks for completed ones.
 */
export function PrerequisiteList({
  prerequisites,
  completions,
  assignmentStatuses,
}: {
  prerequisites: ProjectPrerequisite[];
  completions?: StudentCompletionInput[];
  /** Map of sltHash → assignment commitment status (e.g. "ASSIGNMENT_ACCEPTED", "PENDING_APPROVAL") */
  assignmentStatuses?: Map<string, string>;
}) {
  // Flatten all required module hashes from all prerequisites
  const allModules: { courseId: string; sltHash: string }[] = [];
  for (const prereq of prerequisites) {
    for (const hash of prereq.sltHashes ?? []) {
      allModules.push({ courseId: prereq.courseId, sltHash: hash });
    }
  }

  if (allModules.length === 0) {
    return null;
  }

  // Build completed set from all courses
  const completedSet = new Set<string>();
  for (const c of completions ?? []) {
    for (const hash of c.completedModuleHashes) {
      completedSet.add(hash);
    }
  }

  return (
    <div className="space-y-2">
      {allModules.map((mod) => (
        <ModuleChecklistItem
          key={mod.sltHash}
          courseId={mod.courseId}
          sltHash={mod.sltHash}
          isCompleted={completedSet.has(mod.sltHash)}
          assignmentStatus={assignmentStatuses?.get(mod.sltHash)}
        />
      ))}
    </div>
  );
}

function ModuleChecklistItem({
  courseId,
  sltHash,
  isCompleted,
  assignmentStatus,
}: {
  courseId: string;
  sltHash: string;
  isCompleted: boolean;
  assignmentStatus?: string;
}) {
  const { data: modules = [], isLoading } = useCourseModules(courseId);
  const mod = modules.find((m) => m.sltHash === sltHash);
  const title = mod?.title ?? (isLoading ? "Loading..." : "Module");

  // Derive a single display status with clear priority: completed > accepted > pending > refused > not_started
  const displayStatus = isCompleted
    ? "completed" as const
    : assignmentStatus === "ASSIGNMENT_ACCEPTED" ? "accepted" as const
    : assignmentStatus === "PENDING_APPROVAL" ? "pending" as const
    : assignmentStatus === "ASSIGNMENT_REFUSED" ? "refused" as const
    : "not_started" as const;

  return (
    <Link
      href={mod?.moduleCode ? PUBLIC_ROUTES.module(mod.moduleCode) : PUBLIC_ROUTES.courses}
      className={`flex items-center justify-between gap-3 p-4 rounded-lg border transition-colors ${
        displayStatus === "accepted"
          ? "border-primary/30 bg-primary/5"
          : "hover:border-secondary/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            displayStatus === "completed" || displayStatus === "accepted"
              ? "bg-primary text-primary-foreground"
              : displayStatus === "pending"
                ? "bg-secondary/20 text-secondary"
                : "border-2 border-muted-foreground/30"
          }`}
        >
          {(displayStatus === "completed" || displayStatus === "accepted") && <SuccessIcon className="h-3 w-3" />}
          {displayStatus === "pending" && <PendingIcon className="h-3 w-3" />}
        </div>
        <div>
          <AndamioText
            className={displayStatus === "completed" ? "text-muted-foreground line-through" : "font-medium"}
          >
            {title}
          </AndamioText>
          {displayStatus === "accepted" && (
            <AndamioText variant="small" className="text-primary">
              Feedback accepted — claim your credential to continue
            </AndamioText>
          )}
          {displayStatus === "pending" && (
            <AndamioText variant="small" className="text-muted-foreground">
              Feedback submitted — waiting for review
            </AndamioText>
          )}
          {displayStatus === "refused" && (
            <AndamioText variant="small" className="text-destructive">
              Revision requested — update and resubmit
            </AndamioText>
          )}
        </div>
      </div>
      {(displayStatus === "not_started" || displayStatus === "refused") && (
        <AndamioButton size="sm" rightIcon={<NextIcon className="h-3.5 w-3.5" />}>
          {displayStatus === "refused" ? "Revise" : "Start"}
        </AndamioButton>
      )}
      {displayStatus === "accepted" && (
        <AndamioBadge status="success" className="gap-1">
          <SuccessIcon className="h-3 w-3" />
          Accepted
        </AndamioBadge>
      )}
      {displayStatus === "pending" && (
        <AndamioBadge variant="outline" className="gap-1 text-muted-foreground">
          <PendingIcon className="h-3 w-3" />
          Pending
        </AndamioBadge>
      )}
    </Link>
  );
}
