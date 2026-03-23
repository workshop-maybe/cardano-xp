"use client";

import React, { useState, useMemo } from "react";
import { CARDANO_XP } from "~/config/cardano-xp";
import { XpBadge } from "~/components/xp-badge";
import Link from "next/link";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { ConnectWalletGate } from "~/components/auth/connect-wallet-gate";
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
  AndamioSectionHeader,
  AndamioTableContainer,
  AndamioEmptyState,
  AndamioText,
  AndamioBackButton,
  AndamioAddButton,
  AndamioRowActions,
  AndamioErrorAlert,
  AndamioScrollArea,
} from "~/components/andamio";
import {
  TaskIcon,
  OnChainIcon,
  SuccessIcon,
  PendingIcon,
  AlertIcon,
  UserIcon,
  NeutralIcon,
  ErrorIcon,
  SortIcon,
} from "~/components/icons";
import { formatXP } from "~/lib/cardano-utils";

function getTaskXpReward(task: Task): number {
  // Match on policyId only — the API returns decoded assetName ("XP") not hex ("5850")
  const xpToken = task.tokens?.find(
    (t) => t.policyId === CARDANO_XP.xpToken.policyId
  );
  return xpToken?.quantity ?? 0;
}
import { useProject, type Task } from "~/hooks/api/project/use-project";
import { useManagerTasks, useDeleteTask, useManagerCommitments, type ManagerCommitment } from "~/hooks/api/project/use-project-manager";
import { PUBLIC_ROUTES, ADMIN_ROUTES } from "~/config/routes";

// =============================================================================
// Task Lifecycle Types
// =============================================================================

type TaskLifecycle = "available" | "in_progress" | "pending_review" | "accepted" | "refused" | "denied";

interface TaskLifecycleInfo {
  lifecycle: TaskLifecycle;
  contributor?: string;
  commitment?: ManagerCommitment;
}

function getLifecycleFromStatus(status: string | undefined): TaskLifecycle {
  switch (status) {
    case "SUBMITTED":
      return "pending_review";
    case "ACCEPTED":
      return "accepted";
    case "REFUSED":
      return "refused";
    case "DENIED":
      return "denied";
    case "AWAITING_SUBMISSION":
    case "PENDING_TX_COMMIT":
    case "PENDING_TX_ASSESS":
    case "DRAFT":
      return "in_progress";
    default:
      return "in_progress";
  }
}

function getLifecycleLabel(lifecycle: TaskLifecycle): string {
  switch (lifecycle) {
    case "available":
      return "Available";
    case "in_progress":
      return "In Progress";
    case "pending_review":
      return "Pending Review";
    case "accepted":
      return "Accepted";
    case "refused":
      return "Refused";
    case "denied":
      return "Denied";
  }
}

function getLifecycleBadgeVariant(lifecycle: TaskLifecycle): "default" | "secondary" | "outline" | "destructive" {
  switch (lifecycle) {
    case "available":
      return "outline";
    case "in_progress":
      return "secondary";
    case "pending_review":
      return "secondary";
    case "accepted":
      return "default";
    case "refused":
      return "destructive";
    case "denied":
      return "destructive";
  }
}

function getLifecycleIcon(lifecycle: TaskLifecycle) {
  switch (lifecycle) {
    case "available":
      return <NeutralIcon className="h-3 w-3 mr-1" />;
    case "in_progress":
      return <PendingIcon className="h-3 w-3 mr-1" />;
    case "pending_review":
      return <AlertIcon className="h-3 w-3 mr-1" />;
    case "accepted":
      return <SuccessIcon className="h-3 w-3 mr-1" />;
    case "refused":
      return <ErrorIcon className="h-3 w-3 mr-1" />;
    case "denied":
      return <ErrorIcon className="h-3 w-3 mr-1" />;
  }
}

