"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AndamioPageLoading,
  AndamioNotFoundCard,
  AndamioEmptyState,
} from "~/components/andamio";
import { SLTIcon } from "~/components/icons";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioHeading } from "~/components/andamio/andamio-heading";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { useLearnParams } from "~/hooks/use-learn-params";
import { UserCourseStatus } from "~/components/learner/user-course-status";
import { OnChainSltsBadge } from "~/components/courses/on-chain-slts-viewer";
import { LearnModuleCard } from "~/components/courses/learn-module-card";
import { useCourse, useCourseModules, useTeacherCourseModules } from "~/hooks/api";
import { useStudentAssignmentCommitments, getModuleCommitmentStatus, groupCommitmentsByModule } from "~/hooks/api/course/use-student-assignment-commitments";

/**
 * Learn page — displays credentials to earn and their SLTs.
 * Uses the single course ID from CARDANO_XP config.
 */
export default function LearnPage() {
  return (
    <Suspense fallback={<AndamioPageLoading variant="detail" />}>
      <LearnContent />
    </Suspense>
  );
}

function LearnContent() {
  const { courseId } = useLearnParams();
  const searchParams = useSearchParams();
  const isTeacherPreview = searchParams.get("preview") === "teacher";

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

  const totalSlts = resolvedModules.reduce((sum, m) => {
    const dbCount = m.slts?.length ?? 0;
    const chainCount = m.onChainSlts?.length ?? 0;
    return sum + (dbCount > 0 ? dbCount : chainCount);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3 mb-2">
          <AndamioHeading level={1} size="2xl">{pageTitle}</AndamioHeading>
          <OnChainSltsBadge courseId={courseId} />
        </div>
        {pageDescription && (
          <AndamioText variant="lead">{pageDescription}</AndamioText>
        )}
        <div className="flex flex-wrap gap-3 sm:gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SLTIcon className="h-4 w-4 shrink-0" />
            <span>{totalSlts} {totalSlts === 1 ? "SLT" : "SLTs"} across {resolvedModules.length} {resolvedModules.length === 1 ? "credential" : "credentials"}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <UserCourseStatus courseId={courseId} />

      {/* Credentials */}
      <div className="space-y-6">
        <div>
          <AndamioText variant="muted">
            Request access by giving quick feedback on each SLT. Feedback will be stored by Andamio.{" "}
            <Link href="/about" className="text-primary hover:underline">
              Learn more
            </Link>
          </AndamioText>
        </div>

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
