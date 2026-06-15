import { ArrowRight, Building2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

const signupOptions = [
  {
    title: "카카오 간편가입",
    description: "개인 휴대폰 기반으로 빠르게 가입하고 기관 인증으로 이어집니다.",
    icon: MessageCircle
  },
  {
    title: "구글 간편가입",
    description: "기관 업무용 계정으로 가입하는 원장님과 선생님에게 적합합니다.",
    icon: ShieldCheck
  },
  {
    title: "이메일 직접가입",
    description: "OAuth 없이 이메일과 비밀번호로 기본 계정을 만듭니다.",
    icon: Mail
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
              이동합니다. 실제 OAuth 연동 전까지는 화면과 상태 설계를 먼저 고정합니다.
            </p>

            <div className="mt-6 grid gap-3">
              {signupOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <Link
                    key={option.title}
                    href="/signup/jumbokids"
                    className="flex items-center justify-between gap-4 rounded border border-line bg-surface p-4 transition hover:border-brand hover:bg-white"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand/10 text-brand">
                        <Icon size={20} aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{option.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-muted">{option.description}</span>
                      </span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 text-muted" aria-hidden />
                  </Link>
                );
              })}
            </div>
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
