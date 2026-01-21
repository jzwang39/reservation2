"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/AppShell";

type ReservationRow = {
  id: number;
  reservation_no: string;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: "booked" | "cancelled";
  container_no: string;
  packing_list_path: string;
  cancel_reason: string | null;
  created_at: string;
  display_name: string;
  company_name: string | null;
  phone: string | null;
};

type ClientRow = {
  id: number;
  username: string;
  display_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

type ClosedSlotRow = {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  status: "closed" | "opened";
  created_by: number;
  opened_reason: string | null;
  created_at: string;
  opened_at: string | null;
};

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRange() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  return { startDate: toDateString(start), endDate: toDateString(end) };
}

export default function OperatorTabs() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<
    "reservations" | "closedSlots" | "clients"
  >("reservations");
  const title = lang === "zh" ? "运营人员工作台" : "Operator Dashboard";
  const reservationsTabLabel =
    lang === "zh" ? "预约列表" : "Reservations";
  const closedSlotsTabLabel =
    lang === "zh" ? "关闭时段列表" : "Closed slots";
  const clientsTabLabel = lang === "zh" ? "客户列表" : "Clients";

  return (
    <div className="w-full max-w-5xl bg-white shadow-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xl font-semibold text-klein">
          {title}
        </div>
      </div>
      <div className="border-b border-slate-200 mb-4 flex gap-4">
        <button
          className={`pb-2 text-sm font-medium ${
            tab === "reservations"
              ? "text-klein border-b-2 border-klein"
              : "text-slate-500"
          }`}
          onClick={() => setTab("reservations")}
        >
          {reservationsTabLabel}
        </button>
        <button
          className={`pb-2 text-sm font-medium ${
            tab === "closedSlots"
              ? "text-klein border-b-2 border-klein"
              : "text-slate-500"
          }`}
          onClick={() => setTab("closedSlots")}
        >
          {closedSlotsTabLabel}
        </button>
        <button
          className={`pb-2 text-sm font-medium ${
            tab === "clients"
              ? "text-klein border-b-2 border-klein"
              : "text-slate-500"
          }`}
          onClick={() => setTab("clients")}
        >
          {clientsTabLabel}
        </button>
      </div>
      {tab === "reservations" ? (
        <ReservationListTab />
      ) : tab === "closedSlots" ? (
        <ClosedSlotsTab />
      ) : (
        <ClientListTab />
      )}
    </div>
  );
}

