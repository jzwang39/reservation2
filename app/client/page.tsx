import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientTabs from "@/components/ClientTabs";

export default async function ClientHome() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "client") {
    redirect("/");
  }
  return <ClientTabs />;
}
