"use client";

import { CalendarDays, CalendarPlus, ChevronDown, ChevronUp, Image as ImageIcon, Pencil, Plus, Save, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "./badge";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { events as initialEvents, organizations } from "@/lib/mock-data";
import { getPrimaryOrganizationId } from "@/lib/organization-context";
import type { EventSchedule, Organization } from "@/lib/types";

type EventFormState = {
  organizationId: string;
  title: string;
  eventDate: string;
  audience: string;
  classNames: string;
  description: string;
  supplies: string;
};

type EventManagerProps = {
  availableOrganizations?: Organization[];
  initialOrganizationId?: string;
  initialEventList?: EventSchedule[];
};

const eventTemplates = [
  {
    title: "소풍",
    audience: "전체 원아",
    description: "근교 야외활동과 반별 사진 촬영",
    supplies: "이름표, 돗자리, 간식"
  },
  {
    title: "운동회",
    audience: "전체 원아",
    description: "가족 참여 활동과 단체 촬영",
    supplies: "명찰, 물, 구급함"
  },
  {
    title: "생일잔치",
    audience: "해당 월 생일 원아",
    description: "생일 축하 활동과 기념 사진",
    supplies: "생일 모자, 포토존 소품"
  },
  {
    title: "졸업식",
    audience: "졸업반",
    description: "수료/졸업 발표와 가족 사진 촬영",
    supplies: "꽃다발, 안내문, 포토월"
  }
];

export function EventManager({
  availableOrganizations = organizations,
  initialOrganizationId = getPrimaryOrganizationId(),
  initialEventList = initialEvents
}: EventManagerProps) {
  const [events, setEvents] = useState(initialEventList);
  const [form, setForm] = useState<EventFormState>(() => createEmptyForm(initialOrganizationId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setEvents(initialEventList);
    setForm((current) => ({
      ...current,
      organizationId: initialOrganizationId
    }));
  }, [initialEventList, initialOrganizationId]);

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      try {
        const response = await authenticatedFetch("/api/events", {
          organizationId: form.organizationId
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setStatus("로그인 후 live 행사 데이터를 불러올 수 있습니다.");
          }
          return;
        }

        const loadedEvents = unwrapData<EventSchedule[]>(await response.json());
        if (isMounted && Array.isArray(loadedEvents)) {
          setEvents(loadedEvents);
          setStatus(null);
        }
      } catch {
        if (isMounted) {
          setStatus("행사 목록은 현재 데모 데이터로 표시됩니다.");
        }
      }
    }

    void loadEvents();

    return () => {
      isMounted = false;
    };
  }, [form.organizationId]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [events]
  );

  function updateField(name: keyof EventFormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(event: EventSchedule) {
    setEditingId(event.id);
    setStatus(null);
    setShowDetails(true);
    setIsComposerOpen(true);
    setForm({
      organizationId: event.organizationId,
      title: event.title,
      eventDate: event.eventDate,
      audience: event.audience,
      classNames: event.classNames.join(", "),
      description: event.description,
      supplies: event.supplies.join(", ")
    });
  }

  function resetForm() {
    setEditingId(null);
    setStatus(null);
    setShowDetails(false);
    setForm(createEmptyForm(initialOrganizationId));
  }

  function startCreate() {
    resetForm();
    setIsComposerOpen(true);
  }

  function closeComposer() {
    resetForm();
    setIsComposerOpen(false);
  }

  function applyTemplate(template: {
    title: string;
    audience: string;
    description: string;
    supplies: string;
  }) {
    setForm((current) => ({
      ...current,
      title: template.title,
      audience: template.audience,
      description: template.description,
      supplies: template.supplies
    }));
  }

  async function saveEvent() {
    setIsSaving(true);
    setStatus(null);

    const payload = {
      organizationId: form.organizationId,
      title: form.title.trim(),
      eventDate: form.eventDate,
      audience: form.audience.trim(),
      classNames: splitList(form.classNames),
      description: form.description.trim(),
      supplies: splitList(form.supplies)
    };

    try {
      const response = await authenticatedFetch(editingId ? `/api/events/${editingId}` : "/api/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        organizationId: payload.organizationId,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const saved = normalizeEvent(unwrapData<EventSchedule>(await response.json()), payload);
      setEvents((current) => {
        if (editingId) {
          return current.map((event) => (event.id === editingId ? saved : event));
        }

        return [saved, ...current];
      });
      setStatus(editingId ? "행사 수정 요청이 저장되었습니다." : "새 행사 등록 요청이 저장되었습니다.");
      setIsComposerOpen(false);
      resetForm();
    } catch {
      setStatus("저장에 실패했습니다. 입력값과 API 상태를 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#fffefa] shadow-soft">
      <div className="relative overflow-hidden border-b border-line bg-ink p-4 sm:p-5">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1400&q=85)" }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="text-white">
          <p className="text-sm font-semibold text-white/80">우리 반의 다음 이야기</p>
          <h3 className="mt-1 text-xl font-semibold tracking-normal">사진처럼 기억될 행사를 준비하세요.</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/84">행사명과 날짜부터 적고, 나머지는 필요할 때 차분히 덧붙입니다.</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink"
        >
          <Plus size={18} aria-hidden />
          새 행사 등록
        </button>
        </div>
      </div>

      {status ? <p className="mx-4 mt-4 rounded border border-line bg-surface px-3 py-2 text-sm font-semibold text-muted sm:mx-5">{status}</p> : null}

      <div className="divide-y divide-line">
        {sortedEvents.map((event) => (
          <article key={event.id} className="flex flex-col gap-4 p-4 transition hover:bg-brand/[0.035] sm:flex-row sm:items-center sm:p-5">
            <EventDate eventDate={event.eventDate} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-wrap-anywhere text-base font-semibold text-ink">{event.title}</h4>
                <Badge tone={getReminderTone(event.reminderStatus)}>{getReminderLabel(event.reminderStatus)}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                {event.audience} · {event.classNames.join(", ")}
                {event.description ? ` · ${event.description}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href="#ai-helper"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-semibold text-brand transition hover:border-brand hover:bg-brand/5"
              >
                <Sparkles size={17} aria-hidden />
                AI 기획
              </a>
              <button
                type="button"
                onClick={() => startEdit(event)}
                className="grid min-h-11 min-w-11 place-items-center rounded-full border border-line bg-white text-muted transition hover:border-brand hover:text-brand"
                aria-label={`${event.title} 수정`}
                title="행사 수정"
              >
                <Pencil size={17} aria-hidden />
              </button>
            </div>
          </article>
        ))}
      </div>

      {sortedEvents.length === 0 ? (
        <div className="grid place-items-center gap-3 px-4 py-14 text-center">
          <span className="grid h-11 w-11 place-items-center rounded bg-brand/10 text-brand"><CalendarDays size={21} aria-hidden /></span>
          <p className="font-semibold text-ink">아직 등록한 행사가 없어요.</p>
          <button type="button" onClick={startCreate} className="text-sm font-semibold text-brand">첫 행사 등록하기</button>
        </div>
      ) : null}

      {isComposerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/45 p-0 sm:items-center sm:justify-center sm:p-6" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="event-composer-title" className="max-h-[92svh] w-full overflow-y-auto rounded-t bg-[#fffefa] shadow-soft sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <p className="text-sm font-semibold text-brand">{editingId ? "행사 기록 다듬기" : "새로운 행사 기록"}</p>
                <h3 id="event-composer-title" className="mt-1 text-xl font-semibold text-ink">
                  {editingId ? "행사 내용을 다듬어 주세요." : "행사명과 날짜부터 적어 주세요."}
                </h3>
              </div>
              <button type="button" onClick={closeComposer} className="grid min-h-11 min-w-11 place-items-center rounded border border-line text-muted" aria-label="행사 입력 닫기" title="닫기">
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="grid gap-4 p-5">
              {!editingId ? (
                <div className="flex items-center gap-3 rounded-xl border border-line bg-brand/5 p-3 text-sm text-muted">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand"><ImageIcon size={18} aria-hidden /></span>
                  <span>행사 등록 뒤 대표 사진을 더하면, 우리 기관의 행사 앨범과 안내문에 함께 활용할 수 있어요.</span>
                </div>
              ) : null}
              <Field label="행사명" htmlFor="event-title" required>
                <input id="event-title" value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="예: 가족 운동회" className="w-full rounded border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" autoFocus />
              </Field>
              <Field label="행사일" htmlFor="event-date" required>
                <input id="event-date" type="date" value={form.eventDate} onChange={(event) => updateField("eventDate", event.target.value)} className="w-full rounded border border-line px-3 py-2.5 text-sm outline-none focus:border-brand" />
              </Field>

              <button type="button" onClick={() => setShowDetails((current) => !current)} className="inline-flex min-h-11 items-center justify-between rounded border border-line bg-surface px-3 text-sm font-semibold text-muted" aria-expanded={showDetails} aria-controls="event-details">
                <span>{showDetails ? "상세 입력 접기" : "대상, 반, 준비물 더 입력하기"}</span>
                {showDetails ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
              </button>

              {showDetails ? (
                <div id="event-details" className="grid gap-4 rounded border border-line bg-surface p-3">
                  <div className="flex flex-wrap gap-2">
                    {eventTemplates.map((template) => <button key={template.title} type="button" onClick={() => applyTemplate(template)} className="min-h-10 rounded border border-line bg-white px-3 text-sm font-semibold text-muted">{template.title}</button>)}
                  </div>
                  <Field label="기관" htmlFor="event-organization"><select id="event-organization" value={form.organizationId} onChange={(event) => updateField("organizationId", event.target.value)} className="w-full rounded border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand">{availableOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="대상" htmlFor="event-audience"><input id="event-audience" value={form.audience} onChange={(event) => updateField("audience", event.target.value)} placeholder="예: 만 3-5세" className="w-full rounded border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand" /></Field>
                    <Field label="반/학급" htmlFor="event-classes"><input id="event-classes" value={form.classNames} onChange={(event) => updateField("classNames", event.target.value)} placeholder="쉼표로 구분" className="w-full rounded border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand" /></Field>
                  </div>
                  <Field label="행사 설명" htmlFor="event-description"><textarea id="event-description" value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={3} placeholder="행사 내용과 촬영 포인트를 적어주세요." className="w-full resize-none rounded border border-line bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-brand" /></Field>
                  <Field label="준비물" htmlFor="event-supplies"><input id="event-supplies" value={form.supplies} onChange={(event) => updateField("supplies", event.target.value)} placeholder="쉼표로 구분" className="w-full rounded border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand" /></Field>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeComposer} className="inline-flex min-h-11 items-center justify-center rounded border border-line bg-white px-4 py-2.5 text-sm font-semibold text-muted">취소</button>
                <button type="button" onClick={saveEvent} disabled={isSaving || !form.title.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                  {editingId ? <Save size={18} aria-hidden /> : <CalendarPlus size={18} aria-hidden />}
                  {isSaving ? "저장 중" : editingId ? "수정 저장" : "행사 등록"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function createEmptyForm(organizationId = getPrimaryOrganizationId()): EventFormState {
  return {
    organizationId,
    title: "",
    eventDate: "2026-06-03",
    audience: "전체 원아",
    classNames: "전체",
    description: "",
    supplies: ""
  };
}

function EventDate({ eventDate }: { eventDate: string }) {
  const date = new Date(`${eventDate}T00:00:00`);

  return (
    <div className="grid w-14 shrink-0 place-items-center rounded border border-line bg-surface px-1 py-2 text-center leading-none">
      <span className="text-[11px] font-semibold text-brand">
        {new Intl.DateTimeFormat("ko-KR", { month: "short" }).format(date)}
      </span>
      <span className="mt-1 text-xl font-semibold text-ink">
        {new Intl.DateTimeFormat("ko-KR", { day: "numeric" }).format(date)}
      </span>
    </div>
  );
}

function getReminderLabel(status: EventSchedule["reminderStatus"]) {
  const labels = {
    not_scheduled: "안내 설정 필요",
    scheduled: "안내 예정",
    sent: "안내 완료",
    failed: "확인 필요"
  };

  return labels[status];
}

function Field({
  label,
  htmlFor,
  children,
  required = false
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-ink" htmlFor={htmlFor}>
      {label}{required ? <span className="ml-1 text-coral">*</span> : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEvent(
  event: EventSchedule,
  fallback: {
    title: string;
    eventDate: string;
    audience: string;
    description: string;
    classNames: string[];
    supplies: string[];
    organizationId: string;
  }
): EventSchedule {
  return {
    ...event,
    title: event.title ?? fallback.title,
    eventDate: event.eventDate ?? fallback.eventDate,
    audience: event.audience ?? fallback.audience,
    description: event.description ?? fallback.description,
    organizationId: event.organizationId ?? fallback.organizationId,
    classNames: Array.isArray(event.classNames) ? event.classNames : fallback.classNames,
    supplies: Array.isArray(event.supplies) ? event.supplies : fallback.supplies
  };
}

function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data?: unknown }).data
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

function getReminderTone(status: EventSchedule["reminderStatus"]) {
  if (status === "sent") {
    return "green";
  }

  if (status === "scheduled") {
    return "blue";
  }

  if (status === "failed") {
    return "red";
  }

  return "amber";
}
