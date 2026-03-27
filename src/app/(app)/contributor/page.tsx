"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/core";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { useProject, useProjectTasks, projectKeys, type Task } from "~/hooks/api/project/use-project";
import {
  useContributorCommitments,
  projectContributorKeys,
  type ContributorCommitment,
} from "~/hooks/api/project/use-project-contributor";
import { ConnectWalletGate } from "~/components/auth/connect-wallet-gate";
import { ContentViewer, ContentEditor } from "~/components/editor";
import { TaskAction, ProjectCredentialClaim } from "~/components/tx";
import {
  AndamioPageHeader,
  AndamioPageLoading,
  AndamioEmptyState,
  AndamioErrorAlert,
  AndamioBadge,
  AndamioButton,
  AndamioSeparator,
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
  ContributorIcon,
  TaskIcon,
  SuccessIcon,
  AlertIcon,
  OnChainIcon,
  RefreshIcon,
  CredentialIcon,
  EditIcon,
} from "~/components/icons";
import { XpBadge } from "~/components/xp-badge";
import { formatCommitmentStatus, getCommitmentStatusVariant } from "~/lib/format-status";
import { formatLovelace } from "~/lib/cardano-utils";
import { getTransactionExplorerUrl } from "~/lib/constants";
import { CARDANO_XP } from "~/config/cardano-xp";
import { PUBLIC_ROUTES, AUTH_ROUTES } from "~/config/routes";

// ── Types ────────────────────────────────────────────────────────────────

interface CommitmentWithTask {
  commitment: ContributorCommitment;
  task: Task | null;
  xpReward: number;
}

// ── Page Component ───────────────────────────────────────────────────────

