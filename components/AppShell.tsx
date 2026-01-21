"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

type Lang = "zh" | "en";

type LanguageContextValue = {
  lang: Lang;
  setLang: (value: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useLanguage must be used within AppShell");
  }
  return value;
}

type Props = {
  children: ReactNode;
  initialLang?: Lang;
};

export default function AppShell({ children, initialLang = "zh" }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("reservation_lang");
    if (stored === "zh" || stored === "en") {
      setLang(stored);
    } else {
      setLang(initialLang);
    }
  }, [initialLang]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("reservation_lang", lang);
  }, [lang]);

  const title =
    lang === "zh" ? "大道会员仓送仓预约系统" : "Right Way Warehouse Reservation System";
  const logoutLabel = lang === "zh" ? "退出登录" : "Sign out";
  const accountLabel = lang === "zh" ? "修改密码" : "Change password";
  const langLabel = lang === "zh" ? "EN" : "中";

  async function handleLogout() {
    await signOut({
      callbackUrl: "/"
    });
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="text-base font-semibold text-klein">
              {title}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setLang(lang === "zh" ? "en" : "zh")}
              >
                {langLabel}
              </button>
              <Link
                href="/account"
                className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {accountLabel}
              </Link>
              <button
                type="button"
                className="px-3 py-1 rounded-full bg-klein text-white hover:bg-klein/90"
                onClick={handleLogout}
              >
                {logoutLabel}
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8 flex justify-center">
          {children}
        </main>
      </div>
    </LanguageContext.Provider>
  );
}
