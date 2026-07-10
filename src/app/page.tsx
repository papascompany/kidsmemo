import { ArrowRight, CalendarDays, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { findLandingBlock, getPublishedLandingBlocks } from "@/lib/landing-content";

export const dynamic = "force-dynamic";

const heroImage =
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1800&q=82";

const outcomes = [
  {
    title: "행사 일정을 한눈에",
    description: "원에서 준비하는 일을 차분히 정리합니다.",
    icon: CalendarDays
  },
  {
    title: "안내문 초안을 바로",
    description: "행사에 맞는 학부모 안내를 빠르게 준비합니다.",
    icon: FileText
  },
  {
    title: "필요한 혜택도 함께",
    description: "점보키즈 혜택을 업무 흐름 안에서 확인합니다.",
    icon: Sparkles
  }
];

export default async function LandingPage() {
  const landingBlocks = await getPublishedLandingBlocks();
  const hero = findLandingBlock(landingBlocks, "hero");
  const schedule = findLandingBlock(landingBlocks, "schedule");
  const teacherMessage = findLandingBlock(landingBlocks, "teacher-message");
  const jumbokidsBenefit = findLandingBlock(landingBlocks, "jumbokids-benefit");
  const heroTitle = hero?.title || "행사 준비, 학부모 안내까지 한 번에.";
  const heroBody =
    hero?.body ||
    "키즈메모는 원장님이 행사 일정을 정리하고, 학부모님께 보낼 안내문 초안을 바로 준비할 수 있도록 돕습니다.";
  const primaryCtaLabel = hero?.ctaLabel || "내 기관 시작하기";
  const primaryCtaUrl = hero?.ctaUrl || "/signup";

  return (
    <main className="min-h-screen overflow-x-hidden bg-surface text-ink">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-white drop-shadow-sm">
            키즈메모
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-white/90 transition hover:text-white"
          >
            로그인
          </Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-ink">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${hero?.imageUrl || heroImage})` }}
        />
        <div className="absolute inset-0 bg-ink/76" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-surface" />
        <div className="relative mx-auto flex min-h-[42rem] max-w-6xl items-end px-4 pb-24 pt-28 sm:px-6 sm:pb-28 lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="text-sm font-semibold text-white/80">원장님을 위한 기관 운영 메모</p>
            <h1 className="text-wrap-anywhere mt-4 text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/88 sm:text-lg">{heroBody}</p>
            <Link
              href={primaryCtaUrl}
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded bg-white px-5 text-sm font-semibold text-ink shadow-soft transition hover:bg-white/90"
            >
              {primaryCtaLabel}
              <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-px overflow-hidden rounded border border-line bg-line shadow-soft sm:grid-cols-3">
          {outcomes.map((outcome, index) => {
            const Icon = outcome.icon;
            const content = [schedule, teacherMessage, jumbokidsBenefit][index];

            return (
              <article key={outcome.title} className="bg-white p-5 sm:p-6">
                <div className="grid h-10 w-10 place-items-center rounded bg-brand/10 text-brand">
                  <Icon size={20} aria-hidden />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-ink">{content?.title || outcome.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{content?.body || outcome.description}</p>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-muted">점보키즈 연동 기관을 위한 키즈메모</p>
      </section>
    </main>
  );
}
