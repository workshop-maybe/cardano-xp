"use client";

import React, { useMemo } from "react";
import { useLearnParams } from "~/hooks/use-learn-params";
import Link from "next/link";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { AndamioButton } from "~/components/andamio/andamio-button";
import {
  AndamioPageHeader,
  AndamioSectionHeader,
  AndamioPageLoading,
  AndamioNotFoundCard,
  AndamioCard,
  AndamioCardContent,
  AndamioBackButton,
} from "~/components/andamio";
import { NextIcon } from "~/components/icons";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioHeading } from "~/components/andamio/andamio-heading";
import { useCourse, useCourseModule, useSLTs } from "~/hooks/api";
import { useStudentAssignmentCommitments, getModuleCommitmentStatus } from "~/hooks/api/course/use-student-assignment-commitments";
import { useStudentCredentials, type StudentCourseCredential } from "~/hooks/api/course/use-student-credentials";
import { AssignmentStatusBadge } from "~/components/learner/assignment-status-badge";
import { SLTLessonTable, type CombinedSLTLesson } from "~/components/courses/slt-lesson-table";
import { PUBLIC_ROUTES } from "~/config/routes";

/**
 * Module detail page client content — all interactive logic lives here.
 *
 * Public data (course, modules, SLTs) is prefetched on the server and
 * hydrated into React Query's cache. Auth-gated hooks fire client-side.
 */
