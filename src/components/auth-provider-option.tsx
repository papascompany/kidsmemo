"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type AuthProviderOptionProps = {
  description: string;
  icon: LucideIcon;
  provider: Extract<Provider, "google" | "kakao">;
  title: string;
};

const missingConfigMessage =
  "Supabase 공개 키가 아직 설정되지 않아 간편 로그인을 진행할 수 없습니다. 관리자에게 설정을 요청해 주세요.";
const oauthErrorMessage =
  "간편 로그인을 시작하지 못했습니다. 잠시 후 다시 시도하거나 이메일 로그인을 이용해 주세요.";

export function AuthProviderOption({ description, icon: Icon, provider, title }: AuthProviderOptionProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleProviderSignIn() {
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(missingConfigMessage);
      return;
    }

    setIsStarting(true);

    const origin = window.location.origin;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`
      }
    });

    if (signInError) {
      setError(oauthErrorMessage);
      setIsStarting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        className="flex items-center justify-between gap-4 rounded border border-line bg-surface p-4 text-left transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isStarting}
        onClick={handleProviderSignIn}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand/10 text-brand">
            <Icon size={20} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{title}</span>
            <span className="mt-1 block text-sm leading-5 text-muted">{description}</span>
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-line bg-white px-2 py-1 text-xs font-semibold text-muted">
          {isStarting ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
          {isStarting ? "연결 중" : "계속"}
        </span>
      </button>
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
