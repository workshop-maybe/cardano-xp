"use client";

import React from "react";
import { useLearnParams } from "~/hooks/use-learn-params";
import { AndamioCard, AndamioCardContent, AndamioCardDescription, AndamioCardHeader, AndamioCardTitle } from "~/components/andamio/andamio-card";
import {
  AndamioPageLoading,
  AndamioNotFoundCard,
  AndamioEmptyState,
  AndamioBackButton,
} from "~/components/andamio";
import { CourseIcon } from "~/components/icons";
import { PUBLIC_ROUTES } from "~/config/routes";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioHeading } from "~/components/andamio/andamio-heading";
import { ContentViewer } from "~/components/editor";
import { LessonMediaSection } from "~/components/courses/lesson-media-section";
import { useCourse, useCourseModule, useLesson, useSLTs } from "~/hooks/api";
import { LearnLessonNavigation, type LessonNavItem } from "~/components/courses/learn-lesson-navigation";

/**
 * Lesson detail page for /learn routes.
 * Uses the single course ID from CARDANO_XP config.
 */
export default function LearnLessonPage() {
  const { courseId, moduleCode: moduleCodeParam, moduleIndex: moduleIndexParam } = useLearnParams();
  const moduleCode = moduleCodeParam!;
  const moduleIndex = moduleIndexParam!;

  const { data: course } = useCourse(courseId);
  const { data: courseModule } = useCourseModule(courseId, moduleCode);
  const {
    data: lesson,
    isLoading,
    error: lessonError,
  } = useLesson(courseId, moduleCode, moduleIndex);

  const { data: slts } = useSLTs(courseId, moduleCode);

  const lessonsWithNav: LessonNavItem[] = React.useMemo(() => {
    if (!slts) return [];
    return slts
      .filter((slt) => slt.lesson)
      .map((slt) => ({
        index: slt.moduleIndex ?? 1,
        title: typeof slt.lesson?.title === "string"
          ? slt.lesson.title
          : `Lesson ${slt.moduleIndex ?? 1}`,
      }))
      .sort((a, b) => a.index - b.index);
  }, [slts]);

  const error = lessonError?.message ?? null;

  if (isLoading) {
    return <AndamioPageLoading variant="content" />;
  }

  if (error || !lesson) {
    return (
      <div className="space-y-6">
        <AndamioBackButton href={PUBLIC_ROUTES.module(moduleCode)} label="Back to Module" />

        <AndamioNotFoundCard
          title="Lesson Not Found"
          message={error ?? "Lesson not found"}
        />

        {!error && (
          <AndamioCard>
            <AndamioCardContent className="pt-6">
              <AndamioEmptyState
                icon={CourseIcon}
                title="This learning target doesn't have a lesson yet"
              />
            </AndamioCardContent>
          </AndamioCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AndamioBackButton href={PUBLIC_ROUTES.module(moduleCode)} label="Back to Module" />

      {/* Student Learning Target */}
      <AndamioCard>
        <AndamioCardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <AndamioCardDescription>Learning Target #{moduleIndex}</AndamioCardDescription>
              <AndamioCardTitle>Learning Target {moduleIndex}</AndamioCardTitle>
            </div>
          </div>
        </AndamioCardHeader>
      </AndamioCard>

      {/* Lesson Title and Description */}
      <div className="space-y-4">
        <div>
          <AndamioHeading level={1} size="3xl">
            {typeof lesson.title === "string" ? lesson.title : `Lesson ${moduleIndex}`}
          </AndamioHeading>
          {typeof lesson.description === "string" && lesson.description && (
            <AndamioText variant="lead" className="mt-2">
              {lesson.description}
            </AndamioText>
          )}
        </div>
      </div>

      {/* Media Section */}
      <LessonMediaSection
        videoUrl={typeof lesson.videoUrl === "string" ? lesson.videoUrl : undefined}
        imageUrl={typeof lesson.imageUrl === "string" ? lesson.imageUrl : undefined}
        imageAlt={typeof lesson.title === "string" ? lesson.title : "Lesson image"}
      />

      {/* Lesson Content */}
      {!!lesson.contentJson && (
        <AndamioCard>
          <AndamioCardHeader>
            <AndamioCardTitle>Lesson Content</AndamioCardTitle>
          </AndamioCardHeader>
          <AndamioCardContent>
            <ContentViewer
              content={lesson.contentJson}
              emptyContent={
                <AndamioText variant="muted" className="italic">Unable to parse lesson content</AndamioText>
              }
            />
          </AndamioCardContent>
        </AndamioCard>
      )}

      {/* Empty content state */}
      {!lesson.contentJson && !lesson.imageUrl && !lesson.videoUrl && (
        <AndamioCard>
          <AndamioCardContent className="pt-6">
            <AndamioEmptyState
              icon={CourseIcon}
              title="No content has been added to this lesson yet"
            />
          </AndamioCardContent>
        </AndamioCard>
      )}

      {/* Prev/Next Lesson Navigation */}
      <LearnLessonNavigation
        currentIndex={moduleIndex}
        lessonsWithNav={lessonsWithNav}
        moduleCode={moduleCode}
      />
    </div>
  );
}
