"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
};

type OverviewResponse = {
  overview: DayOverview[];
  myReservations: ReservationRow[];
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

export default function ClientTabs() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"reservation" | "truck">("reservation");
  const title = lang === "zh" ? "客户工作台" : "Client Dashboard";
  const reservationTabLabel =
    lang === "zh" ? "海柜送仓预约" : "Container Delivery Reservation";
  const truckTabLabel =
    lang === "zh" ? "卡车送仓说明" : "Truck Delivery Instructions";
  const [testingWecom, setTestingWecom] = useState(false);
  const showWecomTest = false;

  async function handleTestWecom() {
    setTestingWecom(true);
    try {
      const response = await fetch("/api/client/wecom-test", {
        method: "POST"
      });
      if (response.ok) {
        if (typeof window !== "undefined") {
          window.alert(
            lang === "zh" ? "企业微信测试消息已发送。" : "WeCom test message sent."
          );
        }
      } else {
        if (typeof window !== "undefined") {
          window.alert(
            lang === "zh"
              ? "企业微信测试消息发送失败。"
              : "Failed to send WeCom test message."
          );
        }
      }
    } catch {
      if (typeof window !== "undefined") {
        window.alert(
          lang === "zh"
            ? "企业微信测试消息发送异常。"
            : "Error sending WeCom test message."
        );
      }
    } finally {
      setTestingWecom(false);
    }
  }

  return (
    <div className="w-full max-w-5xl bg-white shadow-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xl font-semibold text-klein">
          {title}
        </div>
        {showWecomTest && (
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md border border-klein text-klein hover:bg-klein hover:text-white disabled:opacity-60"
            onClick={handleTestWecom}
            disabled={testingWecom}
          >
            {lang === "zh" ? "企业微信消息测试" : "WeCom message test"}
          </button>
        )}
      </div>
      <div className="border-b border-slate-200 mb-4 flex gap-4">
        <button
          className={`pb-2 text-sm font-medium ${
            tab === "reservation"
              ? "text-klein border-b-2 border-klein"
              : "text-slate-500"
          }`}
          onClick={() => setTab("reservation")}
        >
          {reservationTabLabel}
        </button>
        <button
          className={`pb-2 text-sm font-medium ${
            tab === "truck"
              ? "text-klein border-b-2 border-klein"
              : "text-slate-500"
          }`}
          onClick={() => setTab("truck")}
        >
          {truckTabLabel}
        </button>
      </div>
      {tab === "reservation" ? <ReservationTab /> : <TruckTab />}
    </div>
  );
}

