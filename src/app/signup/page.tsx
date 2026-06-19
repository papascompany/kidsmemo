import { AuthEmailForm } from "@/components/auth-email-form";
import { AuthProviderOption } from "@/components/auth-provider-option";
import { ArrowRight, Building2, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

const signupOptions = [
  {
    title: "카카오 간편가입",
    description: "OAuth 앱 설정이 완료되면 활성화됩니다.",
    icon: MessageCircle
  },
  {
    title: "구글 간편가입",
    description: "기관 업무용 Google OAuth 연동을 준비 중입니다.",
    icon: ShieldCheck
  }
];

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-brand">
          키즈메모
        </Link>
        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded border border-line bg-white p-6 shadow-soft">
            <p className="text-sm font-semibold text-brand">간편가입</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              계정을 만들고 내 기관을 연결합니다.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              가입 후 점보키즈 아이디 회원인증 또는 초대 코드 참여를 통해 기관별 대시보드로
              이동합니다. 이메일과 비밀번호 가입은 Supabase 설정이 있을 때 실제 계정을 만듭니다.
            </p>

            <div className="mt-6 grid gap-3">
              {signupOptions.map((option) => {
                return (
                  <AuthProviderOption
                    key={option.title}
                    description={option.description}
                    icon={option.icon}
                    title={option.title}
                  />
                );
              })}
            </div>

            <AuthEmailForm mode="signup" />
          </div>

          <aside className="rounded border border-line bg-white p-6 shadow-soft">
            <div className="grid h-12 w-12 place-items-center rounded bg-brand/10 text-brand">
              <Building2 size={23} aria-hidden />
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-normal">
              가입 다음 단계
            </h2>
            <ol className="mt-5 grid gap-3 text-sm text-muted">
              <Step title="점보키즈 아이디 인증" description="기존 점보키즈 회원과 기관 정보를 확인합니다." />
              <Step title="기관 생성 또는 참여" description="원장님은 기관을 만들고, 선생님은 초대 코드로 참여합니다." />
              <Step title="대시보드 시작" description="행사 일정, 쿠폰함, AI 조언을 기관별로 관리합니다." />
            </ol>
            <Link
              href="/onboarding"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded bg-brand px-4 py-3 text-sm font-semibold text-white"
            >
              온보딩 화면 보기
              <ArrowRight size={17} aria-hidden />
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Step({ title, description }: { title: string; description: string }) {
  return (
    <li className="rounded border border-line bg-surface p-4">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 leading-6">{description}</p>
    </li>
  );
}
