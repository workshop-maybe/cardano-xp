import { redirect } from "next/navigation";
import { STUDIO_ROUTES } from "~/config/routes";

/**
 * Studio hub — redirects to the single course editor.
 */
export default function StudioPage() {
  redirect(STUDIO_ROUTES.courseEditor);
}
