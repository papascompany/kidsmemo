import { ArrowRight, CalendarDays, FileText, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { findLandingBlock, getLandingAppearance, getPublishedLandingBlocks } from "@/lib/landing-content";

export const dynamic = "force-dynamic";

const heroImage =
  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1800&q=82";

const outcomes = [
  {
    title: "사진으로 시작하는 행사",
    description: "우리 반의 순간을 먼저 고르고 행사를 정리합니다.",
    icon: CalendarDays
  },
  {
    title: "다정한 안내문 완성",
    description: "사진과 행사 내용을 담아 부모님께 전합니다.",
    icon: FileText
  },
  {
    title: "우리 기관의 기록",
    description: "행사와 혜택, 보낸 안내를 한 권처럼 모아봅니다.",
    icon: ImageIcon
  }
];

export default async function LandingPage() {
  const landingBlocks = await getPublishedLandingBlocks();
  const hero = findLandingBlock(landingBlocks, "hero");
  const schedule = findLandingBlock(landingBlocks, "schedule");
  const teacherMessage = findLandingBlock(landingBlocks, "teacher-message");
  const jumbokidsBenefit = findLandingBlock(landingBlocks, "jumbokids-benefit");
  const appearance = getLandingAppearance(landingBlocks);
  const heroTitle = hero?.title || "행사 준비, 학부모 안내까지 한 번에.";
  const heroBody =
    hero?.body ||
    "키즈메모는 원장님이 행사 일정을 정리하고, 학부모님께 보낼 안내문 초안을 바로 준비할 수 있도록 돕습니다.";
  const primaryCtaLabel = hero?.ctaLabel || "내 기관 시작하기";
  const primaryCtaUrl = hero?.ctaUrl || "/signup";
  const titleClass = appearance.titleStyle === "clear"
    ? "font-semibold"
    : appearance.titleStyle === "editorial"
      ? "font-medium"
      : "font-medium";
  const titleSizeClass = appearance.titleSize === "standard" ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl";
  const overlayClass = appearance.overlayTone === "strong" ? "bg-ink/76" : appearance.overlayTone === "calm" ? "bg-ink/44" : "bg-ink/58";

  return (
    <main className="min-h-screen overflow-x-hidden bg-surface text-ink">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="rounded-full bg-white/90 px-4 py-2 text-lg font-semibold text-ink shadow-soft">
            키즈메모
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/70 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
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
        <div className={`absolute inset-0 ${overlayClass}`} />
        <div className="relative mx-auto flex min-h-[42rem] max-w-6xl items-end px-4 pb-20 pt-28 sm:px-6 sm:pb-24 lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="inline-flex w-fit rounded-full border border-white/45 bg-white/15 px-3 py-1 text-sm font-semibold text-white/90">우리 원의 사진 운영 노트</p>
            <h1 className={`text-wrap-anywhere mt-4 ${titleSizeClass} ${titleClass} leading-tight tracking-normal`}>
              {heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/88 sm:text-lg">{heroBody}</p>
            <Link
              href={primaryCtaUrl}
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink shadow-soft transition hover:bg-white/90"
            >
              {primaryCtaLabel}
              <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {outcomes.map((outcome, index) => {
            const Icon = outcome.icon;
            const content = [schedule, teacherMessage, jumbokidsBenefit][index];

            return (
              <article key={outcome.title} className="rounded-2xl border border-line bg-[#fffefa] p-5 shadow-soft sm:p-6">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand/10 text-brand">
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
