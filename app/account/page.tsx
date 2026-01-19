import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChangePasswordForm from "../../components/ChangePasswordForm";

export default async function AccountPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/");
  }
  return <ChangePasswordForm />;
}
