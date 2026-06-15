import { ArrowRight, KeyRound, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";

const loginMethods = [
  {
    title: "카카오로 로그인",
    description: "원장님과 선생님이 가장 익숙한 계정으로 빠르게 시작합니다.",
    icon: MessageCircle
  },
  {
    title: "구글로 로그인",
    description: "기관 업무용 Google 계정이 있는 사용자를 위한 경로입니다.",
    icon: KeyRound
  },
  {
    title: "이메일로 로그인",
    description: "이메일과 비밀번호 기반 로그인을 위한 기본 경로입니다.",
    icon: Mail
  }
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="rounded border border-line bg-white p-6 shadow-soft">
          <Link href="/" className="text-sm font-semibold text-brand">
            키즈메모
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal">
            내 유치원 운영실로 돌아가기
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            카카오, 구글, 이메일 계정으로 로그인하고 기관별 행사 일정과 점보키즈 쿠폰함을
            이어서 관리합니다.
          </p>

          <div className="mt-6 grid gap-3">
            {loginMethods.map((method) => {
              const Icon = method.icon;

              return (
                <button
                  key={method.title}
                  type="button"
                  className="flex items-center justify-between gap-4 rounded border border-line bg-surface p-4 text-left transition hover:border-brand hover:bg-white"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand/10 text-brand">
                      <Icon size={20} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{method.title}</span>
                      <span className="mt-1 block text-sm leading-5 text-muted">{method.description}</span>
                    </span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-muted" aria-hidden />
                </button>
              );
            })}
          </div>

          <form className="mt-6 grid gap-3 rounded border border-line bg-surface p-4">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              이메일
              <input
                className="rounded border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="director@example.com"
                type="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              비밀번호
              <input
                className="rounded border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="비밀번호"
                type="password"
              />
            </label>
            <button
              type="button"
              className="rounded bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
            >
              로그인 준비 중
            </button>
          </form>

          <p className="mt-5 text-sm text-muted">
            아직 계정이 없다면{" "}
            <Link href="/signup" className="font-semibold text-brand">
              간편가입
            </Link>
            으로 시작하세요.
          </p>
        </section>

        <aside className="rounded border border-line bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-brand">로그인 후 이동</p>
          <div className="mt-4 grid gap-3">
            <Status title="프로필 확인" description="가입 계정의 이름, 연락처, 약관 동의 상태를 확인합니다." />
            <Status title="기관 멤버십 확인" description="원장, 매니저, 선생님 역할과 소속 기관을 확인합니다." />
            <Status title="대시보드 진입" description="기관 일정, 쿠폰함, AI 조언 화면으로 이동합니다." />
          </div>
          <Link
            href="/app"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded border border-line px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand"
          >
            데모 대시보드 열기
            <ArrowRight size={17} aria-hidden />
          </Link>
        </aside>
      </div>
    </main>
  );
}

function Status({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded border border-line bg-surface p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
