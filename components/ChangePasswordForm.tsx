"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/components/AppShell";

export default function ChangePasswordForm() {
  const { lang } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = lang === "zh" ? "修改密码" : "Change password";
  const currentLabel = lang === "zh" ? "当前密码" : "Current password";
  const newLabel = lang === "zh" ? "新密码" : "New password";
  const confirmLabel = lang === "zh" ? "确认新密码" : "Confirm new password";
  const submitLabel = lang === "zh" ? "保存" : "Save";
  const successText =
    lang === "zh" ? "密码已更新。" : "Password has been updated.";
  const mismatchText =
    lang === "zh" ? "两次新密码不一致。" : "Passwords do not match.";
  const tooShortText =
    lang === "zh"
      ? "新密码长度至少 8 位。"
      : "New password must be at least 8 characters.";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(mismatchText);
      return;
    }
    if (newPassword.length < 8) {
      setError(tooShortText);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      if (response.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage(successText);
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      } else {
        const text = await response.text();
        setError(text || "Error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white shadow-sm rounded-lg p-8">
      <h1 className="text-xl font-semibold text-center text-klein mb-6">
        {title}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {currentLabel}
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-klein"
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {newLabel}
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-klein"
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {confirmLabel}
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-klein"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
          />
        </div>
        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}
        {message && (
          <div className="text-sm text-emerald-600">
            {message}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 h-10 rounded-md bg-klein text-white font-medium hover:bg-klein/90 disabled:opacity-60"
          >
            {submitLabel}
          </button>
          <button
            type="button"
            className="flex-1 h-10 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.history.back();
              }
            }}
          >
            {lang === "zh" ? "取消" : "Cancel"}
          </button>
        </div>
      </form>
    </div>
  );
}
