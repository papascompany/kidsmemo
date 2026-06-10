import {
  CalendarDays,
  Gift,
  MessageCircle,
  ShieldCheck,
  Users
} from "lucide-react";
import { AiWorkbench } from "@/components/ai-workbench";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { EventManager } from "@/components/event-manager";
import { JumbokidsCouponWallet } from "@/components/jumbokids-coupon-wallet";
import { OrganizationWorkspace } from "@/components/organization-workspace";
import { Section } from "@/components/section";
import { StatCard } from "@/components/stat-card";
import {
  events,
  messageDeliveries,
  messageJobs,
  organizations,
  profiles,
  staffCoupons
} from "@/lib/mock-data";
import { formatDateTime } from "@/lib/format";
import { getReminderHealth } from "@/lib/reminders";

export default function Home() {
  const queuedJobs = messageJobs.filter((job) => job.status === "queued");
  const sentDeliveries = messageDeliveries.filter((delivery) => delivery.status === "sent");
  const health = getReminderHealth();

  return (
    <AppShell>
      <section id="dashboard" className="min-w-0 scroll-mt-32 py-3 lg:scroll-mt-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand">Director Workspace</p>
            <h1 className="text-wrap-anywhere mt-2 max-w-3xl text-2xl font-semibold leading-tight tracking-normal text-ink sm:text-3xl md:text-4xl">
              원장님의 기관 운영을 한눈에 보는 키즈메모 마이페이지입니다.
            </h1>
            <p className="text-wrap-anywhere mt-3 max-w-3xl text-sm leading-6 text-muted">
              현재 기관 컨텍스트를 먼저 확인하고, 행사 일정, AI 조언 이력, 쿠폰 혜택,
              발송 상태를 부드러운 운영 워크스페이스 안에서 이어서 관리합니다.
            </p>
          </div>
          <div className="flex max-w-full flex-wrap gap-2">
            <Badge tone="green">Kakao · Google · 직접가입</Badge>
            <Badge tone="blue">Pretendard</Badge>
            <Badge tone="amber">반응형 웹</Badge>
          </div>
        </div>

        <div className="mt-6">
          <OrganizationWorkspace />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="등록 기관"
            value={`${organizations.length}`}
            note="어린이집/유치원 멀티테넌트"
            icon={Users}
          />
          <StatCard
            label="연간 행사"
            value={`${events.length}`}
            note="반복/단발 일정 포함"
            icon={CalendarDays}
          />
          <StatCard
            label="활성 쿠폰"
            value={`${staffCoupons.filter((coupon) => coupon.status !== "used").length}`}
            note="교직원 제공 혜택"
            icon={Gift}
          />
          <StatCard
            label="발송 대기"
            value={`${queuedJobs.length}`}
            note="알림톡 → SMS/LMS → 이메일"
            icon={MessageCircle}
          />
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
