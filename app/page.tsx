import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";

export default async function Page() {
  const session = await auth();
  if (session?.user?.role === "client") {
    redirect("/client");
  }
  if (session?.user?.role === "admin") {
    redirect("/admin");
  }
  if (session?.user?.role === "operator") {
    redirect("/operator");
  }
  return <SignInForm />;
}

