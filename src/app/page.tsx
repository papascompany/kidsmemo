import { ArrowRight, CalendarDays, Gift, Sparkles } from "lucide-react";
import Link from "next/link";
import { findLandingBlock, getPublishedLandingBlocks } from "@/lib/landing-content";

export const dynamic = "force-dynamic";

const heroImage =
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1800&q=82";
const focusImage =
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80";

const values = [
  {
    title: "행사 일정",
    description: "반복되는 원 행사를 한눈에 정리합니다.",
    icon: CalendarDays
  },
  {
    title: "AI 안내문",
    description: "행사 안내 초안을 빠르게 준비합니다.",
    icon: Sparkles
  },
  {
    title: "점보키즈 혜택",
    description: "선생님이 필요한 혜택 링크를 모아둡니다.",
    icon: Gift
  }
];

const steps = ["간편가입", "점보키즈 인증 또는 초대 참여", "내 원 대시보드 시작"];

export default async function LandingPage() {
  const landingBlocks = await getPublishedLandingBlocks();
  const hero = findLandingBlock(landingBlocks, "hero");
  const schedule = findLandingBlock(landingBlocks, "schedule");
  const teacherMessage = findLandingBlock(landingBlocks, "teacher-message");
  const jumbokidsBenefit = findLandingBlock(landingBlocks, "jumbokids-benefit");
  const footerCta = findLandingBlock(landingBlocks, "footer-cta");
  const heroTitle = hero?.title || "행사 준비와 안내문을 한곳에서 가볍게.";
  const heroBody =
    hero?.body ||
    "키즈메모는 유치원과 어린이집의 행사 일정, 학부모 안내문, 점보키즈 혜택 확인을 단순하게 이어주는 운영 도구입니다.";
  const primaryCtaLabel = hero?.ctaLabel || "간편가입 시작하기";
  const primaryCtaUrl = hero?.ctaUrl || "/signup";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6f1] text-ink">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="min-w-0">
            <p className="text-xs font-semibold text-brand">점보키즈 연동</p>
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

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${hero?.imageUrl || heroImage})` }}
        />
        <div className="absolute inset-0 bg-black/62" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#f8f6f1]" />
        <div className="relative mx-auto flex min-h-[calc(100svh-65px)] max-w-6xl flex-col justify-end px-4 pb-8 pt-16 sm:px-6 sm:pb-10 lg:px-8">
          <div className="max-w-2xl pb-8 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:pb-10">
            <p className="text-sm font-semibold text-white/84">유치원과 어린이집을 위한 행사 메모</p>
            <h2 className="text-wrap-anywhere mt-4 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/88 sm:text-lg">{heroBody}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryCtaUrl}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-white px-5 text-sm font-semibold text-ink shadow-soft transition hover:bg-white/92"
              >
                {primaryCtaLabel}
                <ArrowRight size={17} aria-hidden />
              </Link>
              <Link
                href="/app"
                className="inline-flex min-h-12 items-center justify-center rounded border border-white/80 bg-ink/70 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-ink/82"
              >
                데모 대시보드 보기
              </Link>
            </div>
          </div>

          <div className="grid gap-2 rounded border border-white/35 bg-white/88 p-2 shadow-soft backdrop-blur md:grid-cols-3">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <div key={value.title} className="flex min-h-20 items-center gap-3 rounded bg-white/70 px-3 py-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand/10 text-brand">
                    <Icon size={20} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink">{value.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-muted">{value.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="overflow-hidden rounded border border-white/70 bg-white shadow-soft">
          <div
            className="min-h-72 bg-cover bg-center sm:min-h-96"
            style={{ backgroundImage: `url(${schedule?.imageUrl || focusImage})` }}
          />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold text-brand">핵심 기능</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-ink">
            필요한 순간에 바로 꺼내 쓰는 행사 도구.
          </h2>
          <div className="mt-7 grid gap-5">
            <ValueLine
              title={schedule?.title || "연간 행사를 놓치지 않게"}
              description={schedule?.body || "소풍, 발표회, 졸업식처럼 반복되는 일정을 간단히 정리합니다."}
            />
            <ValueLine
              title={teacherMessage?.title || "따뜻한 안내문을 빠르게"}
              description={teacherMessage?.body || "행사명과 분위기만 넣어 학부모님께 보낼 초안을 준비합니다."}
            />
            <ValueLine
              title={jumbokidsBenefit?.title || "점보키즈 혜택 확인"}
              description={jumbokidsBenefit?.body || "원에서 사용할 수 있는 혜택과 이동 링크를 함께 확인합니다."}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold text-brand">시작 흐름</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
              가입부터 대시보드까지 짧게 이어집니다.
            </h2>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step} className="rounded border border-line bg-surface p-4">
                <span className="text-sm font-semibold text-brand">0{index + 1}</span>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ink px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-white/72">Kidsmemo</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              {footerCta?.title || "오늘 필요한 행사 메모부터 시작하세요."}
            </h2>
            {footerCta?.body ? <p className="mt-2 text-sm leading-6 text-white/72">{footerCta.body}</p> : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={footerCta?.ctaUrl || "/signup"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-white px-5 text-sm font-semibold text-ink"
            >
              {footerCta?.ctaLabel || "무료로 시작하기"}
              <ArrowRight size={17} aria-hidden />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded border border-white/30 px-5 text-sm font-semibold text-white"
            >
              로그인
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ValueLine({ title, description }: { title: string; description: string }) {
  return (
    <article className="border-t border-line pt-5">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
