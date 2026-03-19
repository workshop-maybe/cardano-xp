"use client";

import React, { useCallback, useMemo, useState } from "react";
import { XpBadge } from "~/components/xp-badge";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import {
  AndamioBadge,
  AndamioCard,
  AndamioCardContent,
  AndamioCardDescription,
  AndamioCardHeader,
  AndamioCardTitle,
  AndamioPageHeader,
  AndamioPageLoading,
  AndamioTable,
  AndamioTableBody,
  AndamioTableCell,
  AndamioTableHead,
  AndamioTableHeader,
  AndamioTableRow,
  AndamioTableContainer,
  AndamioErrorAlert,
  AndamioEmptyState,
  AndamioText,
  AndamioCheckbox,
  AndamioScrollArea,
} from "~/components/andamio";
import {
  AndamioTabs,
  AndamioTabsList,
  AndamioTabsTrigger,
  AndamioTabsContent,
} from "~/components/andamio/andamio-tabs";
import { TaskIcon, OnChainIcon, AddIcon, DeleteIcon } from "~/components/icons";
import { ConnectWalletGate } from "~/components/auth/connect-wallet-gate";
import { TreasuryBalanceCard } from "~/components/studio/treasury-balance-card";
import { TasksManage, TreasuryAddFunds } from "~/components/tx";
import { CARDANO_XP } from "~/config/cardano-xp";
import { toast } from "sonner";
import type { Task } from "~/hooks/api/project/use-project";
import { useProject, projectKeys } from "~/hooks/api/project/use-project";
import { useManagerTasks, projectManagerKeys } from "~/hooks/api/project/use-project-manager";
import { useQueryClient } from "@tanstack/react-query";

/**
 * ListValue - Array of [asset_class, quantity] tuples
 */
type ListValue = Array<[string, number]>;

/**
 * ProjectData - Task formatted for on-chain publishing
 */
interface ProjectData {
  project_content: string;
  expiration_posix: number;
  lovelace_amount: number;
  native_assets: ListValue;
}

function getTaskXpReward(task: Task): number {
  // Match on policyId only — the API returns decoded assetName ("XP") not hex ("5850")
  const xpToken = task.tokens?.find(
    (t) => t.policyId === CARDANO_XP.xpToken.policyId
  );
  return xpToken?.quantity ?? 0;
}

