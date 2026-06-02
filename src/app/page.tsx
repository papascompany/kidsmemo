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
import { CouponManager } from "@/components/coupon-manager";
import { EventManager } from "@/components/event-manager";
import { Section } from "@/components/section";
import { StatCard } from "@/components/stat-card";
import {
  couponCampaigns,
  events,
  messageDeliveries,
  messageJobs,
  organizations,
  profiles
} from "@/lib/mock-data";
import { formatDateTime } from "@/lib/format";
import { getReminderHealth } from "@/lib/reminders";

export default function Home() {
  const queuedJobs = messageJobs.filter((job) => job.status === "queued");
  const sentDeliveries = messageDeliveries.filter((delivery) => delivery.status === "sent");
  const health = getReminderHealth();

  return (
    <AppShell>
      <section id="dashboard" className="py-3">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold text-brand">운영 대시보드</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal text-ink md:text-4xl">
              행사 전날, 점보키즈 혜택과 따뜻한 안내가 자동으로 도착합니다.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              어린이집과 유치원 원장님, 선생님이 연간 행사를 관리하고 쿠폰 발행 방식,
              발송 채널, AI 행사 아이디어를 한곳에서 운영할 수 있는 SaaS입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">Kakao · Google · 직접가입</Badge>
            <Badge tone="blue">Pretendard</Badge>
            <Badge tone="amber">반응형 웹</Badge>
          </div>
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
            value={`${couponCampaigns.filter((campaign) => campaign.isActive).length}`}
            note="API 발급과 수동발행 지원"
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
        description="원별 행사에 쿠폰 캠페인을 연결하고, 전날 배치가 발송 대상을 계산합니다."
      >
        <div className="grid gap-4">
          <EventManager />

          <aside className="rounded border border-line bg-white p-4 shadow-soft">
            <h3 className="text-lg font-semibold text-ink">내일 발송 점검</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Metric label="내일 행사" value={`${health.tomorrowEvents}건`} />
              <Metric label="활성 쿠폰 캠페인" value={`${health.activeCampaigns}개`} />
              <Metric label="발송 채널" value={health.providerOrder.join(" → ")} />
            </div>
          </aside>
        </div>
      </Section>

      <Section
        id="coupons"
        eyebrow="Coupons"
        title="쿠폰발행 관리"
        description="캠페인 생성 시 점보키즈 API 발급 또는 수동발행을 선택합니다. 수동 쿠폰은 HTML 또는 단일 이미지 안내와 함께 하나의 랜딩 페이지로 묶입니다."
      >
        <CouponManager />
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
