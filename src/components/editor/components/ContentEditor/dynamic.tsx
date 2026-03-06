import dynamic from "next/dynamic";
import type { ContentEditorProps } from "./index";

/**
 * Dynamically-loaded ContentEditor — SSR disabled.
 *
 * Use this in read-only or deferred-render contexts where TipTap
 * doesn't need to be in the initial JS bundle. For editing contexts
 * where the user types immediately, import ContentEditor directly.
 */
const ContentEditorDynamic = dynamic<ContentEditorProps>(
  () => import("./index").then((mod) => mod.ContentEditor),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <div className="h-11 bg-muted/50 rounded-lg animate-pulse" />
        <div className="rounded-xl border border-border bg-background p-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted/50 rounded w-3/4" />
            <div className="h-4 bg-muted/50 rounded w-full" />
            <div className="h-4 bg-muted/50 rounded w-5/6" />
            <div className="h-4 bg-muted/50 rounded w-2/3" />
          </div>
        </div>
      </div>
    ),
  },
);

export { ContentEditorDynamic };
export default ContentEditorDynamic;
