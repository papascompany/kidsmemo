"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type AuthMode = "login" | "signup";

type AuthEmailFormProps = {
  mode: AuthMode;
};

const copy = {
  login: {
    button: "이메일로 로그인",
    busy: "로그인 중",
    success: "로그인되었습니다. 기관 연결 상태를 확인합니다.",
    missingConfig:
      "Supabase 공개 키가 아직 설정되지 않아 실제 로그인을 진행할 수 없습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하면 활성화됩니다."
  },
  signup: {
    button: "이메일로 가입",
    busy: "가입 중",
    success: "가입 요청이 완료되었습니다. 기관 온보딩으로 이동합니다.",
    missingConfig:
      "Supabase 공개 키가 아직 설정되지 않아 실제 가입을 진행할 수 없습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하면 활성화됩니다."
  }
} as const;

type OnboardingStatusResponse = {
  ok: true;
  data: {
    memberships: Array<{ organizationId: string }>;
  };
};

export function AuthEmailForm({ mode }: AuthEmailFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(copy[mode].missingConfig);
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: getAuthCallbackUrl()
              }
            });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      const session = result.data.session;
      setMessage(session ? copy[mode].success : "가입 요청이 완료되었습니다. 이메일 확인이 필요하면 받은 편지함을 확인해 주세요.");

      if (session) {
        const destination = await resolvePostAuthDestination(session.access_token);
        router.push(destination);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-3 rounded border border-line bg-surface p-4">
      <label className="grid gap-2 text-sm font-semibold text-ink">
        이메일
        <input
          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="director@example.com"
          required
          type="email"
          value={email}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-ink">
        비밀번호
        <input
          className="rounded border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          required
          type="password"
          value={password}
        />
      </label>
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm leading-6 text-green-700">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:bg-muted"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={17} className="animate-spin" aria-hidden />
            {copy[mode].busy}
          </>
        ) : (
          <>
            {copy[mode].button}
            <ArrowRight size={17} aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}

async function resolvePostAuthDestination(accessToken: string) {
  const response = await fetch("/api/onboarding", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return "/onboarding";
  }

  const payload = (await response.json()) as OnboardingStatusResponse;
  return payload.ok && payload.data.memberships.length > 0 ? "/app" : "/onboarding";
}
