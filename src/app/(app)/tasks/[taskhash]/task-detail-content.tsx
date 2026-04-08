"use client";

import { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { flushSync } from "react-dom";
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
  AndamioBackButton,
  AndamioErrorAlert,
  AndamioPageHeader,
  AndamioPageLoading,
  AndamioSeparator,
  AndamioText,
  AndamioTooltip,
  AndamioTooltipContent,
  AndamioTooltipProvider,
  AndamioTooltipTrigger,
} from "~/components/andamio";
import { ContentDisplay } from "~/components/content-display";
import { ContentEditor, ContentViewer, ContentViewerCompact } from "~/components/editor";
import { EditIcon, SuccessIcon, ContributorIcon, CredentialIcon, AlertIcon, OnChainIcon, RefreshIcon, CourseIcon } from "~/components/icons";
import type { JSONContent } from "@tiptap/core";
import { formatLovelace, formatXP } from "~/lib/cardano-utils";
import { CARDANO_XP } from "~/config/cardano-xp";
import { formatCommitmentStatus, formatTaskStatus, getCommitmentStatusVariant } from "~/lib/format-status";
import { TaskCommit, TaskAction, ProjectCredentialClaim } from "~/components/tx";
import { ConnectWalletPrompt } from "~/components/auth/connect-wallet-prompt";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
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

/** Strip a leading heading node from tiptap JSON so the title isn't duplicated. */
function stripLeadingHeading(json: JSONContent): JSONContent {
  if (!json?.content?.length) return json;
  const first = json.content[0];
  if (first?.type === "heading" && first.attrs?.level === 1) {
    return { ...json, content: json.content.slice(1) };
  }
  return json;
}

function truncateAlias(alias: string | undefined, maxLength = 12): string {
  if (!alias) return "Unknown";
  if (alias.length <= maxLength) return alias;
  return alias.slice(0, maxLength) + "\u2026";
}

/**
 * Task detail client content — all interactive logic lives here.
 *
 * Public data (project detail, tasks list) is prefetched on the server
 * and dehydrated into React Query's cache. Auth-gated hooks fire client-side.
 */