export function ModuleContent() {
  const { courseId, moduleCode: moduleCodeParam } = useLearnParams();
  const moduleCode = moduleCodeParam!;
  const { isAuthenticated } = useAndamioAuth();

  const { data: course } = useCourse(courseId);
  const {
    data: courseModule,
    isLoading: moduleLoading,
    error: moduleError,
  } = useCourseModule(courseId, moduleCode);
  const { data: slts, isLoading: sltsLoading } = useSLTs(courseId, moduleCode);

  const { data: studentCommitments } = useStudentAssignmentCommitments(
    isAuthenticated ? courseId : undefined,
  );

  const { data: studentCredentials } = useStudentCredentials();

  const moduleCommitmentStatus = useMemo(() => {
    if (!studentCommitments) return null;
    const moduleCommitments = studentCommitments.filter(
      (c) => c.courseId === courseId && c.moduleCode === moduleCode,
    );
    const commitmentStatus = getModuleCommitmentStatus(moduleCommitments);

    if (commitmentStatus === "ASSIGNMENT_ACCEPTED") {
      const hasClaimedCredential = hasClaimedModuleCredential(
        studentCredentials ?? [],
        courseId,
        moduleCode,
      );
      if (hasClaimedCredential) return "CREDENTIAL_CLAIMED";
    }

    return commitmentStatus;
  }, [studentCommitments, studentCredentials, moduleCode, courseId]);

  const onChainModules = useMemo(() => course?.modules ?? [], [course?.modules]);

  const combinedData = useMemo<CombinedSLTLesson[]>(() => {
    if (!slts) return [];

    return slts.map((slt) => {
      const lesson = slt.lesson;
      return {
        module_index: slt.moduleIndex ?? 1,
        slt_text: slt.sltText ?? "",
        slt_id: `slt-${slt.moduleIndex}`,
        lesson: lesson
          ? {
              title: typeof lesson.title === "string" ? lesson.title : null,
              description: typeof lesson.description === "string" ? lesson.description : null,
              image_url: typeof lesson.imageUrl === "string" ? lesson.imageUrl : null,
              video_url: typeof lesson.videoUrl === "string" ? lesson.videoUrl : null,
            }
          : undefined,
      };
    });
  }, [slts]);

  const onChainModule = useMemo(() => {
    if (onChainModules.length === 0 || combinedData.length === 0) return null;

    const dbSltTexts = new Set(combinedData.map((s) => s.slt_text));

    for (const mod of onChainModules) {
      const modSlts = mod.onChainSlts ?? [];
      const onChainTexts = new Set(modSlts);
      const intersection = [...dbSltTexts].filter((t) => onChainTexts.has(t));
      if (intersection.length > 0 && modSlts.length > 0 && intersection.length >= modSlts.length * 0.5) {
        return mod;
      }
    }

    return null;
  }, [onChainModules, combinedData]);

  const isLoading = moduleLoading || sltsLoading;

  if (isLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (moduleError || !courseModule) {
    return (
      <AndamioNotFoundCard
        title="Module Not Found"
        message={moduleError?.message ?? "Module not found"}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AndamioBackButton href={PUBLIC_ROUTES.courses} label="Back" />

      <AndamioPageHeader
        title={courseModule.title ?? "Module"}
        description={typeof courseModule.description === "string" ? courseModule.description : undefined}
      />
      <AndamioCard>
        <AndamioCardContent className="pt-6 space-y-4">
          <AndamioSectionHeader
            title="What You'll Learn"
          />
          <AndamioText variant="muted">
            If you already know what to say, skip straight to the assignment. Otherwise, the lessons below will help you get there.
          </AndamioText>
          <div className="pt-1">
            <Link href={`${PUBLIC_ROUTES.courses}/${moduleCode}/assignment`}>
              <AndamioButton size="sm" rightIcon={<NextIcon className="h-3.5 w-3.5" />}>
                Go to Assignment
              </AndamioButton>
            </Link>
          </div>
          <SLTLessonTable
            data={combinedData}
            courseId={courseId}
            moduleCode={moduleCode}
            onChainModule={onChainModule}
            basePath={PUBLIC_ROUTES.courses}
          />
        </AndamioCardContent>
      </AndamioCard>

      <LearnAssignmentCTA
        moduleCode={moduleCode}
        commitmentStatus={moduleCommitmentStatus}
      />
    </div>
  );
}

function hasClaimedModuleCredential(
  credentials: StudentCourseCredential[],
  courseId: string,
  moduleCode: string,
): boolean {
  const courseCredential = credentials.find((c) => c.courseId === courseId);
  if (!courseCredential || courseCredential.claimedCredentials.length === 0) {
    return false;
  }
  return courseCredential.modules.some(
    (m) =>
      m.courseModuleCode === moduleCode &&
      m.sltHash !== "" &&
      courseCredential.claimedCredentials.includes(m.sltHash),
  );
}

interface LearnAssignmentCTAProps {
  moduleCode: string;
  commitmentStatus: string | null;
}

function LearnAssignmentCTA({
  moduleCode,
  commitmentStatus,
}: LearnAssignmentCTAProps) {
  const ctaConfig = getAssignmentCTAConfig(commitmentStatus);

  return (
    <AndamioCard className="border-secondary/30 bg-secondary/5 py-0">
      <AndamioCardContent className="px-4 sm:px-5 py-4">
        <div className="space-y-5">
          {commitmentStatus && (
            <AssignmentStatusBadge status={commitmentStatus} />
          )}
          <AndamioHeading level={3} size="lg">{ctaConfig.heading}</AndamioHeading>
          <AndamioText variant="muted">{ctaConfig.description}</AndamioText>
          {ctaConfig.buttonLabel && (
            <Link href={`${PUBLIC_ROUTES.courses}/${moduleCode}/assignment`}>
              <AndamioButton size="lg" rightIcon={<NextIcon className="h-4 w-4" />}>
                {ctaConfig.buttonLabel}
              </AndamioButton>
            </Link>
          )}
        </div>
      </AndamioCardContent>
    </AndamioCard>
  );
}

function getAssignmentCTAConfig(status: string | null) {
  switch (status) {
    case "PENDING_APPROVAL":
      return {
        heading: "Feedback Submitted",
        description:
          "Your feedback is being reviewed. You can view your submission while you wait.",
        buttonLabel: "View Feedback",
      };
    case "ASSIGNMENT_ACCEPTED":
      return {
        heading: "Feedback Accepted",
        description:
          "Your feedback has been approved. Claim a credential to make it permanent.",
        buttonLabel: "Claim Credential",
      };
    case "CREDENTIAL_CLAIMED":
      return {
        heading: "Credential Earned",
        description:
          "You've earned this credential. Your contribution is permanently recorded.",
        buttonLabel: "View Feedback",
      };
    case "ASSIGNMENT_REFUSED":
      return {
        heading: "Revision Requested",
        description:
          "Your feedback needs some changes. Review the notes and resubmit when ready.",
        buttonLabel: "Revise Feedback",
      };
    default:
      return {
        heading: "Ready?",
        description:
          "Tell us what you think about this app. Once accepted, you'll earn a credential and can start picking up tasks.",
        buttonLabel: "Give Your First Feedback",
      };
  }
}
