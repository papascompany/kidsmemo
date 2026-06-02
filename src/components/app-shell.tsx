import {
  Bot,
  CalendarDays,
  Gift,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "#dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "#calendar", label: "연간 행사", icon: CalendarDays },
  { href: "#coupons", label: "쿠폰발행 관리", icon: Gift },
  { href: "#ai-helper", label: "AI 행사 도우미", icon: Bot },
  { href: "#message-writer", label: "감동 문구", icon: MessageSquareText },
  { href: "#admin", label: "관리 콘솔", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
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
          <p className="font-semibold text-ink">발송 우선순위</p>
          <p className="mt-1">카카오 알림톡 → SMS/LMS → 이메일</p>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-20 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-brand">점보키즈 연동</p>
            <h1 className="text-lg font-semibold">키즈메모</h1>
          </div>
          <Link href="#coupons" className="rounded bg-brand px-3 py-2 text-sm font-semibold text-white">
            쿠폰관리
          </Link>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
