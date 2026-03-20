---
name: tx-challenge
description: Learn the Andamio TX state machine by building — four progressive challenges from status display to full transaction flow.
---

# TX Challenge

Learn Cardano transactions by building. Four challenges, each teaching a core concept.

## Prerequisites

Before starting, verify the developer has:
- Dev server running (`npm run dev`)
- Wallet extension installed (Nami, Eternl, etc.)
- Read `/transactions` for conceptual background (optional but helpful)

## The Challenges

```
┌─────────────────────────────────────────────────────────────────┐
│  CHALLENGE 1        CHALLENGE 2        CHALLENGE 3        CHALLENGE 4  │
│  ────────────       ────────────       ────────────       ────────────  │
│  Status Display  →  Build TX Button →  Fix the Bug     →  Production   │
│                                                             Ready       │
│  "What state       "Make it           "Why is data       "Handle       │
│   am I in?"         actually work"     always stale?"     everything"  │
└─────────────────────────────────────────────────────────────────┘
```

## Instructions

### Setup: Create the Scratch File

Create a scratch file for the challenges:

```typescript
// src/app/(app)/tx-challenge/page.tsx
```

Start with this skeleton:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function TxChallengePage() {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">TX Challenge</h1>

      {/* Challenges go here */}
    </div>
  );
}
```

Tell the developer to open http://localhost:3000/tx-challenge to see their work.

---

## Challenge 1: Status Display

**Goal**: Display a transaction's current state with proper terminal detection.

**The Task**:

Build a component that:
1. Takes a `txHash` prop
2. Uses `useTxStream` to get real-time status
3. Shows the current state with appropriate styling
4. Indicates whether the state is terminal

**Starter Code** (give this to the developer):

```tsx
// Add to page.tsx

function Challenge1() {
  // Hardcode a test hash for now (or use a real one from a past TX)
  const testHash = "abc123"; // Replace with real hash if available

  return (
    <Card>
      <CardHeader>
        <CardTitle>Challenge 1: Status Display</CardTitle>
      </CardHeader>
      <CardContent>
        {/* YOUR CODE HERE */}
        {/* 1. Import and use useTxStream */}
        {/* 2. Display the current state */}
        {/* 3. Show "Terminal" or "In Progress" based on state */}
        {/* 4. Use appropriate colors (green for success, red for failed) */}
      </CardContent>
    </Card>
  );
}
```

**Success Criteria**:

Ask them: "Which states are terminal?" They should answer: `updated`, `failed`, `expired`.

If they say `confirmed` is terminal, they've fallen into the trap. Explain:

> "confirmed" means on-chain, but the Gateway hasn't updated the database yet.
> If you fetch data at "confirmed", you'll get stale results.
> Wait for "updated" — that's when the DB is ready.

**Solution** (only show if stuck):

```tsx
import { useTxStream } from "~/hooks/tx/use-tx-stream";

function Challenge1() {
  const testHash = "abc123";
  const { status, isSuccess, isFailed, isTerminal } = useTxStream(testHash);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Challenge 1: Status Display</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono">{status?.state ?? "unknown"}</span>
          <span className={isTerminal ? "text-muted-foreground" : "text-primary"}>
            {isTerminal ? "(Terminal)" : "(In Progress)"}
          </span>
        </div>
        {isSuccess && <p className="text-green-600">Transaction complete!</p>}
        {isFailed && <p className="text-destructive">Transaction failed</p>}
      </CardContent>
    </Card>
  );
}
```

---

## Challenge 2: Build a TX Button

**Goal**: Create a button that executes a real transaction.

**The Task**:

Build a "Refresh Session" button that:
1. Calls the session refresh endpoint (simple, no on-chain TX needed)
2. Shows loading state while pending
3. Shows success/error feedback

This introduces the pattern without needing wallet signing.

**Starter Code**:

```tsx
function Challenge2() {
  // YOUR CODE HERE
  // 1. Create state for loading and result
  // 2. Call POST /api/gateway/api/v2/auth/session/refresh on click
  // 3. Show loading spinner while fetching
  // 4. Display success or error message

  return (
    <Card>
      <CardHeader>
        <CardTitle>Challenge 2: API Call Button</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your button and feedback UI here */}
      </CardContent>
    </Card>
  );
}
```

**Hint**: Use `fetch` directly — no special hooks needed for this one.

**Success Criteria**:

The button should:
- Disable while loading
- Show a spinner or "Loading..." text
- Display the response (success or error message)

---

## Challenge 3: Fix the Bug

**Goal**: Find and fix a transaction timing bug.

**The Task**:

This code has a bug that causes stale data. Find it and fix it.

**Buggy Code** (give this to the developer):

```tsx
import { useTxStream } from "~/hooks/tx/use-tx-stream";
import { api } from "~/trpc/react";

