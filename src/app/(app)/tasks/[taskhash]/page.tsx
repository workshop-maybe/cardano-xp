"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import {
  AndamioBadge,
  AndamioButton,
  AndamioCard,
  AndamioCardContent,
  AndamioCardDescription,
  AndamioCardHeader,
  AndamioCardTitle,
  AndamioDashboardStat,
  AndamioBackButton,
  AndamioErrorAlert,
  AndamioPageHeader,
  AndamioPageLoading,
  AndamioSectionHeader,
  AndamioSeparator,
  AndamioText,
} from "~/components/andamio";
import { ContentDisplay } from "~/components/content-display";
import { ContentEditor, ContentViewer } from "~/components/editor";
import { PendingIcon, TokenIcon, TeacherIcon, EditIcon, SuccessIcon, ContributorIcon, CredentialIcon, AlertIcon, OnChainIcon, RefreshIcon, CourseIcon } from "~/components/icons";
import type { JSONContent } from "@tiptap/core";
import { formatLovelace, formatXP } from "~/lib/cardano-utils";
import { CARDANO_XP } from "~/config/cardano-xp";
import { formatCommitmentStatus, formatTaskStatus } from "~/lib/format-status";
import { TaskCommit, TaskAction, ProjectCredentialClaim } from "~/components/tx";
import { ConnectWalletPrompt } from "~/components/auth/connect-wallet-prompt";
import { useProjectTask, useProject, projectKeys } from "~/hooks/api/project/use-project";
import { useContributorCommitment, useContributorCommitments, projectContributorKeys } from "~/hooks/api/project/use-project-contributor";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getTransactionExplorerUrl } from "~/lib/constants";
import { useStudentCompletionsForPrereqs } from "~/hooks/api/course/use-student-completions-for-prereqs";
import { checkProjectEligibility } from "~/lib/project-eligibility";
import { PrerequisiteList } from "~/components/project/prerequisite-list";
import { PUBLIC_ROUTES } from "~/config/routes";

// ── Pure helpers ──────────────────────────────────────────────────────────

function formatPosixTimestamp(timestamp: string): string {
  const ms = parseInt(timestamp);
  if (isNaN(ms)) return timestamp;
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCommitmentStatusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status.includes("ACCEPTED") || status === "REWARDS_CLAIMED") return "default";
  if (status.includes("DENIED") || status.includes("REFUSED")) return "destructive";
  if (status.includes("PENDING")) return "outline";
  return "secondary";
}

function truncateAlias(alias: string | undefined, maxLength = 12): string {
  if (!alias) return "Unknown";
  if (alias.length <= maxLength) return alias;
  return alias.slice(0, maxLength) + "\u2026";
}

/**
 * Task Detail Page - uses the single project ID from CARDANO_XP config.
 */
