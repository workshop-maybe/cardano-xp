"use client";

import React from "react";
import Link from "next/link";
import { useCourseModules } from "~/hooks/api/course/use-course-module";
import type { ProjectPrerequisite } from "~/hooks/api/project/use-project";
import type { StudentCompletionInput } from "~/lib/project-eligibility";
import { AndamioText } from "~/components/andamio/andamio-text";
import { SuccessIcon } from "~/components/icons";
import { PUBLIC_ROUTES } from "~/config/routes";

/**
 * Simple checklist of onboarding modules.
 * Shows module titles with checkmarks for completed ones.
 */
export function PrerequisiteList({
  prerequisites,
  completions,
}: {
  prerequisites: ProjectPrerequisite[];
  completions?: StudentCompletionInput[];
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
        />
      ))}
    </div>
  );
}

function ModuleChecklistItem({
  courseId,
  sltHash,
  isCompleted,
}: {
  courseId: string;
  sltHash: string;
  isCompleted: boolean;
}) {
  const { data: modules = [], isLoading } = useCourseModules(courseId);
  const mod = modules.find((m) => m.sltHash === sltHash);
  const title = mod?.title ?? (isLoading ? "Loading..." : "Module");

  return (
    <Link
      href={mod?.moduleCode ? PUBLIC_ROUTES.module(mod.moduleCode) : PUBLIC_ROUTES.courses}
      className="flex items-center gap-3 p-3 rounded-lg border hover:border-secondary/50 transition-colors"
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          isCompleted
            ? "bg-primary text-primary-foreground"
            : "border-2 border-muted-foreground/30"
        }`}
      >
        {isCompleted && <SuccessIcon className="h-3 w-3" />}
      </div>
      <AndamioText
        className={isCompleted ? "text-muted-foreground line-through" : ""}
      >
        {title}
      </AndamioText>
    </Link>
  );
}
