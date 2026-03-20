"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAndamioAuth } from "~/hooks/auth/use-andamio-auth";
import { StudioEditorPane } from "~/components/studio/studio-editor-pane";
import { ConnectWalletGate } from "~/components/auth/connect-wallet-gate";
import {
  AndamioResizablePanelGroup,
  AndamioResizablePanel,
  AndamioResizableHandle,
} from "~/components/andamio/andamio-resizable";
import { AndamioScrollArea } from "~/components/andamio/andamio-scroll-area";
import {
  CourseIcon,
  ProjectIcon,
  TreasuryIcon,
} from "~/components/icons";
import { cn } from "~/lib/utils";
import { ADMIN_ROUTES } from "~/config/routes";

// =============================================================================
// Admin Sidebar Layout — Single course, single project
// =============================================================================

export default function AdminSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated } = useAndamioAuth();

  // Wizard mode: editing a module — /admin/course/[moduleCode]
  // Exclude known static routes (teacher, manage-learners)
  const isWizardMode = useMemo(() => {
    const match = /\/admin\/course\/([^/]+)/.exec(pathname);
    if (!match) return false;
    const segment = match[1];
    if (segment === "teacher" || segment === "manage-learners") return false;
    return true;
  }, [pathname]);

  if (!isAuthenticated) {
    return (
      <StudioEditorPane padding="normal" className="min-h-[calc(100vh-40px-44px)]">
        <ConnectWalletGate
          title="Connect your wallet"
          description="Sign in to manage this project"
        />
      </StudioEditorPane>
    );
  }

  // Wizard mode: full-width, no sidebar
  if (isWizardMode) {
    return <>{children}</>;
  }

  const navItems = [
    {
      label: "Course",
      href: ADMIN_ROUTES.courseEditor,
      icon: CourseIcon,
      active: pathname.startsWith("/admin/course"),
    },
    {
      label: "Project",
      href: ADMIN_ROUTES.projectDashboard,
      icon: ProjectIcon,
      active: pathname.startsWith("/admin/project") && !pathname.startsWith("/admin/project/treasury"),
    },
    {
      label: "Treasury",
      href: ADMIN_ROUTES.treasury,
      icon: TreasuryIcon,
      active: pathname.startsWith("/admin/project/treasury"),
    },
  ];

  return (
    <AndamioResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left Panel: Static Nav */}
      <AndamioResizablePanel defaultSize={20} minSize={12} maxSize={30}>
        <AndamioScrollArea className="h-full">
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg border transition-all duration-150",
                  item.active
                    ? "bg-primary/10 border-primary/30 shadow-sm text-primary"
                    : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </AndamioScrollArea>
      </AndamioResizablePanel>

      <AndamioResizableHandle withHandle />

      {/* Right Panel: Page Content */}
      <AndamioResizablePanel defaultSize={80}>
        {children}
      </AndamioResizablePanel>
    </AndamioResizablePanelGroup>
  );
}
