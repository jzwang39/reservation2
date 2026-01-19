import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminTabs from "@/components/AdminTabs";

export default async function AdminHome() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "admin") {
    redirect("/");
  }
  return <AdminTabs />;
}
