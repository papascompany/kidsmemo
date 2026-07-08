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
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { EventManager } from "@/components/event-manager";
import { JumbokidsCouponWallet } from "@/components/jumbokids-coupon-wallet";
import { OrganizationWorkspace } from "@/components/organization-workspace";
import { Section } from "@/components/section";
import { authenticatedFetch } from "@/lib/auth-fetch";
import { messageJobs } from "@/lib/mock-data";
import type { OrganizationContext } from "@/lib/organization-context";
import { getReminderHealth } from "@/lib/reminders";

export function KidsmemoDashboard() {
  const [liveContext, setLiveContext] = useState<OrganizationContext | null>(null);
  const [liveStatus, setLiveStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const queuedJobs = messageJobs.filter((job) => job.status === "queued");
  const health = getReminderHealth();
  const liveOrganizations = useMemo(
    () => (liveContext ? [liveContext.organization] : undefined),
    [liveContext]
  );

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
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)] xl:items-start">
          <div className="min-w-0 rounded border border-line bg-white p-4 shadow-soft sm:p-5">
            <p className="text-sm font-semibold text-brand">오늘의 운영</p>
            <h1 className="text-wrap-anywhere mt-2 max-w-3xl text-2xl font-semibold leading-tight tracking-normal text-ink sm:text-3xl">
              오늘 해야 할 일만 먼저 확인하세요.
            </h1>
            <p className="text-wrap-anywhere mt-2 max-w-2xl text-sm leading-6 text-muted">
              행사 점검, 쿠폰 저장, 안내 문구 생성 순서로 바로 이동합니다.
              기관 상세와 운영 기록은 아래 접힌 영역에서 필요할 때만 엽니다.
            </p>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <TodayTask
                href="#calendar"
                icon={CalendarDays}
                step="1"
                title="내일 행사 점검"
                description={`${health.tomorrowEvents}건의 행사와 준비 상태를 확인합니다.`}
                status="일정 관리"
              />
              <TodayTask
                href="#coupons"
                icon={Gift}
                step="2"
                title="쿠폰 저장"
                description={`${health.availableStaffCoupons}개의 사용 가능 쿠폰을 복사하거나 내려받습니다.`}
                status="쿠폰함"
              />
              <TodayTask
                href="#ai-helper"
                icon={ClipboardCheck}
                step="3"
                title="안내 문구 만들기"
                description="행사명만 넣고 학부모 안내 초안을 만듭니다."
                status="AI 도움"
              />
            </div>
          </div>

          <aside className="rounded border border-line bg-white p-4 shadow-soft">
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">오늘 할 일</Badge>
              <Badge tone={liveStatus === "ready" ? "green" : "amber"}>
                {liveStatus === "ready" ? "Live Supabase" : liveStatus === "loading" ? "세션 확인 중" : "Mock Fallback"}
              </Badge>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink">빠른 요약</h2>
            <div className="mt-3 grid gap-2">
              <Metric label="내일 행사" value={`${health.tomorrowEvents}건`} />
              <Metric label="사용 가능 쿠폰" value={`${health.availableStaffCoupons}개`} />
              <Metric label="발송 대기" value={`${queuedJobs.length}건`} />
            </div>
            <a
              href="#calendar"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white"
            >
              오늘 업무 시작
              <ArrowRight size={16} aria-hidden />
            </a>
          </aside>
        </div>

        <details className="group mt-5 rounded border border-line bg-white shadow-soft">
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

          <aside className="rounded border border-line bg-white p-4 shadow-soft">
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

function TodayTask({
  href,
  icon: Icon,
  step,
  title,
  description,
  status
}: {
  href: string;
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <a
      href={href}
      className="group flex min-h-40 flex-col justify-between rounded border border-line bg-surface p-4 transition hover:border-brand hover:bg-white"
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-white text-brand">
            <Icon size={18} aria-hidden />
          </span>
          <span className="rounded border border-line bg-white px-2 py-1 text-xs font-semibold text-muted">
            {step}
          </span>
        </div>
        <p className="mt-4 text-base font-semibold text-ink">{title}</p>
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
