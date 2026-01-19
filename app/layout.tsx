import "./globals.css";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { auth } from "@/lib/auth";

type Props = {
  children: ReactNode;
};

export const metadata = {
  title: "仓库预约系统",
  description: "仓库预约系统登录"
};

export default async function RootLayout({ children }: Props) {
  const session = await auth();
  const role = session?.user?.role;
  let initialLang: "zh" | "en" = "zh";
  if (!session || !session.user) {
    initialLang = "en";
  } else if (role === "client") {
    initialLang = "en";
  }
  return (
    <html lang={initialLang}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AppShell initialLang={initialLang}>{children}</AppShell>
      </body>
    </html>
  );
}
