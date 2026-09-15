"use client";

import { useState } from "react";
import StatusPill from "@/components/ui/StatusPill";

type Tab = "sales" | "stok";

type SalesReport = {
  id: string;
  report_date: string;
  qty_sold: number;
  sampling_qty: number;
  total_selling: number;
  status: string;
  ec: number | null;
  product: { variant: string } | null;
  outlet: { name: string } | null;
};

type StockReport = {
  id: string;
  report_date: string;
  stock_awal: number;
  stock_akhir: number;
  selisih: number;
  status: string;
  product: { variant: string } | null;
  outlet: { name: string } | null;
};

function fmtDate(d: string) {
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtRp(n: number) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

function worstStatus(items: { status: string }[]) {
  return items.some((r) => r.status !== "approved") ? "pending" : "approved";
}

type Day = {
  date: string;
  status: string;
  outlet: string;
  ec?: number;
  total?: number;
  lines: { product: string; qty: string; sub: string }[];
};

export default function RiwayatList({
  sales,
  stock,
}: {
  sales: SalesReport[];
  stock: StockReport[];
}) {
  const [tab, setTab] = useState<Tab>("sales");

  const byDate = <T extends { report_date: string }>(rows: T[]): T[][] => {
    const map = new Map<string, T[]>();
    rows.forEach((r) => {
      const k = r.report_date;
      map.set(k, [...(map.get(k) ?? []), r]);
    });
    return [...map.values()];
  };

  const salesDays: Day[] = byDate(sales).map((rows) => ({
    date: rows[0].report_date,
    status: worstStatus(rows),
    outlet: rows[0].outlet?.name ?? "—",
    ec: Math.max(...rows.map((r) => r.ec ?? 0)),
    total: rows.reduce((s, r) => s + (r.total_selling || 0), 0),
    lines: rows.map((r) => ({
      product: r.product?.variant ?? "—",
      qty: `${r.qty_sold} pcs`,
      sub: fmtRp(r.total_selling || 0),
    })),
  }));

  const stockDays: Day[] = byDate(stock).map((rows) => ({
    date: rows[0].report_date,
    status: worstStatus(rows),
    outlet: rows[0].outlet?.name ?? "—",
    lines: rows.map((r) => ({
      product: r.product?.variant ?? "—",
      qty: `${r.stock_awal} → ${r.stock_akhir}`,
      sub: `Selisih ${r.selisih}`,
    })),
  }));

  const days = tab === "sales" ? salesDays : stockDays;

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 pt-2">
        <button
          type="button"
          onClick={() => setTab("sales")}
          className={`rounded-full px-4 py-2 text-[12px] font-bold transition ${
            tab === "sales"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
          }`}
        >
          Sales
        </button>
        <button
          type="button"
          onClick={() => setTab("stok")}
          className={`rounded-full px-4 py-2 text-[12px] font-bold transition ${
            tab === "stok"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
          }`}
        >
          Stok
        </button>
      </div>

      {/* List */}
      <main className="space-y-3 px-4 pb-24 pt-4">
        {days.length === 0 && (
          <p className="pt-20 text-center text-sm text-slate-400">
            Belum ada laporan {tab === "sales" ? "sales" : "stok"}.
          </p>
        )}
        {days.map((day, i) => (
          <div
            key={day.date + i}
            className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-500">{fmtDate(day.date)}</span>
              <div className="flex items-center gap-1.5">
                {tab === "sales" && (day.ec ?? 0) > 0 && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-700">
                    EC {day.ec}
                  </span>
                )}
                <StatusPill status={day.status} />
              </div>
            </div>
            <h3 className="mb-3 text-[16px] font-semibold text-slate-900">{day.outlet}</h3>

            <div className="space-y-1.5">
              {day.lines.map((l, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-[13px] font-medium text-slate-700">{l.product}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[12px] text-slate-500">{l.qty}</span>
                    <span className="w-[72px] text-right font-mono text-[12px] font-semibold text-slate-900">
                      {l.sub}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {tab === "sales" && (
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                  Total Omzet
                </span>
                <span className="font-mono text-[15px] font-bold text-slate-900">
                  {fmtRp(day.total ?? 0)}
                </span>
              </div>
            )}
          </div>
        ))}
      </main>
    </>
  );
}