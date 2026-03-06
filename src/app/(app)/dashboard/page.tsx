import { redirect } from "next/navigation";
import { CARDANO_XP } from "~/config";

export default function DashboardPage() {
  redirect(CARDANO_XP.routes.course);
}
