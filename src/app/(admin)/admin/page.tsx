import { redirect } from "next/navigation";
import { ADMIN_ROUTES } from "~/config/routes";

/**
 * Admin hub — redirects to the course editor.
 */
export default function AdminPage() {
  redirect(ADMIN_ROUTES.courseEditor);
}