function ReservationTab() {
  const { lang } = useLanguage();
  const [{ startDate, endDate }] = useState(() => getRange());
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDate, setConfirmingDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState("10:00");
  const [containerNo, setContainerNo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const url = `/api/client/reservations?start=${startDate}&end=${endDate}`;
    const response = await fetch(url);
    if (response.ok) {
      const json = (await response.json()) as OverviewResponse;
      setData(json);
    } else {
      setError("加载预约信息失败。");
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const processedOverview = useMemo(() => {
    if (!data) return [];
    return data.overview.map(day => {
      const bookedSlots = day.slots.filter(slot => slot.status === "booked");
      if (bookedSlots.length === 0) {
        return day;
      }
      const newSlots = day.slots.map(slot => {
        if (slot.status !== "available") {
          return slot;
        }
        const overlaps = bookedSlots.some(b => {
          return !(
            slot.endTime <= b.startTime || slot.startTime >= b.endTime
          );
        });
        if (overlaps) {
          return {
            ...slot,
            status: "unavailable" as SlotStatus
          };
        }
        return slot;
      });
      return {
        ...day,
        slots: newSlots
      };
    });
  }, [data]);

  const availableSlotsByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();
    if (!processedOverview) return map;
    for (const day of processedOverview) {
      const list = day.slots.filter(slot => slot.status === "available");
      if (list.length > 0) {
        map.set(day.date, list);
      }
    }
    return map;
  }, [processedOverview]);

  function openForm(date: string) {
    const slots = availableSlotsByDate.get(date);
    if (!slots || slots.length === 0) {
      return;
    }
    setConfirmingDate(date);
    setSelectedStartTime(slots[0].startTime);
    setContainerNo("");
    setFile(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!confirmingDate || !data) {
      return;
    }
    if (!selectedStartTime) {
      setError(
        lang === "zh"
          ? "请选择开始时间。"
          : "Please select a start time."
      );
      return;
    }
    if (!containerNo.trim()) {
      setError(
        lang === "zh"
          ? "柜号不能为空。"
          : "Container number is required."
      );
      return;
    }
    if (!file) {
      setError(
        lang === "zh"
          ? "请上传装箱单文件。"
          : "Please upload the packing list file."
      );
      return;
    }
    const formData = new FormData();
    formData.append("date", confirmingDate);
    formData.append("startTime", selectedStartTime);
    formData.append("containerNo", containerNo.trim());
    formData.append("packingList", file);
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/client/reservations", {
      method: "POST",
      body: formData
    });
    if (response.ok) {
      setConfirmingDate(null);
      await load();
    } else {
      const text = await response.text();
      setError(
        text ||
          (lang === "zh" ? "预约失败。" : "Reservation failed.")
      );
    }
    setSubmitting(false);
  }

  async function handleCancel(item: ReservationRow) {
    setCancellingId(item.id);
    setError(null);
    const response = await fetch(
      `/api/client/reservations/${item.id}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: cancelReason || null
        })
      }
    );
    if (response.ok || response.status === 204) {
      setCancelReason("");
      setCancellingId(null);
      await load();
    } else {
      const text = await response.text();
      setError(text || "取消失败。");
      setCancellingId(null);
    }
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-600">
        {lang === "zh"
          ? "从明天开始两周内进行海柜送仓预约。周一和周日不可预约。"
          : "Reserve container deliveries for the next two weeks starting tomorrow. Monday and Sunday are not bookable."}
      </div>
      {loading && (
        <div className="text-sm text-slate-500">
          {lang === "zh" ? "加载中..." : "Loading..."}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {processedOverview.map(day => {
              const available = availableSlotsByDate.get(day.date);
              const hasAvailable = !!available && available.length > 0;
              return (
                <div
                  key={day.date}
                  className="border border-slate-200 rounded-md p-2 flex flex-col gap-2"
                >
                  <div className="text-xs font-medium text-slate-700">
                    {day.date}
                  </div>
                  <div className="flex flex-col gap-1 min-h-[72px]">
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
                  <button
                    className="mt-1 inline-flex items-center justify-center rounded-md bg-klein text-white text-xs px-2 py-1 hover:bg-klein/90 disabled:opacity-60"
                    disabled={!hasAvailable}
                    onClick={() => openForm(day.date)}
                  >
                    {lang === "zh" ? "预约" : "Reserve"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pt-4">
            <div className="text-sm font-medium text-slate-700 mb-2">
              {lang === "zh" ? "我的预约" : "My reservations"}
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
                      {lang === "zh" ? "柜号" : "Container No."}
                    </th>
                    <th className="px-3 py-2 text-left text-slate-500">
                      {lang === "zh" ? "装箱单文件" : "Packing list"}
                    </th>
                    <th className="px-3 py-2 text-left text-slate-500">
                      {lang === "zh" ? "状态" : "Status"}
                    </th>
                    <th className="px-3 py-2 text-left text-slate-500">
                      {lang === "zh" ? "操作" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.myReservations.length === 0 && (
                    <tr>
                      <td
                        className="px-3 py-3 text-center text-slate-400"
                        colSpan={7}
                      >
                        {lang === "zh"
                          ? "暂无预约记录。"
                          : "No reservation records."}
                      </td>
                    </tr>
                  )}
                  {data.myReservations.map(item => {
                    const dateObj = new Date(`${item.date}T00:00:00`);
                    const diff =
                      (dateObj.getTime() - now.getTime()) / 86400000;
                    const canCancel =
                      item.status === "booked" && diff >= 1;
                    return (
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
                          {item.container_no}
                        </td>
                        <td className="px-3 py-2">
                          {item.packing_list_path ? (
                            <div className="flex items-center gap-2">
                              <span>
                                {item.packing_list_path.split("/").pop()}
                              </span>
                              <a
                                href={`/api/client/reservations/${item.id}/packing-list`}
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
                        <td className="px-3 py-2">
                          {canCancel && (
                            <div className="flex flex-col gap-1">
                              <textarea
                                className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                                placeholder={
                                  lang === "zh"
                                    ? "取消原因（可选）"
                                    : "Reason for cancellation (optional)"
                                }
                                value={
                                  cancellingId === item.id
                                    ? cancelReason
                                    : ""
                                }
                                onChange={event => {
                                  setCancellingId(item.id);
                                  setCancelReason(event.target.value);
                                }}
                              />
                              <button
                                className="inline-flex items-center justify-center rounded-md bg-red-600 text-white text-xs px-3 py-1 hover:bg-red-700 disabled:opacity-60"
                                disabled={submitting}
                                onClick={() => handleCancel(item)}
                              >
                                {lang === "zh"
                                  ? "取消预约"
                                  : "Cancel reservation"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {confirmingDate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <div className="text-lg font-semibold text-klein">
              {lang === "zh" ? "新建预约" : "New reservation"}
            </div>
            <div className="text-sm text-slate-600">
              {lang === "zh" ? "日期：" : "Date: "}
              {confirmingDate}
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh" ? "开始时间" : "Start time"}
                </span>
                <select
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  required
                  value={selectedStartTime}
                  onChange={event =>
                    setSelectedStartTime(event.target.value)
                  }
                >
                  {(availableSlotsByDate.get(confirmingDate) || []).map(
                    slot => (
                      <option key={slot.startTime} value={slot.startTime}>
                        {slot.startTime}–{slot.endTime}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh" ? "柜号" : "Container No."}
                </span>
                <input
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm"
                  required
                  value={containerNo}
                  onChange={event => setContainerNo(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">
                  {lang === "zh"
                    ? "装箱单文件（PDF / Word，最大 10M）"
                    : "Packing list file (PDF / Word, max 10MB)"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-klein text-white text-xs px-3 py-1 hover:bg-klein/90"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                  >
                    {lang === "zh" ? "选择文件" : "Choose file"}
                  </button>
                  <span className="text-xs text-slate-500">
                    {file
                      ? file.name
                      : lang === "zh"
                      ? "未选择文件"
                      : "No file chosen"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  required
                  className="hidden"
                  onChange={event => {
                    const f = event.target.files?.[0] || null;
                    setFile(f);
                  }}
                />
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-600"
                onClick={() => {
                  setConfirmingDate(null);
                  setError(null);
                }}
              >
                {lang === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                className="px-4 py-2 text-sm rounded-md bg-klein text-white hover:bg-klein/90 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {lang === "zh" ? "确认预约" : "Confirm reservation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TruckTab() {
  const { lang } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="text-center text-3xl font-semibold text-klein">
        {lang === "zh"
          ? "卡车派送无需预约，直接送仓即可"
          : "Truck deliveries do not require reservation; send directly to warehouse."}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-lg font-medium text-slate-700">
            {lang === "zh" ? "公司地址" : "Company address"}
          </div>
          <div className="text-lg text-slate-600">
            {lang === "zh"
              ? "11480 Hillguard Rd, Dallas, TX 75243"
              : "11480 Hillguard Rd, Dallas, TX 75243"}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-lg font-medium text-slate-700">
            {lang === "zh" ? "联系电话" : "Telephone"}
          </div>
          <div className="text-lg text-slate-600">
            {lang === "zh" ? "817-913-3376" : "817-913-3376"}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-lg font-medium text-slate-700">
            {lang === "zh" ? "联系人信息" : "Contact person"}
          </div>
          <div className="text-lg text-slate-600">
            {lang === "zh" ? (
              <>
                联系人:Bright Way
                <br />
                邮箱：supervisor.brightway.dallas@gmail.com
              </>
            ) : (
              <>
                Contact: Bright Way
                <br />
                Email: supervisor.brightway.dallas@gmail.com
              </>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-lg font-medium text-slate-700">
            {lang === "zh" ? "可服务时间" : "Service hours"}
          </div>
          <div className="text-lg text-slate-600">
            {lang === "zh"
              ? "周一和周日不可预约。其他日期可以送货时间：10:00-15:00。"
              : "Truck deliveries are accepted from 10:00 to 15:00 on days other than Monday and Sunday."}
          </div>
        </div>
      </div>
    </div>
  );
}
