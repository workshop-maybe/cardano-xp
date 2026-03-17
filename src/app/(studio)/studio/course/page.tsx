import { redirect } from "next/navigation";
import { STUDIO_ROUTES } from "~/config/routes";

/**
 * Redirect /studio/course to /studio
 * The unified studio page now handles both courses and projects.
 */
export default function StudioCourseRedirect() {
  redirect(STUDIO_ROUTES.hub);
}
