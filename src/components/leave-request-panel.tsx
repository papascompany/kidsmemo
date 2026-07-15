"use client";

import { Check, Loader2, Send, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/auth-fetch";
import type { Role } from "@/lib/types";

export interface LeaveRequestPanelProps {
  organizationId: string;
  userRole: Role;
  className?: string;
  defaultLeaveType?: string;
}

type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
type LeaveRequest = {
  id: string;
  organizationId: string;
  profileId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedAt: string | null;
  createdAt: string;
};

const statusLabels: Record<LeaveStatus, string> = {
  pending: "검토 대기",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소"
};

const reviewRoles: Role[] = ["owner", "manager", "admin"];

export function LeaveRequestPanel({ organizationId, userRole, className = "", defaultLeaveType = "annual" }: LeaveRequestPanelProps) {
  const canReview = reviewRoles.includes(userRole);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [reviewRequests, setReviewRequests] = useState<LeaveRequest[]>([]);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [leaveType, setLeaveType] = useState(defaultLeaveType);
  const [requestedDays, setRequestedDays] = useState("1");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadRequests();
    // organizationId is the explicit parent-owned scope for this panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, canReview]);

  const pendingReviewCount = useMemo(() => reviewRequests.filter((item) => item.status === "pending").length, [reviewRequests]);

  async function loadRequests() {
    setLoading(true);
    const ownResponse = await authenticatedFetch(`/api/leave?organizationId=${encodeURIComponent(organizationId)}`, { organizationId });
    const ownPayload = await ownResponse.json().catch(() => null) as { data?: { requests?: LeaveRequest[] }; error?: { message?: string } } | null;
    if (!ownResponse.ok) {
      setMessage(ownPayload?.error?.message || "휴가 신청을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }
    setRequests(ownPayload?.data?.requests ?? []);

    if (canReview) {
      const reviewResponse = await authenticatedFetch(`/api/admin/leave/requests?organizationId=${encodeURIComponent(organizationId)}`, { organizationId });
      const reviewPayload = await reviewResponse.json().catch(() => null) as { data?: { requests?: LeaveRequest[] }; error?: { message?: string } } | null;
      if (reviewResponse.ok) setReviewRequests(reviewPayload?.data?.requests ?? []);
      else setMessage(reviewPayload?.error?.message || "기관 휴가 신청을 불러오지 못했습니다.");
    } else {
      setReviewRequests([]);
    }
    setLoading(false);
  }

  async function submitRequest() {
    setSaving(true);
    setMessage("");
    const response = await authenticatedFetch("/api/leave", {
      method: "POST",
      organizationId,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, leaveType, startDate, endDate, requestedDays, reason })
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!response.ok) setMessage(payload?.error?.message || "휴가 신청을 저장하지 못했습니다.");
    else {
      setReason("");
      setMessage("휴가 신청을 등록했습니다.");
      await loadRequests();
    }
    setSaving(false);
  }

  async function cancelRequest(id: string) {
    setSaving(true);
    const response = await authenticatedFetch("/api/leave", {
      method: "PATCH",
      organizationId,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, organizationId, status: "cancelled" })
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    setMessage(response.ok ? "대기 중인 휴가 신청을 취소했습니다." : payload?.error?.message || "휴가 신청을 취소하지 못했습니다.");
    if (response.ok) await loadRequests();
    setSaving(false);
  }

  async function reviewRequest(id: string, status: "approved" | "rejected") {
    setSaving(true);
    const response = await authenticatedFetch("/api/admin/leave/requests", {
      method: "PATCH",
      organizationId,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, organizationId, status })
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    setMessage(response.ok ? `휴가 신청을 ${status === "approved" ? "승인" : "반려"}했습니다.` : payload?.error?.message || "휴가 신청을 처리하지 못했습니다.");
    if (response.ok) await loadRequests();
    setSaving(false);
  }

  return (
    <section className={`grid gap-5 ${className}`} aria-label="직원 휴가 신청 및 승인">
      <div className="grid gap-4 rounded border border-line bg-white p-5 shadow-soft">
        <div>
          <p className="text-sm font-semibold text-brand">휴가 신청</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">내 휴가 일정을 미리 알려주세요</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ink">휴가 유형<select value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className="min-h-11 rounded border border-line bg-white px-3 font-normal"><option value="annual">연차</option><option value="half_day">반차</option><option value="sick">병가</option><option value="other">기타</option></select></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">신청 일수<input type="number" min="0.5" max="366" step="0.5" value={requestedDays} onChange={(event) => setRequestedDays(event.target.value)} className="min-h-11 rounded border border-line bg-white px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">시작일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-h-11 rounded border border-line bg-white px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">종료일<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-h-11 rounded border border-line bg-white px-3 font-normal" /></label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-ink">사유 <span className="font-normal text-muted">선택</span><textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} rows={3} className="rounded border border-line bg-white px-3 py-2 font-normal" placeholder="관리자에게 전달할 내용을 적어주세요." /></label>
        <button type="button" onClick={() => void submitRequest()} disabled={saving || loading || !organizationId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"><Send size={16} aria-hidden />신청하기</button>
        {message ? <p role="status" className="rounded border border-line bg-surface px-3 py-2 text-sm font-semibold text-muted">{message}</p> : null}
      </div>

      <RequestList title="내 신청 내역" requests={requests} saving={saving} onCancel={cancelRequest} />

      {canReview ? <section className="grid gap-3 rounded border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><div><p className="text-sm font-semibold text-brand">관리자 검토</p><h2 className="mt-1 text-xl font-semibold text-ink">기관 휴가 신청</h2></div><span className="text-sm text-muted">대기 {pendingReviewCount}건</span></div>
        <div className="grid gap-3">{reviewRequests.length ? reviewRequests.map((item) => <ReviewRow key={item.id} request={item} saving={saving} onReview={reviewRequest} />) : <p className="rounded border border-dashed border-line px-4 py-6 text-sm text-muted">기관 휴가 신청이 없습니다.</p>}</div>
      </section> : null}
    </section>
  );
}

function RequestList({ title, requests, saving, onCancel }: { title: string; requests: LeaveRequest[]; saving: boolean; onCancel: (id: string) => Promise<void> }) {
  return <section className="grid gap-3 rounded border border-line bg-white p-5 shadow-soft"><h2 className="text-lg font-semibold text-ink">{title}</h2>{requests.length ? requests.map((item) => <div key={item.id} className="grid gap-3 rounded border border-line bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-ink">{item.startDate}{item.endDate !== item.startDate ? ` ~ ${item.endDate}` : ""}</strong><StatusBadge status={item.status} /></div><p className="mt-1 text-sm text-muted">{item.leaveType} · {item.requestedDays}일{item.reason ? ` · ${item.reason}` : ""}</p></div>{item.status === "pending" ? <button type="button" onClick={() => void onCancel(item.id)} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line bg-white px-3 text-sm font-semibold text-ink disabled:opacity-60"><XCircle size={16} aria-hidden />취소</button> : null}</div>) : <p className="rounded border border-dashed border-line px-4 py-6 text-sm text-muted">아직 신청한 휴가가 없습니다.</p>}</section>;
}

function ReviewRow({ request, saving, onReview }: { request: LeaveRequest; saving: boolean; onReview: (id: string, status: "approved" | "rejected") => Promise<void> }) {
  return <div className="grid gap-3 rounded border border-line bg-surface p-4 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-ink">{request.startDate}{request.endDate !== request.startDate ? ` ~ ${request.endDate}` : ""}</strong><StatusBadge status={request.status} /></div><p className="mt-1 break-all text-xs text-muted">직원 {request.profileId} · {request.leaveType} · {request.requestedDays}일</p>{request.reason ? <p className="mt-2 text-sm text-muted">{request.reason}</p> : null}</div>{request.status === "pending" ? <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => void onReview(request.id, "approved")} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-1 rounded bg-brand px-3 text-sm font-semibold text-white disabled:opacity-60"><Check size={15} aria-hidden />승인</button><button type="button" onClick={() => void onReview(request.id, "rejected")} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-1 rounded border border-line bg-white px-3 text-sm font-semibold text-ink disabled:opacity-60"><X size={15} aria-hidden />반려</button></div> : null}</div>;
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  return <span className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold text-muted">{statusLabels[status]}</span>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
