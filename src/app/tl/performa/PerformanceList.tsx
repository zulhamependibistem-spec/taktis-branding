"use client";

import { useState, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { getTeamPerformance, type PerfPeriod } from "@/lib/actions/tl";

type SpgPerf = {
  id: string;
  initials: string;
  name: string;
  outlet: string;
  omzet: number;
  laporan: number;
  ec: number;
  konvSampling: number | null;
  konvSelling: number | null;
  target: number | null;
  pct: number | null;
  sisa: number | null;
};

const PERIODS: { key: PerfPeriod; label: string }[] = [
  { key: "hari", label: "Hari Ini" },
  { key: "minggu", label: "Minggu Ini" },
  { key: "bulan", label: "Bulan Ini" },
];

const fmtRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function PerformanceList({
  initial,
}: {
  initial: { omzet: number; spgs: SpgPerf[] };
}) {
  const [period, setPeriod] = useState<PerfPeriod>("hari");
  const [data, setData] = useState<{ omzet: number; spgs: SpgPerf[] }>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  async function switchPeriod(p: PerfPeriod) {
    const id = ++reqId.current;
    setPeriod(p);
    setBusy(true);
    setError(null);
    const res = await getTeamPerformance(p);
    if (id !== reqId.current) return; // respon basi dari klik sebelumnya
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setData({ omzet: res.omzet, spgs: res.spgs });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => switchPeriod(p.key)}
            className={cn(
              "flex-none rounded-xl px-4 py-2 text-[12px] font-semibold whitespace-nowrap transition active:scale-95",
              period === p.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-[12px] font-semibold text-slate-500">
            Total Omzet Tim ({PERIODS.find((x) => x.key === period)?.label})
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-indigo-600">
            {busy ? "..." : fmtRp(data.omzet)}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Icon name="analytics" size={22} />
        </div>
      </div>

      {data.spgs.length === 0 ? (
        <p className="pt-10 text-center text-sm text-slate-400">
          Belum ada data performa untuk periode ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.spgs.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600/10 text-sm font-bold text-indigo-600">
                  {s.initials || <Icon name="woman" size={20} filled />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900">{s.name}</h3>
                  <p className="flex items-center gap-1 truncate text-[12px] text-slate-500">
                    <Icon name="store" size={13} />
                    {s.outlet}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-indigo-600">
                  Omzet {fmtRp(s.omzet)}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600">
                  {s.laporan} Hari
                </span>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-violet-700">
                  EC {s.ec}
                </span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-sky-700">
                  Konv Sampling {s.konvSampling === null ? "—" : `${s.konvSampling}%`}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-700">
                  Selling {s.konvSelling === null ? "—" : fmtRp(s.konvSelling)}/call
                </span>
              </div>

              {s.target !== null && s.pct !== null && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500">
                      Target {fmtRp(s.target)}/hari
                    </span>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        s.pct >= 100 ? "text-emerald-600" : s.pct >= 50 ? "text-amber-600" : "text-rose-600"
                      )}
                    >
                      {s.pct}%{s.pct >= 100 ? " (capai)" : ` · sisa ${fmtRp(s.sisa ?? 0)}`}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        s.pct >= 100 ? "bg-emerald-500" : "bg-indigo-500"
                      )}
                      style={{ width: `${Math.min(100, s.pct)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
