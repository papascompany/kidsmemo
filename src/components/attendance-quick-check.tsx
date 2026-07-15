"use client";

import { Check, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { AttendanceRoster, AttendanceRosterItem } from "@/lib/attendance-operations";
import type { OrganizationContext } from "@/lib/organization-context";

const statusLabels: Record<AttendanceRosterItem["status"], string> = {
  present: "출석",
  absent: "결석",
  late: "지각",
  excused: "인정결석"
};

export function AttendanceQuickCheck({ context }: { context: OrganizationContext | null }) {
  const [className, setClassName] = useState("");
  const [roster, setRoster] = useState<AttendanceRoster | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("반을 입력하면 오늘 출석부를 바로 불러옵니다.");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setRoster(null);
    setState("idle");
    setMessage("반을 입력하면 오늘 출석부를 바로 불러옵니다.");
  }, [context?.organization.id]);

  async function loadRoster() {
    if (!context?.organization.id || !className.trim()) return;
    setState("loading");
    const params = new URLSearchParams({ attendanceDate: today, className: className.trim() });
    const response = await authenticatedFetch(`/api/attendance?${params}`);
    if (!response.ok) {
      setState("error");
      setMessage("출석부를 불러오지 못했습니다. 기관 권한과 반 이름을 확인해 주세요.");
      return;
    }
    setRoster(unwrapData<AttendanceRoster>(await response.json()));
    setState("idle");
    setMessage("오늘 출석 상태를 확인하고 저장하세요.");
  }

  async function saveRoster() {
    if (!roster || roster.roster.length === 0) return;
    setState("saving");
    const response = await authenticatedFetch("/api/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: roster.organizationId,
        attendanceDate: roster.attendanceDate,
        className: roster.className,
        records: roster.roster.map(({ childName, status, note }) => ({ childName, status, note }))
      })
    });
    if (!response.ok) {
      setState("error");
      setMessage("출석 저장에 실패했습니다. 마감 여부를 확인해 주세요.");
      return;
    }
    setRoster(unwrapData<{ roster: AttendanceRoster }>(await response.json()).roster);
    setState("saved");
    setMessage("오늘 출석을 저장했습니다.");
  }

  return (
    <section className="rounded-xl border border-line bg-[#fffefa] p-4 shadow-soft sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-brand">오늘의 출석</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">반별 출석을 빠르게 기록하세요.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        </div>
        {state === "saved" ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><Check size={16} />저장됨</span> : null}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="예: 햇님반" className="min-h-11 flex-1 rounded border border-line bg-white px-3 text-sm outline-none focus:border-brand" />
        <button type="button" onClick={() => void loadRoster()} disabled={!context?.organization.id || !className.trim() || state === "loading"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:text-muted">
          <RefreshCw size={16} className={state === "loading" ? "animate-spin" : ""} />조회
        </button>
      </div>
      {roster ? (
        <div className="mt-4 grid gap-2">
          {roster.roster.map((item, index) => (
            <div key={item.childName} className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-2 rounded border border-line bg-surface p-3">
              <span className="truncate text-sm font-semibold text-ink">{item.childName}</span>
              <select value={item.status} onChange={(event) => setRoster({ ...roster, roster: roster.roster.map((current, currentIndex) => currentIndex === index ? { ...current, status: event.target.value as AttendanceRosterItem["status"] } : current) })} className="min-h-10 rounded border border-line bg-white px-2 text-sm">
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          ))}
          <button type="button" onClick={() => void saveRoster()} disabled={state === "saving" || roster.isClosed} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            {state === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}출석 저장
          </button>
        </div>
      ) : null}
    </section>
  );
}

function unwrapData<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object" || !("data" in payload)) throw new Error("출석 응답 형식이 올바르지 않습니다.");
  return (payload as { data: T }).data;
}
