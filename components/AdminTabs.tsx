"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/AppShell";

type SlotStatus =
  | "available"
  | "booked"
  | "closed"
  | "cancelled"
  | "unavailable";

type Slot = {
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
};

type DayOverview = {
  date: string;
  weekday: number;
  slots: Slot[];
};

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

type OverviewResponse = {
  overview: DayOverview[];
  reservations: ReservationRow[];
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

function statusLabel(status: SlotStatus, lang: "zh" | "en") {
  if (status === "available") {
    return lang === "zh" ? "可预约" : "Available";
  }
  if (status === "booked") {
    return lang === "zh" ? "已预约" : "Booked";
  }
  if (status === "closed") {
    return lang === "zh" ? "已关闭" : "Closed";
  }
  if (status === "cancelled") {
    return lang === "zh" ? "已取消" : "Cancelled";
  }
  return lang === "zh" ? "不可约" : "Unavailable";
}

function statusColor(status: SlotStatus) {
  if (status === "available") return "bg-emerald-100 text-emerald-700";
  if (status === "booked") return "bg-blue-100 text-blue-700";
  if (status === "closed") return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

export default function AdminTabs() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"overview" | "closed">("overview");
  const title = lang === "zh" ? "仓库管理员工作台" : "Warehouse Admin Panel";
  const overviewTabLabel =
    lang === "zh" ? "预约总览" : "Reservation Overview";
  const closedTabLabel =
    lang === "zh" ? "关闭时间段管理" : "Closed Time Slot Management";

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
            tab === "overview"
              ? "text-klein border-b-2 border-klein"
              : "text-slate-500"
          }`}
          onClick={() => setTab("overview")}
        >
          {overviewTabLabel}
        </button>
        <button
          className={`pb-2 text-sm font-medium ${
            tab === "closed"
              ? "text-klein border-b-2 border-klein"
              : "text-slate-500"
          }`}
          onClick={() => setTab("closed")}
        >
          {closedTabLabel}
        </button>
      </div>
      {tab === "overview" ? <OverviewTab /> : <ClosedSlotTab />}
    </div>
  );
}

function OverviewTab() {
  const { lang } = useLanguage();
  const [{ startDate, endDate }] = useState(() => getRange());
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const url = `/api/admin/overview?start=${startDate}&end=${endDate}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = (await response.json()) as OverviewResponse;
        setData(json);
      }
      setLoading(false);
    }
    load();
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-600">
        {lang === "zh"
          ? "显示从明天开始两周内的预约时间段信息（周一和周日不可约）。"
          : "Show reservation time slots for the next two weeks starting tomorrow (not bookable on Monday and Sunday)."}
      </div>
      {loading && (
        <div className="text-sm text-slate-500">
          {lang === "zh" ? "加载中..." : "Loading..."}
        </div>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {data.overview.map(day => (
              <div
                key={day.date}
                className="border border-slate-200 rounded-md p-2 flex flex-col gap-2"
              >
                <div className="text-xs font-medium text-slate-700">
                  {day.date}
                </div>
                <div className="flex flex-col gap-1">
                  {day.slots.map(slot => (
                    <div
                      key={slot.startTime}
                      className={`text-xs rounded px-2 py-1 inline-flex items-center justify-between flex-wrap ${statusColor(
                        slot.status
                      )}`}
                    >
                      <span>
                        {slot.startTime}–{slot.endTime}
                      </span>
                      <span className="ml-2">
                        {statusLabel(slot.status, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4">
            <div className="text-sm font-medium text-slate-700 mb-2">
              {lang === "zh" ? "预约列表" : "Reservations"}
            </div>
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
                      {lang === "zh" ? "公司" : "Company"}
                    </th>
                    <th className="px-3 py-2 text-left text-slate-500">
                      {lang === "zh" ? "联系电话" : "Phone"}
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
                  {data.reservations.length === 0 && (
                    <tr>
                      <td
                        className="px-3 py-3 text-center text-slate-400"
                        colSpan={9}
                      >
                        {lang === "zh"
                          ? "暂无预约记录。"
                          : "No reservation records."}
                      </td>
                    </tr>
                  )}
                  {data.reservations.map(item => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{item.reservation_no}</td>
                      <td className="px-3 py-2">{item.date}</td>
                      <td className="px-3 py-2">
                        {item.start_time}–{item.end_time}
                      </td>
                      <td className="px-3 py-2">{item.display_name}</td>
                      <td className="px-3 py-2">
                        {item.company_name || "—"}
                      </td>
                      <td className="px-3 py-2">{item.phone || "—"}</td>
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
        </>
      )}
    </div>
  );
}

function ClosedSlotTab() {
  const { lang } = useLanguage();
  const [{ startDate, endDate }] = useState(() => getRange());
  const [items, setItems] = useState<ClosedSlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(startDate);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");
  const [openReason, setOpenReason] = useState("");
  const [openingId, setOpeningId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    const response = await fetch("/api/admin/closed-slots");
    if (response.ok) {
      const json = (await response.json()) as { items: ClosedSlotRow[] };
      setItems(json.items);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    if (!reason.trim()) {
      alert(
        lang === "zh"
          ? "请填写关闭原因。"
          : "Please enter the reason for closing."
      );
      return;
    }
    const payload: {
      date: string;
      mode: "full" | "partial";
      reason: string;
      startTime?: string;
      endTime?: string;
    } = {
      date,
      mode,
      reason: reason.trim()
    };
    if (mode === "partial") {
      payload.startTime = startTime;
      payload.endTime = endTime;
    }
    const response = await fetch("/api/admin/closed-slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setReason("");
      await refresh();
    } else {
      const text = await response.text();
      alert(
        text ||
          (lang === "zh"
            ? "新增关闭时间段失败。"
            : "Failed to add closed time slot.")
      );
    }
  }

  async function handleOpen(item: ClosedSlotRow) {
    if (!openReason.trim()) {
      return;
    }
    await fetch("/api/admin/closed-slots", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: item.id,
        openedReason: openReason.trim()
      })
    });
    setOpenReason("");
    setOpeningId(null);
    await refresh();
  }

  const selectableDates = useMemo(() => {
    const list: string[] = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);
    while (cursor <= end) {
      const s = toDateString(cursor);
      const weekday = cursor.getDay();
      if (weekday !== 0 && weekday !== 1) {
        list.push(s);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [startDate, endDate]);

  const hoursOptions = [
    ["10:00", "13:00"],
    ["11:00", "14:00"],
    ["12:00", "15:00"]
  ];

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-600">
        {lang === "zh"
          ? "通过选择日期和时间段关闭或打开预约时间段。"
          : "Close or open reservation time slots by selecting date and time range."}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="font-medium text-slate-700">
            {lang === "zh" ? "新增关闭时间段" : "Create closed time slot"}
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">
                {lang === "zh" ? "日期" : "Date"}
              </span>
              <select
                className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                value={date}
                onChange={event => setDate(event.target.value)}
              >
                {selectableDates.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4 items-center">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  checked={mode === "full"}
                  onChange={() => setMode("full")}
                />
                {lang === "zh" ? "全天不可" : "All day unavailable"}
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  checked={mode === "partial"}
                  onChange={() => setMode("partial")}
                />
                {lang === "zh" ? "选择时间段" : "Select time range"}
              </label>
            </div>
            {mode === "partial" && (
              <div className="flex gap-2 items-center">
                <select
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={startTime}
                  onChange={event => setStartTime(event.target.value)}
                >
                  {hoursOptions.map(([start]) => (
                    <option key={start} value={start}>
                      {start}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-slate-500">
                  {lang === "zh" ? "至" : "to"}
                </span>
                <select
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  value={endTime}
                  onChange={event => setEndTime(event.target.value)}
                >
                  {hoursOptions.map(([start, end]) => (
                    <option key={start} value={end}>
                      {end}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">
                {lang === "zh" ? "关闭原因" : "Reason for closing"}
              </span>
              <textarea
                className="border border-slate-300 rounded-md px-2 py-1 text-sm min-h-[60px]"
                value={reason}
                onChange={event => setReason(event.target.value)}
                required
              />
            </div>
            <button
              className="mt-1 inline-flex items-center justify-center rounded-md bg-klein text-white text-sm px-4 py-2 hover:bg-klein/90 disabled:opacity-60"
              onClick={handleCreate}
              disabled={loading}
            >
              {lang === "zh" ? "新增关闭时间段" : "Add closed time slot"}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="font-medium text-slate-700">
            {lang === "zh" ? "已关闭时间段列表" : "Closed time slots"}
          </div>
          {loading && (
            <div className="text-sm text-slate-500">
              {lang === "zh" ? "加载中..." : "Loading..."}
            </div>
          )}
          <div className="border border-slate-200 rounded-md max-h-80 overflow-auto">
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
                    {lang === "zh" ? "操作" : "Actions"}
                  </th>
                  <th className="px-3 py-2 text-left text-slate-500">
                    {lang === "zh" ? "关闭操作时间" : "Closed at"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td
                      className="px-3 py-3 text-center text-slate-400"
                      colSpan={5}
                    >
                      {lang === "zh"
                        ? "暂无关闭记录。"
                        : "No closed records."}
                    </td>
                  </tr>
                )}
                {items.map(item => {
                  const isClosed = item.status === "closed";
                  const slotLabel =
                    item.start_time && item.end_time
                      ? `${item.start_time}–${item.end_time}`
                      : lang === "zh" ? "全天" : "All day";
                  const dateObj = new Date(item.date);
                  const now = new Date();
                  const isToday =
                    dateObj.getFullYear() === now.getFullYear() &&
                    dateObj.getMonth() === now.getMonth() &&
                    dateObj.getDate() === now.getDate();
                  const canOpen = isClosed && !isToday;
                  return (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-3 py-2">{item.date}</td>
                      <td className="px-3 py-2">{slotLabel}</td>
                      <td className="px-3 py-2">
                        {item.status === "closed"
                          ? lang === "zh"
                            ? "已关闭"
                            : "Closed"
                          : lang === "zh"
                          ? "可预约"
                          : "Available"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-slate-500">
                            {lang === "zh" ? "原因：" : "Reason: "}
                            {item.reason}
                          </div>
                          {item.opened_reason && (
                            <div className="text-xs text-slate-500">
                              {lang === "zh" ? "打开理由：" : "Open reason: "}
                              {item.opened_reason}
                            </div>
                          )}
                          {canOpen && (
                            <div className="space-y-1">
                              <textarea
                                className="border border-slate-300 rounded-md px-2 py-1 text-xs w-full"
                                placeholder={
                                  lang === "zh"
                                    ? "填写打开理由"
                                    : "Enter reason for opening"
                                }
                                value={
                                  openingId === item.id ? openReason : ""
                                }
                                onChange={event => {
                                  setOpeningId(item.id);
                                  setOpenReason(event.target.value);
                                }}
                              />
                              <button
                                className="inline-flex items-center justify-center rounded-md bg-emerald-600 text-white text-xs px-3 py-1 hover:bg-emerald-700 disabled:opacity-60"
                                onClick={() => handleOpen(item)}
                                disabled={loading}
                              >
                                {lang === "zh" ? "打开时间段" : "Open time slot"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {item.created_at}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
