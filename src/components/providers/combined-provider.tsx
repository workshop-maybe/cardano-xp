"use client";

import { type ReactNode, useState, useEffect, type ComponentType } from "react";

/**
 * CombinedProvider — parallel-loads MeshProvider + AuthProvider
 *
 * Fires both dynamic imports concurrently via Promise.all, then renders
 * them in the correct nesting order (Mesh wraps Auth) once both resolve.
 * This collapses the serial two-tick waterfall into a single tick.
 *
 * AuthProvider must be inside MeshProvider because AndamioAuthProvider
 * calls useWallet() from @meshsdk/react.
 */
export function CombinedProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<{
    Mesh: ComponentType<{ children: ReactNode }>;
    Auth: ComponentType<{ children: ReactNode }>;
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      import("@meshsdk/react"),
      import("~/contexts/andamio-auth-context"),
    ]).then(([meshMod, authMod]) => {
      setProviders({
        Mesh: meshMod.MeshProvider,
        Auth: authMod.AndamioAuthProvider,
      });
    });
  }, []);

  if (!providers) {
    return <>{children}</>;
  }

  const { Mesh, Auth } = providers;

  return (
    <Mesh>
      <Auth>{children}</Auth>
    </Mesh>
  );
}
