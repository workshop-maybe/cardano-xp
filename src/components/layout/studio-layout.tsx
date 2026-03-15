"use client";

import React, { useState, useCallback } from "react";
import { AuthStatusBar } from "./auth-status-bar";
import { AppNavBar } from "./app-nav-bar";
import {
  StudioHeader,
  StudioHeaderContext,
  type StudioHeaderContextValue,
} from "./studio-header";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface StudioLayoutProps {
  children: React.ReactNode;
  initialBreadcrumbs?: BreadcrumbItem[];
  initialTitle?: string;
  initialStatus?: string;
  initialStatusVariant?: "default" | "secondary" | "destructive" | "outline";
  initialActions?: React.ReactNode;
}

/**
 * Focused full-screen layout for studio/content creation.
 * Uses AppNavBar (top nav) instead of sidebar.
 */
export function StudioLayout({
  children,
  initialBreadcrumbs,
  initialTitle,
  initialStatus,
  initialStatusVariant = "secondary",
  initialActions,
}: StudioLayoutProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[] | undefined>(
    initialBreadcrumbs
  );
  const [title, setTitle] = useState<string | undefined>(initialTitle);
  const [status, setStatusState] = useState<string | undefined>(initialStatus);
  const [statusVariant, setStatusVariant] = useState<
    "default" | "secondary" | "destructive" | "outline"
  >(initialStatusVariant);
  const [actions, setActions] = useState<React.ReactNode>(initialActions);

  const setStatus = useCallback(
    (
      newStatus: string,
      variant: "default" | "secondary" | "destructive" | "outline" = "secondary"
    ) => {
      setStatusState(newStatus);
      setStatusVariant(variant);
    },
    []
  );

  const contextValue: StudioHeaderContextValue = {
    setBreadcrumbs,
    setTitle,
    setStatus,
    setActions,
  };

  return (
    <StudioHeaderContext.Provider value={contextValue}>
      <div className="flex h-screen w-full flex-col overflow-hidden overscroll-none bg-background">
        <AuthStatusBar />
        <AppNavBar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <StudioHeader
            breadcrumbs={breadcrumbs}
            title={title}
            status={status}
            statusVariant={statusVariant}
            actions={actions}
          />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </StudioHeaderContext.Provider>
  );
}
