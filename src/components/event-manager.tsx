"use client";

import { CalendarPlus, CheckCircle2, Pencil, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "./badge";
import { events as initialEvents, organizations } from "@/lib/mock-data";
import { formatDate } from "@/lib/format";
import type { EventSchedule } from "@/lib/types";

type EventFormState = {
  organizationId: string;
  title: string;
  eventDate: string;
  audience: string;
  classNames: string;
  description: string;
  supplies: string;
};

const emptyForm: EventFormState = {
  organizationId: organizations[0]?.id ?? "",
  title: "",
  eventDate: "2026-06-03",
  audience: "전체 원아",
  classNames: "전체",
  description: "",
  supplies: ""
};

export function EventManager() {
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState<EventFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [events]
  );
  const editingEvent = events.find((event) => event.id === editingId);

  function updateField(name: keyof EventFormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(event: EventSchedule) {
    setEditingId(event.id);
    setStatus(null);
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
    setForm(emptyForm);
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
      const response = await fetch(editingId ? `/api/events/${editingId}` : "/api/events", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!editingId) {
        setForm({ ...emptyForm, title: "", description: "", supplies: "" });
      }
    } catch {
      setStatus("저장에 실패했습니다. 입력값과 API 상태를 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
      <div className="rounded border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {editingId ? "행사 수정" : "행사 등록"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              행사 일정, 대상, 준비물을 기록해 원장님 워크스페이스에서 흐름을 확인합니다.
            </p>
          </div>
          {editingId ? <Badge tone="blue">수정 중</Badge> : <Badge tone="green">신규</Badge>}
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="기관" htmlFor="event-organization">
            <select
              id="event-organization"
              value={form.organizationId}
              onChange={(event) => updateField("organizationId", event.target.value)}
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="행사명" htmlFor="event-title">
            <input
              id="event-title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="예: 가족 운동회"
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="행사일" htmlFor="event-date">
              <input
                id="event-date"
                type="date"
                value={form.eventDate}
                onChange={(event) => updateField("eventDate", event.target.value)}
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
            <Field label="대상" htmlFor="event-audience">
              <input
                id="event-audience"
                value={form.audience}
                onChange={(event) => updateField("audience", event.target.value)}
                placeholder="예: 만 3-5세"
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </Field>
          </div>

          <Field label="반/학급" htmlFor="event-classes">
            <input
              id="event-classes"
              value={form.classNames}
              onChange={(event) => updateField("classNames", event.target.value)}
              placeholder="쉼표로 구분"
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </Field>

          <Field label="행사 설명" htmlFor="event-description">
            <textarea
              id="event-description"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={3}
              placeholder="행사 내용과 촬영 포인트를 적어주세요."
              className="w-full resize-none rounded border border-line px-3 py-2 text-sm leading-6 outline-none focus:border-brand"
            />
          </Field>

          <Field label="준비물" htmlFor="event-supplies">
            <input
              id="event-supplies"
              value={form.supplies}
              onChange={(event) => updateField("supplies", event.target.value)}
              placeholder="쉼표로 구분"
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={saveEvent}
            disabled={isSaving || !form.title.trim()}
            className="inline-flex items-center justify-center gap-2 rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {editingId ? <Save size={18} aria-hidden /> : <CalendarPlus size={18} aria-hidden />}
            {isSaving ? "저장 중" : editingId ? "수정 저장" : "행사 등록"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-2 rounded border border-line bg-white px-4 py-2.5 text-sm font-semibold text-muted"
            >
              <RotateCcw size={18} aria-hidden />
              신규 등록으로 전환
            </button>
          ) : null}
        </div>

        {status ? <p className="mt-3 text-sm font-semibold text-muted">{status}</p> : null}
        {editingEvent ? (
          <p className="mt-2 text-xs leading-5 text-muted">
            현재 API 계약상 삭제는 백엔드 스프린트 범위에 포함되지 않았습니다.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded border border-line bg-white shadow-soft">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_auto] border-b border-line bg-surface px-4 py-3 text-sm font-semibold text-muted max-lg:hidden">
          <span>행사</span>
          <span>일정</span>
          <span>상태</span>
          <span className="text-right">관리</span>
        </div>
        <div className="divide-y divide-line">
          {sortedEvents.map((event) => {
            return (
              <article
                key={event.id}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[1.4fr_0.8fr_0.6fr_auto]"
              >
                <div>
                  <h3 className="font-semibold text-ink">{event.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {event.description || "설명 없음"} · {event.classNames.join(", ")}
                  </p>
                </div>
                <p className="text-sm font-semibold text-ink">{formatDate(event.eventDate)}</p>
                <div>
                  <Badge tone={getReminderTone(event.reminderStatus)}>{event.reminderStatus}</Badge>
                </div>
                <div className="flex justify-start lg:justify-end">
                  <button
                    type="button"
                    onClick={() => startEdit(event)}
                    className="inline-flex h-9 items-center gap-2 rounded border border-line bg-white px-3 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand"
                  >
                    <Pencil size={16} aria-hidden />
                    수정
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-ink" htmlFor={htmlFor}>
      {label}
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
