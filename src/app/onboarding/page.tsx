import { ArrowRight, Building2, KeyRound, UsersRound } from "lucide-react";
import Link from "next/link";

const onboardingCards = [
  {
    title: "새 기관 만들기",
    description: "원장님이 직접 유치원/어린이집 워크스페이스를 만들고 구성원을 초대합니다.",
    icon: Building2
  },
  {
    title: "초대 코드로 참여",
    description: "이미 생성된 기관에 선생님 또는 매니저 역할로 참여합니다.",
    icon: KeyRound
  },
  {
    title: "점보키즈 인증 확인",
    description: "점보키즈 회원 인증과 기관 매칭 상태를 확인합니다.",
    icon: UsersRound
  }
];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f1] px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-brand">
          키즈메모
        </Link>
        <section className="mt-6 rounded border border-line bg-white p-6 shadow-soft">
          <p className="text-sm font-semibold text-brand">기관 온보딩</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal">
            키즈메모는 기관 단위로 행사와 쿠폰을 관리합니다.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            가입한 사용자는 프로필을 완성한 뒤 기관을 만들거나 초대 코드로 참여합니다.
            원장님과 선생님은 자신이 속한 기관의 데이터만 볼 수 있습니다.
          </p>
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {onboardingCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title} className="rounded border border-line bg-white p-5 shadow-soft">
                <div className="grid h-11 w-11 place-items-center rounded bg-brand/10 text-brand">
                  <Icon size={21} aria-hidden />
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-normal">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{card.description}</p>
              </article>
            );
          })}
        </div>

        <section className="mt-5 grid gap-4 rounded border border-line bg-white p-5 shadow-soft lg:grid-cols-2">
          <form className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              기관명
              <input
                className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="햇살나무 어린이집"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              기관 유형
              <select className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20">
                <option>어린이집</option>
                <option>유치원</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              초대 코드
              <input
                className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="선택 입력"
              />
            </label>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded bg-brand px-4 py-3 text-sm font-semibold text-white"
            >
              기관 연결 준비 중
              <ArrowRight size={17} aria-hidden />
            </button>
          </form>

          <aside className="rounded border border-line bg-surface p-5">
            <p className="font-semibold text-ink">온보딩 완료 기준</p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
              <li>프로필 이름과 연락처가 저장되어야 합니다.</li>
              <li>하나 이상의 기관 멤버십이 있어야 합니다.</li>
              <li>현재 선택된 기관이 세션에 연결되어야 합니다.</li>
              <li>점보키즈 인증은 pending 상태여도 관리자 화면에서 추적되어야 합니다.</li>
            </ul>
            <Link
              href="/app"
              className="mt-5 inline-flex items-center justify-center rounded border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand"
            >
              데모 대시보드 보기
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
