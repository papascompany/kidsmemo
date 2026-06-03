import {
  CalendarDays,
  ChevronRight,
  History,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Settings2,
  Sparkles,
  UserRound,
  Users
} from "lucide-react";
import { Badge } from "./badge";
import {
  couponCampaigns,
  events,
  getCampaignById,
  getCampaignItems,
  messageDeliveries,
  messageJobs,
  organizations,
  profiles
} from "@/lib/mock-data";
import { channelLabels, formatDate, formatDateTime, issueModeLabels, targetScopeLabels } from "@/lib/format";

const workspaceImage =
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1600&q=85";
const profileImage =
  "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80";
const aiImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80";
const couponImage =
  "https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?auto=format&fit=crop&w=900&q=80";

const aiAdviceHistory = [
  {
    id: "ai-1",
    eventName: "봄 소풍",
    createdAt: "2026-04-10T15:20:00+09:00",
    summary: "숲 체험 동선, 반별 포토존, 가정통신문 초안을 저장했습니다.",
    status: "재사용 가능"
  },
  {
    id: "ai-2",
    eventName: "졸업 발표회",
    createdAt: "2026-02-06T10:10:00+09:00",
    summary: "포토존 체크리스트와 졸업 앨범 안내 문구를 정리했습니다.",
    status: "발송 문구 연결"
  }
];

export function OrganizationWorkspace() {
  const currentOrganization = organizations[0];
  const director = profiles.find(
    (profile) => profile.organizationId === currentOrganization.id && profile.role === "owner"
  );
  const organizationEvents = events
    .filter((event) => event.organizationId === currentOrganization.id)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const organizationCampaigns = couponCampaigns.filter(
    (campaign) =>
      campaign.targetScope === "all_members" ||
      campaign.selectedOrganizationIds.includes(currentOrganization.id)
  );
  const organizationEventIds = new Set(organizationEvents.map((event) => event.id));
  const organizationJobs = messageJobs.filter((job) => organizationEventIds.has(job.eventId));
  const organizationDeliveries = messageDeliveries.filter((delivery) =>
    organizationJobs.some((job) => job.id === delivery.jobId)
  );

  return (
    <div className="grid gap-5">
      <section
        className="relative overflow-hidden rounded border border-line bg-ink text-white shadow-soft"
        style={{ backgroundImage: `url(${workspaceImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-ink/88 via-ink/62 to-ink/18" />
        <div className="relative grid min-h-[430px] content-between gap-8 p-5 sm:p-7 lg:grid-cols-[1fr_360px] lg:p-8">
          <div className="flex max-w-3xl flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="green">현재 기관</Badge>
                <span className="rounded border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                  원장 워크스페이스
                </span>
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-normal sm:text-4xl lg:text-5xl">
                {currentOrganization.name} 운영실
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/86 sm:text-base">
                내 기관의 행사, AI 조언, 쿠폰 혜택, 발송 상태를 한 화면에서 확인합니다.
                지금 선택된 기관 범위 안에서 필요한 운영 정보를 먼저 확인하고, 세부 관리는 아래 도구에서 이어갑니다.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="기관 구성원" value={`${currentOrganization.memberCount}명`} />
              <HeroMetric label="등록 행사" value={`${organizationEvents.length}건`} />
              <HeroMetric label="발송 이력" value={`${organizationJobs.length}건`} />
            </div>
          </div>

          <div className="self-end rounded border border-white/24 bg-white/16 p-4 backdrop-blur-md">
            <p className="text-xs font-semibold text-white/75">기관 선택</p>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{currentOrganization.name}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-white/78">
                  <MapPin size={15} aria-hidden />
                  {currentOrganization.region}
                </p>
              </div>
              <Badge tone="blue">{currentOrganization.type === "daycare" ? "어린이집" : "유치원"}</Badge>
            </div>
            <div className="mt-4 rounded bg-white/14 p-3 text-sm leading-6 text-white/82">
              여러 기관을 맡은 계정은 이 위치에서 기관을 전환합니다. 원장/교사 화면은
              선택한 기관의 정보만 표시합니다.
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <ProfileCard director={director} organizationName={currentOrganization.name} />
        <ScheduleCard events={organizationEvents} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AiHistoryCard />
        <CouponSendingCard
          campaigns={organizationCampaigns}
          jobs={organizationJobs}
          deliveries={organizationDeliveries}
        />
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/20 bg-white/14 p-3 backdrop-blur">
      <p className="text-xs font-semibold text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ProfileCard({
  director,
  organizationName
}: {
  director?: (typeof profiles)[number];
  organizationName: string;
}) {
  return (
    <article className="overflow-hidden rounded border border-line bg-white shadow-soft">
      <div
        className="min-h-44 bg-cover bg-center p-4"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(23,32,51,0.08), rgba(23,32,51,0.58)), url(${profileImage})` }}
      >
        <div className="flex h-36 flex-col justify-end">
          <p className="text-sm font-semibold text-white/82">내 유치원 프로필</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">{organizationName}</h2>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <InfoLine icon={UserRound} label="담당 원장" value={director?.name ?? "김원장"} />
        <InfoLine icon={Phone} label="대표 연락처" value={director?.phone ?? "010-1234-5678"} />
        <InfoLine icon={Mail} label="계정 이메일" value={director?.email ?? "director@example.com"} />
        <InfoLine icon={Users} label="초대 상태" value="교사 1명 참여 · 초대코드 준비" />
      </div>
    </article>
  );
}

