"use client";

import React from "react";
import Link from "next/link";
import { useProject } from "~/hooks/api";
import { XpBadge } from "~/components/xp-badge";
import { useProjectTasks, groupTasksByHash } from "~/hooks/api/project/use-project";
import {
  AndamioBadge,
  AndamioButton,
  AndamioTable,
  AndamioTableBody,
  AndamioTableCell,
  AndamioTableHead,
  AndamioTableHeader,
  AndamioTableRow,
  AndamioPageHeader,
  AndamioPageLoading,
  AndamioEmptyState,
  AndamioTableContainer,
  AndamioErrorAlert,
} from "~/components/andamio";
import {
  AndamioCard,
  AndamioCardContent,
  AndamioCardHeader,
  AndamioCardTitle,
  AndamioCardDescription,
} from "~/components/andamio/andamio-card";
import { AndamioText } from "~/components/andamio/andamio-text";
import {
  TaskIcon,
  ContributorIcon,
  SuccessIcon,
} from "~/components/icons";
import { PrerequisiteList } from "~/components/project/prerequisite-list";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { useContributorCommitments } from "~/hooks/api/project/use-project-contributor";
import { useStudentCompletionsForPrereqs } from "~/hooks/api/course/use-student-completions-for-prereqs";
import { checkProjectEligibility } from "~/lib/project-eligibility";
import { useStudentAssignmentCommitments, getModuleCommitmentStatus, groupCommitmentsByModule } from "~/hooks/api/course/use-student-assignment-commitments";
import { CARDANO_XP } from "~/config/cardano-xp";
import { NextIcon, PendingIcon } from "~/components/icons";
import { PUBLIC_ROUTES, AUTH_ROUTES } from "~/config/routes";

/**
 * Tasks page — public view of all available tasks.
 * Uses the single project ID from CARDANO_XP config.
 */