function hexToText(hex: string): string {
  try {
    const bytes = new Uint8Array(
      hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
    );
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/**
 * Admin Project Page
 *
 * Single-project manage treasury — uses CARDANO_XP.projectId directly.
 */
export default function AdminProjectPage() {
  const projectId = CARDANO_XP.projectId;
  const { isAuthenticated } = useAndamioAuth();
  const queryClient = useQueryClient();

  const { data: projectDetail, isLoading: isProjectLoading, error: projectError } = useProject(projectId);
  const contributorStateId = projectDetail?.contributorStateId ?? null;
  const { data: tasks = [], isLoading: isTasksLoading } = useManagerTasks(projectId);

  const [txInProgress, setTxInProgress] = useState<"add" | "remove" | null>(null);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<Set<number>>(new Set());
  const [selectedOnChainTaskIds, setSelectedOnChainTaskIds] = useState<Set<string>>(new Set());

  const onChainTasks: Task[] = useMemo(() => {
    const raw = (projectDetail?.tasks ?? []).filter(t => t.taskStatus === "ON_CHAIN");
    const seen = new Set<string>();
    return raw.filter((t) => {
      if (!t.taskHash) return true;
      if (seen.has(t.taskHash)) return false;
      seen.add(t.taskHash);
      return true;
    });
  }, [projectDetail?.tasks]);

  const onChainTaskCount = onChainTasks.length;

  const refreshData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      queryClient.invalidateQueries({ queryKey: projectManagerKeys.tasks(projectId) }),
    ]);
  }, [queryClient, projectId]);

  const handleToggleTask = (taskIndex: number) => {
    setSelectedTaskIndices((prev) => {
      const next = new Set(prev);
      if (next.has(taskIndex)) next.delete(taskIndex);
      else next.add(taskIndex);
      return next;
    });
  };

  const handleSelectAll = () => {
    const draftTasks = tasks.filter((t) => t.taskStatus === "DRAFT");
    if (selectedTaskIndices.size === draftTasks.length) {
      setSelectedTaskIndices(new Set());
    } else {
      setSelectedTaskIndices(new Set(draftTasks.map((t) => t.index).filter((idx): idx is number => idx !== undefined)));
    }
  };

  const handleToggleOnChainTask = (taskHash: string) => {
    setSelectedOnChainTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskHash)) next.delete(taskHash);
      else next.add(taskHash);
      return next;
    });
  };

  const handleSelectAllOnChain = () => {
    if (selectedOnChainTaskIds.size === onChainTasks.length) {
      setSelectedOnChainTaskIds(new Set());
    } else {
      setSelectedOnChainTaskIds(new Set(onChainTasks.map((t) => t.taskHash).filter(Boolean)));
    }
  };

  if (!isAuthenticated) {
    return (
      <ConnectWalletGate
        title="Project Admin"
        description="Connect your wallet to manage the project"
      />
    );
  }

  if (isProjectLoading || isTasksLoading) {
    return <AndamioPageLoading variant="detail" />;
  }

  const errorMessage = projectError instanceof Error ? projectError.message : projectError ? "Failed to load project" : null;
  if (errorMessage) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <AndamioErrorAlert error={errorMessage} />
      </div>
    );
  }

  const onChainTaskHashes = new Set(
    onChainTasks.map((t) => t.taskHash).filter(Boolean)
  );

  const draftTasks = tasks.filter(
    (t) => t.taskStatus === "DRAFT" && (!t.taskHash || !onChainTaskHashes.has(t.taskHash))
  );

  const selectedTasks = draftTasks.filter((t) => t.index !== undefined && selectedTaskIndices.has(t.index));

  const tasksToAdd: ProjectData[] = selectedTasks.map((task) => {
    const projectContent = (task.title || task.description || "Task").substring(0, 140);

    let expirationMs = parseInt(task.expirationTime ?? "0") || 0;
    if (expirationMs < 946684800000) {
      expirationMs = expirationMs * 1000;
    }

    // Build native_assets with hex-encoded asset names.
    // The API returns decoded names ("XP") but on-chain expects hex ("5850").
    const nativeAssets: ListValue = (task.tokens ?? []).map((t) => {
      const hexName = t.policyId === CARDANO_XP.xpToken.policyId
        ? CARDANO_XP.xpToken.assetName
        : t.assetName;
      return [`${t.policyId}.${hexName}`, t.quantity];
    });

    return {
      project_content: projectContent,
      expiration_posix: expirationMs,
      lovelace_amount: parseInt(task.lovelaceAmount) || 5000000,
      native_assets: nativeAssets,
    };
  });

  const taskCodes = selectedTasks.map((t) => t.title || `Task ${(t.index ?? 0) + 1}`);
  const taskIndices = selectedTasks.map((t) => t.index).filter((idx): idx is number => idx !== undefined);

  const selectedOnChainTasks = onChainTasks.filter((t) => t.taskHash && selectedOnChainTaskIds.has(t.taskHash));
  const tasksToRemove: ProjectData[] = selectedOnChainTasks.map((task) => {
    const onChainContent = task.onChainContent ?? "";
    const projectContent = /^[0-9a-fA-F]+$/.exec(onChainContent) ? hexToText(onChainContent) : (task.title || "Task");

    let expirationMs = parseInt(task.expirationTime ?? "0") || 0;
    if (expirationMs < 946684800000) {
      expirationMs = expirationMs * 1000;
    }

    // Build native_assets with hex-encoded asset names.
    // The API returns decoded names ("XP") but on-chain expects hex ("5850").
    const nativeAssets: ListValue = (task.tokens ?? []).map((t) => {
      const hexName = t.policyId === CARDANO_XP.xpToken.policyId
        ? CARDANO_XP.xpToken.assetName
        : t.assetName;
      return [`${t.policyId}.${hexName}`, t.quantity];
    });

    return {
      project_content: projectContent,
      expiration_posix: expirationMs,
      lovelace_amount: parseInt(task.lovelaceAmount) || 5000000,
      native_assets: nativeAssets,
    };
  });

  const addLovelace = tasksToAdd.reduce((sum, t) => sum + t.lovelace_amount, 0);
  const treasuryBalance = projectDetail?.treasuryBalance ?? 0;
  const onChainCommitted = onChainTasks.reduce(
    (sum, t) => sum + (parseInt(t.lovelaceAmount) || 0),
    0,
  );
  const availableFunds = treasuryBalance - onChainCommitted;
  const publishDepositAmount = Math.max(0, addLovelace - availableFunds);

  // XP needed for tasks being published
  const addXp = tasksToAdd.reduce((sum, t) => {
    const xpAsset = t.native_assets.find(([assetClass]) =>
      typeof assetClass === "string" && assetClass.includes(CARDANO_XP.xpToken.assetName)
    );
    return sum + (xpAsset ? (typeof xpAsset[1] === "number" ? xpAsset[1] : 0) : 0);
  }, 0);

  // XP already in treasury (don't ask wallet to supply what's already there)
  const treasuryXp = projectDetail?.treasuryAssets?.find(
    (t) => t.policyId === CARDANO_XP.xpToken.policyId
  )?.quantity ?? 0;
  const onChainXpCommitted = onChainTasks.reduce((sum, t) => {
    const xp = t.tokens?.find((tk) => tk.policyId === CARDANO_XP.xpToken.policyId);
    return sum + (xp?.quantity ?? 0);
  }, 0);
  const availableXp = treasuryXp - onChainXpCommitted;
  const xpDepositNeeded = Math.max(0, addXp - availableXp);

  const publishDepositValue: ListValue = [];
  if (publishDepositAmount > 0) {
    publishDepositValue.push(["lovelace", publishDepositAmount]);
  }
  if (xpDepositNeeded > 0) {
    publishDepositValue.push([
      `${CARDANO_XP.xpToken.policyId}.${CARDANO_XP.xpToken.assetName}`,
      xpDepositNeeded,
    ]);
  }

  return (
    <AndamioScrollArea className="h-full">
    <div className="min-h-full">
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <AndamioPageHeader
        title="Project Admin"
        description="Manage tasks, treasury, and XP distribution"
      />

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-4">
        <AndamioBadge variant="secondary">
          {draftTasks.length} Draft Task{draftTasks.length !== 1 ? "s" : ""}
        </AndamioBadge>
        <AndamioBadge variant="default" className="bg-primary text-primary-foreground">
          <OnChainIcon className="h-3 w-3 mr-1" />
          {onChainTaskCount} Published
        </AndamioBadge>
        {selectedTasks.length > 0 && (
          <AndamioBadge variant="outline" className="bg-primary/10">
            {selectedTasks.length} Selected
          </AndamioBadge>
        )}
      </div>

      {/* Treasury Balance */}
      <TreasuryBalanceCard
        treasuryBalance={projectDetail?.treasuryBalance}
        treasuryAssets={projectDetail?.treasuryAssets}
        treasuryAddress={projectDetail?.treasuryAddress}
      />

      {/* Add Funds to Treasury */}
      <TreasuryAddFunds
        projectNftPolicyId={projectId}
        onSuccess={async () => {
          await refreshData();
        }}
      />

      {/* Task Management Tabs */}
      <AndamioTabs defaultValue="publish" className="w-full">
        <AndamioTabsList className="w-auto inline-flex h-9 mb-6">
          <AndamioTabsTrigger value="publish" className="text-sm gap-1.5 px-4">
            <AddIcon className="h-4 w-4" />
            Add to Treasury
          </AndamioTabsTrigger>
          <AndamioTabsTrigger value="remove" className="text-sm gap-1.5 px-4">
            <DeleteIcon className="h-4 w-4" />
            Remove from Treasury
          </AndamioTabsTrigger>
        </AndamioTabsList>

        {/* PUBLISH TAB */}
        <AndamioTabsContent value="publish" className="space-y-4">
          {draftTasks.length > 0 ? (
            <AndamioCard>
              <AndamioCardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <AndamioCardTitle className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <AddIcon className="h-4 w-4 text-primary" />
                      </div>
                      Add to Treasury
                    </AndamioCardTitle>
                    <AndamioCardDescription>
                      Select draft tasks to publish on-chain. Each task locks its reward amount in the treasury.
                    </AndamioCardDescription>
                  </div>
                  <AndamioCheckbox
                    checked={selectedTaskIndices.size === draftTasks.length && draftTasks.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all draft tasks"
                  />
                </div>
              </AndamioCardHeader>
              <AndamioCardContent className="space-y-4">
                <AndamioTableContainer>
                  <AndamioTable>
                    <AndamioTableHeader>
                      <AndamioTableRow>
                        <AndamioTableHead className="w-12"></AndamioTableHead>
                        <AndamioTableHead>Title</AndamioTableHead>
                        <AndamioTableHead className="hidden md:table-cell">Hash</AndamioTableHead>
                        <AndamioTableHead className="w-32 text-center">Reward</AndamioTableHead>
                      </AndamioTableRow>
                    </AndamioTableHeader>
                    <AndamioTableBody>
                      {draftTasks.map((task) => {
                        const taskIndex = task.index ?? 0;
                        const isSelected = selectedTaskIndices.has(taskIndex);
                        const isValid = task.title.length > 0 && task.title.length <= 140;

                        return (
                          <AndamioTableRow
                            key={task.taskHash || `draft-${taskIndex}`}
                            className={isSelected ? "bg-primary/5" : ""}
                          >
                            <AndamioTableCell>
                              <AndamioCheckbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleTask(taskIndex)}
                                disabled={!isValid}
                                aria-label={`Select task ${taskIndex}`}
                              />
                            </AndamioTableCell>
                            <AndamioTableCell>
                              <div>
                                <AndamioText as="div" className="font-medium">{task.title || "Untitled Task"}</AndamioText>
                                {!isValid && (
                                  <AndamioText variant="small" className="text-muted-foreground">
                                    Title required (max 140 chars) for on-chain content
                                  </AndamioText>
                                )}
                              </div>
                            </AndamioTableCell>
                            <AndamioTableCell className="hidden md:table-cell font-mono text-xs">
                              {task.taskHash ? `${task.taskHash.slice(0, 16)}...` : "-"}
                            </AndamioTableCell>
                            <AndamioTableCell className="text-center">
                              <XpBadge amount={getTaskXpReward(task)} />
                            </AndamioTableCell>
                          </AndamioTableRow>
                        );
                      })}
                    </AndamioTableBody>
                  </AndamioTable>
                </AndamioTableContainer>

                {(tasksToAdd.length > 0 || txInProgress === "add") && contributorStateId && (
                  <>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 space-y-3">
                      <AndamioText className="font-semibold text-base">Transaction Summary</AndamioText>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <AndamioText variant="small" className="text-sm text-muted-foreground">Publishing</AndamioText>
                          <AndamioText className="text-xl font-bold text-primary">
                            {tasksToAdd.length} {tasksToAdd.length !== 1 ? "tasks" : "task"}
                          </AndamioText>
                        </div>
                        <div className="space-y-1">
                          <AndamioText variant="small" className="text-sm text-muted-foreground">Total XP Rewards</AndamioText>
                          <AndamioText className="text-xl font-bold text-secondary">
                            {addXp.toLocaleString()} XP
                          </AndamioText>
                        </div>
                      </div>
                    </div>

                    <TasksManage
                      projectNftPolicyId={projectId}
                      contributorStateId={contributorStateId}
                      tasksToAdd={tasksToAdd}
                      tasksToRemove={[]}
                      depositValue={publishDepositValue}
                      taskCodes={taskCodes}
                      taskIndices={taskIndices}
                      onTxSubmit={() => setTxInProgress("add")}
                      onSuccess={async () => {
                        setTxInProgress(null);
                        setSelectedTaskIndices(new Set());
                        await refreshData();
                      }}
                    />
                  </>
                )}
              </AndamioCardContent>
            </AndamioCard>
          ) : (
            <AndamioEmptyState
              icon={TaskIcon}
              title="No Draft Tasks"
              description="All tasks have been published on-chain, or no tasks have been created yet."
            />
          )}
        </AndamioTabsContent>

        {/* REMOVE TAB */}
        <AndamioTabsContent value="remove" className="space-y-4">
          {onChainTasks.length > 0 ? (
            <AndamioCard className="border-destructive/20">
              <AndamioCardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <AndamioCardTitle className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                        <DeleteIcon className="h-4 w-4 text-destructive" />
                      </div>
                      Remove from Treasury
                    </AndamioCardTitle>
                    <AndamioCardDescription>
                      Select on-chain tasks to remove. Removed tasks return their locked reward to the treasury.
                    </AndamioCardDescription>
                  </div>
                  <AndamioCheckbox
                    checked={selectedOnChainTaskIds.size === onChainTasks.length && onChainTasks.length > 0}
                    onCheckedChange={handleSelectAllOnChain}
                    aria-label="Select all on-chain tasks"
                  />
                </div>
              </AndamioCardHeader>
              <AndamioCardContent className="space-y-4">
                <AndamioTableContainer>
                  <AndamioTable>
                    <AndamioTableHeader>
                      <AndamioTableRow>
                        <AndamioTableHead className="w-12"></AndamioTableHead>
                        <AndamioTableHead>Content</AndamioTableHead>
                        <AndamioTableHead className="hidden md:table-cell">Hash</AndamioTableHead>
                        <AndamioTableHead className="w-32 text-center">Reward</AndamioTableHead>
                        <AndamioTableHead className="hidden sm:table-cell w-32 text-center">Expires</AndamioTableHead>
                      </AndamioTableRow>
                    </AndamioTableHeader>
                    <AndamioTableBody>
                      {onChainTasks.map((task, mapIdx) => {
                        const taskHash = task.taskHash ?? "";
                        const isSelected = selectedOnChainTaskIds.has(taskHash);
                        const displayContent = task.title || (task.onChainContent ? hexToText(task.onChainContent) : "(empty content)");
                        const expirationMs = parseInt(task.expirationTime ?? "0") || 0;
                        const expirationDate = new Date(expirationMs < 946684800000 ? expirationMs * 1000 : expirationMs);

                        return (
                          <AndamioTableRow
                            key={`${taskHash || task.index}-${mapIdx}`}
                            className={isSelected ? "bg-destructive/5" : ""}
                          >
                            <AndamioTableCell>
                              <AndamioCheckbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleOnChainTask(taskHash)}
                                disabled={!taskHash}
                                aria-label={`Select task for removal`}
                              />
                            </AndamioTableCell>
                            <AndamioTableCell>
                              <AndamioText as="div" className="font-medium">
                                {displayContent}
                              </AndamioText>
                            </AndamioTableCell>
                            <AndamioTableCell className="hidden md:table-cell font-mono text-xs">
                              {taskHash ? `${taskHash.slice(0, 16)}...` : "-"}
                            </AndamioTableCell>
                            <AndamioTableCell className="text-center">
                              <XpBadge amount={getTaskXpReward(task)} />
                            </AndamioTableCell>
                            <AndamioTableCell className="hidden sm:table-cell text-center text-xs text-muted-foreground">
                              {expirationDate.toLocaleDateString()}
                            </AndamioTableCell>
                          </AndamioTableRow>
                        );
                      })}
                    </AndamioTableBody>
                  </AndamioTable>
                </AndamioTableContainer>

                {(tasksToRemove.length > 0 || txInProgress === "remove") && contributorStateId && (
                  <>
                    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1">
                      <div className="font-medium">Removal Summary</div>
                      <div className="text-destructive">
                        Removing {tasksToRemove.length} task{tasksToRemove.length !== 1 ? "s" : ""} (XP returned to treasury)
                      </div>
                    </div>

                    <TasksManage
                      projectNftPolicyId={projectId}
                      contributorStateId={contributorStateId}
                      tasksToAdd={[]}
                      tasksToRemove={tasksToRemove}
                      depositValue={[]}
                      taskCodes={[]}
                      taskIndices={[]}
                      onTxSubmit={() => setTxInProgress("remove")}
                      onSuccess={async () => {
                        setTxInProgress(null);
                        toast.success("Tasks removed successfully!");
                        setSelectedOnChainTaskIds(new Set());
                        await refreshData();
                      }}
                    />
                  </>
                )}
              </AndamioCardContent>
            </AndamioCard>
          ) : (
            <AndamioEmptyState
              icon={OnChainIcon}
              title="No On-Chain Tasks"
              description="No tasks are currently published on-chain."
            />
          )}
        </AndamioTabsContent>
      </AndamioTabs>

    </div>
    </div>
    </AndamioScrollArea>
  );
}
