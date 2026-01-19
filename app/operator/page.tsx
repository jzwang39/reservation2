import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OperatorTabs from "@/components/OperatorTabs";

export default async function OperatorHome() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "operator") {
    redirect("/");
  }
  return <OperatorTabs />;
}
