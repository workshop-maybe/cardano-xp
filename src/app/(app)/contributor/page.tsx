"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  PendingIcon,
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
  const [showClaimFlow, setShowClaimFlow] = useState(false);
  const [isTxInFlight, setIsTxInFlight] = useState(false);
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

  const contributorStateId = project?.contributorStateId ?? "0".repeat(56);

  // ── Callbacks ────────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectContributorKeys.all }),
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      queryClient.invalidateQueries({ queryKey: projectKeys.tasks(projectId) }),
    ]);
  }, [queryClient, projectId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast.info("Data refreshed");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  // Refetch on mount to catch TXs that completed while user was elsewhere
  useEffect(() => {
    void refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear editor state when commitment status changes
  useEffect(() => {
    setEditingTaskHash(null);
    setEvidence(null);
  }, [commitments?.map((c) => c.commitmentStatus).join(",")]);

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
                You&apos;ve earned your on-chain credential for this project.{" "}
                <Link href={AUTH_ROUTES.credentials} className="text-primary hover:underline">
                  View credentials
                </Link>
              </AndamioText>
            </div>
          </div>
        </div>
      )}

      {/* Commitment list */}
      {commitmentsWithTasks.map((item) => (
        <CommitmentCard
          key={`${item.commitment.taskHash}-${item.commitment.commitmentStatus}`}
          item={item}
          projectId={projectId}
          contributorStateId={contributorStateId}
          projectTitle={project?.title}
          hasClaimed={hasClaimed}
          isTxInFlight={isTxInFlight}
          isRefreshing={isRefreshing}
          editingTaskHash={editingTaskHash}
          evidence={evidence}
          showClaimFlow={showClaimFlow}
          onEditEvidence={(taskHash) => {
            setEditingTaskHash(taskHash);
            setEvidence(null);
          }}
          onEvidenceChange={setEvidence}
          onCancelEdit={() => {
            setEditingTaskHash(null);
            setEvidence(null);
          }}
          onShowClaimFlow={setShowClaimFlow}
          onTxStart={() => setIsTxInFlight(true)}
          onTxEnd={() => setIsTxInFlight(false)}
          onSuccess={async () => {
            setIsTxInFlight(false);
            await refreshData();
          }}
          onClaimSuccess={async () => {
            setIsTxInFlight(false);
            setJustClaimed(true);
            await refreshData();
          }}
          onRefresh={handleRefresh}
        />
      ))}
    </div>
  );
}

// ── CommitmentCard ────────────────────────────────────────────────────────

interface CommitmentCardProps {
  item: CommitmentWithTask;
  projectId: string;
  contributorStateId: string;
  projectTitle?: string;
  hasClaimed: boolean;
  isTxInFlight: boolean;
  isRefreshing: boolean;
  editingTaskHash: string | null;
  evidence: JSONContent | null;
  showClaimFlow: boolean;
  onEditEvidence: (taskHash: string) => void;
  onEvidenceChange: (content: JSONContent | null) => void;
  onCancelEdit: () => void;
  onShowClaimFlow: (show: boolean) => void;
  onTxStart: () => void;
  onTxEnd: () => void;
  onSuccess: () => Promise<void>;
  onClaimSuccess: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

function CommitmentCard({
  item,
  projectId,
  contributorStateId,
  projectTitle,
  hasClaimed,
  isTxInFlight,
  isRefreshing,
  editingTaskHash,
  evidence,
  showClaimFlow,
  onEditEvidence,
  onEvidenceChange,
  onCancelEdit,
  onShowClaimFlow,
  onTxStart,
  onTxEnd,
  onSuccess,
  onClaimSuccess,
  onRefresh,
}: CommitmentCardProps) {
  const { commitment, task, xpReward } = item;
  const status = commitment.commitmentStatus ?? "UNKNOWN";
  const taskTitle = task?.title || "Task no longer available";
  const isEditing = editingTaskHash === commitment.taskHash;

  return (
    <AndamioCard>
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
        {/* ── PENDING_TX states ──────────────────────────────────────── */}
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
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshIcon className="h-4 w-4 mr-2" />
              {isRefreshing ? "Refreshing..." : "Refresh Status"}
            </AndamioButton>
          </>
        )}

        {/* ── SUBMITTED ─────────────────────────────────────────────── */}
        {status === "SUBMITTED" && (
          <>
            <AndamioText variant="small" className="text-muted-foreground">
              Evidence submitted. Waiting for manager review.
            </AndamioText>

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

            {/* Evidence display */}
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

            {/* Edit button / editor */}
            {!hasClaimed && !isEditing && (
              <AndamioButton
                variant="outline"
                size="sm"
                onClick={() => onEditEvidence(commitment.taskHash)}
                disabled={isTxInFlight}
              >
                <EditIcon className="h-4 w-4 mr-2" />
                Update Evidence
              </AndamioButton>
            )}

            {isEditing && task && (
              <>
                <AndamioSeparator />
                <div className="space-y-3">
                  <AndamioText className="font-medium">Update Your Evidence</AndamioText>
                  <div className="min-h-[200px] border rounded-lg">
                    <ContentEditor
                      content={evidence ?? (commitment.evidence as JSONContent | null)}
                      onContentChange={onEvidenceChange}
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
                    onTxStart();
                    await onSuccess();
                  }}
                />
                <AndamioButton variant="ghost" size="sm" onClick={onCancelEdit}>
                  Cancel
                </AndamioButton>
              </>
            )}
          </>
        )}

        {/* ── REFUSED ───────────────────────────────────────────────── */}
        {status === "REFUSED" && (
          <>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertIcon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <AndamioText variant="small">
                  Your work was not accepted. Update your evidence and resubmit.
                </AndamioText>
              </div>
            </div>

            {!isEditing && (
              <AndamioButton
                variant="outline"
                size="sm"
                onClick={() => onEditEvidence(commitment.taskHash)}
                disabled={isTxInFlight}
              >
                <EditIcon className="h-4 w-4 mr-2" />
                Revise Evidence
              </AndamioButton>
            )}

            {isEditing && task && (
              <>
                <div className="space-y-3">
                  <AndamioText className="font-medium">Resubmit Your Evidence</AndamioText>
                  <div className="min-h-[200px] border rounded-lg">
                    <ContentEditor
                      content={evidence ?? (commitment.evidence as JSONContent | null)}
                      onContentChange={onEvidenceChange}
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
                    onTxStart();
                    await onSuccess();
                  }}
                />
                <AndamioButton variant="ghost" size="sm" onClick={onCancelEdit}>
                  Cancel
                </AndamioButton>
              </>
            )}
          </>
        )}

        {/* ── ACCEPTED ──────────────────────────────────────────────── */}
        {status === "ACCEPTED" && !hasClaimed && (
          <>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <SuccessIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <AndamioText className="font-medium text-primary">
                    Your work was accepted!
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
                  onClick={() => onShowClaimFlow(true)}
                  disabled={isTxInFlight}
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
            ) : (
              <>
                <ProjectCredentialClaim
                  projectNftPolicyId={projectId}
                  contributorStateId={contributorStateId}
                  projectTitle={projectTitle}
                  pendingRewardLovelace={task?.lovelaceAmount}
                  onSuccess={async () => {
                    onTxStart();
                    await onClaimSuccess();
                  }}
                />
                <AndamioButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onShowClaimFlow(false)}
                >
                  Back to options
                </AndamioButton>
              </>
            )}
          </>
        )}

        {/* ── ACCEPTED + already claimed (read-only) ────────────────── */}
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

        {/* ── Unknown / other status ────────────────────────────────── */}
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
}