export default function TasksPage() {
  const projectId = CARDANO_XP.projectId;

  const { data: project, isLoading, error } = useProject(projectId);
  const { data: mergedTasks } = useProjectTasks(projectId);
  const { isAuthenticated, user } = useAndamioAuth();

  // Prerequisite eligibility
  const prereqCourseIds = React.useMemo(() => {
    if (!project?.prerequisites) return [];
    return project.prerequisites
      .map((p) => p.courseId)
      .filter((id): id is string => !!id);
  }, [project?.prerequisites]);

  const { completions } = useStudentCompletionsForPrereqs(prereqCourseIds);

  const prerequisites = React.useMemo(() => project?.prerequisites ?? [], [project?.prerequisites]);
  const eligibility = React.useMemo(() => {
    if (!isAuthenticated || prerequisites.length === 0) return null;
    return checkProjectEligibility(prerequisites, completions);
  }, [isAuthenticated, prerequisites, completions]);

  // Check if user has accepted assignments but hasn't claimed the credential yet
  const { data: studentCommitments } = useStudentAssignmentCommitments(
    isAuthenticated ? CARDANO_XP.courseId : undefined,
  );
  const hasAcceptedAssignment = React.useMemo(() => {
    if (!studentCommitments) return false;
    return studentCommitments.some((c) => c.networkStatus === "ASSIGNMENT_ACCEPTED");
  }, [studentCommitments]);
  const readyToClaimCredential = hasAcceptedAssignment && eligibility && !eligibility.eligible;

  // Build assignment status map (sltHash → highest-priority status) for prerequisite display
  const assignmentStatuses = React.useMemo(() => {
    if (!studentCommitments) return undefined;
    const grouped = groupCommitmentsByModule(studentCommitments, CARDANO_XP.courseId);
    const map = new Map<string, string>();
    for (const [, moduleCommitments] of grouped) {
      const status = getModuleCommitmentStatus(moduleCommitments);
      if (status && moduleCommitments[0]?.sltHash) {
        map.set(moduleCommitments[0].sltHash, status);
      }
    }
    return map;
  }, [studentCommitments]);

  // Authenticated contributor commitments
  const { data: myCommitments = [] } = useContributorCommitments(projectId);

  // Derive contributor status from commitments
  const contributorStatus = React.useMemo(() => {
    const alias = user?.accessTokenAlias;
    if (!alias || !project) return null;

    const isContributor = (project.contributors ?? []).some((c) => c.alias === alias);
    if (!isContributor) return null;

    const hasClaimed = (project.credentialClaims ?? []).some((c) => c.alias === alias);

    const hasPending = myCommitments.some(c =>
      c.commitmentStatus === "SUBMITTED" ||
      c.commitmentStatus === "REFUSED" ||
      c.commitmentStatus === "PENDING_TX_COMMIT"
    );
    if (hasPending) return "task_pending" as const;

    const hasAccepted = myCommitments.some(c => c.commitmentStatus === "ACCEPTED");
    if (hasAccepted && !hasClaimed) return "task_accepted" as const;

    if (hasClaimed) return null;

    return "enrolled" as const;
  }, [user?.accessTokenAlias, project, myCommitments]);

  // Check if the current user has contributed
  const isReturningContributor = React.useMemo(() => {
    const alias = user?.accessTokenAlias;
    if (!alias || !project?.submissions) return false;
    return project.submissions.some(s => s.submittedBy === alias);
  }, [user?.accessTokenAlias, project?.submissions]);

  // Filter to live tasks only
  const allTasks = mergedTasks ?? project?.tasks ?? [];
  const liveTasks = React.useMemo(() => {
    return allTasks.filter((t) => t.taskStatus === "ON_CHAIN");
  }, [allTasks]);

  if (isLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <AndamioErrorAlert error={error?.message ?? "Project not found"} />
      </div>
    );
  }

  // Split into available vs completed
  const submittedTaskHashes = new Set(
    (project.submissions ?? []).map(s => s.taskHash).filter(Boolean),
  );

  const acceptedTaskHashes = new Set(
    myCommitments
      .filter(c => c.commitmentStatus === "ACCEPTED")
      .map(c => c.taskHash)
      .filter(Boolean),
  );
  const availableTasks = liveTasks.filter(t => !submittedTaskHashes.has(t.taskHash ?? ""));
  const completedTasks = liveTasks.filter(t => acceptedTaskHashes.has(t.taskHash ?? ""));

  // Group tasks by taskHash for display
  const availableTaskGroups = groupTasksByHash(availableTasks);
  const completedTaskGroups = groupTasksByHash(completedTasks);

  // Derived stats
  const contributors = project.contributors ?? [];

  // Helper to get XP from a task
  const getTaskXp = (task: typeof allTasks[0]) => {
    const xpToken = task.tokens?.find(
      (tok) => tok.policyId === CARDANO_XP.xpToken.policyId
    );
    return xpToken?.quantity ?? 0;
  };

  const availableXp = availableTasks.reduce((sum, t) => sum + getTaskXp(t), 0);

  // XP distributed = sum of XP for each submitted task
  const submissions = project.submissions ?? [];
  const taskXpByHash = new Map(
    allTasks.map((t) => [t.taskHash, getTaskXp(t)])
  );
  const distributedXp = submissions.reduce((sum, s) => {
    return sum + (taskXpByHash.get(s.taskHash) ?? 0);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <AndamioPageHeader
          title="Contribute"
          description="Pick a task, give feedback, earn XP. Your contribution history becomes your identity."
          action={
            isReturningContributor ? (
              <Link href={AUTH_ROUTES.contributor}>
                <AndamioButton variant="outline">
                  <ContributorIcon className="h-4 w-4 mr-2" />
                  My Contributions
                </AndamioButton>
              </Link>
            ) : undefined
          }
        />
      </div>

      {/* Contributor Status Bar */}
      {contributorStatus && (
        <div className={`rounded-lg border p-4 flex items-center justify-between gap-4 ${
          contributorStatus === "task_accepted"
            ? "border-primary/30 bg-primary/5"
            : "border-muted-foreground/20 bg-muted/30"
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            {contributorStatus === "task_accepted" ? (
              <SuccessIcon className="h-5 w-5 text-primary shrink-0" />
            ) : contributorStatus === "task_pending" ? (
              <PendingIcon className="h-5 w-5 text-secondary shrink-0" />
            ) : (
              <ContributorIcon className="h-5 w-5 text-primary shrink-0" />
            )}
            <div className="min-w-0">
              <AndamioText className="font-medium">
                {contributorStatus === "task_accepted"
                  ? "Task Accepted — Action Required"
                  : contributorStatus === "task_pending"
                    ? "Task Pending Review"
                    : "You're contributing to this project"}
              </AndamioText>
              <AndamioText variant="small" className="text-muted-foreground">
                {contributorStatus === "task_accepted"
                  ? "Your work was approved! Claim your reward or commit to a new task."
                  : contributorStatus === "task_pending"
                    ? "Your submission is waiting for manager review."
                    : "You have an active contributor role."}
              </AndamioText>
            </div>
          </div>
          <Link href={AUTH_ROUTES.contributor}>
            <AndamioButton size="sm" variant={contributorStatus === "task_accepted" ? "default" : "outline"}>
              {contributorStatus === "task_accepted" ? "Claim Reward" : "Contributor Dashboard"}
              <NextIcon className="h-3.5 w-3.5 ml-1.5" />
            </AndamioButton>
          </Link>
        </div>
      )}

      {/* Treasury XP */}
      {(() => {
        const treasuryXp = project.treasuryAssets?.find(
          (t) => t.policyId === CARDANO_XP.xpToken.policyId
        )?.quantity ?? 0;
        return treasuryXp > 0 ? (
          <div className="rounded-2xl border-2 border-secondary/30 bg-gradient-to-br from-secondary/10 via-secondary/5 to-background p-8">
            <div className="flex items-center justify-center gap-6">
              <img
                src="/logos/xp-token.png"
                alt="XP"
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-full shadow-lg shadow-secondary/20"
              />
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary/70 mb-1">
                  XP available
                </p>
                <p className="text-5xl sm:text-6xl font-display font-bold text-secondary tracking-tight leading-none">
                  {treasuryXp.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Fixed supply. Tasks are the only mint.
                </p>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Onboarding for Feedback Providers */}
      {prerequisites.length > 0 && (!eligibility || !eligibility.eligible) && (
        <AndamioCard>
          <AndamioCardHeader>
            <div className="flex items-center justify-between">
              <div>
                <AndamioCardTitle className="text-lg">Before you start</AndamioCardTitle>
                <AndamioCardDescription>
                  Complete this prerequisite to contribute. Moderated by humans — it moves at the speed of people.
                </AndamioCardDescription>
              </div>
              {eligibility && (
                <AndamioBadge variant="outline" className="gap-1 text-muted-foreground">
                  {eligibility.totalCompleted}/{eligibility.totalRequired} done
                </AndamioBadge>
              )}
            </div>
          </AndamioCardHeader>
          <AndamioCardContent>
            <PrerequisiteList prerequisites={prerequisites} completions={completions} assignmentStatuses={assignmentStatuses} />
          </AndamioCardContent>
        </AndamioCard>
      )}

      {/* Claim credential CTA — assignment accepted but credential not yet claimed */}
      {readyToClaimCredential && (
        <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 space-y-4 text-center">
          <AndamioText className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Your feedback was accepted
          </AndamioText>
          <AndamioText variant="lead" className="max-w-lg mx-auto">
            Claim your credential to unlock tasks and start earning XP. You&apos;re one step away.
          </AndamioText>
          <div className="pt-2">
            <Link href={PUBLIC_ROUTES.courses}>
              <AndamioButton size="lg" rightIcon={<NextIcon className="h-4 w-4" />}>
                Claim Your Credential
              </AndamioButton>
            </Link>
          </div>
        </div>
      )}

      {/* Project details — only show when eligible, not authenticated, or no prerequisites */}
      {(!prerequisites.length || !isAuthenticated || eligibility?.eligible) && (<>

      {/* Stats Bar */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TaskIcon className="h-4 w-4" />
            <AndamioText variant="small">Available XP</AndamioText>
          </div>
          <AndamioText className="text-2xl font-bold">
            {availableXp.toLocaleString()} XP
          </AndamioText>
          <AndamioText variant="small" className="text-muted-foreground">
            across {availableTasks.length} task{availableTasks.length !== 1 ? "s" : ""}
          </AndamioText>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ContributorIcon className="h-4 w-4" />
            <AndamioText variant="small">Contributors</AndamioText>
          </div>
          <AndamioText className="text-2xl font-bold">
            {contributors.length}
          </AndamioText>
          <AndamioText variant="small" className="text-muted-foreground">
            giving feedback
          </AndamioText>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <SuccessIcon className="h-4 w-4" />
            <AndamioText variant="small">XP Distributed</AndamioText>
          </div>
          <AndamioText className="text-2xl font-bold">
            {distributedXp.toLocaleString()} XP
          </AndamioText>
          <AndamioText variant="small" className="text-muted-foreground">
            across {submissions.length} completed task{submissions.length !== 1 ? "s" : ""}
          </AndamioText>
        </div>
      </div>

      {/* Available Tasks */}
      {availableTaskGroups.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TaskIcon className="h-5 w-5" />
              <AndamioText className="text-lg font-semibold">Available Tasks</AndamioText>
              <AndamioText variant="small" className="text-muted-foreground">
                ({availableTasks.length} total)
              </AndamioText>
            </div>
          </div>
          <AndamioTableContainer>
            <AndamioTable>
              <AndamioTableHeader>
                <AndamioTableRow>
                  <AndamioTableHead>Task</AndamioTableHead>
                  <AndamioTableHead className="hidden md:table-cell">Expiration</AndamioTableHead>
                  <AndamioTableHead className="text-right">Reward</AndamioTableHead>
                </AndamioTableRow>
              </AndamioTableHeader>
              <AndamioTableBody>
                {availableTaskGroups.map((group) => {
                  const task = group.representative;
                  return (
                    <AndamioTableRow key={group.taskHash}>
                      <AndamioTableCell>
                        {task.taskHash ? (
                          <Link href={PUBLIC_ROUTES.task(task.taskHash)}>
                            <div className="flex items-center gap-2">
                              <AndamioText className="font-medium hover:underline">
                                {task.title || "Untitled Task"}
                              </AndamioText>
                              {group.count > 1 && (
                                <AndamioBadge variant="secondary" className="text-xs">
                                  x{group.count}
                                </AndamioBadge>
                              )}
                            </div>
                            <AndamioText variant="small" className="font-mono text-xs text-muted-foreground break-all">
                              {task.taskHash}
                            </AndamioText>
                          </Link>
                        ) : (
                          <AndamioText className="text-muted-foreground">No ID</AndamioText>
                        )}
                      </AndamioTableCell>
                      <AndamioTableCell className="hidden md:table-cell">
                        {task.expirationTime ? (
                          <AndamioText variant="small">
                            {new Date(Number(task.expirationTime)).toLocaleDateString()}
                          </AndamioText>
                        ) : (
                          <AndamioText variant="small" className="text-muted-foreground">
                            None
                          </AndamioText>
                        )}
                      </AndamioTableCell>
                      <AndamioTableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <XpBadge amount={getTaskXp(task)} />
                          {group.count > 1 && (
                            <AndamioText variant="small" className="text-muted-foreground">each</AndamioText>
                          )}
                        </div>
                      </AndamioTableCell>
                    </AndamioTableRow>
                  );
                })}
              </AndamioTableBody>
            </AndamioTable>
          </AndamioTableContainer>
        </div>
      ) : (
        <AndamioEmptyState
          icon={TaskIcon}
          title="No tasks available"
          description="This project doesn't have any active tasks yet. Check back later."
        />
      )}

      {/* My Completed Tasks */}
      {isAuthenticated && completedTaskGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SuccessIcon className="h-5 w-5 text-muted-foreground" />
            <AndamioText className="text-lg font-semibold text-muted-foreground">
              My Completed Tasks
            </AndamioText>
          </div>
          <AndamioTableContainer>
            <AndamioTable>
              <AndamioTableHeader>
                <AndamioTableRow>
                  <AndamioTableHead>Task</AndamioTableHead>
                  <AndamioTableHead className="text-right">Reward</AndamioTableHead>
                </AndamioTableRow>
              </AndamioTableHeader>
              <AndamioTableBody>
                {completedTaskGroups.map((group) => {
                  const task = group.representative;
                  return (
                    <AndamioTableRow key={group.taskHash} className="opacity-70">
                      <AndamioTableCell>
                        <Link href={PUBLIC_ROUTES.task(task.taskHash)}>
                          <div className="flex items-center gap-2">
                            <AndamioText className="font-medium hover:underline">
                              {task.title || "Untitled Task"}
                            </AndamioText>
                            {group.count > 1 && (
                              <AndamioBadge variant="secondary" className="text-xs opacity-70">
                                x{group.count}
                              </AndamioBadge>
                            )}
                          </div>
                        </Link>
                      </AndamioTableCell>
                      <AndamioTableCell className="text-right">
                        <XpBadge amount={getTaskXp(task)} className="opacity-70" />
                      </AndamioTableCell>
                    </AndamioTableRow>
                  );
                })}
              </AndamioTableBody>
            </AndamioTable>
          </AndamioTableContainer>
        </div>
      )}

      </>)}
    </div>
  );
}
