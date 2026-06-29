"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, KeyRound, Loader2, UsersRound } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type OnboardingMode = "create" | "join";

type OnboardingStatus = {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    organizationType: "daycare" | "kindergarten";
    organizationRegion: string;
    role: "owner" | "manager" | "teacher" | "admin";
  }>;
};

type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        message: string;
      };
    };

const onboardingCards = [
  {
    title: "새 기관 만들기",
    description: "원장님이 직접 유치원/어린이집 워크스페이스를 만들고 구성원을 초대합니다.",
    icon: Building2
  },
  {
    title: "초대 코드로 참여",
    description: "이미 생성된 기관에 선생님 역할로 참여합니다.",
    icon: KeyRound
  },
  {
    title: "점보키즈 인증 확인",
    description: "점보키즈 회원 인증과 기관 매칭 상태를 확인합니다.",
    icon: UsersRound
  }
];

export default function OnboardingPage() {
  const [mode, setMode] = useState<OnboardingMode>("create");
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState<"daycare" | "kindergarten">("daycare");
  const [organizationRegion, setOrganizationRegion] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [sessionState, setSessionState] = useState<"checking" | "missing-config" | "signed-out" | "ready">(
    "checking"
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const primaryMembership = status?.memberships[0] ?? null;
  const isComplete = Boolean(primaryMembership);
  const canSubmit = sessionState === "ready" && !isSubmitting;

  const loadStatus = useCallback(async (token: string) => {
    setIsLoadingStatus(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = (await response.json()) as ApiResponse<OnboardingStatus>;

      if (!payload.ok) {
        setError(payload.error.message);
        return;
      }

      setStatus(payload.data);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setSessionState("missing-config");
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;

      const token = data.session?.access_token ?? null;
      if (!token) {
        setSessionState("signed-out");
        return;
      }

      setAccessToken(token);
      setSessionState("ready");
      await loadStatus(token);
    });

    return () => {
      isMounted = false;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (!status?.profile) return;

    setProfileName(status.profile.name);
    setProfilePhone(status.profile.phone);
  }, [status?.profile]);

  const sessionNotice = useMemo(() => {
    if (sessionState === "checking") {
      return <Notice tone="neutral">세션 상태를 확인하는 중입니다.</Notice>;
    }

    if (sessionState === "missing-config") {
      return (
        <Notice tone="warning">
          Supabase 공개 키가 설정되면 가입 세션을 확인하고 기관 온보딩을 이어갈 수 있습니다.
        </Notice>
      );
    }

    if (sessionState === "signed-out") {
      return (
        <Notice tone="warning">
          현재 브라우저에 로그인 세션이 없습니다.{" "}
          <Link href="/login" className="font-semibold text-brand">
            로그인
          </Link>
          후 기관 연결을 진행해 주세요.
        </Notice>
      );
    }

    return (
      <Notice tone={isComplete ? "success" : "neutral"}>
        {status?.user.email ?? "로그인된 계정"} 계정으로 온보딩을 진행합니다.
      </Notice>
    );
  }, [isComplete, sessionState, status?.user.email]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!accessToken) {
      setError("로그인 세션을 찾을 수 없습니다. 다시 로그인해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body =
        mode === "create"
          ? {
              action: "create",
              profileName,
              profilePhone,
              organizationName,
              organizationType,
              organizationRegion
            }
          : {
              action: "join",
              profileName,
              profilePhone,
              inviteCode
            };

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const payload = (await response.json()) as ApiResponse<{ organizationId: string; role: string }>;

      if (!payload.ok) {
        setError(payload.error.message);
        return;
      }

      setMessage(mode === "create" ? "기관이 생성되었습니다." : "기관에 참여했습니다.");
      await loadStatus(accessToken);
    } finally {
      setIsSubmitting(false);
    }
  }

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
          {sessionNotice}
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
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-2 rounded border border-line bg-surface p-1">
              <button
                type="button"
                className={`rounded px-3 py-2 text-sm font-semibold transition ${
                  mode === "create" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
                onClick={() => setMode("create")}
              >
                기관 만들기
              </button>
              <button
                type="button"
                className={`rounded px-3 py-2 text-sm font-semibold transition ${
                  mode === "join" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
                onClick={() => setMode("join")}
              >
                초대로 참여
              </button>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-ink">
              이름
              <input
                className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="홍길동"
                required
                value={profileName}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              연락처
              <input
                className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                onChange={(event) => setProfilePhone(event.target.value)}
                placeholder="010-0000-0000"
                value={profilePhone}
              />
            </label>

            {mode === "create" ? (
              <>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  기관명
                  <input
                    className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder="햇살나무 어린이집"
                    required
                    value={organizationName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  기관 유형
                  <select
                    className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) => setOrganizationType(event.target.value as "daycare" | "kindergarten")}
                    value={organizationType}
                  >
                    <option value="daycare">어린이집</option>
                    <option value="kindergarten">유치원</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  지역
                  <input
                    className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) => setOrganizationRegion(event.target.value)}
                    placeholder="서울 강남구"
                    required
                    value={organizationRegion}
                  />
                </label>
              </>
            ) : (
              <label className="grid gap-2 text-sm font-semibold text-ink">
                초대 코드
                <input
                  className="rounded border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="기관 UUID"
                  required
                  value={inviteCode}
                />
              </label>
            )}

            {error ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm leading-6 text-green-700">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:bg-muted"
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" aria-hidden />
                  저장 중
                </>
              ) : (
                <>
                  {mode === "create" ? "기관 만들기" : "기관 참여하기"}
                  <ArrowRight size={17} aria-hidden />
                </>
              )}
            </button>
          </form>

          <aside className="rounded border border-line bg-surface p-5">
            <p className="font-semibold text-ink">온보딩 상태</p>
            <div className="mt-3 grid gap-3 text-sm leading-6 text-muted">
              <StatusRow done={Boolean(status?.profile)} label="프로필 저장" />
              <StatusRow done={isComplete} label="기관 멤버십 연결" />
              <StatusRow done={isComplete} label="대시보드 진입 가능" />
              <StatusRow done={false} label="점보키즈 인증 대기" />
            </div>

            {isLoadingStatus ? (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                저장 상태 확인 중
              </p>
            ) : null}

            {primaryMembership ? (
              <div className="mt-5 rounded border border-line bg-white p-4 text-sm">
                <p className="font-semibold text-ink">{primaryMembership.organizationName}</p>
                <p className="mt-1 text-muted">
                  {primaryMembership.organizationRegion} · {primaryMembership.role}
                </p>
                <p className="mt-2 break-all text-xs text-muted">초대 코드: {primaryMembership.organizationId}</p>
              </div>
            ) : null}

            <Link
              href={isComplete ? "/app" : "/signup"}
              className="mt-5 inline-flex items-center justify-center rounded border border-line bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand"
            >
              {isComplete ? "대시보드로 이동" : "가입 화면으로 이동"}
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Notice({ children, tone }: { children: React.ReactNode; tone: "neutral" | "success" | "warning" }) {
  const toneClass =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-line bg-surface text-muted";

  return <p className={`mt-5 rounded border px-4 py-3 text-sm leading-6 ${toneClass}`}>{children}</p>;
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-line bg-white px-3 py-2">
      <CheckCircle2 size={17} className={done ? "text-green-600" : "text-muted"} aria-hidden />
      <span className={done ? "font-semibold text-ink" : ""}>{label}</span>
    </div>
  );
}
