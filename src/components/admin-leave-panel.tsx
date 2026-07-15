"use client";

import { Calculator, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminOrganizationSelect } from "@/components/admin-organization-select";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { AnnualLeaveSummary, LeaveCalculationBasis } from "@/lib/annual-leave";

type SaveState = "idle" | "saving" | "saved" | "error";
type LeaveStaff = {
  id: string;
  organizationId: string;
  profileId: string;
  name: string;
  email: string;
  hireDate: string;
  terminationDate: string | null;
  weeklyHours: number;
  annualAttendanceRate: number | null;
  employmentType: string;
  summary: AnnualLeaveSummary;
};
type LeaveMember = { organizationId: string; profileId: string; role: string; name: string; email: string };
type LeavePayload = {
  asOfDate: string;
  settings: Array<{ organizationId: string; headcount: number; calculationBasis: LeaveCalculationBasis; effectiveFrom: string }>;
  staffMembers: LeaveMember[];
  staff: LeaveStaff[];
};

const initialForm = {
  id: "",
  profileId: "",
  hireDate: new Date().toISOString().slice(0, 10),
  terminationDate: "",
  weeklyHours: "40",
  annualAttendanceRate: "",
  employmentType: "regular"
};

export function AdminLeavePanel() {
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [payload, setPayload] = useState<LeavePayload | null>(null);
  const [headcount, setHeadcount] = useState("5");
  const [calculationBasis, setCalculationBasis] = useState<LeaveCalculationBasis>("hire_date");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("기관을 선택하면 직원별 연차 계산 현황을 불러옵니다.");

  useEffect(() => {
    if (!organizationId) {
      setPayload(null);
      return;
    }
    void loadLeave(organizationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function loadLeave(id: string) {
    setState("saving");
    const response = await authenticatedFetch(`/api/admin/leave?organizationId=${encodeURIComponent(id)}`);
    if (!response.ok) {
      setState("error");
      setMessage("연차 정보를 불러오지 못했습니다. migration 적용 여부를 확인해 주세요.");
      return;
    }
    const result = (await response.json()) as { data?: LeavePayload };
    const nextPayload = result.data;
    if (!nextPayload) {
      setState("error");
      setMessage("연차 응답 형식이 올바르지 않습니다.");
      return;
    }
    setPayload(nextPayload);
    const settings = nextPayload.settings[0];
    if (settings) {
      setHeadcount(String(settings.headcount));
      setCalculationBasis(settings.calculationBasis);
      setEffectiveFrom(settings.effectiveFrom);
    }
    setState("idle");
    setMessage(`${organizationName || "선택한 기관"}의 연차 기준을 확인했습니다.`);
  }

  async function saveSettings() {
    if (!organizationId) return;
    setState("saving");
    const response = await authenticatedFetch("/api/admin/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "settings",
        organizationId,
        headcount,
        calculationBasis,
        effectiveFrom
      })
    });
    setState(response.ok ? "saved" : "error");
    setMessage(response.ok ? "기관 연차 기준을 저장했습니다." : "기관 연차 기준 저장에 실패했습니다.");
    if (response.ok) await loadLeave(organizationId);
  }

  async function saveEmployment() {
    if (!organizationId || !form.profileId || !form.hireDate) {
      setState("error");
      setMessage("기관, 직원을 선택하고 입사일을 입력해 주세요.");
      return;
    }
    setState("saving");
    const response = await authenticatedFetch("/api/admin/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "employment",
        id: form.id || undefined,
        organizationId,
        profileId: form.profileId,
        hireDate: form.hireDate,
        terminationDate: form.terminationDate || null,
        weeklyHours: form.weeklyHours,
        annualAttendanceRate: form.annualAttendanceRate === "" ? null : Number(form.annualAttendanceRate) / 100,
        employmentType: form.employmentType,
        monthlyAttendance: {}
      })
    });
    setState(response.ok ? "saved" : "error");
    setMessage(response.ok ? "직원 고용정보를 저장했습니다." : "직원 고용정보 저장에 실패했습니다.");
    if (response.ok) {
      setForm(initialForm);
      await loadLeave(organizationId);
    }
  }

  function selectStaff(staff: LeaveStaff) {
    setForm({
      id: staff.id,
      profileId: staff.profileId,
      hireDate: staff.hireDate,
      terminationDate: staff.terminationDate ?? "",
      weeklyHours: String(staff.weeklyHours),
      annualAttendanceRate: staff.annualAttendanceRate === null ? "" : String(staff.annualAttendanceRate * 100),
      employmentType: staff.employmentType
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">연차·직원 기준 관리</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              근로기준법 제60조 기준으로 기관 적용 여부, 입사일, 주당 근로시간, 직전 1년 출근율을 관리합니다.
            </p>
          </div>
          <Calculator className="text-brand" aria-hidden />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <AdminOrganizationSelect
            value={organizationId}
            required
            onChange={(id, name) => {
              setOrganizationId(id);
              setOrganizationName(name);
            }}
            placeholder="연차를 관리할 기관 검색"
          />
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-ink" htmlFor="leave-headcount">상시근로자 수</label>
            <input id="leave-headcount" value={headcount} onChange={(event) => setHeadcount(event.target.value)} inputMode="numeric" className="min-h-11 rounded border border-line bg-white px-3 text-sm" />
          </div>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            계산 기준
            <select value={calculationBasis} onChange={(event) => setCalculationBasis(event.target.value as LeaveCalculationBasis)} className="min-h-11 rounded border border-line bg-white px-3 text-sm font-normal">
              <option value="hire_date">입사일 기준 (법정 기본)</option>
              <option value="calendar_year">회계연도 기준 (퇴직 시 불이익 비교)</option>
            </select>
          </label>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-ink" htmlFor="leave-effective-from">적용 시작일</label>
            <input id="leave-effective-from" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} className="min-h-11 rounded border border-line bg-white px-3 text-sm" />
          </div>
        </div>
        <button type="button" onClick={() => void saveSettings()} disabled={!organizationId || state === "saving"} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
          {state === "saving" ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Save size={17} aria-hidden />}
          기관 기준 저장
        </button>
        <p className={`mt-4 rounded border border-line bg-surface px-3 py-2 text-sm font-semibold ${state === "error" ? "text-coral" : "text-muted"}`}>{message}</p>
        {calculationBasis === "calendar_year" ? <p className="mt-2 text-xs leading-5 text-muted">회계연도 운영은 입사일 기준보다 불리하지 않아야 하며, 퇴직 시 차이를 정산해야 합니다.</p> : null}
      </section>

      <section className="rounded border border-line bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold">직원 고용정보</h3>
        <p className="mt-1 text-sm leading-6 text-muted">직원 역할은 멤버십에서 가져오며, 연차 계산에 필요한 근로조건만 별도로 기록합니다.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            직원
            <select value={form.profileId} onChange={(event) => setForm({ ...form, profileId: event.target.value })} className="min-h-11 rounded border border-line bg-white px-3 text-sm font-normal" disabled={!payload}>
              <option value="">직원을 선택하세요</option>
              {(payload?.staffMembers ?? []).map((member) => <option key={member.profileId} value={member.profileId}>{member.name || member.email} · {member.role}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">고용형태<input value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })} className="min-h-11 rounded border border-line bg-white px-3 text-sm font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">입사일<input type="date" value={form.hireDate} onChange={(event) => setForm({ ...form, hireDate: event.target.value })} className="min-h-11 rounded border border-line bg-white px-3 text-sm font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">퇴사일 (선택)<input type="date" value={form.terminationDate} onChange={(event) => setForm({ ...form, terminationDate: event.target.value })} className="min-h-11 rounded border border-line bg-white px-3 text-sm font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">주 소정근로시간<input type="number" min="0" max="168" step="0.01" value={form.weeklyHours} onChange={(event) => setForm({ ...form, weeklyHours: event.target.value })} className="min-h-11 rounded border border-line bg-white px-3 text-sm font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">직전 1년 출근율 (%)<input type="number" min="0" max="100" step="0.1" value={form.annualAttendanceRate} onChange={(event) => setForm({ ...form, annualAttendanceRate: event.target.value })} placeholder="자료 없으면 비워두기" className="min-h-11 rounded border border-line bg-white px-3 text-sm font-normal" /></label>
        </div>
        <button type="button" onClick={() => void saveEmployment()} disabled={!organizationId || !form.profileId || state === "saving"} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-muted"><Save size={17} aria-hidden />직원 기준 저장</button>
      </section>

      <section className="rounded border border-line bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold">연차 계산 현황{organizationName ? ` · ${organizationName}` : ""}</h3>
        <div className="mt-4 grid gap-3">
          {(payload?.staff ?? []).map((staff) => (
            <button key={staff.id} type="button" onClick={() => selectStaff(staff)} className="grid gap-3 rounded border border-line bg-surface p-4 text-left hover:border-brand md:grid-cols-[minmax(180px,1fr)_repeat(3,minmax(100px,auto))] md:items-center">
              <span><strong className="block text-ink">{staff.name || staff.email}</strong><span className="text-xs text-muted">입사 {staff.hireDate}</span></span>
              <span><small className="block text-muted">발생</small><strong>{staff.summary.accruedDays}일</strong></span>
              <span><small className="block text-muted">사용</small><strong>{staff.summary.usedDays}일</strong></span>
              <span><small className="block text-muted">잔여</small><strong className={staff.summary.needsAttendanceInput ? "text-amber-700" : "text-brand"}>{staff.summary.needsAttendanceInput ? "자료 필요" : `${staff.summary.remainingDays}일`}</strong></span>
            </button>
          ))}
          {organizationId && (payload?.staff ?? []).length === 0 ? <p className="rounded border border-dashed border-line px-4 py-6 text-sm text-muted">아직 고용정보가 등록된 직원이 없습니다. 위에서 직원을 선택해 등록하세요.</p> : null}
        </div>
      </section>
    </div>
  );
}
