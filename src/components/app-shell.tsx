import {
  Bot,
  CalendarDays,
  Gift,
  LayoutDashboard,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "#dashboard", label: "오늘 할 일", mobileLabel: "오늘", icon: LayoutDashboard },
  { href: "#calendar", label: "행사 일정", mobileLabel: "일정", icon: CalendarDays },
  { href: "#coupons", label: "쿠폰함", mobileLabel: "쿠폰", icon: Gift },
  { href: "#ai-helper", label: "AI 도움", mobileLabel: "AI", icon: Bot }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-surface">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-5 py-6 lg:block">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-brand text-white">
            <ShieldCheck size={22} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand">점보키즈 연동</p>
            <h1 className="text-lg font-semibold text-ink">키즈메모</h1>
          </div>
        </div>

        <nav className="mt-8 grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink"
              >
                <Icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded border border-line bg-surface p-4 text-sm text-muted">
          <p className="font-semibold text-ink">빠른 흐름</p>
          <p className="mt-1">행사 확인 → 쿠폰 저장 → 문구 생성</p>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-brand">점보키즈 연동</p>
            <h1 className="text-lg font-semibold">키즈메모</h1>
          </div>
          <div className="rounded border border-line bg-surface px-3 py-2 text-right text-xs font-semibold text-muted">
            원장 워크스페이스
          </div>
        </div>
        <nav
          aria-label="모바일 빠른 이동"
          className="flex snap-x gap-2 overflow-x-auto px-4 pb-3"
        >
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-w-[4.5rem] snap-start flex-col items-center justify-center gap-1 rounded border border-line bg-white px-3 py-2 text-xs font-semibold text-muted shadow-sm transition hover:border-brand hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                aria-label={`${item.label}로 이동`}
              >
                <Icon size={17} aria-hidden />
                <span>{item.mobileLabel}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="min-w-0 lg:pl-64">
        <div className="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
