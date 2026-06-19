import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";

type AuthProviderOptionProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function AuthProviderOption({ description, icon: Icon, title }: AuthProviderOptionProps) {
  return (
    <button
      type="button"
      className="flex cursor-not-allowed items-center justify-between gap-4 rounded border border-line bg-surface p-4 text-left opacity-75"
      disabled
      aria-disabled="true"
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
        <Lock size={13} aria-hidden />
        준비 중
      </span>
    </button>
  );
}
