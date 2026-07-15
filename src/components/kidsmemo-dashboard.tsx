"use client";

import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Gift,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AiWorkbench } from "@/components/ai-workbench";
import { AttendanceQuickCheck } from "@/components/attendance-quick-check";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { EventManager } from "@/components/event-manager";
import { JumbokidsCouponWallet } from "@/components/jumbokids-coupon-wallet";
import { LeaveRequestPanel } from "@/components/leave-request-panel";
import { OrganizationWorkspace } from "@/components/organization-workspace";
import { Section } from "@/components/section";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { messageJobs } from "@/lib/mock-data";
import type { OrganizationContext } from "@/lib/organization-context";
import { getReminderHealth } from "@/lib/reminders";
import type { EventSchedule } from "@/lib/types";

const dashboardPhoto =
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1600&q=85";

export function KidsmemoDashboard() {
  const [liveContext, setLiveContext] = useState<OrganizationContext | null>(null);
  const [liveStatus, setLiveStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const queuedJobs = messageJobs.filter((job) => job.status === "queued");
  const health = getReminderHealth();
  const liveOrganizations = useMemo(
    () => (liveContext ? [liveContext.organization] : undefined),
    [liveContext]
  );
  const upcomingEvents = useMemo(
    () => {
      const today = new Date().toISOString().slice(0, 10);

      return (liveContext?.events ?? [])
        .filter((event) => event.eventDate >= today)
        .sort((left, right) => left.eventDate.localeCompare(right.eventDate))
        .slice(0, 3);
    },
    [liveContext]
  );
  const primaryTask = health.tomorrowEvents > 0
    ? {
        title: "내일 행사를 최종 점검하세요.",
        description: `내일 예정된 ${health.tomorrowEvents}건의 행사 준비와 학부모 안내 상태를 확인합니다.`
      }
    : {
        title: "다가오는 행사 준비를 시작하세요.",
        description: "일정을 확인하고 준비물과 학부모 안내 업무를 차례로 정리합니다."
      };

  useEffect(() => {
    let isMounted = true;

    async function loadLiveContext() {
      try {
        const response = await authenticatedFetch("/api/session/context");
        if (!response.ok) {
          if (isMounted) {
            setLiveStatus("fallback");
          }
          return;
        }

        const context = unwrapData<OrganizationContext>(await response.json());
        if (isMounted) {
          setLiveContext(context);
          setLiveStatus("ready");
        }
      } catch {
        if (isMounted) {
          setLiveStatus("fallback");
        }
      }
    }

    void loadLiveContext();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell>
      <section id="dashboard" className="min-w-0 scroll-mt-32 py-3 lg:scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand">한샘유치원의 오늘</p>
            <h1 className="text-wrap-anywhere mt-1 text-2xl font-semibold leading-tight tracking-normal text-ink sm:text-3xl">
              사진 한 장으로 오늘의 이야기를 시작하세요.
            </h1>
          </div>
          <Badge tone={liveStatus === "ready" ? "green" : "amber"}>
            {liveStatus === "ready" ? "Live Supabase" : liveStatus === "loading" ? "세션 확인 중" : "Mock Fallback"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-start">
          <article
            className="relative min-w-0 overflow-hidden rounded-2xl border border-line bg-ink p-5 text-white shadow-soft sm:p-6"
            style={{ backgroundImage: `url(${dashboardPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <div className="absolute inset-0 bg-ink/72" />
            <div className="relative">
            <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-white/15" aria-hidden>
                <CalendarDays size={18} />
              </span>
              오늘의 한 장
            </div>
            <h2 className="text-wrap-anywhere mt-5 max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl">{primaryTask.title}</h2>
            <p className="text-wrap-anywhere mt-3 max-w-xl text-sm leading-6 text-white/84">{primaryTask.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="#calendar" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink">
                행사 일정 열기
                <ArrowRight size={16} aria-hidden />
              </a>
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/90">발송 대기 {queuedJobs.length}건</span>
            </div>
            </div>
          </article>

          <aside className="rounded-2xl border border-line bg-[#fffefa] p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">다가오는 일정과 작업</p>
                <p className="mt-1 text-sm text-muted">날짜 순으로 바로 이어서 처리합니다.</p>
              </div>
              <a href="#calendar" className="shrink-0 text-sm font-semibold text-brand">전체 일정</a>
            </div>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => <UpcomingEvent key={event.id} event={event} />)
              ) : (
                <>
                  <UpcomingAction label="오늘" title="내일 행사 점검" detail={`${health.tomorrowEvents}건의 행사 확인`} href="#calendar" />
                  <UpcomingAction label="오늘" title="쿠폰 저장" detail={`${health.availableStaffCoupons}개 사용 가능`} href="#coupons" />
                  <UpcomingAction label="다음" title="학부모 안내 문구" detail={`${queuedJobs.length}건 발송 대기`} href="#ai-helper" />
                </>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <TodayTask href="#coupons" icon={Gift} title="쿠폰함 정리" description={`${health.availableStaffCoupons}개의 사용 가능 쿠폰을 확인합니다.`} status="쿠폰함" />
          <TodayTask href="#ai-helper" icon={ClipboardCheck} title="안내 문구 준비" description="행사 안내 초안을 만들고 저장합니다." status="AI 도움" />
          <TodayTask href="#calendar" icon={CalendarDays} title="발송 상태 확인" description={`${queuedJobs.length}건의 대기 작업을 일정과 함께 점검합니다.`} status="일정 관리" />
        </div>

        <div className="mt-5">
          <AttendanceQuickCheck context={liveContext} />
        </div>

        {liveContext ? (
          <div className="mt-5">
            <LeaveRequestPanel
              organizationId={liveContext.organization.id}
              userRole={liveContext.director?.role ?? "teacher"}
            />
          </div>
        ) : null}

        <details className="group mt-5 rounded-2xl border border-line bg-[#fffefa] shadow-soft">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-ink marker:hidden">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Sparkles size={17} className="shrink-0 text-brand" aria-hidden />
              기관 운영 상세와 저장된 기록 보기
            </span>
            <span className="shrink-0 text-xs text-muted group-open:hidden">펼치기</span>
            <span className="hidden shrink-0 text-xs text-muted group-open:inline">접기</span>
          </summary>
          <div className="border-t border-line p-3 sm:p-4">
            <OrganizationWorkspace context={liveContext} liveMode={liveStatus === "ready"} />
          </div>
        </details>
      </section>

      <Section
        id="calendar"
        eyebrow="Calendar"
        title="연간 행사 일정"
        description="원별 행사를 등록하고 준비물, 일정 상태, 행사 전 안내 작업을 한곳에서 점검합니다."
      >
        <div className="grid gap-4">
          <EventManager
            availableOrganizations={liveOrganizations}
            initialEventList={liveContext?.events}
            initialOrganizationId={liveContext?.organization.id}
          />

          <aside className="rounded-xl border border-line bg-[#fffefa] p-4 shadow-soft">
            <h3 className="text-lg font-semibold text-ink">내일 발송 점검</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Metric label="내일 행사" value={`${health.tomorrowEvents}건`} />
              <Metric label="제공 쿠폰" value={`${health.availableStaffCoupons}개`} />
              <Metric label="발송 채널" value={health.providerOrder.join(" -> ")} />
            </div>
          </aside>
        </div>
      </Section>

      <Section
        id="coupons"
        eyebrow="Coupons"
        title="점보키즈 쿠폰함"
        description="점보키즈 관리자가 원장님과 선생님께 제공한 쿠폰/할인코드를 다운로드하고, 점보키즈 또는 고도몰에서 사용할 수 있습니다."
      >
        <JumbokidsCouponWallet initialContext={liveContext} liveMode={liveStatus === "ready"} />
      </Section>

      <Section
        id="ai-helper"
        eyebrow="AI"
        title="행사 아이디어와 학부모 메시지"
        description="행사 도우미와 감동 문구 생성기는 결과를 저장, 복사, 인쇄할 수 있는 운영형 도구로 구성했습니다."
      >
        <AiWorkbench organizationId={liveContext?.organization.id} />
      </Section>

      <div className="no-print h-10" />
    </AppShell>
  );
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-surface p-3">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

function UpcomingEvent({ event }: { event: EventSchedule }) {
  const date = new Date(`${event.eventDate}T00:00:00`);
  const month = new Intl.DateTimeFormat("ko-KR", { month: "short" }).format(date);
  const day = new Intl.DateTimeFormat("ko-KR", { day: "numeric" }).format(date);
  const status = event.reminderStatus === "sent"
    ? "발송 완료"
    : event.reminderStatus === "scheduled"
      ? "안내 예정"
      : "안내 설정 필요";

  return (
    <a href="#calendar" className="group flex items-center gap-3 py-3 transition hover:bg-surface">
      <span className="grid w-12 shrink-0 place-items-center rounded border border-line bg-surface px-1 py-2 text-center leading-none">
        <span className="text-[11px] font-semibold text-brand">{month}</span>
        <span className="mt-1 text-lg font-semibold text-ink">{day}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{event.title}</span>
        <span className="mt-1 block truncate text-xs text-muted">{status}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
    </a>
  );
}

function UpcomingAction({ label, title, detail, href }: { label: string; title: string; detail: string; href: string }) {
  return (
    <a href={href} className="group flex items-center gap-3 py-3 transition hover:bg-surface">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded border border-line bg-surface px-1 text-center text-xs font-semibold text-brand">{label}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block truncate text-xs text-muted">{detail}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
    </a>
  );
}

function TodayTask({
  href,
  icon: Icon,
  title,
  description,
  status
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <a
      href={href}
      className="group flex min-h-32 flex-col justify-between rounded-xl border border-line bg-[#fffefa] p-4 transition hover:border-brand hover:bg-brand/5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-white text-brand">
            <Icon size={18} aria-hidden />
          </span>
        </div>
        <p className="mt-3 text-base font-semibold text-ink">{title}</p>
        <p className="text-wrap-anywhere mt-2 text-sm leading-5 text-muted">{description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm font-semibold text-brand">
        <span>{status}</span>
        <ArrowRight
          size={17}
          className="shrink-0 transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </a>
  );
}
