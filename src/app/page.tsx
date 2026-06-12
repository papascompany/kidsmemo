import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Gift,
  ShieldCheck,
} from "lucide-react";
import { AiWorkbench } from "@/components/ai-workbench";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { EventManager } from "@/components/event-manager";
import { JumbokidsCouponWallet } from "@/components/jumbokids-coupon-wallet";
import { OrganizationWorkspace } from "@/components/organization-workspace";
import { Section } from "@/components/section";
import {
  messageDeliveries,
  messageJobs,
  profiles,
} from "@/lib/mock-data";
import { formatDateTime } from "@/lib/format";
import { getReminderHealth } from "@/lib/reminders";
import { getRuntimeBackendState } from "@/lib/runtime-state";

export default function Home() {
  const queuedJobs = messageJobs.filter((job) => job.status === "queued");
  const sentDeliveries = messageDeliveries.filter((delivery) => delivery.status === "sent");
  const health = getReminderHealth();
  const runtimeState = getRuntimeBackendState();

  return (
    <AppShell>
      <section id="dashboard" className="min-w-0 scroll-mt-32 py-3 lg:scroll-mt-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand">오늘의 운영</p>
            <h1 className="text-wrap-anywhere mt-2 max-w-3xl text-2xl font-semibold leading-tight tracking-normal text-ink sm:text-3xl md:text-4xl">
              바쁜 원장님과 선생님을 위한 3단계 업무 화면입니다.
            </h1>
            <p className="text-wrap-anywhere mt-3 max-w-3xl text-sm leading-6 text-muted">
              행사 확인, 쿠폰 저장, 학부모 문구 생성만 먼저 보이게 정리했습니다.
              세부 설정과 운영 상태는 필요할 때만 아래에서 확인합니다.
            </p>
          </div>
          <div className="flex max-w-full flex-wrap gap-2">
            <Badge tone="green">클릭 동선 축소</Badge>
            <Badge tone="blue">모바일 우선</Badge>
            <Badge tone="amber">Mock Fallback</Badge>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <QuickAction
            href="#calendar"
            icon={CalendarDays}
            title="행사 하나 등록"
            description="행사명과 날짜만 먼저 적고 저장합니다."
          />
          <QuickAction
            href="#coupons"
            icon={Gift}
            title="쿠폰 코드 저장"
            description="점보키즈 쿠폰을 복사하거나 내려받습니다."
          />
          <QuickAction
            href="#ai-helper"
            icon={ClipboardCheck}
            title="안내 문구 만들기"
            description="행사명만 넣고 바로 초안을 만듭니다."
          />
        </div>

        <div className="mt-6">
          <OrganizationWorkspace />
        </div>

        <div className="mt-6 grid gap-3 rounded border border-line bg-white p-4 shadow-soft md:grid-cols-3">
          <Metric label="내일 행사" value={`${health.tomorrowEvents}건`} />
          <Metric label="사용 가능 쿠폰" value={`${health.availableStaffCoupons}개`} />
          <Metric label="발송 대기" value={`${queuedJobs.length}건`} />
        </div>
      </section>

      <Section
        id="calendar"
        eyebrow="Calendar"
        title="연간 행사 일정"
        description="원별 행사를 등록하고 준비물, 일정 상태, 행사 전 안내 작업을 한곳에서 점검합니다."
      >
        <div className="grid gap-4">
          <EventManager />

          <aside className="rounded border border-line bg-white p-4 shadow-soft">
            <h3 className="text-lg font-semibold text-ink">내일 발송 점검</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Metric label="내일 행사" value={`${health.tomorrowEvents}건`} />
              <Metric label="제공 쿠폰" value={`${health.availableStaffCoupons}개`} />
              <Metric label="발송 채널" value={health.providerOrder.join(" → ")} />
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
        <JumbokidsCouponWallet />
      </Section>

      <Section
        id="ai-helper"
        eyebrow="AI"
        title="행사 아이디어와 학부모 메시지"
        description="행사 도우미와 감동 문구 생성기는 결과를 저장, 복사, 인쇄할 수 있는 운영형 도구로 구성했습니다."
      >
        <AiWorkbench />
      </Section>

      <Section
        id="admin"
        eyebrow="Admin"
        title="관리 콘솔"
        description="발송 상태, 외부 API 상태, 가입/권한 흐름을 한눈에 점검합니다."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded border border-line bg-white p-4 shadow-soft">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <ShieldCheck size={20} aria-hidden />
              인증 흐름
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-muted">
              <li>카카오계정 OAuth</li>
              <li>구글계정 OAuth</li>
              <li>이메일/비밀번호 직접가입</li>
              <li>기관 생성 또는 초대 코드 참여</li>
            </ul>
          </div>
          <div className="rounded border border-line bg-white p-4 shadow-soft">
            <h3 className="text-lg font-semibold text-ink">최근 발송</h3>
            <div className="mt-3 grid gap-3">
              {messageJobs.map((job) => (
                <div key={job.id} className="rounded border border-line bg-surface p-3 text-sm">
                  <p className="font-semibold text-ink">{formatDateTime(job.scheduledFor)}</p>
                  <p className="mt-1 text-muted">
                    {job.recipientCount}명 · {job.channels.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded border border-line bg-white p-4 shadow-soft">
            <h3 className="text-lg font-semibold text-ink">회원/권한</h3>
            <div className="mt-3 grid gap-2">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between rounded border border-line bg-surface p-3 text-sm">
                  <span className="font-semibold text-ink">{profile.name}</span>
                  <Badge tone={profile.role === "admin" ? "amber" : "gray"}>{profile.role}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded border border-line bg-white p-4 shadow-soft">
            <h3 className="text-lg font-semibold text-ink">런타임 모드</h3>
            <div className="mt-3 grid gap-3 text-sm">
              <div className="rounded border border-line bg-surface p-3">
                <p className="font-semibold text-ink">{runtimeState.modeLabel}</p>
                <p className="mt-1 text-muted">현재 데이터 백엔드가 실제 Supabase로 전환되지 않았습니다.</p>
              </div>
              <div className="flex items-center justify-between rounded border border-line bg-surface px-3 py-2">
                <span className="text-muted">Supabase 전환 잠금</span>
                <Badge tone={runtimeState.liveSupabaseArmed ? "green" : "amber"}>
                  {runtimeState.lockLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded border border-line bg-surface px-3 py-2">
                <span className="text-muted">요청 백엔드</span>
                <span className="font-semibold text-ink">{runtimeState.requestedBackend}</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <div className="no-print h-10" />
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-surface p-3">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description
}: {
  href: string;
  icon: typeof CalendarDays;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group flex min-h-28 items-center justify-between gap-4 rounded border border-line bg-white p-4 shadow-soft transition hover:border-brand"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded bg-surface text-brand">
          <Icon size={21} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
        </div>
      </div>
      <ArrowRight
        size={18}
        className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
        aria-hidden
      />
    </a>
  );
}
