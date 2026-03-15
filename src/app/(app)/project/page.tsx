import { redirect } from "next/navigation";
import { CARDANO_XP } from "~/config";

export default function ProjectPage() {
  redirect(CARDANO_XP.routes.project);
}