function ScheduleCard({ events: organizationEvents }: { events: typeof events }) {
  return (
    <article className="rounded border border-line bg-white p-4 shadow-soft">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-brand">행사 일정</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">내 기관 연간 행사</h2>
        </div>
        <a
          href="#calendar"
          className="inline-flex items-center justify-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-brand"
        >
          일정 관리
          <ChevronRight size={16} aria-hidden />
        </a>
      </div>
      <div className="mt-4 grid gap-3">
        {organizationEvents.map((event) => {
          const campaign = getCampaignById(event.couponCampaignId);

          return (
            <div key={event.id} className="rounded border border-line bg-surface p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {formatDate(event.eventDate)} · {event.audience} · {event.classNames.join(", ")}
                  </p>
                </div>
                <Badge tone={event.reminderStatus === "sent" ? "green" : "blue"}>
                  {event.reminderStatus}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted">
                연결 혜택: <span className="font-semibold text-ink">{campaign?.name ?? "미연결"}</span>
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function AiHistoryCard() {
  return (
    <article className="overflow-hidden rounded border border-line bg-white shadow-soft">
      <div
        className="min-h-36 bg-cover bg-center p-4"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(23,32,51,0.78), rgba(23,32,51,0.16)), url(${aiImage})` }}
      >
        <div className="flex min-h-28 flex-col justify-end">
          <p className="text-sm font-semibold text-white/78">AI 행사 조언</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">저장된 행사 조언</h2>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        {aiAdviceHistory.map((history) => (
          <div key={history.id} className="rounded border border-line bg-surface p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-2 font-semibold text-ink">
                  <Sparkles size={17} className="text-coral" aria-hidden />
                  {history.eventName}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">{history.summary}</p>
              </div>
              <Badge tone="amber">{history.status}</Badge>
            </div>
            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
              <History size={14} aria-hidden />
              {formatDateTime(history.createdAt)}
            </p>
          </div>
        ))}
        <a
          href="#ai-helper"
          className="inline-flex items-center justify-center gap-2 rounded bg-coral px-4 py-2.5 text-sm font-semibold text-white"
        >
          AI 도우미 열기
          <ChevronRight size={16} aria-hidden />
        </a>
      </div>
    </article>
  );
}

function CouponSendingCard({
  campaigns,
  jobs,
  deliveries
}: {
  campaigns: typeof couponCampaigns;
  jobs: typeof messageJobs;
  deliveries: typeof messageDeliveries;
}) {
  const latestJob = jobs[0];

  return (
    <article className="overflow-hidden rounded border border-line bg-white shadow-soft">
      <div className="grid md:grid-cols-[0.9fr_1.1fr]">
        <div
          className="min-h-64 bg-cover bg-center p-4 text-white"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(23,32,51,0.06), rgba(23,32,51,0.78)), url(${couponImage})` }}
        >
          <div className="flex h-full min-h-56 flex-col justify-end">
            <p className="text-sm font-semibold text-white/78">쿠폰과 발송</p>
            <h2 className="mt-1 text-2xl font-semibold">쿠폰과 발송 설정</h2>
            <p className="mt-3 text-sm leading-6 text-white/82">
              점보키즈 혜택, 안내 이미지, 카카오 알림톡/SMS/이메일 우선순위를 함께 확인합니다.
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <TinyMetric icon={Settings2} label="활성 캠페인" value={`${campaigns.length}개`} />
            <TinyMetric icon={Send} label="발송 작업" value={`${jobs.length}건`} />
            <TinyMetric icon={MessageCircle} label="전송 레코드" value={`${deliveries.length}건`} />
          </div>

          <div className="grid gap-3">
            {campaigns.map((campaign) => {
              const items = getCampaignItems(campaign.id);

              return (
                <div key={campaign.id} className="rounded border border-line bg-surface p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{campaign.name}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {issueModeLabels[campaign.issueMode]} · {targetScopeLabels[campaign.targetScope]}
                      </p>
                    </div>
                    <Badge tone={campaign.noticeType === "image" ? "blue" : "gray"}>
                      {campaign.noticeType === "image" ? "이미지 안내" : "HTML 안내"}
                    </Badge>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <ImageIcon size={16} aria-hidden />
                    등록 혜택 {items.length}개 · {formatDate(campaign.validUntil)}까지
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded border border-line bg-white p-3">
            <p className="text-sm font-semibold text-ink">기본 발송 우선순위</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {channelLabels.alimtalk} → {channelLabels.sms} → {channelLabels.email}
            </p>
            {latestJob ? (
              <p className="mt-2 text-xs font-semibold text-brand">
                최근 예약: {formatDateTime(latestJob.scheduledFor)} · {latestJob.recipientCount}명
              </p>
            ) : null}
          </div>

          <a
            href="#coupons"
            className="inline-flex items-center justify-center gap-2 rounded bg-brand px-4 py-2.5 text-sm font-semibold text-white"
          >
            쿠폰 설정 관리
            <ChevronRight size={16} aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded border border-line bg-surface p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-white text-brand">
        <Icon size={17} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function TinyMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-line bg-surface p-3">
      <Icon size={17} className="text-brand" aria-hidden />
      <p className="mt-2 text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}
