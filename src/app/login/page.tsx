import { AuthEmailForm } from "@/components/auth-email-form";
import { AuthProviderOption } from "@/components/auth-provider-option";
import Link from "next/link";

const loginMethods = [
  {
    title: "카카오로 로그인",
    description: "카카오계정으로 이어서 로그인합니다.",
    provider: "kakao"
  },
  {
    title: "구글로 로그인",
    description: "기관 업무용 Google 계정으로 로그인합니다.",
    provider: "google"
  }
] as const;

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const authMessage = getAuthMessage(params.auth_error);

  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-md">
        <Link href="/" className="inline-block text-lg font-semibold text-brand">
          키즈메모
        </Link>
        <div className="mt-8 rounded border border-line bg-white p-6 shadow-soft sm:p-8">
          <p className="text-sm font-semibold text-brand">로그인</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">기관 운영을 이어가세요.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            일정과 학부모 안내를 관리하던 내 기관으로 돌아갑니다.
          </p>

          <div className="mt-7 grid gap-3">
            {authMessage ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                {authMessage}
              </p>
            ) : null}
            {loginMethods.map((method) => (
              <AuthProviderOption key={method.title} {...method} />
            ))}
          </div>

          <AuthEmailForm mode="login" />

          <p className="mt-6 text-sm text-muted">
            아직 계정이 없다면{" "}
            <Link href="/signup" className="font-semibold text-brand hover:text-brand/80">
              간편가입
            </Link>
            으로 시작하세요.
          </p>
        </div>
      </section>
    </main>
  );
}

function getAuthMessage(error: string | string[] | undefined) {
  const code = Array.isArray(error) ? error[0] : error;

  if (!code) return null;

  if (code === "config") {
    return "인증 설정이 아직 완료되지 않아 로그인을 마칠 수 없습니다. 관리자에게 설정을 요청해 주세요.";
  }

  return "로그인을 마치지 못했습니다. 다시 시도하거나 이메일 로그인을 이용해 주세요.";
}
