"use client";

import { signIn } from "next-auth/react";
import { ChangeEvent, FormEvent, useState } from "react";
import { useLanguage } from "@/components/AppShell";

export default function SignInForm() {
  const { lang } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title =
    lang === "zh" ? "大道会员仓送仓预约系统登录" : "Sign in to Right Way Warehouse System";
  const usernameLabel = lang === "zh" ? "用户名" : "Username";
  const passwordLabel = lang === "zh" ? "密码" : "Password";
  const buttonLabel = loading
    ? lang === "zh"
      ? "登录中..."
      : "Signing in..."
    : lang === "zh"
    ? "登录"
    : "Sign in";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await signIn("credentials", {
        redirect: true,
        callbackUrl: "/",
        username,
        password
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white shadow-sm rounded-lg p-8">
      <h1 className="text-2xl font-semibold text-center text-klein mb-6">
        {title}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {usernameLabel}
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-klein"
            value={username}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setUsername(event.target.value)
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {passwordLabel}
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-klein"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setPassword(event.target.value)
            }
          />
        </div>
        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-klein text-white font-medium hover:bg-klein/90 disabled:opacity-60"
        >
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}
