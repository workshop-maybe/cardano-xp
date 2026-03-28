"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  AndamioPageLoading,
  AndamioNotFoundCard,
  AndamioEmptyState,
} from "~/components/andamio";
import { SLTIcon } from "~/components/icons";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioHeading } from "~/components/andamio/andamio-heading";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { UserCourseStatus } from "~/components/learner/user-course-status";
import { LearnModuleCard } from "~/components/courses/learn-module-card";
import { useCourse, useCourseModules, useTeacherCourseModules } from "~/hooks/api";
import { useStudentAssignmentCommitments, getModuleCommitmentStatus, groupCommitmentsByModule } from "~/hooks/api/course/use-student-assignment-commitments";
import { CARDANO_XP } from "~/config/cardano-xp";

/**
 * Learn page client content — all interactive logic lives here.
 *
 * Course and module data is prefetched on the server and hydrated
 * into React Query's cache. Auth-gated hooks fire client-side.
 */
export function LearnContent({ preview }: { preview: boolean }) {
  const courseId = CARDANO_XP.courseId;
  const searchParams = useSearchParams();
  const isTeacherPreview = preview || searchParams.get("preview") === "teacher";

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useCourse(courseId);

  const {
    data: modules,
    isLoading: modulesLoading,
    error: modulesError,
  } = useCourseModules(courseId);

  const {
    data: teacherModules,
    isLoading: teacherModulesLoading,
    error: teacherModulesError,
  } = useTeacherCourseModules(isTeacherPreview ? courseId : undefined);

  const { isAuthenticated } = useAndamioAuth();
  const { data: studentCommitments } = useStudentAssignmentCommitments(
    isAuthenticated ? courseId : undefined,
  );

  const commitmentsByModule = useMemo(
    () => groupCommitmentsByModule(studentCommitments ?? [], courseId),
    [studentCommitments, courseId],
  );

  const resolvedModules = isTeacherPreview
    ? (teacherModules?.length ? teacherModules : modules ?? [])
    : modules ?? [];

  const resolvedModulesLoading = isTeacherPreview
    ? (modulesLoading || teacherModulesLoading)
    : modulesLoading;

  const resolvedModulesError = isTeacherPreview
    ? (modulesError ?? teacherModulesError)
    : modulesError;

  const isLoading = courseLoading || resolvedModulesLoading;
  const error = courseError ?? resolvedModulesError;

  if (isLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (error || !course) {
    return (
      <AndamioNotFoundCard
        title="Not Found"
        message={error?.message ?? "Content not found"}
      />
    );
  }

  const pageTitle = course.title ?? "Earn Credentials";
  const pageDescription = course.description;

  if (resolvedModules.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <AndamioHeading level={1} size="2xl">{pageTitle}</AndamioHeading>
          {pageDescription && (
            <AndamioText variant="lead">{pageDescription}</AndamioText>
          )}
        </div>
        <AndamioEmptyState
          icon={SLTIcon}
          title="No credentials available yet"
          className="border rounded-md"
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Onboarding Header */}
      <div className="space-y-5 pt-2">
        <div>
          <AndamioHeading level={1} size="2xl">{pageTitle}</AndamioHeading>
          <AndamioText variant="lead">
            Complete this quick assignment and you can start giving feedback and earning XP.
          </AndamioText>
        </div>
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-5 space-y-2">
          <AndamioText variant="small" className="font-medium text-foreground">
            How it works
          </AndamioText>
          <AndamioText variant="small">
            Give quick feedback on the learning targets below and earn a credential.
            That credential is your ticket to pick up tasks, contribute to the project, and earn XP.
          </AndamioText>
        </div>
      </div>

      {/* Progress */}
      <UserCourseStatus courseId={courseId} />

      {/* Modules */}
      <div className="space-y-6">
        <div className="space-y-4">
          {resolvedModules.map((courseModule, moduleIndex) => {
            const dbSlts = (courseModule.slts ?? [])
              .filter((s) => !!s.sltText)
              .map((s) => ({ sltText: s.sltText! }));

            const chainSlts = (courseModule.onChainSlts ?? [])
              .map((text) => ({ sltText: text }));

            const displaySlts = dbSlts.length > 0 ? dbSlts : chainSlts;

            const hasOnChain = (courseModule.onChainSlts ?? []).length > 0;
            const onChainSltsSet = new Set(courseModule.onChainSlts ?? []);

            const moduleCommitments = commitmentsByModule.get(courseModule.moduleCode ?? "") ?? [];
            const moduleCommitmentStatus = getModuleCommitmentStatus(moduleCommitments);

            return (
              <LearnModuleCard
                key={courseModule.moduleCode ?? courseModule.sltHash}
                moduleCode={courseModule.moduleCode ?? ""}
                title={courseModule.title ?? "Credential"}
                index={moduleIndex + 1}
                sltHash={courseModule.sltHash}
                slts={displaySlts}
                onChainSlts={onChainSltsSet}
                isOnChain={hasOnChain}
                commitmentStatus={moduleCommitmentStatus}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
