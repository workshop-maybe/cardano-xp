import { redirect } from "next/navigation";
import { CARDANO_XP } from "~/config";

export default function CoursePage() {
  redirect(CARDANO_XP.routes.course);
}
