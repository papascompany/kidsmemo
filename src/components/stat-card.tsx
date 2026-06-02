import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  note,
  icon: Icon
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          <p className="mt-2 text-sm text-muted">{note}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded bg-surface text-brand">
          <Icon size={20} aria-hidden />
        </div>
      </div>
    </div>
  );
}
