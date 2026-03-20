"use client";

import {
  AndamioCard,
  AndamioCardContent,
  AndamioCardHeader,
} from "~/components/andamio/andamio-card";
import { AndamioBadge } from "~/components/andamio/andamio-badge";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioText } from "~/components/andamio/andamio-text";
import { AndamioSkeleton } from "~/components/andamio/andamio-skeleton";
import { AndamioCardIconHeader } from "~/components/andamio/andamio-card-icon-header";
import {
  AndamioTable,
  AndamioTableBody,
  AndamioTableCell,
  AndamioTableHead,
  AndamioTableHeader,
  AndamioTableRow,
} from "~/components/andamio/andamio-table";
import { AndamioTableContainer } from "~/components/andamio";
import {
  TeacherIcon,
  RefreshIcon,
  AlertIcon,
  SuccessIcon,
  ExternalLinkIcon,
} from "~/components/icons";
import type { TeacherAssignmentCommitment } from "~/hooks/api";

interface PendingReviewsListProps {
  /** All commitments for the course (filtering done internally) */
  commitments: TeacherAssignmentCommitment[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error from data fetch */
  error?: Error | null;
  /** Callback to refetch data */
  onRefetch?: () => void;
  /** Callback when an assessment row is clicked */
  onSelectAssessment?: (assessment: TeacherAssignmentCommitment) => void;
}

/**
 * Pending Reviews List Component
 *
 * Presentational component that displays assignments awaiting teacher review.
 * Receives data from the parent page — does not fetch internally.
 *
 * UX States:
 * - Loading: Skeleton table rows
 * - Empty: Informative "All caught up!" message
 * - Error: Inline alert with retry button
 */
export function PendingReviewsList({
  commitments,
  isLoading = false,
  error,
  onRefetch,
  onSelectAssessment,
}: PendingReviewsListProps) {
  const refetch = onRefetch ?? (() => { /* noop */ });
  const pendingAssessments = commitments.filter(
    (c) => c.commitmentStatus === "PENDING_APPROVAL"
  );

  // Loading state - skeleton table
  if (isLoading) {
    return (
      <AndamioCard>
        <AndamioCardHeader>
          <AndamioCardIconHeader
            icon={TeacherIcon}
            title="On-Chain Pending Assessments"
            description="Assignments awaiting review from blockchain data"
          />
        </AndamioCardHeader>
        <AndamioCardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-md bg-muted/30">
                <AndamioSkeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <AndamioSkeleton className="h-4 w-48" />
                  <AndamioSkeleton className="h-3 w-32" />
                </div>
                <AndamioSkeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </AndamioCardContent>
      </AndamioCard>
    );
  }

  // Error state - inline alert with retry
  if (error) {
    return (
      <AndamioCard>
        <AndamioCardHeader>
          <div className="flex items-center justify-between">
            <AndamioCardIconHeader
              icon={TeacherIcon}
              title="On-Chain Pending Assessments"
              description="Assignments awaiting review from blockchain data"
            />
            <AndamioButton variant="ghost" size="icon-sm" onClick={() => void refetch()}>
              <RefreshIcon className="h-4 w-4" />
            </AndamioButton>
          </div>
        </AndamioCardHeader>
        <AndamioCardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-3">
              <AlertIcon className="h-6 w-6 text-destructive" />
            </div>
            <AndamioText variant="small" className="font-medium text-destructive">
              Failed to load pending assessments
            </AndamioText>
            <AndamioText variant="small" className="text-xs mt-1 max-w-[250px]">
              {error.message}
            </AndamioText>
            <AndamioButton variant="outline" size="sm" onClick={() => void refetch()} className="mt-4">
              <RefreshIcon className="mr-2 h-4 w-4" />
              Retry
            </AndamioButton>
          </div>
        </AndamioCardContent>
      </AndamioCard>
    );
  }

  // Empty state - all caught up
  if (pendingAssessments.length === 0) {
    return (
      <AndamioCard>
        <AndamioCardHeader>
          <div className="flex items-center justify-between">
            <AndamioCardIconHeader
              icon={TeacherIcon}
              title="On-Chain Pending Assessments"
              description="Assignments awaiting review from blockchain data"
            />
            <AndamioButton variant="ghost" size="icon-sm" onClick={() => void refetch()}>
              <RefreshIcon className="h-4 w-4" />
            </AndamioButton>
          </div>
        </AndamioCardHeader>
        <AndamioCardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
              <SuccessIcon className="h-6 w-6 text-primary" />
            </div>
            <AndamioText className="font-medium">
              All caught up!
            </AndamioText>
            <AndamioText variant="muted" className="mt-1 max-w-[250px]">
              No pending assignment reviews on-chain at this time
            </AndamioText>
          </div>
        </AndamioCardContent>
      </AndamioCard>
    );
  }

  // Format submission date from slot
  // Updated 2026-01-28: submittedAt removed, use submissionSlot only
  const formatSubmissionDate = (assessment: TeacherAssignmentCommitment): string => {
    if (assessment.submissionSlot) {
      // Preprod genesis time: 2022-04-01T00:00:00Z = 1648771200
      const genesisTime = 1648771200;
      const timestamp = (genesisTime + assessment.submissionSlot) * 1000;
      return new Date(timestamp).toLocaleDateString();
    }
    return "Unknown";
  };

  return (
    <AndamioCard>
      <AndamioCardHeader>
        <div className="flex items-center justify-between">
          <AndamioCardIconHeader
            icon={TeacherIcon}
            title="On-Chain Pending Assessments"
            description={`${pendingAssessments.length} assignment${pendingAssessments.length !== 1 ? "s" : ""} awaiting review from blockchain`}
          />
          <div className="flex items-center gap-2">
            <AndamioBadge variant="secondary">
              {pendingAssessments.length} pending
            </AndamioBadge>
            <AndamioButton variant="ghost" size="icon-sm" onClick={() => void refetch()}>
              <RefreshIcon className="h-4 w-4" />
            </AndamioButton>
          </div>
        </div>
      </AndamioCardHeader>
      <AndamioCardContent>
        <AndamioTableContainer>
          <AndamioTable>
            <AndamioTableHeader>
              <AndamioTableRow>
                <AndamioTableHead>Student</AndamioTableHead>
                <AndamioTableHead>Assignment</AndamioTableHead>
                <AndamioTableHead className="hidden sm:table-cell">Submitted</AndamioTableHead>
                <AndamioTableHead>Content</AndamioTableHead>
              </AndamioTableRow>
            </AndamioTableHeader>
            <AndamioTableBody>
              {pendingAssessments.map((assessment) => (
                <AndamioTableRow
                  key={`${assessment.courseId}-${assessment.sltHash}-${assessment.studentAlias}`}
                  className={onSelectAssessment ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onSelectAssessment?.(assessment)}
                >
                  <AndamioTableCell className="font-mono text-xs">
                    {assessment.studentAlias}
                  </AndamioTableCell>
                  <AndamioTableCell>
                    <code className="text-xs font-mono truncate block max-w-[120px]">
                      {assessment.moduleCode ?? (assessment.sltHash ?? "").slice(0, 12) + "..."}
                    </code>
                  </AndamioTableCell>
                  <AndamioTableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {formatSubmissionDate(assessment)}
                  </AndamioTableCell>
                  <AndamioTableCell>
                    <div className="flex items-center gap-2">
                      <AndamioText variant="small" className="max-w-[150px] truncate">
                        {assessment.evidence ? (
                          <span className="text-primary">Tiptap content</span>
                        ) : assessment.onChainContent ? (
                          <span className="font-mono text-muted-foreground">{assessment.onChainContent.slice(0, 20)}...</span>
                        ) : (
                          <span className="italic text-muted-foreground">No content</span>
                        )}
                      </AndamioText>
                      {onSelectAssessment && (
                        <ExternalLinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </AndamioTableCell>
                </AndamioTableRow>
              ))}
            </AndamioTableBody>
          </AndamioTable>
        </AndamioTableContainer>
      </AndamioCardContent>
    </AndamioCard>
  );
}