function Challenge3() {
  const [txHash, setTxHash] = useState<string | null>(null);
  const { status } = useTxStream(txHash);

  // Fetch user's courses
  const { data: courses, refetch } = api.course.list.useQuery();

  // Simulate a course enrollment TX
  const handleEnroll = async () => {
    // ... TX building and signing code ...
    const hash = "simulated-hash-123";
    setTxHash(hash);
  };

  // BUG IS HERE - can you spot it?
  useEffect(() => {
    if (status?.state === "confirmed") {
      console.log("TX confirmed! Fetching fresh data...");
      void refetch();
    }
  }, [status?.state, refetch]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Challenge 3: Fix the Bug</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Status: {status?.state ?? "none"}</p>
        <p>Courses: {courses?.length ?? 0}</p>
        <p className="text-sm text-muted-foreground">
          After enrollment, the course count should increase. But it doesn't update correctly...
        </p>
      </CardContent>
    </Card>
  );
}
```

**The Bug**:

They're refetching on `"confirmed"` instead of `"updated"`.

**Why It Matters**:

> The blockchain confirms in ~20 seconds, but the Gateway needs another ~30 seconds
> to process the TX and update the database. Fetching at "confirmed" returns
> pre-transaction data.

**The Fix**:

```tsx
useEffect(() => {
  if (status?.state === "updated") {  // Changed from "confirmed"
    console.log("DB updated! Fetching fresh data...");
    void refetch();
  }
}, [status?.state, refetch]);
```

**Bonus Question**: Ask them what happens if they need to handle both success AND failure. Answer: check for `isTerminal` and then branch on `isSuccess` vs `isFailed`.

---

## Challenge 4: Production-Ready TX

**Goal**: Build a complete transaction flow with all edge cases handled.

**The Task**:

Build a "Mint Test Token" button (simulated) that:
1. Shows a confirmation dialog before proceeding
2. Displays wallet connection status
3. Handles the full state machine (pending → confirmed → updated)
4. Shows appropriate UI for each state
5. Handles errors gracefully
6. Allows retry on failure

**Requirements Checklist**:

```
[ ] Confirmation before TX
[ ] Loading state while building TX
[ ] "Sign in wallet" prompt
[ ] Pending state with spinner
[ ] Confirmed state (but NOT triggering data refresh yet!)
[ ] Updated state → success message + data refresh
[ ] Failed state → error message + retry button
[ ] Expired state → "TX timed out" + rebuild option
```

**Skeleton**:

```tsx
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { useTxStream } from "~/hooks/tx/use-tx-stream";
import { useWallet } from "@meshsdk/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

function Challenge4() {
  const { connected } = useWallet();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const { status, isSuccess, isFailed, isTerminal } = useTxStream(txHash);

  const handleMint = async () => {
    // YOUR CODE HERE
    // 1. Set building state
    // 2. Build TX (simulated for this challenge)
    // 3. Sign with wallet
    // 4. Submit and register
    // 5. Set txHash to start watching
  };

  const handleRetry = () => {
    setTxHash(null);
    // Reset and try again
  };

  // YOUR CODE HERE
  // Build the complete UI with all states handled

  return (
    <Card>
      <CardHeader>
        <CardTitle>Challenge 4: Production-Ready TX</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your complete TX UI here */}
      </CardContent>
    </Card>
  );
}
```

**Evaluation**:

When they think they're done, ask these questions:

1. "What happens if the user closes the browser after signing but before 'updated'?"
   - Answer: TX continues on-chain. On reload, they should check for pending TXs.

2. "What if the wallet disconnects mid-transaction?"
   - Answer: TX still submits if already signed. UI should handle reconnection gracefully.

3. "How would you persist TX state across page refreshes?"
   - Answer: Use `localStorage` or the `tx-watcher-store` which persists pending TXs.

---

## Completion

When all four challenges are done:

```
Congratulations! You've learned:

✓ TX states and terminal detection
✓ The "confirmed vs updated" timing trap
✓ Building transaction UIs with proper state handling
✓ Error handling and retry patterns

Next steps:
- Read the actual TX hooks: src/hooks/tx/
- Study a real implementation: src/app/(app)/project/[projectid]/[taskhash]/page.tsx
- Run the e2e tests: npm run test:e2e -- --grep "task-commitment"
```

**Cleanup**:

Optionally remove the scratch file:

```bash
rm -rf src/app/\(app\)/tx-challenge
```

Or keep it as a reference!

---

## Tips for the Agent

1. **Let them struggle** — Don't give solutions immediately. The "confirmed" bug is the key learning moment.

2. **Use real hashes if available** — If they've done transactions before, use a real hash from their history for Challenge 1.

3. **Celebrate the "aha" moment** — When they realize "confirmed" isn't terminal, that's the breakthrough. Reinforce it.

4. **Skip challenges if appropriate** — If they already know the basics, jump to Challenge 3 or 4.

5. **Connect to real code** — After each challenge, show them where this pattern exists in the actual codebase.

---

**Last Updated**: March 2026