export function TaskDetailContent() {
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

  // Collapsible task description
  const taskContentRef = useRef<HTMLDivElement>(null);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(true);
  const [needsDescriptionCollapse, setNeedsDescriptionCollapse] = useState(false);

  useLayoutEffect(() => {
    if (taskContentRef.current) {
      const height = taskContentRef.current.getBoundingClientRect().height;
      setNeedsDescriptionCollapse(height > 200);
    }
  }, [task?.contentJson]);

  // Evidence editor state
  const [evidence, setEvidence] = useState<JSONContent | null>(null);
  const [isEditingEvidence, setIsEditingEvidence] = useState(false);
  const commitmentCardRef = useRef<HTMLDivElement>(null);

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

  // Fallback for REFUSED/DENIED state
  const deniedFallback = !commitment
    ? allMyCommitments.find(c => c.taskHash === taskHash && (c.commitmentStatus === "REFUSED" || c.commitmentStatus === "DENIED")) ?? null
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
  const activeCommitment = commitment ?? deniedFallback;
  const commitmentStatus = activeCommitment?.commitmentStatus ?? null;

  // Check if user has an active commitment on a different task
  const activeElsewhere = allMyCommitments.find(
    (c) =>
      c.taskHash !== taskHash &&
      ["PENDING_TX_COMMIT", "COMMITTED", "REFUSED"].includes(c.commitmentStatus ?? "")
  );
  const hasActiveCommitmentElsewhere = !!activeElsewhere;

  // Expiration check
  const isExpired = task.expirationTime
    ? parseInt(task.expirationTime) > 0 && new Date(parseInt(task.expirationTime)) < new Date()
    : false;

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
    commitmentCardDescription = "";
  } else if (commitmentStatus === "ACCEPTED") {
    commitmentCardDescription = "Your work has been accepted";
  } else {
    commitmentCardDescription = "Track your progress on this task";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AndamioBackButton href={PUBLIC_ROUTES.projects} label="Back to Tasks" />
        <div className="flex items-center gap-2">
          <AndamioTooltipProvider>
            <AndamioTooltip>
              <AndamioTooltipTrigger asChild>
                <AndamioBadge variant="default" className="font-mono text-xs cursor-help">
                  {task.taskHash || taskHash}
                </AndamioBadge>
              </AndamioTooltipTrigger>
              <AndamioTooltipContent side="bottom">
                <p className="text-xs">This task hash is the on-chain anchor for this task.</p>
              </AndamioTooltipContent>
            </AndamioTooltip>
          </AndamioTooltipProvider>
        </div>
      </div>

      {/* Task Title and Description */}
      <AndamioPageHeader
        title={task.title || "Untitled Task"}
        description={task.description || undefined}
      />

      {/* Task Metadata — compact control pad */}
      <div className="rounded-lg border bg-card px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">ADA Reward</div>
            <div className="text-sm font-semibold text-primary">{formatLovelace(task.lovelaceAmount ?? "0")}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">XP Reward</div>
            <div className="text-sm font-semibold text-yellow-400">{formatXP(
              task.tokens?.find((t) => t.policyId === CARDANO_XP.xpToken.policyId)?.quantity ?? 0
            )}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Expires</div>
            <div className="text-sm font-semibold text-secondary">{formatPosixTimestamp(task.expirationTime ?? "0")}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Created By</div>
            <div className="text-sm font-semibold">{createdBy}</div>
          </div>
        </div>
      </div>

      {/* Task Content */}
      {!!task.contentJson && (
        <>
          <AndamioText className="text-lg font-semibold">Feedback Requested</AndamioText>
          <div className="rounded-lg border bg-card px-4 py-3">
            <div className="relative">
              <div
                ref={taskContentRef}
                className={needsDescriptionCollapse && isDescriptionCollapsed ? "max-h-[200px] overflow-hidden" : ""}
              >
                <ContentViewerCompact content={stripLeadingHeading(task.contentJson as JSONContent)} />
              </div>
              {needsDescriptionCollapse && isDescriptionCollapsed && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
              )}
            </div>
            {needsDescriptionCollapse && (
              <button
                type="button"
                onClick={() => setIsDescriptionCollapsed(!isDescriptionCollapsed)}
                className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {isDescriptionCollapsed ? "Show full description" : "Show less"}
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Commitment Status Card ─────────────────────────────────────── */}
      <div>
        <AndamioText className="text-lg font-semibold">Your Feedback</AndamioText>
        {commitmentCardDescription && <AndamioText variant="small" className="text-muted-foreground">{commitmentCardDescription}</AndamioText>}
      </div>
      <div ref={commitmentCardRef} className="rounded-lg border bg-card px-4 py-3">
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
                      Your work was accepted
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
          ) : commitmentStatus === "COMMITTED" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <AndamioText as="span" variant="small" className="font-medium">Status</AndamioText>
                <AndamioBadge variant={getCommitmentStatusVariant(commitmentStatus)}>
                  {formatCommitmentStatus(commitmentStatus)}
                </AndamioBadge>
              </div>

              <AndamioText variant="small" className="text-muted-foreground">
                Your work has been committed. Waiting for manager review.
              </AndamioText>

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

              {activeCommitment?.evidence != null && (
                <>
                  <AndamioSeparator />
                  <div>
                    <AndamioText variant="small" className="font-medium mb-2">Your Evidence</AndamioText>
                    <div className="min-h-[100px] border rounded-lg bg-muted/20 p-4">
                      <ContentViewer content={activeCommitment.evidence as JSONContent} />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : commitmentStatus === "REFUSED" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <AndamioText as="span" variant="small" className="font-medium">Status</AndamioText>
                <AndamioBadge variant={getCommitmentStatusVariant(commitmentStatus)}>
                  {formatCommitmentStatus(commitmentStatus)}
                </AndamioBadge>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <AndamioText variant="small">
                    Your work needs revision. Update your evidence and resubmit below.
                  </AndamioText>
                </div>
              </div>

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
                    Resubmit Your Evidence
                  </AndamioText>
                </div>
                <div className="border rounded-lg">
                  <ContentEditor
                    content={evidence ?? (activeCommitment?.evidence as JSONContent | null)}
                    onContentChange={setEvidence}
                    minHeight="150px"
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
                taskEvidence={evidence ?? (activeCommitment?.evidence as JSONContent | undefined)}
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
          ) : commitmentStatus === "DENIED" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <AndamioText as="span" variant="small" className="font-medium">Status</AndamioText>
                <AndamioBadge variant={getCommitmentStatusVariant(commitmentStatus)}>
                  {formatCommitmentStatus(commitmentStatus)}
                </AndamioBadge>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <AndamioText variant="small">
                    Your submission was permanently denied.
                  </AndamioText>
                </div>
              </div>

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

              {activeCommitment?.evidence != null && (
                <>
                  <AndamioSeparator />
                  <div>
                    <AndamioText variant="small" className="font-medium mb-2">Your Evidence</AndamioText>
                    <div className="min-h-[100px] border rounded-lg bg-muted/20 p-4">
                      <ContentViewer content={activeCommitment.evidence as JSONContent} />
                    </div>
                  </div>
                </>
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
          ) : isExpired ? (
            <div className="text-center py-6 space-y-2">
              <AlertIcon className="h-6 w-6 text-destructive mx-auto" />
              <AndamioText className="font-medium text-destructive">
                This task has expired
              </AndamioText>
              <AndamioText variant="small" className="text-muted-foreground">
                The deadline for this task has passed.
              </AndamioText>
              <Link href={PUBLIC_ROUTES.projects}>
                <AndamioButton
                  variant="outline"
                  size="sm"
                  className="cursor-pointer mt-2"
                >
                  Browse other tasks
                </AndamioButton>
              </Link>
            </div>
          ) : hasActiveCommitmentElsewhere ? (
            <div className="text-center py-6 space-y-2">
              <AlertIcon className="h-6 w-6 text-muted-foreground mx-auto" />
              <AndamioText className="font-medium">
                You have an active commitment on another task
              </AndamioText>
              <AndamioText variant="small" className="text-muted-foreground">
                Complete or leave your current task before committing to a new one.
              </AndamioText>
              <Link href={`/tasks/${activeElsewhere!.taskHash}`}>
                <AndamioButton
                  variant="outline"
                  size="sm"
                  className="cursor-pointer mt-2"
                >
                  Go to active task
                </AndamioButton>
              </Link>
            </div>
          ) : (
            <div className="py-6">
              {isEditingEvidence ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <ContentEditor
                      content={evidence}
                      onContentChange={setEvidence}
                      showWordCount
                      minHeight="150px"
                    />
                    {!hasValidEvidence && evidence && (
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

                  {hasValidEvidence && (
                    <TaskCommit
                      projectNftPolicyId={projectId}
                      contributorStateId={contributorStateId}
                      taskHash={taskHash}
                      taskCode={`TASK_${task.index}`}
                      taskTitle={task.title ?? undefined}
                      taskEvidence={evidence}
                      isFirstCommit={isFirstCommit}
                      taskStatus={task.taskStatus as "DRAFT" | "PENDING_TX" | "ON_CHAIN" | undefined}
                      onSuccess={async () => {
                        setIsEditingEvidence(false);
                        await refreshData();
                      }}
                    />
                  )}

                  <div className="flex justify-end">
                    {hasValidEvidence ? (
                      <ConfirmDialog
                        trigger={
                          <AndamioButton variant="ghost" className="cursor-pointer">
                            Cancel
                          </AndamioButton>
                        }
                        title="Discard your work?"
                        description="Your evidence submission will be lost."
                        confirmText="Discard"
                        variant="destructive"
                        onConfirm={() => {
                          setIsEditingEvidence(false);
                          setEvidence(null);
                        }}
                      />
                    ) : (
                      <AndamioButton
                        variant="ghost"
                        onClick={() => {
                          setIsEditingEvidence(false);
                          setEvidence(null);
                        }}
                        className="cursor-pointer"
                      >
                        Cancel
                      </AndamioButton>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <AndamioButton
                      variant="outline"
                      onClick={() => {
                        flushSync(() => {
                          setIsEditingEvidence(true);
                        });
                        commitmentCardRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                      className="cursor-pointer"
                    >
                      <EditIcon className="h-4 w-4 mr-2" />
                      Share Your Feedback
                    </AndamioButton>

                  </div>

                  <details className="text-sm group">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors text-center">
                      How does this work?
                    </summary>
                    <div className="mt-3 rounded-lg border bg-muted/20 p-4 text-muted-foreground space-y-2 text-left">
                      <ol className="list-decimal list-inside space-y-1.5 text-sm">
                        <li><strong className="text-foreground">Read</strong> — review the task description above</li>
                        <li><strong className="text-foreground">Write</strong> — compose your feedback or response to the task</li>
                        <li><strong className="text-foreground">Submit</strong> — submit your evidence for review</li>
                      </ol>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
      </div>

    </div>
  );
}
