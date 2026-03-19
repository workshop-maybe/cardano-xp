"use client";

import { useEffect } from "react";
import { AndamioAlert, AndamioAlertDescription, AndamioAlertTitle } from "~/components/andamio/andamio-alert";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioPageHeader } from "~/components/andamio";
import { AlertIcon, RefreshIcon } from "~/components/icons";

/**
 * Error boundary for the (admin) route group
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error boundary caught:", error);
  }, [error]);

  return (
    <div className="space-y-6 p-6">
      <AndamioPageHeader
        title="Something went wrong"
        description="An unexpected error occurred"
      />

      <AndamioAlert variant="destructive">
        <AlertIcon className="h-4 w-4" />
        <AndamioAlertTitle>Error</AndamioAlertTitle>
        <AndamioAlertDescription>
          {error.message || "An unexpected error occurred"}
          {error.digest && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </span>
          )}
        </AndamioAlertDescription>
      </AndamioAlert>

      <AndamioButton onClick={reset} variant="outline">
        <RefreshIcon className="h-4 w-4 mr-2" />
        Try again
      </AndamioButton>
    </div>
  );
}
