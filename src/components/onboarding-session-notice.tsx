"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type SessionState = "checking" | "configured-missing" | "signed-out" | "signed-in";

export function OnboardingSessionNotice() {
  const [state, setState] = useState<SessionState>("checking");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setState("configured-missing");
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      const userEmail = data.session?.user.email ?? null;
      setEmail(userEmail);
      setState(userEmail ? "signed-in" : "signed-out");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (state === "checking") {
    return <Notice tone="neutral">세션 상태를 확인하는 중입니다.</Notice>;
  }

  if (state === "configured-missing") {
    return (
      <Notice tone="warning">
        Supabase 공개 키가 설정되면 가입 세션을 확인하고 기관 온보딩을 이어갈 수 있습니다.
      </Notice>
    );
  }

  if (state === "signed-out") {
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

  return <Notice tone="success">{email} 계정으로 온보딩을 진행합니다.</Notice>;
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
