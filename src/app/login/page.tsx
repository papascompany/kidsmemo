import { AuthEmailForm } from "@/components/auth-email-form";
import { AuthProviderOption } from "@/components/auth-provider-option";
import { ArrowRight, KeyRound, MessageCircle } from "lucide-react";
import Link from "next/link";

const loginMethods = [
  {
    title: "카카오로 로그인",
    description: "카카오계정으로 키즈메모에 로그인합니다.",
    provider: "kakao",
    icon: MessageCircle
  },
  {
    title: "구글로 로그인",
    description: "기관 업무용 Google 계정으로 로그인합니다.",
    provider: "google",
    icon: KeyRound
  }
] as const;

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const authMessage = getAuthMessage(params.auth_error);

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
            {authMessage ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                {authMessage}
              </p>
            ) : null}
            {loginMethods.map((method) => {
              return (
                <AuthProviderOption
                  key={method.title}
                  description={method.description}
                  icon={method.icon}
                  provider={method.provider}
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

function getAuthMessage(error: string | string[] | undefined) {
  const code = Array.isArray(error) ? error[0] : error;

  if (!code) {
    return null;
  }

  if (code === "config") {
    return "인증 설정이 아직 완료되지 않아 로그인을 마칠 수 없습니다. 관리자에게 설정을 요청해 주세요.";
  }

  return "로그인을 마치지 못했습니다. 다시 시도하거나 이메일 로그인을 이용해 주세요.";
}

function Status({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded border border-line bg-surface p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
