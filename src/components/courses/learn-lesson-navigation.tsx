"use client";

import React from "react";
import Link from "next/link";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioText } from "~/components/andamio/andamio-text";
import { PreviousIcon, NextIcon, AssignmentIcon } from "~/components/icons";

export interface LessonNavItem {
  /** SLT module_index (1-based) */
  index: number;
  /** Lesson title for subtitle display */
  title: string;
}

interface LearnLessonNavigationProps {
  /** Current lesson's SLT index */
  currentIndex: number;
  /** All SLTs in this module that have lessons, sorted by index */
  lessonsWithNav: LessonNavItem[];
  /** Module code for building hrefs */
  moduleCode: string;
}

/**
 * LearnLessonNavigation - Prev/Next navigation for /learn routes.
 * Links to /learn paths (no course ID needed).
 */
export function LearnLessonNavigation({
  currentIndex,
  lessonsWithNav,
  moduleCode,
}: LearnLessonNavigationProps) {
  if (lessonsWithNav.length === 0) return null;

  const currentPos = lessonsWithNav.findIndex((l) => l.index === currentIndex);
  if (currentPos === -1) return null;

  const prev = currentPos > 0 ? lessonsWithNav[currentPos - 1] : null;
  const next = currentPos < lessonsWithNav.length - 1 ? lessonsWithNav[currentPos + 1] : null;
  const isLastLesson = currentPos === lessonsWithNav.length - 1;

  return (
    <div className="flex items-stretch justify-between gap-4 pt-6 border-t">
      {/* Previous */}
      <div className="flex-1">
        {prev && (
          <Link href={`/learn/${moduleCode}/${prev.index}`} className="block">
            <AndamioButton variant="outline" className="w-full justify-start h-auto py-3">
              <PreviousIcon className="h-4 w-4 mr-2 shrink-0" />
              <div className="text-left">
                <div className="text-sm">Previous</div>
                <AndamioText variant="small" className="text-xs text-muted-foreground">
                  {prev.title}
                </AndamioText>
              </div>
            </AndamioButton>
          </Link>
        )}
      </div>

      {/* Next or Go to Assignment */}
      <div className="flex-1">
        {next ? (
          <Link href={`/learn/${moduleCode}/${next.index}`} className="block">
            <AndamioButton variant="outline" className="w-full justify-end h-auto py-3">
              <div className="text-right">
                <div className="text-sm">Next</div>
                <AndamioText variant="small" className="text-xs text-muted-foreground">
                  {next.title}
                </AndamioText>
              </div>
              <NextIcon className="h-4 w-4 ml-2 shrink-0" />
            </AndamioButton>
          </Link>
        ) : isLastLesson ? (
          <Link href={`/learn/${moduleCode}/assignment`} className="block">
            <AndamioButton className="w-full justify-end h-auto py-3">
              <div className="text-right">
                <div className="text-sm">Go to Assignment</div>
              </div>
              <AssignmentIcon className="h-4 w-4 ml-2 shrink-0" />
            </AndamioButton>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
