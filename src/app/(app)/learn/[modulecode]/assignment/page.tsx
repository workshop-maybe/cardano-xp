"use client";

import React, { useMemo } from "react";
import { useLearnParams } from "~/hooks/use-learn-params";
import { PUBLIC_ROUTES } from "~/config/routes";
import { ContentViewer } from "~/components/editor";
import { AndamioBadge } from "~/components/andamio/andamio-badge";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioCard, AndamioCardContent, AndamioCardDescription, AndamioCardHeader, AndamioCardTitle } from "~/components/andamio/andamio-card";
import { AndamioSeparator } from "~/components/andamio/andamio-separator";
import { AndamioAlert, AndamioAlertDescription } from "~/components/andamio/andamio-alert";
import {
  AndamioPageHeader,
  AndamioPageLoading,
  AndamioNotFoundCard,
  AndamioBackButton,
} from "~/components/andamio";
import { AssignmentCommitment } from "~/components/learner/assignment-commitment";
import { useCourse, useCourseModule, useSLTs, useAssignment, type SLT } from "~/hooks/api";
import { useStudentAssignmentCommitments, getModuleCommitmentStatus } from "~/hooks/api/course/use-student-assignment-commitments";
import { CommitmentStatusBadge } from "~/components/courses/commitment-status-badge";
import { computeSltHash } from "@andamio/core/hashing";
import { AlertIcon, SuccessIcon } from "~/components/icons";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";

/**
 * Learn assignment page - uses the single course ID from CARDANO_XP config.
 */
export default function LearnAssignmentPage() {
  const { courseId, moduleCode: moduleCodeParam } = useLearnParams();
  const moduleCode = moduleCodeParam!;

  const { data: course } = useCourse(courseId);
  const { data: courseModule } = useCourseModule(courseId, moduleCode);
  const { data: slts } = useSLTs(courseId, moduleCode);
  const {
    data: assignment,
    isLoading,
    error: assignmentError,
  } = useAssignment(courseId, moduleCode);

  const error = assignmentError?.message ?? null;

  const { isAuthenticated } = useAndamioAuth();
  const { data: studentCommitments } = useStudentAssignmentCommitments(
    isAuthenticated ? courseId : undefined
  );

  const commitmentStatus = useMemo(() => {
    if (!studentCommitments) return null;
    const moduleCommitments = studentCommitments.filter(
      (c) => c.moduleCode === moduleCode && c.courseId === courseId
    );
    return getModuleCommitmentStatus(moduleCommitments);
  }, [studentCommitments, moduleCode, courseId]);

  const computedSltHash = useMemo(() => {
    if (slts && slts.length > 0) {
      const sltTexts = [...slts]
        .sort((a, b) => (a.moduleIndex ?? 0) - (b.moduleIndex ?? 0))
        .map((slt) => slt.sltText ?? "");
      return computeSltHash(sltTexts);
    }
    return null;
  }, [slts]);

  const onChainModuleHash = useMemo(() => {
    if (!computedSltHash || !course?.modules) return null;
    const matchingModule = course.modules.find(
      (m) => m.sltHash === computedSltHash
    );
    return matchingModule?.sltHash ?? null;
  }, [computedSltHash, course?.modules]);

  const dbSltHash = courseModule?.sltHash ?? null;
  const sltHash = onChainModuleHash ?? dbSltHash ?? computedSltHash;

  const hashMismatch = useMemo(() => {
    if (onChainModuleHash && computedSltHash && onChainModuleHash !== computedSltHash) {
      return { computed: computedSltHash, onChain: onChainModuleHash };
    }
    return null;
  }, [onChainModuleHash, computedSltHash]);

  const sortedSlts: SLT[] = slts
    ? [...slts].sort((a, b) => (a.moduleIndex ?? 0) - (b.moduleIndex ?? 0))
    : ([] as SLT[]);

  if (isLoading) {
    return <AndamioPageLoading variant="content" />;
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <AndamioBackButton href={PUBLIC_ROUTES.module(moduleCode)} label="Back to Module" />
        <AndamioNotFoundCard
          title="Assignment Not Found"
          message={error ?? "No assignment found for this module"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AndamioBackButton href={PUBLIC_ROUTES.module(moduleCode)} label="Back to Module" />

      <AndamioPageHeader
        title={assignment.title ?? "Assignment"}
        description={undefined}
      />

      <div className="flex items-center gap-2">
        <AndamioBadge variant="outline" className="font-mono text-xs">
          {moduleCode}
        </AndamioBadge>
        {commitmentStatus && <CommitmentStatusBadge status={commitmentStatus} />}
      </div>

      {sortedSlts.length > 0 && (
        <AndamioCard>
          <AndamioCardHeader>
            <AndamioCardTitle>Learning Targets</AndamioCardTitle>
            <AndamioCardDescription>
              This assignment covers {sortedSlts.length} Student Learning Target{sortedSlts.length !== 1 ? 's' : ''}
            </AndamioCardDescription>
          </AndamioCardHeader>
          <AndamioCardContent>
            <div className="space-y-2">
              {sortedSlts.map((slt) => (
                <div key={`slt-${slt.moduleIndex ?? 0}`} className="flex items-start gap-3 p-3 border rounded-md">
                  <AndamioBadge variant="outline" className="mt-0.5">
                    {slt.moduleIndex ?? 0}
                  </AndamioBadge>
                  <AndamioText variant="small" className="flex-1 text-foreground">{slt.sltText ?? ""}</AndamioText>
                </div>
              ))}
            </div>
          </AndamioCardContent>
        </AndamioCard>
      )}

      {!!assignment.contentJson && (
        <AndamioCard>
          <AndamioCardHeader>
            <AndamioCardTitle>Assignment Details</AndamioCardTitle>
            <AndamioCardDescription>Read the full assignment below</AndamioCardDescription>
          </AndamioCardHeader>
          <AndamioCardContent>
            <ContentViewer content={assignment.contentJson} />
          </AndamioCardContent>
        </AndamioCard>
      )}

      <AndamioSeparator />

      {hashMismatch && (
        <AndamioAlert variant="destructive">
          <AlertIcon className="h-4 w-4" />
          <AndamioAlertDescription>
            <AndamioText className="font-medium">Module Content Changed</AndamioText>
            <AndamioText variant="small">
              This module has been updated since it was published. Your instructor may need to republish it. Please contact your course administrator.
            </AndamioText>
          </AndamioAlertDescription>
        </AndamioAlert>
      )}

      {onChainModuleHash && !hashMismatch && (
        <AndamioAlert>
          <SuccessIcon className="h-4 w-4 text-primary" />
          <AndamioAlertDescription>
            <span className="font-medium">Module verified on-chain</span>
            <span className="ml-2 text-xs font-mono text-muted-foreground">
              {onChainModuleHash.slice(0, 16)}...
            </span>
          </AndamioAlertDescription>
        </AndamioAlert>
      )}

      <AssignmentCommitment
        assignmentTitle={assignment.title}
        courseId={courseId}
        moduleCode={moduleCode}
        sltHash={sltHash}
      />
    </div>
  );
}