export default function TaskDetailPage() {
  const params = useParams();
  const projectId = CARDANO_XP.projectId;
  const taskHash = params.taskhash as string;
  const { isAuthenticated, user } = useAndamioAuth();
  const queryClient = useQueryClient();

  // Task data from shared cache
  const { data: task, isLoading: isTaskLoading, error: taskError } = useProjectTask(projectId, taskHash);

  // Project-level data for contributor context
  const { data: project } = useProject(projectId);

  // Prerequisite eligibility
  const prereqCourseIds = useMemo(() => {
    if (!project?.prerequisites) return [];
    return project.prerequisites
      .map((p) => p.courseId)
      .filter((id): id is string => !!id);
  }, [project?.prerequisites]);

  const { completions: prereqCompletions, isLoading: isEligibilityLoading } =
    useStudentCompletionsForPrereqs(prereqCourseIds);

  const prerequisites = useMemo(() => project?.prerequisites ?? [], [project?.prerequisites]);
  const eligibility = useMemo(() => {
    if (!isAuthenticated || prerequisites.length === 0) return null;
    return checkProjectEligibility(prerequisites, prereqCompletions);
  }, [isAuthenticated, prerequisites, prereqCompletions]);

  // Commitment status (authenticated only)
  const { data: commitment, isLoading: isCommitmentLoading } = useContributorCommitment(
    projectId,
    taskHash
  );

  // Evidence editor state
  const [evidence, setEvidence] = useState<JSONContent | null>(null);
  const [isEditingEvidence, setIsEditingEvidence] = useState(false);

  // Pending TX hash for task actions
  const [pendingActionTxHash, setPendingActionTxHash] = useState<string | null>(null);

  // Show claim flow
  const [showClaimFlow, setShowClaimFlow] = useState(false);

  // All commitments in this project
  const { data: allMyCommitments = [] } = useContributorCommitments(projectId);

  // isFirstCommit
  const isFirstCommit = allMyCommitments.filter(
    (c) => c.commitmentStatus !== "PENDING_TX_COMMIT"
  ).length === 0;

  // Fallback for REFUSED state
  const refusedFallback = !commitment
    ? allMyCommitments.find(c => c.taskHash === taskHash && c.commitmentStatus === "REFUSED") ?? null
    : null;

  const isTaskAccepted = commitment?.commitmentStatus === "ACCEPTED";

  // Check if already claimed
  const hasClaimed = useMemo(() => {
    const alias = user?.accessTokenAlias;
    if (!alias || !project?.credentialClaims) return false;
    return project.credentialClaims.some((c) => c.alias === alias);
  }, [user?.accessTokenAlias, project?.credentialClaims]);

  // Derive accepted task reward
  const acceptedTaskReward = useMemo(() => {
    if (!isTaskAccepted || !task) return "0";
    return task.lovelaceAmount ?? "0";
  }, [isTaskAccepted, task]);

  // Check if evidence is valid
  const hasValidEvidence = evidence?.content &&
    Array.isArray(evidence.content) &&
    evidence.content.length > 0 &&
    !(evidence.content.length === 1 &&
      evidence.content[0]?.type === "paragraph" &&
      (!evidence.content[0]?.content || evidence.content[0]?.content.length === 0));

  // Clear stale pending TX hash
  useEffect(() => {
    setPendingActionTxHash(null);
  }, [commitment?.commitmentStatus]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: projectContributorKeys.all,
      }),
      queryClient.invalidateQueries({
        queryKey: projectKeys.detail(projectId),
      }),
      queryClient.invalidateQueries({
        queryKey: projectKeys.tasks(projectId),
      }),
    ]);
  }, [queryClient, projectId]);

  // ── Loading / Error states ─────────────────────────────────────────────

  if (isTaskLoading) {
    return <AndamioPageLoading variant="content" />;
  }

  const errorMessage = taskError instanceof Error ? taskError.message : taskError ? "Failed to load task" : null;
  if (errorMessage || !task) {
    return (
      <div className="space-y-6">
        <AndamioBackButton href={PUBLIC_ROUTES.projects} label="Back to Tasks" />
        <AndamioErrorAlert error={errorMessage ?? "Task not found"} />
      </div>
    );
  }

  const createdBy = truncateAlias(task.createdByAlias);

  const contributorStateId = project?.contributorStateId ?? task.contributorStateId ?? "0".repeat(56);

  // Unified reference
  const activeCommitment = commitment ?? refusedFallback;
  const commitmentStatus = activeCommitment?.commitmentStatus ?? null;

  // Pre-assignment gate
  const preAssignedAlias = task?.preAssignedAlias ?? null;
  const isPreAssigned = !!preAssignedAlias;
  const isAssignedToCurrentUser =
    isPreAssigned && user?.accessTokenAlias === preAssignedAlias;
  const isBlockedByPreAssignment =
    isPreAssigned && isAuthenticated && !isAssignedToCurrentUser;

  // Card description
  let commitmentCardDescription: string;
  if (!isAuthenticated) {
    commitmentCardDescription = "Connect your wallet to commit to this task";
  } else if (isCommitmentLoading) {
    commitmentCardDescription = "Loading commitment status\u2026";
  } else if (!activeCommitment) {
    commitmentCardDescription = "Commit to this task to get started";
  } else if (commitmentStatus === "ACCEPTED") {
    commitmentCardDescription = "Your work has been accepted!";
  } else {
    commitmentCardDescription = "Track your progress on this task";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AndamioBackButton href={PUBLIC_ROUTES.projects} label="Back to Tasks" />
        <div className="flex items-center gap-2">
          <AndamioBadge variant="outline" className="font-mono text-xs">
            #{task.index}
          </AndamioBadge>
          <AndamioBadge variant="default">
            {formatTaskStatus(task.taskStatus ?? "")}
          </AndamioBadge>
        </div>
      </div>

      {/* Task Title and Description */}
      <AndamioPageHeader
        title={task.title || "Untitled Task"}
        description={task.description || undefined}
      />

      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AndamioDashboardStat
          icon={TokenIcon}
          label="ADA Reward"
          value={formatLovelace(task.lovelaceAmount ?? "0")}
          iconColor="success"
        />
        <AndamioDashboardStat
          icon={TokenIcon}
          label="XP Reward"
          value={formatXP(
            task.tokens?.find((t) => t.policyId === CARDANO_XP.xpToken.policyId)?.quantity ?? 0
          )}
          iconColor="warning"
        />
        <AndamioDashboardStat
          icon={PendingIcon}
          label="Expires"
          value={formatPosixTimestamp(task.expirationTime ?? "0")}
        />
        <AndamioDashboardStat
          icon={TeacherIcon}
          label="Created By"
          value={createdBy}
          iconColor="info"
        />
      </div>

      {/* Task Hash */}
      <div className="p-3 bg-muted rounded-lg">
        <AndamioText variant="small" className="text-xs mb-1">Task Hash (On-Chain ID)</AndamioText>
        <AndamioText className="font-mono text-sm break-all">
          {task.taskHash || taskHash}
        </AndamioText>
      </div>

      {/* Task Content */}
      {!!task.contentJson && (
        <AndamioCard>
          <AndamioCardHeader>
            <AndamioCardTitle>Task Details</AndamioCardTitle>
            <AndamioCardDescription>Full task instructions and requirements</AndamioCardDescription>
          </AndamioCardHeader>
          <AndamioCardContent>
            <ContentDisplay content={task.contentJson as JSONContent} />
          </AndamioCardContent>
        </AndamioCard>
      )}

      {/* XP Reward */}
      {task.tokens && task.tokens.length > 0 && (
        <AndamioCard>
          <AndamioCardHeader>
            <AndamioCardTitle>XP Reward</AndamioCardTitle>
            <AndamioCardDescription>Reputation tokens earned on completion</AndamioCardDescription>
          </AndamioCardHeader>
          <AndamioCardContent>
            <div className="space-y-2">
              {task.tokens.map((token, idx) => {
                const isXp = token.policyId === CARDANO_XP.xpToken.policyId;
                const displayName = isXp ? "XP" : (token.assetName || token.policyId?.slice(0, 16) || `Token ${idx + 1}`);
                return (
                  <div key={token.policyId || idx} className="flex items-center justify-between p-3 border bg-card">
                    <AndamioText className="font-display font-semibold">
                      {displayName}
                    </AndamioText>
                    <AndamioBadge variant={isXp ? "secondary" : "outline"}>
                      {isXp ? formatXP(token.quantity) : token.quantity}
                    </AndamioBadge>
                  </div>
                );
              })}
            </div>
          </AndamioCardContent>
        </AndamioCard>
      )}

      {/* ── Commitment Status Card ─────────────────────────────────────── */}
      <AndamioCard>
        <AndamioCardHeader>
          <AndamioCardTitle>Your Commitment</AndamioCardTitle>
          <AndamioCardDescription>
            {commitmentCardDescription}
          </AndamioCardDescription>
        </AndamioCardHeader>
        <AndamioCardContent>
          {!isAuthenticated ? (
            <div className="text-center py-6">
              <AndamioText variant="muted" className="mb-4">Connect your wallet to commit to this task</AndamioText>
              <ConnectWalletPrompt />
            </div>
          ) : isCommitmentLoading ? (
            <div className="text-center py-6">
              <AndamioText variant="muted">Checking commitment status…</AndamioText>
            </div>
          ) : commitmentStatus === "ACCEPTED" && hasClaimed ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <SuccessIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <AndamioText className="font-medium">
                    Rewards Claimed
                  </AndamioText>
                  <AndamioText variant="small" className="mt-1 text-muted-foreground">
                    You&apos;ve claimed your credential and rewards for this task.
                  </AndamioText>
                </div>
              </div>
            </div>
          ) : commitmentStatus === "ACCEPTED" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <SuccessIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <AndamioText className="font-medium text-primary">
                      Your work was accepted!
                    </AndamioText>
                    <AndamioText variant="small" className="mt-1">
                      You earned {formatLovelace(acceptedTaskReward)}. Choose your next step below.
                    </AndamioText>
                  </div>
                </div>
              </div>

              {!showClaimFlow ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href={PUBLIC_ROUTES.projects} className="block">
                    <div className="rounded-lg border p-4 space-y-3 hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <div className="flex items-center gap-2">
                        <ContributorIcon className="h-5 w-5 text-primary" />
                        <AndamioText className="font-medium">Continue Contributing</AndamioText>
                      </div>
                      <AndamioText variant="small">
                        Browse available tasks and commit to a new one. Your {formatLovelace(acceptedTaskReward)} reward will be claimed automatically.
                      </AndamioText>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setShowClaimFlow(true)}
                    className="rounded-lg border border-primary/20 p-4 space-y-3 hover:border-primary/50 transition-colors cursor-pointer h-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CredentialIcon className="h-5 w-5 text-primary" />
                      <AndamioText className="font-medium">Leave & Claim</AndamioText>
                    </div>
                    <AndamioText variant="small">
                      Leave the project, claim {formatLovelace(acceptedTaskReward)} in rewards, and mint your credential NFT.
                    </AndamioText>
                  </button>
                </div>
              ) : (
                <>
                  {eligibility === null || eligibility.eligible ? (
                    <ProjectCredentialClaim
                      projectNftPolicyId={projectId}
                      contributorStateId={contributorStateId}
                      projectTitle={project?.title || undefined}
                      pendingRewardLovelace={acceptedTaskReward}
                      onSuccess={async () => {
                        await refreshData();
                      }}
                    />
                  ) : (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex items-start gap-3">
                        <AlertIcon className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <AndamioText className="font-medium text-destructive">
                            Prerequisites Not Met
                          </AndamioText>
                          <AndamioText variant="small" className="mt-1">
                            You need to complete the required course modules before claiming your credential.
                          </AndamioText>
                        </div>
                      </div>
                    </div>
                  )}
                  <AndamioButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowClaimFlow(false)}
                    className="cursor-pointer"
                  >
                    Back to options
                  </AndamioButton>
                </>
              )}
            </div>
          ) : commitmentStatus === "PENDING_TX_COMMIT" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <AndamioText as="span" variant="small" className="font-medium">Status</AndamioText>
                <AndamioBadge variant="outline">
                  Awaiting Confirmation
                </AndamioBadge>
              </div>

              {commitment?.pendingTxHash && (
                <>
                  <AndamioSeparator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <OnChainIcon className="h-4 w-4 text-muted-foreground" />
                      <AndamioText variant="small" className="font-medium">Pending Transaction</AndamioText>
                    </div>
                    <a
                      href={getTransactionExplorerUrl(commitment.pendingTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {commitment.pendingTxHash.slice(0, 12)}...
                    </a>
                  </div>
                </>
              )}

              <AndamioSeparator />
              <div>
                <AndamioText variant="small" className="font-medium mb-2">Submitted Evidence</AndamioText>
                <div className="min-h-[100px] border rounded-lg bg-muted/20 p-4">
                  {commitment?.evidence ? (
                    <ContentViewer content={commitment.evidence as JSONContent} />
                  ) : (
                    <AndamioText variant="small" className="text-muted-foreground italic">
                      No evidence recorded
                    </AndamioText>
                  )}
                </div>
              </div>

              <AndamioText variant="small" className="text-muted-foreground">
                Waiting for blockchain confirmation. This usually takes a few minutes.
              </AndamioText>

              <AndamioButton
                variant="outline"
                size="sm"
                onClick={async () => {
                  await refreshData();
                  toast.info("Data refreshed", {
                    description: "Check back in a few seconds if the transaction hasn't confirmed yet.",
                  });
                }}
              >
                <RefreshIcon className="h-4 w-4 mr-2" />
                Refresh Status
              </AndamioButton>
            </div>
          ) : commitmentStatus === "SUBMITTED" || commitmentStatus === "REFUSED" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <AndamioText as="span" variant="small" className="font-medium">Status</AndamioText>
                <AndamioBadge variant={getCommitmentStatusVariant(commitmentStatus)}>
                  {formatCommitmentStatus(commitmentStatus)}
                </AndamioBadge>
              </div>

              {commitmentStatus === "REFUSED" && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <AndamioText variant="small">
                      Your work was not accepted. Update your evidence and resubmit below.
                    </AndamioText>
                  </div>
                </div>
              )}

              {commitmentStatus === "SUBMITTED" && (
                <AndamioText variant="small" className="text-muted-foreground">
                  Evidence submitted. Waiting for manager review. You can update your evidence below.
                </AndamioText>
              )}

              {activeCommitment?.submissionTx && (
                <>
                  <AndamioSeparator />
                  <div>
                    <AndamioText variant="small" className="mb-1">Submission Transaction</AndamioText>
                    <a
                      href={getTransactionExplorerUrl(activeCommitment.submissionTx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {activeCommitment.submissionTx.slice(0, 16)}...{activeCommitment.submissionTx.slice(-8)}
                    </a>
                  </div>
                </>
              )}

              <AndamioSeparator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <EditIcon className="h-4 w-4 text-muted-foreground" />
                  <AndamioText className="font-medium">
                    {commitmentStatus === "REFUSED" ? "Resubmit Your Evidence" : "Update Your Evidence"}
                  </AndamioText>
                </div>
                <div className="min-h-[200px] border rounded-lg">
                  <ContentEditor
                    content={evidence ?? (activeCommitment?.evidence as JSONContent | null)}
                    onContentChange={setEvidence}
                  />
                </div>
                {!hasValidEvidence && (
                  <AndamioText variant="small" className="text-muted-foreground">
                    Please provide evidence describing your work on this task.
                  </AndamioText>
                )}
                {hasValidEvidence && (
                  <AndamioText variant="small" className="text-primary flex items-center gap-1">
                    <SuccessIcon className="h-4 w-4" />
                    Evidence ready for submission
                  </AndamioText>
                )}
              </div>

              <TaskAction
                projectNftPolicyId={projectId}
                contributorStateId={contributorStateId}
                taskHash={taskHash}
                taskCode={`TASK_${task.index}`}
                taskTitle={task.title ?? undefined}
                taskEvidence={evidence ?? (commitment?.evidence as JSONContent | undefined)}
                onSuccess={async (result) => {
                  setPendingActionTxHash(result.txHash);
                  await refreshData();
                }}
              />

              {pendingActionTxHash && (
                <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <OnChainIcon className="h-4 w-4 text-muted-foreground" />
                      <AndamioText variant="small" className="font-medium">Pending Transaction</AndamioText>
                    </div>
                    <a
                      href={getTransactionExplorerUrl(pendingActionTxHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {pendingActionTxHash.slice(0, 12)}...
                    </a>
                  </div>
                  <AndamioButton
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await refreshData();
                      toast.info("Data refreshed");
                    }}
                  >
                    <RefreshIcon className="h-4 w-4 mr-2" />
                    Refresh Status
                  </AndamioButton>
                </div>
              )}
            </div>
          ) : commitment ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <AndamioText as="span" variant="small" className="font-medium">Status</AndamioText>
                <AndamioBadge variant={getCommitmentStatusVariant(commitment.commitmentStatus ?? "")}>
                  {formatCommitmentStatus(commitment.commitmentStatus ?? "")}
                </AndamioBadge>
              </div>

              {commitment.submissionTx && (
                <>
                  <AndamioSeparator />
                  <div>
                    <AndamioText variant="small" className="mb-1">Pending Transaction</AndamioText>
                    <AndamioText className="font-mono text-xs break-all">{commitment.submissionTx}</AndamioText>
                  </div>
                </>
              )}

              {commitment.evidence != null && (
                <>
                  <AndamioSeparator />
                  <div>
                    <AndamioText variant="small" className="font-medium mb-2">Your Evidence</AndamioText>
                    <ContentDisplay
                      content={commitment.evidence as JSONContent}
                      variant="muted"
                    />
                  </div>
                </>
              )}
            </div>
          ) : isEligibilityLoading && prereqCourseIds.length > 0 ? (
            <div className="text-center py-6">
              <AndamioText variant="muted">Checking eligibility…</AndamioText>
            </div>
          ) : eligibility?.eligible === false ? (
            <div className="py-6 space-y-4">
              <div className="space-y-1">
                <AndamioText className="text-lg font-semibold">
                  Get Started as a Feedback Provider
                </AndamioText>
                <AndamioText variant="muted">
                  This app is moderated by humans. It moves at the speed of people.
                </AndamioText>
              </div>
              <PrerequisiteList
                prerequisites={prerequisites}
                completions={prereqCompletions}
              />
              <div>
                <Link href={PUBLIC_ROUTES.courses}>
                  <AndamioButton
                    size="sm"
                    className="cursor-pointer"
                  >
                    Start Onboarding
                  </AndamioButton>
                </Link>
              </div>
            </div>
          ) : isBlockedByPreAssignment ? (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted mx-auto">
                <AlertIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <AndamioText className="font-medium">
                  This task is reserved
                </AndamioText>
                <AndamioText variant="muted">
                  Pre-assigned to{" "}
                  <span className="font-medium">@{preAssignedAlias}</span>.
                  Only they can commit to this task.
                </AndamioText>
              </div>
              <Link href={PUBLIC_ROUTES.projects}>
                <AndamioButton
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                >
                  Browse other tasks
                </AndamioButton>
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              {isEditingEvidence ? (
                <AndamioText variant="muted">
                  Complete your submission below
                </AndamioText>
              ) : (
                <>
                  <AndamioText variant="muted" className="mb-4">
                    You haven&apos;t committed to this task yet
                  </AndamioText>
                  <AndamioButton
                    variant="outline"
                    onClick={() => setIsEditingEvidence(true)}
                    className="cursor-pointer"
                  >
                    <EditIcon className="h-4 w-4 mr-2" />
                    Commit to This Task
                  </AndamioButton>
                </>
              )}
            </div>
          )}
        </AndamioCardContent>
      </AndamioCard>

      {/* ── Evidence Editor and Transaction (new commitment) ────────── */}
      {isAuthenticated && !activeCommitment && eligibility?.eligible !== false && !isBlockedByPreAssignment && isEditingEvidence && (
        <div className="space-y-6">
          <AndamioSectionHeader
            title="Your Work"
            icon={<EditIcon className="h-5 w-5" />}
          />

          <AndamioCard>
            <AndamioCardHeader>
              <AndamioCardTitle>Your Submission</AndamioCardTitle>
              <AndamioCardDescription>
                Describe your plan or provide your work so far
              </AndamioCardDescription>
            </AndamioCardHeader>
            <AndamioCardContent>
              <ContentEditor
                content={evidence}
                onContentChange={setEvidence}
                showWordCount
              />
            </AndamioCardContent>
          </AndamioCard>

          {evidence && Object.keys(evidence).length > 0 && (
            <TaskCommit
              projectNftPolicyId={projectId}
              contributorStateId={contributorStateId}
              taskHash={taskHash}
              taskCode={`TASK_${task.index}`}
              taskTitle={task.title ?? undefined}
              taskEvidence={evidence}
              isFirstCommit={isFirstCommit}
              onSuccess={async () => {
                setIsEditingEvidence(false);
                await refreshData();
              }}
            />
          )}

          <div className="flex justify-end">
            <AndamioButton
              variant="ghost"
              onClick={() => {
                setIsEditingEvidence(false);
                setEvidence(null);
              }}
            >
              Cancel
            </AndamioButton>
          </div>
        </div>
      )}
    </div>
  );
}
