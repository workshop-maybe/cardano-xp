"use client";

import React, { useMemo } from "react";
import { useLearnParams } from "~/hooks/use-learn-params";
import Link from "next/link";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { AndamioBadge } from "~/components/andamio/andamio-badge";
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
import { OnChainIcon, AssignmentIcon, NextIcon } from "~/components/icons";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioHeading } from "~/components/andamio/andamio-heading";
import { useCourse, useCourseModule, useSLTs } from "~/hooks/api";
import { useStudentAssignmentCommitments, getModuleCommitmentStatus } from "~/hooks/api/course/use-student-assignment-commitments";
import { useStudentCredentials, type StudentCourseCredential } from "~/hooks/api/course/use-student-credentials";
import { AssignmentStatusBadge } from "~/components/learner/assignment-status-badge";
import { SLTLessonTable, type CombinedSLTLesson } from "~/components/courses/slt-lesson-table";
import { PUBLIC_ROUTES } from "~/config/routes";

/**
 * Module detail page for /learn routes.
 * Uses the single course ID from CARDANO_XP config.
 */
export default function LearnModulePage() {
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
      <AndamioBackButton href={PUBLIC_ROUTES.courses} label="Back to Course" />

      <AndamioPageHeader
        title={courseModule.title ?? "Module"}
        description={typeof courseModule.description === "string" ? courseModule.description : undefined}
      />
      <AndamioCard>
        <AndamioCardContent className="pt-6 space-y-4">
          <AndamioSectionHeader
            title="What You'll Learn"
            badge={onChainModule ? (
              <AndamioBadge variant="outline" className="text-primary border-primary">
                <OnChainIcon className="h-3 w-3 mr-1" />
                On-chain
              </AndamioBadge>
            ) : undefined}
          />
          <AndamioText variant="muted">
            Each learning target has a short lesson. Read through them, then submit your feedback to earn this credential.
          </AndamioText>
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
    <AndamioCard className="border-primary/50 bg-primary/5">
      <AndamioCardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <AssignmentIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <AndamioHeading level={3} size="lg">{ctaConfig.heading}</AndamioHeading>
              {commitmentStatus && (
                <AssignmentStatusBadge status={commitmentStatus} />
              )}
            </div>
            <AndamioText variant="muted">{ctaConfig.description}</AndamioText>
          </div>
          {ctaConfig.buttonLabel && (
            <div className="flex-shrink-0">
              <Link href={`${PUBLIC_ROUTES.courses}/${moduleCode}/assignment`}>
                <AndamioButton size="lg">
                  {ctaConfig.buttonLabel}
                  <NextIcon className="h-4 w-4 ml-2" />
                </AndamioButton>
              </Link>
            </div>
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
        heading: "Feedback Accepted!",
        description:
          "Your feedback has been approved. Claim your credential to record it on-chain.",
        buttonLabel: "Claim Credential",
      };
    case "CREDENTIAL_CLAIMED":
      return {
        heading: "Credential Earned",
        description:
          "You've earned this credential. Your contribution is recorded on-chain.",
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
        heading: "Ready to share your feedback?",
        description:
          "Tell us what you think about what you've learned. Accepted feedback earns you a credential.",
        buttonLabel: "Give Feedback",
      };
  }
}
