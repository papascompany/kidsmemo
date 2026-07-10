"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
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
    <main className="min-h-screen bg-[#f8f6f1] px-4 py-6 text-ink sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-semibold text-brand">
          키즈메모
        </Link>
        <section className="mt-5 max-w-2xl">
          <p className="text-sm font-semibold text-brand">마지막 한 단계</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
            내 기관의 첫 행사를 준비할까요?
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
            원장님은 기관을 만들고, 선생님은 받은 초대 코드로 바로 참여할 수 있어요.
          </p>
          {sessionNotice}
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          <form onSubmit={handleSubmit} className="rounded border border-line bg-white p-5 shadow-soft sm:p-7">
            <div className="grid grid-cols-2 gap-2 rounded border border-line bg-surface p-1" aria-label="참여 방식">
              <button
                type="button"
                className={`flex min-h-20 flex-col items-start justify-center rounded px-4 py-3 text-left text-sm font-semibold transition ${
                  mode === "create" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
                onClick={() => setMode("create")}
              >
                <Building2 size={18} className="mb-2 text-brand" aria-hidden />
                원장님이에요
                <span className="mt-1 text-xs font-normal">내 기관 만들기</span>
              </button>
              <button
                type="button"
                className={`flex min-h-20 flex-col items-start justify-center rounded px-4 py-3 text-left text-sm font-semibold transition ${
                  mode === "join" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
                onClick={() => setMode("join")}
              >
                <KeyRound size={18} className="mb-2 text-brand" aria-hidden />
                초대를 받았어요
                <span className="mt-1 text-xs font-normal">코드로 참여하기</span>
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                이름
                <input
                  className="rounded border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="홍길동"
                  required
                  value={profileName}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink">
                연락처 <span className="font-normal text-muted">(선택)</span>
                <input
                  className="rounded border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) => setProfilePhone(event.target.value)}
                  placeholder="010-0000-0000"
                  value={profilePhone}
                />
              </label>
            </div>

            {mode === "create" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  기관명
                  <input
                    className="rounded border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder="햇살나무 어린이집"
                    required
                    value={organizationName}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  기관 유형
                  <select
                    className="rounded border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) => setOrganizationType(event.target.value as "daycare" | "kindergarten")}
                    value={organizationType}
                  >
                    <option value="daycare">어린이집</option>
                    <option value="kindergarten">유치원</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink sm:col-span-2">
                  지역
                  <input
                    className="rounded border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) => setOrganizationRegion(event.target.value)}
                    placeholder="서울 강남구"
                    required
                    value={organizationRegion}
                  />
                </label>
              </div>
            ) : (
              <label className="mt-5 grid gap-2 text-sm font-semibold text-ink">
                초대 코드
                <input
                  className="rounded border border-line bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="예: KIDS-2026"
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
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:bg-muted"
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

          <aside className="rounded border border-line bg-white p-5 shadow-soft">
            <p className="text-sm font-semibold text-brand">시작하면</p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal">바로 할 수 있어요</h2>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-muted">
              <StatusRow done={isComplete} label="내 기관 행사 일정 확인" />
              <StatusRow done={isComplete} label="AI로 안내문 초안 만들기" />
              <StatusRow done={isComplete} label="점보키즈 쿠폰함 열기" />
            </div>

            {isLoadingStatus ? (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" aria-hidden />
                저장 상태 확인 중
              </p>
            ) : null}

            {primaryMembership ? (
              <div className="mt-5 rounded border border-line bg-surface p-4 text-sm">
                <p className="font-semibold text-ink">{primaryMembership.organizationName}</p>
                <p className="mt-1 text-muted">
                  {primaryMembership.organizationRegion} · {primaryMembership.role}
                </p>
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
