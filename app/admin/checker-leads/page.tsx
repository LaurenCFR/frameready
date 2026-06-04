import { redirect } from "next/navigation";
import CheckerLeadsPage from "@/components/admin/CheckerLeadsPage";
import { requireAdminSession } from "@/lib/admin-auth";

export default async function AdminCheckerLeadsPage() {
  const session = await requireAdminSession();

  if (!session.authenticated) {
    redirect("/admin");
  }

  return <CheckerLeadsPage />;
}
