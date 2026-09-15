import { cn } from "@/lib/utils";

const STYLES: Record<string, { label: string; cls: string }> = {
  approved: { label: "Terkirim", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  not_submitted: { label: "Belum Ada", cls: "bg-rose-50 text-rose-600 border border-rose-200" },
  checked_in: { label: "Masuk", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  checked_out: { label: "Selesai", cls: "bg-slate-100 text-slate-600 border border-slate-200" },
  not_checked_in: { label: "Belum", cls: "bg-slate-100 text-slate-500 border border-slate-200" },
  active: { label: "Aktif", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  inactive: { label: "Nonaktif", cls: "bg-slate-100 text-slate-500 border border-slate-200" },
  backup: { label: "Back Up", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  back_up: { label: "Back Up", cls: "bg-purple-50 text-purple-700 border border-purple-200" },
};

export default function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const cfg = STYLES[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border border-slate-200" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-0.5 text-[11px] font-bold leading-none transition-all",
        cfg.cls,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