/** Priority order: pending_review needs attention most, then in_progress, etc. */
const LIFECYCLE_PRIORITY: Record<TaskLifecycle, number> = {
  pending_review: 5,
  in_progress: 4,
  accepted: 3,
  refused: 2,
  denied: 1,
  available: 0,
};

function shouldReplace(existing: TaskLifecycle, incoming: TaskLifecycle): boolean {
  return LIFECYCLE_PRIORITY[incoming] > LIFECYCLE_PRIORITY[existing];
}

/**
 * Draft Tasks List - View and manage draft tasks for a project
 *
 * Uses React Query hooks:
 * - useProject(projectId) - Project detail for contributorStateId
 * - useManagerTasks(projectId) - All tasks including DRAFT
 * - useDeleteTask() - Delete task mutation
 */
export default function DraftTasksPage() {
  const projectId = CARDANO_XP.projectId;
  const { isAuthenticated } = useAndamioAuth();

  // React Query hooks
  const { data: projectDetail, isLoading: isProjectLoading, error: projectError } = useProject(projectId);
  const contributorStateId = projectDetail?.contributorStateId;
  const { data: tasks = [], isLoading: isTasksLoading } = useManagerTasks(projectId);
  const { data: allCommitments = [], isLoading: isCommitmentsLoading } = useManagerCommitments(projectId);
  const deleteTask = useDeleteTask();

  const [deletingTaskIndex, setDeletingTaskIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lifecycleFilter, setLifecycleFilter] = useState<TaskLifecycle | "all">("all");
  const [sortField, setSortField] = useState<"title" | "reward" | "lifecycle" | "contributor">("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [draftSortField, setDraftSortField] = useState<"title" | "reward">("title");
  const [draftSortDirection, setDraftSortDirection] = useState<"asc" | "desc">("asc");

  // Build lifecycle map: taskHash → most relevant commitment info
  const taskLifecycleMap = useMemo(() => {
    const map = new Map<string, TaskLifecycleInfo>();
    for (const commitment of allCommitments) {
      const existing = map.get(commitment.taskHash);
      // Keep the most "advanced" commitment per taskHash
      // Priority: pending_review > in_progress > accepted > refused > denied
      if (!existing || shouldReplace(existing.lifecycle, getLifecycleFromStatus(commitment.commitmentStatus))) {
        map.set(commitment.taskHash, {
          lifecycle: getLifecycleFromStatus(commitment.commitmentStatus),
          contributor: commitment.submittedBy,
          commitment,
        });
      }
    }
    return map;
  }, [allCommitments]);

  // Build set of on-chain task hashes from project detail (source of truth)
  // to exclude from draft list when manager tasks API lags behind
  const onChainTaskHashes = useMemo(() => new Set(
    (projectDetail?.tasks ?? [])
      .filter((t) => t.taskStatus === "ON_CHAIN")
      .map((t) => t.taskHash)
      .filter(Boolean)
  ), [projectDetail?.tasks]);

  // Separate tasks by status, excluding drafts that are already on-chain
  const draftTasksRaw = useMemo(() => tasks.filter(
    (t) => t.taskStatus === "DRAFT" && (!t.taskHash || !onChainTaskHashes.has(t.taskHash))
  ), [tasks, onChainTaskHashes]);

  // Sorted draft tasks
  const draftTasks = useMemo(() => {
    const sorted = [...draftTasksRaw];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (draftSortField === "title") {
        cmp = (a.title || "").localeCompare(b.title || "");
      } else {
        cmp = getTaskXpReward(a) - getTaskXpReward(b);
      }
      return draftSortDirection === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [draftTasksRaw, draftSortField, draftSortDirection]);
  // De-duplicate ON_CHAIN tasks by taskHash (API can return duplicates across data sources)
  const liveTasks = useMemo(() => {
    const onChainTasks = tasks.filter((t) => t.taskStatus === "ON_CHAIN");
    const seen = new Set<string>();
    return onChainTasks.filter((t) => {
      if (!t.taskHash) return true; // Keep tasks without hash (shouldn't happen for ON_CHAIN)
      if (seen.has(t.taskHash)) return false;
      seen.add(t.taskHash);
      return true;
    });
  }, [tasks]);
  const otherTasks = useMemo(() => tasks.filter((t) => !["DRAFT", "ON_CHAIN"].includes(t.taskStatus ?? "")), [tasks]);

  // Lifecycle summary counts for live tasks
  const lifecycleCounts = useMemo(() => {
    let available = 0;
    let inProgress = 0;
    let pendingReview = 0;
    let accepted = 0;
    for (const task of liveTasks) {
      const info = taskLifecycleMap.get(task.taskHash);
      if (!info) {
        available++;
      } else {
        switch (info.lifecycle) {
          case "in_progress":
            inProgress++;
            break;
          case "pending_review":
            pendingReview++;
            break;
          case "accepted":
            accepted++;
            break;
          default:
            available++;
        }
      }
    }
    return { available, inProgress, pendingReview, accepted };
  }, [liveTasks, taskLifecycleMap]);

  // Filtered and sorted live tasks
  const filteredLiveTasks = useMemo(() => {
    let filtered = lifecycleFilter === "all"
      ? [...liveTasks]
      : liveTasks.filter((task) => {
          const info = taskLifecycleMap.get(task.taskHash);
          const lifecycle = info?.lifecycle ?? "available";
          return lifecycle === lifecycleFilter;
        });

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = (a.title || "").localeCompare(b.title || "");
          break;
        case "contributor": {
          const ca = taskLifecycleMap.get(a.taskHash)?.contributor ?? "";
          const cb = taskLifecycleMap.get(b.taskHash)?.contributor ?? "";
          cmp = ca.localeCompare(cb);
          break;
        }
        case "reward":
          cmp = getTaskXpReward(a) - getTaskXpReward(b);
          break;
        case "lifecycle": {
          const la = taskLifecycleMap.get(a.taskHash)?.lifecycle ?? "available";
          const lb = taskLifecycleMap.get(b.taskHash)?.lifecycle ?? "available";
          cmp = LIFECYCLE_PRIORITY[lb] - LIFECYCLE_PRIORITY[la]; // Higher priority first
          break;
        }
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });

    return filtered;
  }, [liveTasks, taskLifecycleMap, lifecycleFilter, sortField, sortDirection]);

  const toggleSort = (field: "title" | "reward" | "lifecycle" | "contributor") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleDraftSort = (field: "title" | "reward") => {
    if (draftSortField === field) {
      setDraftSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setDraftSortField(field);
      setDraftSortDirection("asc");
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!isAuthenticated) {
      setError("You must be authenticated to delete tasks");
      return;
    }
    if (!contributorStateId) {
      setError("Missing project contributor state. Try refreshing the page.");
      return;
    }
    if (task.index === undefined) {
      setError("Cannot delete task: missing task index");
      return;
    }

    setDeletingTaskIndex(task.index);
    setError(null);

    try {
      await deleteTask.mutateAsync({
        projectId,
        contributorStateId,
        taskIndex: task.index,
      });
    } catch (err) {
      console.error("Error deleting task:", err);
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeletingTaskIndex(null);
    }
  };

  // Helper to get status badge variant
  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "ON_CHAIN":
        return "default";
      case "DRAFT":
        return "secondary";
      case "EXPIRED":
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <ConnectWalletGate
        title="Draft Tasks"
        description="Connect your wallet to manage tasks"
      />
    );
  }

  // Loading state
  if (isProjectLoading || isTasksLoading || isCommitmentsLoading) {
    return <AndamioPageLoading variant="list" />;
  }

  // Error state
  const errorMessage = projectError instanceof Error ? projectError.message : projectError ? "Failed to load project" : error;
  if (errorMessage) {
    return (
      <div className="space-y-6">
        <AndamioBackButton
          href={ADMIN_ROUTES.projectDashboard}
          label="Back to Project"
        />

        <AndamioErrorAlert error={errorMessage} />
      </div>
    );
  }

  return (
    <AndamioScrollArea className="h-full">
    <div className="min-h-full">
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <AndamioBackButton
          href={ADMIN_ROUTES.projectDashboard}
          label="Back to Project"
        />

        <Link href={ADMIN_ROUTES.newTask}>
          <AndamioAddButton label="Create Task" />
        </Link>
      </div>

      <AndamioPageHeader
        title="Tasks"
        description="Manage tasks for this project"
      />

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-3">
        {draftTasks.length > 0 && (
          <AndamioBadge variant="secondary">
            {draftTasks.length} Draft
          </AndamioBadge>
        )}
        <AndamioBadge variant="default" className="bg-primary text-primary-foreground">
          <OnChainIcon className="h-3 w-3 mr-1" />
          {liveTasks.length} Published
        </AndamioBadge>
        {lifecycleCounts.available > 0 && (
          <AndamioBadge variant="outline">
            <NeutralIcon className="h-3 w-3 mr-1" />
            {lifecycleCounts.available} Available
          </AndamioBadge>
        )}
        {lifecycleCounts.inProgress > 0 && (
          <AndamioBadge variant="outline">
            <PendingIcon className="h-3 w-3 mr-1" />
            {lifecycleCounts.inProgress} In Progress
          </AndamioBadge>
        )}
        {lifecycleCounts.pendingReview > 0 && (
          <AndamioBadge variant="outline" className="border-primary/50 text-primary">
            <AlertIcon className="h-3 w-3 mr-1" />
            {lifecycleCounts.pendingReview} Needs Review
          </AndamioBadge>
        )}
        {lifecycleCounts.accepted > 0 && (
          <AndamioBadge variant="outline">
            <SuccessIcon className="h-3 w-3 mr-1" />
            {lifecycleCounts.accepted} Accepted
          </AndamioBadge>
        )}
      </div>

      {/* Draft Tasks Section */}
      {draftTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <AndamioSectionHeader title="Draft Tasks" />
            <Link href={ADMIN_ROUTES.treasury}>
              <AndamioButton variant="default" size="sm">
                <OnChainIcon className="h-4 w-4 mr-2" />
                Publish Tasks
              </AndamioButton>
            </Link>
          </div>
          <AndamioText variant="small">These tasks are not yet published to the blockchain</AndamioText>
          <AndamioTableContainer>
            <AndamioTable>
              <AndamioTableHeader>
                <AndamioTableRow>
                  <AndamioTableHead>
                    <button onClick={() => toggleDraftSort("title")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground">
                      Title
                      <SortIcon className={`h-3 w-3 ${draftSortField === "title" ? "text-primary" : "text-muted-foreground/50"}`} />
                    </button>
                  </AndamioTableHead>
                  <AndamioTableHead className="w-32 text-center">
                    <button onClick={() => toggleDraftSort("reward")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
                      XP
                      <SortIcon className={`h-3 w-3 ${draftSortField === "reward" ? "text-primary" : "text-muted-foreground/50"}`} />
                    </button>
                  </AndamioTableHead>
                  <AndamioTableHead className="w-32 text-center">Status</AndamioTableHead>
                  <AndamioTableHead className="w-32 text-right">Actions</AndamioTableHead>
                </AndamioTableRow>
              </AndamioTableHeader>
              <AndamioTableBody>
                {draftTasks.map((task, index) => {
                  const taskIndex = task.index ?? 0;
                  return (
                    <AndamioTableRow key={task.taskHash || `draft-${taskIndex}-${index}`}>

                      <AndamioTableCell className="font-medium">{task.title || "Untitled Task"}</AndamioTableCell>
                      <AndamioTableCell className="text-center">
                        <XpBadge amount={getTaskXpReward(task)} />
                      </AndamioTableCell>
                      <AndamioTableCell className="text-center">
                        <AndamioBadge variant={getStatusVariant(task.taskStatus ?? "")}>{task.taskStatus}</AndamioBadge>
                      </AndamioTableCell>
                      <AndamioTableCell className="text-right">
                        <AndamioRowActions
                          editHref={ADMIN_ROUTES.editTask(taskIndex)}
                          onDelete={() => handleDeleteTask(task)}
                          itemName="task"
                          deleteDescription={`Are you sure you want to delete "${task.title || "Untitled Task"}"? This action cannot be undone.`}
                          isDeleting={deletingTaskIndex === taskIndex}
                        />
                      </AndamioTableCell>
                    </AndamioTableRow>
                  );
                })}
              </AndamioTableBody>
            </AndamioTable>
          </AndamioTableContainer>
        </div>
      )}

      {/* Live Tasks Section */}
      {liveTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <AndamioSectionHeader title="Live Tasks" />
            {lifecycleCounts.pendingReview > 0 && (
              <Link href={ADMIN_ROUTES.commitments}>
                <AndamioButton variant="outline" size="sm">
                  <AlertIcon className="h-4 w-4 mr-2" />
                  Review Submissions ({lifecycleCounts.pendingReview})
                </AndamioButton>
              </Link>
            )}
          </div>
          <AndamioText variant="small">Published on-chain. Lifecycle status is derived from contributor commitments.</AndamioText>

          {/* Lifecycle Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLifecycleFilter("all")}
              aria-pressed={lifecycleFilter === "all"}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                lifecycleFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All ({liveTasks.length})
            </button>
            {lifecycleCounts.available > 0 && (
              <button
                type="button"
                onClick={() => setLifecycleFilter("available")}
                aria-pressed={lifecycleFilter === "available"}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  lifecycleFilter === "available"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <NeutralIcon className="h-3 w-3" />
                Available ({lifecycleCounts.available})
              </button>
            )}
            {lifecycleCounts.inProgress > 0 && (
              <button
                type="button"
                onClick={() => setLifecycleFilter("in_progress")}
                aria-pressed={lifecycleFilter === "in_progress"}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  lifecycleFilter === "in_progress"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <PendingIcon className="h-3 w-3" />
                In Progress ({lifecycleCounts.inProgress})
              </button>
            )}
            {lifecycleCounts.pendingReview > 0 && (
              <button
                type="button"
                onClick={() => setLifecycleFilter("pending_review")}
                aria-pressed={lifecycleFilter === "pending_review"}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  lifecycleFilter === "pending_review"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <AlertIcon className="h-3 w-3" />
                Pending Review ({lifecycleCounts.pendingReview})
              </button>
            )}
            {lifecycleCounts.accepted > 0 && (
              <button
                type="button"
                onClick={() => setLifecycleFilter("accepted")}
                aria-pressed={lifecycleFilter === "accepted"}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  lifecycleFilter === "accepted"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <SuccessIcon className="h-3 w-3" />
                Accepted ({lifecycleCounts.accepted})
              </button>
            )}
          </div>

          <AndamioTableContainer>
            <AndamioTable>
              <AndamioTableHeader>
                <AndamioTableRow>
                  <AndamioTableHead>
                    <button onClick={() => toggleSort("title")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground">
                      Title
                      <SortIcon className={`h-3 w-3 ${sortField === "title" ? "text-primary" : "text-muted-foreground/50"}`} />
                    </button>
                  </AndamioTableHead>
                  <AndamioTableHead>
                    <button onClick={() => toggleSort("contributor")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground">
                      Contributor
                      <SortIcon className={`h-3 w-3 ${sortField === "contributor" ? "text-primary" : "text-muted-foreground/50"}`} />
                    </button>
                  </AndamioTableHead>
                  <AndamioTableHead className="w-32 text-center">
                    <button onClick={() => toggleSort("reward")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
                      XP
                      <SortIcon className={`h-3 w-3 ${sortField === "reward" ? "text-primary" : "text-muted-foreground/50"}`} />
                    </button>
                  </AndamioTableHead>
                  <AndamioTableHead className="w-40 text-center">
                    <button onClick={() => toggleSort("lifecycle")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground mx-auto">
                      Lifecycle
                      <SortIcon className={`h-3 w-3 ${sortField === "lifecycle" ? "text-primary" : "text-muted-foreground/50"}`} />
                    </button>
                  </AndamioTableHead>
                </AndamioTableRow>
              </AndamioTableHeader>
              <AndamioTableBody>
                {filteredLiveTasks.map((task) => {
                  const taskIndex = task.index ?? 0;
                  const info = taskLifecycleMap.get(task.taskHash);
                  const lifecycle = info?.lifecycle ?? "available";
                  return (
                    <AndamioTableRow key={`${task.taskHash}-${taskIndex}`}>
                      <AndamioTableCell className="font-medium">
                        <Link
                          href={PUBLIC_ROUTES.task(task.taskHash)}
                          className="hover:underline"
                        >
                          {task.title || "Untitled Task"}
                        </Link>
                      </AndamioTableCell>
                      <AndamioTableCell>
                        {info?.contributor ? (
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono text-xs truncate max-w-[120px]">
                              {info.contributor}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </AndamioTableCell>
                      <AndamioTableCell className="text-center">
                        <XpBadge amount={getTaskXpReward(task)} />
                      </AndamioTableCell>
                      <AndamioTableCell className="text-center">
                        <AndamioBadge variant={getLifecycleBadgeVariant(lifecycle)}>
                          {getLifecycleIcon(lifecycle)}
                          {getLifecycleLabel(lifecycle)}
                        </AndamioBadge>
                      </AndamioTableCell>
                    </AndamioTableRow>
                  );
                })}
              </AndamioTableBody>
            </AndamioTable>
          </AndamioTableContainer>
          {filteredLiveTasks.length === 0 && lifecycleFilter !== "all" && (
            <div className="text-center py-4">
              <AndamioText variant="muted">No tasks match the selected filter.</AndamioText>
            </div>
          )}
        </div>
      )}

      {/* Other Tasks Section */}
      {otherTasks.length > 0 && (
        <div className="space-y-3">
          <AndamioSectionHeader title="Other Tasks" />
          <AndamioText variant="small">Tasks with expired, cancelled, or other non-active statuses</AndamioText>
          <AndamioTableContainer>
            <AndamioTable>
              <AndamioTableHeader>
                <AndamioTableRow>
                  <AndamioTableHead>Title</AndamioTableHead>
                  <AndamioTableHead className="w-32 text-center">XP</AndamioTableHead>
                  <AndamioTableHead className="w-32 text-center">Status</AndamioTableHead>
                </AndamioTableRow>
              </AndamioTableHeader>
              <AndamioTableBody>
                {otherTasks.map((task, idx) => {
                  const taskIndex = task.index ?? 0;
                  return (
                    <AndamioTableRow key={`${task.taskHash || 'other'}-${taskIndex}-${idx}`}>

                      <AndamioTableCell className="font-medium">{task.title || "Untitled Task"}</AndamioTableCell>
                      <AndamioTableCell className="text-center">
                        <XpBadge amount={getTaskXpReward(task)} />
                      </AndamioTableCell>
                      <AndamioTableCell className="text-center">
                        <AndamioBadge variant={getStatusVariant(task.taskStatus ?? "")}>{task.taskStatus}</AndamioBadge>
                      </AndamioTableCell>
                    </AndamioTableRow>
                  );
                })}
              </AndamioTableBody>
            </AndamioTable>
          </AndamioTableContainer>
        </div>
      )}

      {/* Empty State */}
      {tasks.length === 0 && (
        <AndamioEmptyState
          icon={TaskIcon}
          title="No tasks yet"
          description="Create your first task to get started"
          action={
            <Link href={ADMIN_ROUTES.newTask}>
              <AndamioAddButton label="Create Task" />
            </Link>
          }
        />
      )}
    </div>
    </div>
    </AndamioScrollArea>
  );
}
