"use client";

import { useEffect, useRef, useState } from "react";
import { AndamioButton } from "~/components/andamio/andamio-button";
import { AndamioText } from "~/components/andamio/andamio-text";
import { SuccessIcon, LoadingIcon, SecurityAlertIcon } from "~/components/icons";

/**
 * Waitlist signup for the future "post your own project" feature.
 *
 * Two visual variants share one submission flow:
 * - `inline` — collapsed by default, expands when the user clicks
 *   "Notify me" (used on the landing strip).
 * - `expanded` — form visible by default (used on /xp/activity).
 *
 * Successful submissions persist to sessionStorage so the form stays in
 * the success state for the rest of the browser session. Not a hard
 * dedup — clearing storage or using a new browser lets the user
 * re-submit, which is acceptable for a best-effort signal.
 */

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const SESSION_STORAGE_KEY = "xp_waitlist_submitted";

interface ProjectPostingWaitlistFormProps {
  variant?: "inline" | "expanded";
  /** Optional id suffix to avoid duplicate input ids when mounted twice on the same page. */
  idSuffix?: string;
}

export function ProjectPostingWaitlistForm({
  variant = "expanded",
  idSuffix = "",
}: ProjectPostingWaitlistFormProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const [isExpanded, setIsExpanded] = useState(variant === "expanded");

  // If the user already submitted in this session, start in success state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_STORAGE_KEY) === "1") {
      setState({ kind: "success" });
      setIsExpanded(true);
    }
  }, []);

  // Move keyboard focus to the email input when the inline form expands.
  useEffect(() => {
    if (isExpanded && state.kind === "idle" && variant === "inline") {
      emailRef.current?.focus();
    }
  }, [isExpanded, state.kind, variant]);

  const inputId = `waitlist-email${idSuffix ? `-${idSuffix}` : ""}`;
  const honeypotId = `waitlist-company${idSuffix ? `-${idSuffix}` : ""}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "submitting" });

    try {
      const res = await fetch("/api/project-posting-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailRef.current?.value ?? "",
          company: companyRef.current?.value ?? "",
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setState({
          kind: "error",
          message: data.error ?? "Couldn't save your email. Please try again.",
        });
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
      }
      setState({ kind: "success" });
    } catch {
      setState({
        kind: "error",
        message:
          "Network error. Please check your connection and try again.",
      });
    }
  }

  // ── Success state ──
  if (state.kind === "success") {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-start gap-3">
        <SuccessIcon className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
        <AndamioText variant="small" className="text-foreground">
          You&apos;re on the list — check your inbox for confirmation. We&apos;ll email
          you when project posting opens on Cardano XP.
        </AndamioText>
      </div>
    );
  }

  // ── Inline variant, collapsed ──
  if (variant === "inline" && !isExpanded) {
    return (
      <AndamioButton onClick={() => setIsExpanded(true)} size="sm">
        Notify me when project posting opens
      </AndamioButton>
    );
  }

  // ── Active form (expanded, idle / submitting / error) ──
  const isSubmitting = state.kind === "submitting";
  const inputClassName =
    "w-full bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          Notify me when project posting opens
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={emailRef}
            id={inputId}
            type="email"
            required
            disabled={isSubmitting}
            placeholder="you@example.com"
            aria-label="Your email address"
            className={inputClassName}
          />
          <AndamioButton
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="sm:w-auto w-full"
          >
            {isSubmitting ? (
              <>
                <LoadingIcon className="h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              "Notify me"
            )}
          </AndamioButton>
        </div>
      </div>

      {/* Honeypot — invisible to real users, bots fill it */}
      <div aria-hidden className="hidden" style={{ display: "none" }}>
        <label htmlFor={honeypotId}>Company (leave blank)</label>
        <input
          ref={companyRef}
          id={honeypotId}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.kind === "error" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
          <SecurityAlertIcon className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <AndamioText variant="small" className="text-destructive">
            {state.message}
          </AndamioText>
        </div>
      )}

      <AndamioText variant="muted" className="text-xs">
        Your email is used only to notify you when project posting launches.
        Email <span className="font-mono">james@andamio.io</span> to request
        deletion.
      </AndamioText>
    </form>
  );
}
