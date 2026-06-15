import { ArrowRight, BadgeCheck, SearchCheck } from "lucide-react";
import Link from "next/link";

const verificationStates = [
  {
    title: "인증 대기",
    description: "점보키즈 아이디와 기관 정보를 입력한 뒤 확인을 요청합니다."
  },
  {
    title: "기관 매칭",
    description: "점보키즈의 기존 유치원/어린이집 정보와 키즈메모 기관을 연결합니다."
  },
  {
    title: "관리자 승인",
    description: "필요한 경우 점보키즈 운영자가 기관 연결을 최종 승인합니다."
  }
];

export default function JumbokidsVerificationPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded border border-line bg-white p-6 shadow-soft">
          <Link href="/" className="text-sm font-semibold text-brand">
            키즈메모
          </Link>
          <p className="mt-6 text-sm font-semibold text-brand">점보키즈 아이디 회원인증</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            점보키즈 회원과 기관을 확인합니다.
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            실제 점보키즈 API 연동은 후속 개발로 진행하되, 가입 흐름과 관리자 승인 설계에는
            지금부터 포함합니다.
          </p>

          <form className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              점보키즈 아이디
              <input
                className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="jumbokids_id"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              기관명
              <input
                className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="햇살나무 어린이집"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              대표 연락처
              <input
                className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                placeholder="010-0000-0000"
              />
            </label>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
            >
              인증 요청 준비 중
              <SearchCheck size={17} aria-hidden />
            </button>
          </form>
        </section>

        <aside className="grid gap-4">
          <div className="rounded border border-line bg-white p-5 shadow-soft">
            <div className="grid h-11 w-11 place-items-center rounded bg-brand/10 text-brand">
              <BadgeCheck size={21} aria-hidden />
            </div>
            <h2 className="mt-4 text-xl font-semibold tracking-normal">관리자 관리 항목</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              운영자는 기관별 인증 상태, 점보키즈 외부 ID, 재인증 요청, 쿠폰 등록 권한을 확인합니다.
            </p>
          </div>
          {verificationStates.map((state) => (
            <div key={state.title} className="rounded border border-line bg-white p-5 shadow-soft">
              <p className="font-semibold text-ink">{state.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{state.description}</p>
            </div>
          ))}
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 rounded border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand"
          >
            기관 온보딩으로 이동
            <ArrowRight size={17} aria-hidden />
          </Link>
        </aside>
      </div>
    </main>
  );
}
