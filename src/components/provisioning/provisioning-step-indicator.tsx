"use client";

import React from "react";
import { CompletedIcon, LoadingIcon, NeutralIcon, AlertIcon } from "~/components/icons";
import { cn } from "~/lib/utils";
import type { ProvisioningStep, ProvisioningEntityType } from "./types";
import { PROVISIONING_DISPLAY } from "./types";

interface ProvisioningStepIndicatorProps {
  entityType: ProvisioningEntityType;
  currentStep: ProvisioningStep;
  className?: string;
}

type StepConfig = {
  id: ProvisioningStep;
  label: string;
};

/**
 * Get step configurations for an entity type
 */
function getSteps(entityType: ProvisioningEntityType): StepConfig[] {
  const display = PROVISIONING_DISPLAY[entityType];
  return [
    { id: "submitted", label: display.steps.submitted },
    { id: "confirming", label: display.steps.confirming },
    { id: "ready", label: display.steps.ready },
  ];
}

/**
 * Determine step status based on current step
 */
function getStepStatus(
  stepId: ProvisioningStep,
  currentStep: ProvisioningStep
): "completed" | "current" | "pending" | "error" {
  if (currentStep === "error") {
    if (stepId === "submitted") return "completed";
    if (stepId === "confirming") return "error";
    return "pending";
  }

  const order: ProvisioningStep[] = ["submitted", "confirming", "ready"];
  const currentIndex = order.indexOf(currentStep);
  const stepIndex = order.indexOf(stepId);

  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "pending";
}

/**
 * ProvisioningStepIndicator
 *
 * Visual progress indicator for the provisioning process.
 * Shows three steps: submitted → confirming → ready
 */
export function ProvisioningStepIndicator({
  entityType,
  currentStep,
  className,
}: ProvisioningStepIndicatorProps) {
  const steps = getSteps(entityType);

  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => {
        const status = getStepStatus(step.id, currentStep);
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-4 top-9 w-0.5 h-5 transition-colors duration-200",
                  status === "completed" ? "bg-primary" : "bg-border"
                )}
              />
            )}

            <div className="flex items-center gap-4">
              {/* Step indicator */}
              <StepIcon status={status} />

              {/* Step label */}
              <span
                className={cn(
                  "text-sm font-medium transition-colors duration-150",
                  status === "completed" && "text-primary",
                  status === "current" && "text-foreground",
                  status === "pending" && "text-muted-foreground",
                  status === "error" && "text-destructive"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Step icon with CSS transition states
 */
function StepIcon({
  status,
}: {
  status: "completed" | "current" | "pending" | "error";
}) {
  const baseClasses =
    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200";

  if (status === "completed") {
    return (
      <div className={cn(baseClasses, "bg-primary text-primary-foreground")}>
        <CompletedIcon className="h-4 w-4" />
      </div>
    );
  }

  if (status === "current") {
    return (
      <div className={cn(baseClasses, "bg-primary text-primary-foreground")}>
        <LoadingIcon className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={cn(baseClasses, "bg-destructive text-destructive-foreground")}>
        <AlertIcon className="h-4 w-4" />
      </div>
    );
  }

  // pending
  return (
    <div className={cn(baseClasses, "bg-muted text-muted-foreground")}>
      <NeutralIcon className="h-4 w-4" />
    </div>
  );
}
