import { AuthEmailForm } from "@/components/auth-email-form";
import { AuthProviderOption } from "@/components/auth-provider-option";
import { ArrowRight, KeyRound, MessageCircle } from "lucide-react";
import Link from "next/link";

const loginMethods = [
  {
    title: "카카오로 로그인",
    description: "OAuth 앱 설정이 완료되면 활성화됩니다.",
    icon: MessageCircle
  },
  {
    title: "구글로 로그인",
    description: "기관 업무용 Google OAuth 연동을 준비 중입니다.",
    icon: KeyRound
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
              return (
                <AuthProviderOption
                  key={method.title}
                  description={method.description}
                  icon={method.icon}
                  title={method.title}
                />
              );
            })}
          </div>

          <AuthEmailForm mode="login" />

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
