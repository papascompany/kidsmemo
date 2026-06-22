import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Gift,
  LockKeyhole,
  MessageSquareText,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { findLandingBlock, getPublishedLandingBlocks } from "@/lib/landing-content";

export const dynamic = "force-dynamic";

const heroImage =
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1800&q=82";
const scheduleImage =
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80";
const photoBookImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";
const teacherImage =
  "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=1200&q=80";

const features = [
  {
    title: "연간 행사 일정",
    description: "소풍, 발표회, 졸업식처럼 반복되는 행사를 원별 일정으로 정리합니다.",
    icon: CalendarDays
  },
  {
    title: "AI 행사 조언",
    description: "준비 체크리스트와 학부모 안내문 초안을 빠르게 만듭니다.",
    icon: Sparkles
  },
  {
    title: "점보키즈 쿠폰함",
    description: "관리자가 제공한 쿠폰, 할인코드, 사용 링크를 기관별로 확인합니다.",
    icon: Gift
  }
];

const flows = [
  "간편가입",
  "점보키즈 아이디 인증",
  "기관 생성 또는 초대 참여",
  "내 유치원 대시보드 시작"
];

export default async function LandingPage() {
  const landingBlocks = await getPublishedLandingBlocks();
  const hero = findLandingBlock(landingBlocks, "hero");
  const schedule = findLandingBlock(landingBlocks, "schedule");
  const teacherMessage = findLandingBlock(landingBlocks, "teacher-message");
  const jumbokidsBenefit = findLandingBlock(landingBlocks, "jumbokids-benefit");
  const footerCta = findLandingBlock(landingBlocks, "footer-cta");
  const heroTitle = hero?.title || "행사는 놓치지 않고, 안내문은 더 따뜻하게.";
  const heroBody =
    hero?.body ||
    "키즈메모는 원장님과 선생님이 행사 일정, AI 안내문, 점보키즈 쿠폰함을 한곳에서 관리하도록 돕는 반응형 웹 서비스입니다.";
  const primaryCtaLabel = hero?.ctaLabel || "간편가입 시작하기";
  const primaryCtaUrl = hero?.ctaUrl || "/signup";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6f1] text-ink">
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="min-w-0">
            <p className="text-xs font-semibold text-brand">점보키즈 연동 SaaS</p>
            <h1 className="text-lg font-semibold tracking-normal">키즈메모</h1>
          </Link>
          <nav className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="rounded border border-line bg-white px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-ink"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
            >
              간편가입
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative min-h-[calc(100vh-65px)] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${hero?.imageUrl || heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/36 via-black/28 to-[#f8f6f1]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-65px)] max-w-7xl flex-col justify-end px-4 pb-16 pt-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="text-sm font-semibold text-white/86">유치원과 어린이집을 위한 행사 운영 도구</p>
            <h2 className="text-wrap-anywhere mt-4 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/88 sm:text-lg">
              {heroBody}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryCtaUrl}
                className="inline-flex items-center justify-center gap-2 rounded bg-white px-5 py-3 text-sm font-semibold text-ink shadow-soft transition hover:bg-white/92"
              >
                {primaryCtaLabel}
                <ArrowRight size={17} aria-hidden />
              </Link>
              <Link
                href="/signup/jumbokids"
                className="inline-flex items-center justify-center gap-2 rounded border border-white/70 bg-white/12 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                점보키즈 아이디로 회원인증
              </Link>
            </div>
          </div>
          <div className="mt-12 grid gap-3 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="rounded border border-white/35 bg-white/82 p-4 shadow-soft backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded bg-brand/10 text-brand">
                      <Icon size={20} aria-hidden />
                    </div>
                    <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
        <EditorialCard
          image={schedule?.imageUrl || scheduleImage}
          eyebrow="Schedule"
          title={schedule?.title || "연간 행사를 놓치지 않게"}
          description={schedule?.body || "반복되는 원 행사를 한 화면에서 정리하고 내일 필요한 안내를 먼저 확인합니다."}
        />
        <EditorialCard
          image={teacherMessage?.imageUrl || teacherImage}
          eyebrow="AI Message"
          title={teacherMessage?.title || "선생님 말투에 맞는 안내문"}
          description={teacherMessage?.body || "행사명과 분위기만 넣어도 학부모님께 보낼 따뜻한 초안을 준비합니다."}
        />
        <EditorialCard
          image={jumbokidsBenefit?.imageUrl || photoBookImage}
          eyebrow="Jumbokids Benefit"
          title={jumbokidsBenefit?.title || "점보키즈 혜택을 기관별로"}
          description={jumbokidsBenefit?.body || "원장님과 선생님이 사용할 수 있는 쿠폰과 고도몰 링크를 안전하게 제공합니다."}
        />
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-brand">가입 흐름</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-ink">
              처음 쓰는 선생님도 몇 단계면 시작합니다.
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              점보키즈 아이디 회원인증은 추후 실연동 예정이지만, 가입 설계와 관리자 관리
              흐름에는 지금부터 포함합니다.
            </p>
          </div>
          <div className="grid gap-3">
            {flows.map((flow, index) => (
              <div key={flow} className="flex items-center gap-4 rounded border border-line bg-surface p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-brand text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="font-semibold text-ink">{flow}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
        <InfoPanel
          icon={BadgeCheck}
          title="기관별 독립 워크스페이스"
          description="원장님과 선생님은 자신이 속한 유치원/어린이집의 일정과 쿠폰만 확인합니다."
        />
        <InfoPanel
          icon={LockKeyhole}
          title="역할 기반 권한 설계"
          description="원장, 매니저, 선생님, 플랫폼 관리자의 권한을 분리해 안전하게 확장합니다."
        />
        <InfoPanel
          icon={MessageSquareText}
          title="행사와 안내문 중심 활성화"
          description="행사 준비 흐름 안에서 AI 조언과 점보키즈 혜택이 자연스럽게 이어집니다."
        />
      </section>

      <section className="bg-ink px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/72">Kidsmemo</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              {footerCta?.title || "내 유치원 운영실을 먼저 열어보세요."}
            </h2>
            {footerCta?.body ? <p className="mt-2 text-sm leading-6 text-white/72">{footerCta.body}</p> : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={footerCta?.ctaUrl || "/signup"}
              className="inline-flex items-center justify-center gap-2 rounded bg-white px-5 py-3 text-sm font-semibold text-ink"
            >
              {footerCta?.ctaLabel || "무료로 시작하기"}
              <ArrowRight size={17} aria-hidden />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded border border-white/30 px-5 py-3 text-sm font-semibold text-white"
            >
              데모 대시보드 보기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function EditorialCard({
  image,
  eyebrow,
  title,
  description
}: {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <article className="relative min-h-80 overflow-hidden rounded border border-white/60 shadow-soft">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/18 to-black/70" />
      <div className="relative flex min-h-80 flex-col justify-end p-5 text-white">
        <p className="text-sm font-semibold text-white/76">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-normal">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/82">{description}</p>
      </div>
    </article>
  );
}

function InfoPanel({
  icon: Icon,
  title,
  description
}: {
  icon: typeof BadgeCheck;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded border border-line bg-white p-5 shadow-soft">
      <div className="grid h-11 w-11 place-items-center rounded bg-brand/10 text-brand">
        <Icon size={21} aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