function ReservationListTab() {
  const { lang } = useLanguage();
  const [{ startDate, endDate }] = useState(() => getRange());
  const [items, setItems] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const url = `/api/operator/reservations?start=${startDate}&end=${endDate}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = (await response.json()) as {
          reservations: ReservationRow[];
        };
        setItems(json.reservations);
      }
      setLoading(false);
    }
    load();
  }, [startDate, endDate]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        {lang === "zh"
          ? "查看从明天开始两周内的预约记录，按日期和时间排序。"
          : "View reservation records for the next two weeks starting tomorrow, sorted by date and time."}
      </div>
      {loading && (
        <div className="text-sm text-slate-500">
          {lang === "zh" ? "加载中..." : "Loading..."}
        </div>
      )}
      <div className="border border-slate-200 rounded-md overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "单号" : "No."}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "日期" : "Date"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "时间段" : "Time"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "客户" : "Client"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "联系电话" : "Phone"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "公司" : "Company"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "柜号" : "Container No."}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "装箱单文件" : "Packing list"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "状态" : "Status"}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td
                  className="px-3 py-3 text-center text-slate-400"
                  colSpan={9}
                >
                  {lang === "zh" ? "暂无预约记录。" : "No reservation records."}
                </td>
              </tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {item.reservation_no}
                </td>
                <td className="px-3 py-2">
                  {item.date}
                </td>
                <td className="px-3 py-2">
                  {item.start_time}–{item.end_time}
                </td>
                <td className="px-3 py-2">
                  {item.display_name}
                </td>
                <td className="px-3 py-2">
                  {item.phone || "—"}
                </td>
                <td className="px-3 py-2">
                  {item.company_name || "—"}
                </td>
                <td className="px-3 py-2">
                  {item.container_no}
                </td>
                <td className="px-3 py-2">
                  {item.packing_list_path ? (
                    <div className="flex items-center gap-2">
                      <span>
                        {item.packing_list_path.split("/").pop()}
                      </span>
                      <a
                        href={`/api/operator/reservations/${item.id}/packing-list`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-klein text-klein text-xs px-2 py-1 hover:bg-klein hover:text-white"
                      >
                        {lang === "zh" ? "查看" : "View"}
                      </a>
                    </div>
                  ) : lang === "zh" ? (
                    "无"
                  ) : (
                    "None"
                  )}
                </td>
                <td className="px-3 py-2">
                  {item.status === "booked"
                    ? lang === "zh"
                      ? "已预约"
                      : "Booked"
                    : lang === "zh"
                    ? "已取消"
                    : "Cancelled"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientListTab() {
  const { lang } = useLanguage();
  const [items, setItems] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
   const [showForm, setShowForm] = useState(false);
   const [username, setUsername] = useState("");
   const [displayName, setDisplayName] = useState("");
   const [companyName, setCompanyName] = useState("");
   const [phone, setPhone] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch("/api/operator/clients");
      if (response.ok) {
        const json = (await response.json()) as {
          clients: ClientRow[];
        };
        setItems(json.clients);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate() {
    setError(null);
    if (!username.trim() || !displayName.trim() || !password) {
      setError(
        lang === "zh"
          ? "请填写客户名、登录名和登录密码。"
          : "Please fill client name, login name and password."
      );
      return;
    }
    if (password.length < 8) {
      setError(
        lang === "zh"
          ? "登录密码长度至少 8 位。"
          : "Password must be at least 8 characters."
      );
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/operator/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          company_name: companyName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          password
        })
      });
      if (response.ok) {
        const created = (await response.json()) as ClientRow;
        setItems(prev => [created, ...prev]);
        setShowForm(false);
        setUsername("");
        setDisplayName("");
        setCompanyName("");
        setPhone("");
        setEmail("");
        setPassword("");
      } else {
        const text = await response.text();
        setError(
          text ||
            (lang === "zh"
              ? "创建客户失败。"
              : "Failed to create client.")
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {lang === "zh"
            ? "查看所有客户账号及其公司信息，供运营跟进。"
            : "View all client accounts and company information for operations follow-up."}
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md bg-klein text-white text-sm px-3 py-1.5 hover:bg-klein/90"
          onClick={() => {
            setShowForm(true);
            setError(null);
          }}
        >
          {lang === "zh" ? "添加客户" : "Add client"}
        </button>
      </div>
      {loading && (
        <div className="text-sm text-slate-500">
          {lang === "zh" ? "加载中..." : "Loading..."}
        </div>
      )}
      <div className="border border-slate-200 rounded-md overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "客户名" : "Client name"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "公司" : "Company"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "电话" : "Phone"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "邮箱" : "Email"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "创建时间" : "Created at"}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td
                  className="px-3 py-3 text-center text-slate-400"
                  colSpan={5}
                >
                  {lang === "zh" ? "暂无客户数据。" : "No client data."}
                </td>
              </tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {item.display_name || item.username}
                </td>
                <td className="px-3 py-2">
                  {item.company_name || "—"}
                </td>
                <td className="px-3 py-2">
                  {item.phone || "—"}
                </td>
                <td className="px-3 py-2">
                  {item.email || "—"}
                </td>
                <td className="px-3 py-2">
                  {item.created_at}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <div className="text-lg font-semibold text-klein">
              {lang === "zh" ? "添加客户" : "Add client"}
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh" ? "登录名（用户名）" : "Login name (username)"}
                </span>
                <input
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={username}
                  onChange={event => {
                    const value = event.target.value;
                    setUsername(value);
                    setDisplayName(value);
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh" ? "客户名" : "Client name"}
                </span>
                <input
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={displayName}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh" ? "公司" : "Company"}
                </span>
                <input
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={companyName}
                  onChange={event => setCompanyName(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh" ? "电话" : "Phone"}
                </span>
                <input
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh" ? "邮箱" : "Email"}
                </span>
                <input
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh" ? "登录密码" : "Login password"}
                </span>
                <input
                  type="password"
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                />
              </div>
              {error && (
                <div className="text-xs text-red-600">
                  {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
              >
                {lang === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-klein text-white hover:bg-klein/90 disabled:opacity-60"
                onClick={handleCreate}
                disabled={submitting}
              >
                {lang === "zh" ? "确认" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClosedSlotsTab() {
  const { lang } = useLanguage();
  const [items, setItems] = useState<ClosedSlotRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await fetch("/api/operator/closed-slots");
      if (response.ok) {
        const json = (await response.json()) as { items: ClosedSlotRow[] };
        setItems(json.items);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        {lang === "zh"
          ? "查看管理员设置的当前关闭及历史关闭时间段，仅用于参考。"
          : "View current and historical closed time slots set by admin for reference."}
      </div>
      {loading && (
        <div className="text-sm text-slate-500">
          {lang === "zh" ? "加载中..." : "Loading..."}
        </div>
      )}
      <div className="border border-slate-200 rounded-md max-h-96 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "日期" : "Date"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "时间段" : "Time"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "状态" : "Status"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "关闭原因" : "Reason"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "关闭时间" : "Closed at"}
              </th>
              <th className="px-3 py-2 text-left text-slate-500">
                {lang === "zh" ? "打开时间" : "Opened at"}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td
                  className="px-3 py-3 text-center text-slate-400"
                  colSpan={6}
                >
                  {lang === "zh" ? "暂无关闭记录。" : "No closed records."}
                </td>
              </tr>
            )}
            {items.map(item => {
              const slotLabel =
                item.start_time && item.end_time
                  ? `${item.start_time}–${item.end_time}`
                  : lang === "zh"
                  ? "全天"
                  : "All day";
              const statusLabel =
                item.status === "closed"
                  ? lang === "zh"
                    ? "已关闭"
                    : "Closed"
                  : lang === "zh"
                  ? "可预约"
                  : "Available";
              return (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{item.date}</td>
                  <td className="px-3 py-2">{slotLabel}</td>
                  <td className="px-3 py-2">{statusLabel}</td>
                  <td className="px-3 py-2">{item.reason}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {item.created_at}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {item.opened_at || (lang === "zh" ? "—" : "—")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