export default function ContributorPage() {
  const projectId = CARDANO_XP.projectId;
  const { isAuthenticated, user } = useAndamioAuth();
  const queryClient = useQueryClient();

  // ── Data fetching ────────────────────────────────────────────────────

  const { data: commitments, isLoading: isCommitmentsLoading, error: commitmentsError } =
    useContributorCommitments(projectId);

  const { data: project, isLoading: isProjectLoading } = useProject(projectId);

  // Use useProjectTasks (merged endpoint) — NOT project.tasks.
  // The project detail endpoint doesn't populate tokens/assets.
  // See: docs/solutions/integration-issues/task-deletion-empty-native-assets-datasource-mismatch.md
  const { data: tasks, isLoading: isTasksLoading } = useProjectTasks(projectId);

  // ── Local state ──────────────────────────────────────────────────────

  const [editingTaskHash, setEditingTaskHash] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<JSONContent | null>(null);
  const [claimFlowTaskHash, setClaimFlowTaskHash] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Derived data ─────────────────────────────────────────────────────

  const taskLookup = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of tasks ?? []) {
      if (task.taskHash) {
        map.set(task.taskHash, task);
      }
    }
    return map;
  }, [tasks]);

  const commitmentsWithTasks: CommitmentWithTask[] = useMemo(() => {
    if (!commitments) return [];
    return commitments.map((c) => {
      const task = taskLookup.get(c.taskHash) ?? null;
      const xpToken = task?.tokens?.find(
        (t) => t.policyId === CARDANO_XP.xpToken.policyId
      );
      return {
        commitment: c,
        task,
        xpReward: xpToken?.quantity ?? 0,
      };
    });
  }, [commitments, taskLookup]);

  const hasClaimed = useMemo(() => {
    if (justClaimed) return true;
    const alias = user?.accessTokenAlias;
    if (!alias || !project?.credentialClaims) return false;
    return project.credentialClaims.some((c) => c.alias === alias);
  }, [user?.accessTokenAlias, project?.credentialClaims, justClaimed]);

  // ── Callbacks ────────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectContributorKeys.all }),
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      queryClient.invalidateQueries({ queryKey: projectKeys.tasks(projectId) }),
    ]);
  }, [queryClient, projectId]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.info("Data refreshed");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, isRefreshing]);

  // Refetch on mount only if cache exists (returning user, not first visit)
  useEffect(() => {
    const hasCache = queryClient.getQueryData(projectContributorKeys.commitments(projectId));
    if (hasCache) {
      void refreshData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear editor state when the *edited* commitment's status changes
  const editedCommitmentStatus = useMemo(
    () => editingTaskHash
      ? commitments?.find((c) => c.taskHash === editingTaskHash)?.commitmentStatus ?? null
      : null,
    [commitments, editingTaskHash]
  );

  useEffect(() => {
    if (editingTaskHash && editedCommitmentStatus) {
      // Status changed while editing — notify user rather than silently discarding
      toast.info("This task's status was updated.");
      setEditingTaskHash(null);
      setEvidence(null);
    }
  }, [editedCommitmentStatus, editingTaskHash]);

  // ── Auth gate ────────────────────────────────────────────────────────

  if (!isAuthenticated || !user) {
    return (
      <ConnectWalletGate
        title="Contributor Dashboard"
        description="Connect your wallet to view your contributions"
      />
    );
  }

  if (!user.accessTokenAlias) {
    return (
      <div className="space-y-6">
        <AndamioPageHeader
          title="Contributor Dashboard"
          description="View your task commitments and claim rewards"
        />
        <AndamioEmptyState
          icon={ContributorIcon}
          title="Access Token Required"
          description="You need an Andamio Access Token to contribute. Mint one to get started."
          action={
            <Link href="/andamio-access-token">
              <AndamioButton size="sm">Get Access Token</AndamioButton>
            </Link>
          }
        />
      </div>
    );
  }

  // ── Unified loading gate ─────────────────────────────────────────────

  const isReady = !isCommitmentsLoading && !isProjectLoading && !isTasksLoading;
  if (!isReady) {
    return <AndamioPageLoading variant="detail" />;
  }

  if (commitmentsError) {
    return (
      <div className="space-y-6">
        <AndamioPageHeader title="Contributor Dashboard" />
        <AndamioErrorAlert
          error={commitmentsError instanceof Error ? commitmentsError.message : "Failed to load commitments"}
        />
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────

  if (!commitmentsWithTasks.length && !hasClaimed) {
    return (
      <div className="space-y-6">
        <AndamioPageHeader
          title="Contributor Dashboard"
          description="Your task commitments and contribution history"
        />
        <AndamioEmptyState
          icon={ContributorIcon}
          title="No contributions yet"
          description="Browse available tasks and make your first commitment to start earning XP."
          action={
            <Link href={PUBLIC_ROUTES.projects}>
              <AndamioButton>Browse Tasks</AndamioButton>
            </Link>
          }
        />
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  const contributorStateId = project?.contributorStateId;

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <AndamioPageHeader
        title="Contributor Dashboard"
        description="Your task commitments and contribution history"
      />

      {/* Post-claim banner */}
      {hasClaimed && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <CredentialIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <AndamioText className="font-medium text-primary">
                Credential Claimed
              </AndamioText>
              <AndamioText variant="small" className="mt-1">
                You&apos;ve earned your credential for this project.{" "}
                <Link href={AUTH_ROUTES.credentials} className="text-primary hover:underline">
                  View credentials
                </Link>
              </AndamioText>
            </div>
          </div>
        </div>
      )}

      {/* Commitment list */}
      {commitmentsWithTasks.map((item) => {
        const { commitment, task, xpReward } = item;
        const status = commitment.commitmentStatus ?? "UNKNOWN";
        const taskTitle = task?.title || "Task no longer available";
        const isEditing = editingTaskHash === commitment.taskHash;
        const showClaimFlow = claimFlowTaskHash === commitment.taskHash;

        return (
          <AndamioCard key={`${commitment.taskHash}-${status}`}>
            <AndamioCardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <AndamioCardTitle className="text-base">
                    {task?.taskHash ? (
                      <Link href={PUBLIC_ROUTES.task(task.taskHash)} className="hover:underline">
                        {taskTitle}
                      </Link>
                    ) : (
                      taskTitle
                    )}
                  </AndamioCardTitle>
                  {xpReward > 0 && (
                    <AndamioCardDescription className="flex items-center gap-2 mt-1">
                      <XpBadge amount={xpReward} />
                      {task?.lovelaceAmount && (
                        <AndamioText variant="small" className="text-muted-foreground">
                          + {formatLovelace(task.lovelaceAmount)}
                        </AndamioText>
                      )}
                    </AndamioCardDescription>
                  )}
                </div>
                <AndamioBadge variant={getCommitmentStatusVariant(status)}>
                  {formatCommitmentStatus(status)}
                </AndamioBadge>
              </div>
            </AndamioCardHeader>

            <AndamioCardContent className="space-y-4">
              {/* ── PENDING_TX states ────────────────────────────────── */}
              {status.startsWith("PENDING_TX") && (
                <>
                  {commitment.pendingTxHash && (
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
                  )}
                  <AndamioText variant="small" className="text-muted-foreground">
                    Waiting for blockchain confirmation. This usually takes a few minutes.
                  </AndamioText>
                  <AndamioButton
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshIcon className="h-4 w-4 mr-2" />
                    {isRefreshing ? "Refreshing..." : "Refresh Status"}
                  </AndamioButton>
                </>
              )}

              {/* ── SUBMITTED / REFUSED (merged) ────────────────────── */}
              {(status === "SUBMITTED" || status === "REFUSED") && (
                <>
                  {status === "REFUSED" && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <div className="flex items-start gap-2">
                        <AlertIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <AndamioText variant="small">
                          Your work was not accepted. Update your evidence and resubmit.
                        </AndamioText>
                      </div>
                    </div>
                  )}

                  {status === "SUBMITTED" && (
                    <AndamioText variant="small" className="text-muted-foreground">
                      Evidence submitted. Waiting for manager review.
                    </AndamioText>
                  )}

                  {commitment.submissionTx && (
                    <>
                      <AndamioSeparator />
                      <div className="flex items-center justify-between">
                        <AndamioText variant="small">Submission TX</AndamioText>
                        <a
                          href={getTransactionExplorerUrl(commitment.submissionTx)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {commitment.submissionTx.slice(0, 16)}...
                        </a>
                      </div>
                    </>
                  )}

                  {/* Evidence display (read-only) */}
                  {commitment.evidence != null && !isEditing && (
                    <>
                      <AndamioSeparator />
                      <div>
                        <AndamioText variant="small" className="font-medium mb-2">Your Evidence</AndamioText>
                        <div className="min-h-[80px] border rounded-lg bg-muted/20 p-4">
                          <ContentViewer content={commitment.evidence as JSONContent} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Edit button */}
                  {!hasClaimed && !isEditing && (
                    <AndamioButton
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTaskHash(commitment.taskHash);
                        setEvidence(null);
                      }}
                    >
                      <EditIcon className="h-4 w-4 mr-2" />
                      {status === "REFUSED" ? "Revise Evidence" : "Update Evidence"}
                    </AndamioButton>
                  )}

                  {/* Editor + TaskAction */}
                  {isEditing && task && contributorStateId && (
                    <>
                      <AndamioSeparator />
                      <div className="space-y-3">
                        <AndamioText className="font-medium">
                          {status === "REFUSED" ? "Resubmit Your Evidence" : "Update Your Evidence"}
                        </AndamioText>
                        <div className="min-h-[200px] border rounded-lg">
                          <ContentEditor
                            content={evidence ?? (commitment.evidence as JSONContent | null)}
                            onContentChange={setEvidence}
                          />
                        </div>
                      </div>
                      <TaskAction
                        projectNftPolicyId={projectId}
                        contributorStateId={contributorStateId}
                        taskHash={commitment.taskHash}
                        taskCode={`TASK_${task.index}`}
                        taskTitle={task.title ?? undefined}
                        taskEvidence={evidence ?? (commitment.evidence as JSONContent | undefined)}
                        onSuccess={async () => {
                          await refreshData();
                        }}
                      />
                      <AndamioButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTaskHash(null);
                          setEvidence(null);
                        }}
                      >
                        Cancel
                      </AndamioButton>
                    </>
                  )}
                </>
              )}

              {/* ── ACCEPTED ────────────────────────────────────────── */}
              {status === "ACCEPTED" && !hasClaimed && (
                <>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <SuccessIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <AndamioText className="font-medium text-primary">
                          Your work was accepted
                        </AndamioText>
                        <AndamioText variant="small" className="mt-1">
                          Choose your next step below.
                        </AndamioText>
                      </div>
                    </div>
                  </div>

                  {!showClaimFlow ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Link href={PUBLIC_ROUTES.projects} className="block">
                        <div className="rounded-lg border p-4 space-y-3 hover:border-primary/50 transition-colors cursor-pointer h-full">
                          <div className="flex items-center gap-2">
                            <TaskIcon className="h-5 w-5 text-primary" />
                            <AndamioText className="font-medium">Browse Tasks</AndamioText>
                          </div>
                          <AndamioText variant="small">
                            Commit to a new task. Your pending reward will be claimed automatically.
                          </AndamioText>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setClaimFlowTaskHash(commitment.taskHash)}
                        className="rounded-lg border border-primary/20 p-4 space-y-3 hover:border-primary/50 transition-colors cursor-pointer h-full text-left xp-card-glow"
                      >
                        <div className="flex items-center gap-2">
                          <CredentialIcon className="h-5 w-5 text-primary" />
                          <AndamioText className="font-medium">Leave & Claim</AndamioText>
                        </div>
                        <AndamioText variant="small">
                          Leave the project, claim rewards, and mint your credential NFT.
                        </AndamioText>
                      </button>
                    </div>
                  ) : contributorStateId ? (
                    <>
                      <ProjectCredentialClaim
                        projectNftPolicyId={projectId}
                        contributorStateId={contributorStateId}
                        projectTitle={project?.title}
                        pendingRewardLovelace={task?.lovelaceAmount}
                        onSuccess={async () => {
                          setJustClaimed(true);
                          await refreshData();
                        }}
                      />
                      <AndamioButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setClaimFlowTaskHash(null)}
                      >
                        Back to options
                      </AndamioButton>
                    </>
                  ) : null}
                </>
              )}

              {/* ── ACCEPTED + already claimed (read-only) ──────────── */}
              {status === "ACCEPTED" && hasClaimed && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <SuccessIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <AndamioText className="font-medium">Rewards Claimed</AndamioText>
                      <AndamioText variant="small" className="mt-1 text-muted-foreground">
                        You&apos;ve claimed your credential and rewards for this task.
                      </AndamioText>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Unknown / other status ──────────────────────────── */}
              {!["SUBMITTED", "REFUSED", "ACCEPTED", "UNKNOWN"].includes(status) &&
                !status.startsWith("PENDING_TX") && (
                  <div className="flex items-center justify-between">
                    <AndamioText variant="small" className="text-muted-foreground">
                      Status: {formatCommitmentStatus(status)}
                    </AndamioText>
                    {commitment.submissionTx && (
                      <a
                        href={getTransactionExplorerUrl(commitment.submissionTx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {commitment.submissionTx.slice(0, 12)}...
                      </a>
                    )}
                  </div>
                )}
            </AndamioCardContent>
          </AndamioCard>
        );
      })}
    </div>
  );
}
