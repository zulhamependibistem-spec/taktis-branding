"use client";

import { useState, useTransition, useEffect, Fragment, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { dateWIB } from "@/lib/date";
import { getAnalyticsData } from "@/lib/actions/admin";

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;

function daysAgoISO(days: number) {
  return dateWIB(new Date(Date.now() - days * 86400000));
}

function todayISO() {
  return dateWIB(new Date());
}

const VARIANT_COLORS = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];

export function AnalyticsManager() {
  const [from, setFrom] = useState(daysAgoISO(7));
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState<Extract<AnalyticsData, { success: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"overview" | "outlet">("overview");
  const reqId = useRef(0);

  const loadData = (f: string, t: string) => {
    const id = ++reqId.current;
    setError(null);
    startTransition(async () => {
      const res = await getAnalyticsData({ from: f, to: t });
      if (id !== reqId.current) return; // respon basi dari klik sebelumnya
      if (!res.success) {
        setError(res.error);
        setData(null);
      } else {
        setData(res);
      }
    });
  };

  // Fetch on mount (sync setError within effect trips the rule by design)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreset = (preset: "today" | "7d" | "30d") => {
    let f = todayISO();
    const t = todayISO();
    if (preset === "7d") f = daysAgoISO(7);
    if (preset === "30d") f = daysAgoISO(30);
    setFrom(f);
    setTo(t);
    loadData(f, t);
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(from, to);
  };

  // BI Metric Ratios
  const sellThroughRate = data
    ? data.summary.totalQtySold + data.summary.totalStockAkhir > 0
      ? Math.round(
          (data.summary.totalQtySold /
            (data.summary.totalQtySold + data.summary.totalStockAkhir)) *
            100
        )
      : 0
    : 0;

  const samplingEfficiency = data
    ? data.summary.totalSampling > 0
      ? (data.summary.totalQtySold / data.summary.totalSampling).toFixed(1)
      : "0"
    : "0";

  const totalStoresCount = data ? Math.max(1, data.outletList.length) : 1;
  const avgRevPerStore = data ? Math.round(data.summary.totalRevenue / totalStoresCount) : 0;

  // Max daily revenue for Trend Chart SVG scaling
  const maxTrendRev = data
    ? Math.max(...data.dailyTrends.map((d) => d.revenue), 1)
    : 1;

  // Donut slices calculation for regular variants
  let accumulatedAngle = 0;
  const donutSlices = data
    ? data.variantList.map((v, i) => {
        const percentage = v.pctQty;
        const angle = (percentage / 100) * 360;
        const startAngle = accumulatedAngle;
        accumulatedAngle += angle;
        return {
          ...v,
          startAngle,
          angle,
          color: VARIANT_COLORS[i % VARIANT_COLORS.length],
        };
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Top Filter Bar Header (User's Favorite) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Executive BI Analytics</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => handlePreset("today")}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handlePreset("7d")}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => handlePreset("30d")}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              30 Hari
            </button>
          </div>

          <form onSubmit={handleFilter} className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-xs font-semibold text-slate-400">s/d</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              <Icon name="search" size={14} />
              {isPending ? "..." : "Filter"}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {(["overview", "outlet"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-t-lg px-4 py-2.5 text-[13px] font-semibold transition",
              tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {t === "overview" ? "Overview" : "Breakdown Toko"}
          </button>
        ))}
      </div>

      {data && tab === "overview" && (
        <>
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Gross Omzet</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Icon name="edit" size={16} />
                </span>
              </div>
              <p className="mt-2 text-lg font-extrabold text-slate-900">
                Rp {data.summary.totalRevenue.toLocaleString("id-ID")}
              </p>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span>Rerata Store: Rp {avgRevPerStore.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Volume Selling</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon name="storefront" size={16} />
                </span>
              </div>
              <p className="mt-2 text-lg font-extrabold text-slate-900">
                {data.summary.totalQtySold.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-semibold text-slate-500">Pcs</span>
              </p>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                <span>Sell-Through: {sellThroughRate}%</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Kontribusi Promo</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Icon name="store" size={16} />
                </span>
              </div>
              <p className="mt-2 text-lg font-extrabold text-slate-900">
                Rp {data.summary.totalPromoRevenue.toLocaleString("id-ID")}
              </p>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-purple-600">
                <span>Share Omzet: {data.summary.promoRevPct}%</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Sampling Ratio</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Icon name="schedule" size={16} />
                </span>
              </div>
              <p className="mt-2 text-lg font-extrabold text-slate-900">
                {data.summary.totalSampling.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-semibold text-slate-500">Cup</span>
              </p>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                <span>Efisiensi: {samplingEfficiency} Pcs / Cup</span>
              </div>
            </div>
          </div>

          {/* Daily Selling Trend Bar & Line Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Tren Penjualan Harian (Revenue & Volume)</h2>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Omzet (Rp)
                </span>
                <span className="flex items-center gap-1.5 text-cyan-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Volume (Pcs)
                </span>
              </div>
            </div>

            {data.dailyTrends.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-xs font-medium text-slate-400">
                Belum ada transaksi laporan selling dalam rentang tanggal ini.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex h-48 items-end justify-between gap-2 border-b border-slate-200 pb-2 pt-6 px-2">
                  {data.dailyTrends.map((d, i) => {
                    const heightPct = Math.max(10, Math.round((d.revenue / maxTrendRev) * 100));
                    return (
                      <div
                        key={i}
                        className="group relative flex flex-1 flex-col items-center justify-end h-full"
                      >
                        <div className="absolute -top-12 z-20 hidden rounded-lg bg-slate-900 px-2.5 py-1 text-center text-[10px] font-semibold text-white shadow-lg group-hover:block whitespace-nowrap">
                          <p>{d.date}</p>
                          <p className="text-emerald-400">Rp {d.revenue.toLocaleString("id-ID")}</p>
                          <p className="text-cyan-300">{d.qty} Pcs</p>
                        </div>
                        <div
                          className="w-full max-w-[42px] rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-300 group-hover:opacity-90"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between px-2 text-[10px] font-semibold text-slate-400">
                  {data.dailyTrends.map((d, i) => (
                    <span key={i} className="flex-1 text-center truncate">
                      {d.date.slice(5)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* NEW BI ADDITION: TL Leaderboard & Channel Group Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* TL Performance Leaderboard */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Performa Penjualan per Team Leader</h2>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 border border-indigo-200">
                  {data.tlList.length} Team Leader Area
                </span>
              </div>

              {data.tlList.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-xs font-medium text-slate-400">
                  Belum ada data transaksi Team Leader.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {data.tlList.map((t, idx) => (
                    <div key={t.tl} className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold text-white">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">{t.tl}</span>
                        </div>
                        <span className="font-extrabold text-indigo-600">
                          Rp {t.revenue.toLocaleString("id-ID")}{" "}
                          <span className="font-medium text-slate-500">({t.qty} Pcs)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span>Tim: {t.spgCount} SPG Aktif</span>
                        <span>Share: {t.pctRev}% Omzet</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{ width: `${Math.min(100, t.pctRev)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Channel Group Performance */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Distribusi Channel Penjualan</h2>
                </div>
                <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-700 border border-cyan-200">
                  {data.channelList.length} Channel
                </span>
              </div>

              {data.channelList.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-xs font-medium text-slate-400">
                  Belum ada data channel toko.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {data.channelList.map((c) => (
                    <div key={c.channel} className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{c.channel}</span>
                        <span className="font-extrabold text-slate-900">
                          Rp {c.revenue.toLocaleString("id-ID")}{" "}
                          <span className="font-medium text-slate-500">({c.qty} Pcs)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                        <span>Kontribusi Omzet Total</span>
                        <span>{c.pctRev}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${Math.min(100, c.pctRev)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Varian Reguler vs Paket Promo Analytics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Donut Chart: Varian Reguler Market Share */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Performa Varian Reguler</h2>

              {data.variantList.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-xs font-medium text-slate-400">
                  Tidak ada data varian reguler.
                </div>
              ) : (
                <div className="flex flex-col items-center sm:flex-row sm:justify-around gap-6">
                  <div className="relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full bg-slate-100 p-3 shadow-inner">
                    <div
                      className="h-full w-full rounded-full"
                      style={{
                        background: `conic-gradient(${donutSlices
                          .map(
                            (s) => `${s.color} ${s.startAngle}deg ${s.startAngle + s.angle}deg`
                          )
                          .join(", ")})`,
                      }}
                    />
                    <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Reguler</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {data.summary.totalQtySold - data.summary.totalPromoQty}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">Pcs</span>
                    </div>
                  </div>

                  <div className="w-full space-y-2.5">
                    {data.variantList.map((v, i) => (
                      <div key={v.variant} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shadow-sm"
                            style={{ backgroundColor: VARIANT_COLORS[i % VARIANT_COLORS.length] }}
                          />
                          <span className="font-semibold text-slate-800">{v.variant}</span>
                        </div>
                        <div className="text-right font-medium">
                          <span className="font-bold text-slate-900">{v.pctQty}%</span>
                          <span className="text-slate-400 text-[11px]"> ({v.qty} Pcs)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Promo & Paket Bundling Performance */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Performa Paket Promo & Bundling</h2>
                </div>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                  {data.packageList.length} Jenis Paket
                </span>
              </div>

              {data.packageList.length === 0 ? (
                <div className="flex h-52 flex-col items-center justify-center text-center text-xs font-medium text-slate-400">
                  Belum ada transaksi penjualan paket promo.
                </div>
              ) : (
                <div className="space-y-4">
                  {data.packageList.map((p) => (
                    <div key={p.variant} className="space-y-1.5 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-900">{p.variant}</span>
                        <span className="font-bold text-slate-900">
                          Rp {p.revenue.toLocaleString("id-ID")}{" "}
                          <span className="font-normal text-slate-500">({p.qty} Paket)</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-purple-600"
                          style={{ width: `${Math.min(100, p.pctQty)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top 5 vs Bottom 5 Outlets Comparative Analysis */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top 5 Outlets */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">Top 5 Outlet Performers (Omzet Highest)</h2>

              <div className="space-y-3">
                {data.topOutlets.length === 0 ? (
                  <p className="py-6 text-center text-xs font-medium text-slate-400">Belum ada data toko.</p>
                ) : (
                  data.topOutlets.map((o, idx) => {
                    const maxTopRev = data.topOutlets[0]?.revenue || 1;
                    const barPct = Math.round((o.revenue / maxTopRev) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 text-[11px] font-bold text-indigo-600">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                              {o.name}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900">
                            Rp {o.revenue.toLocaleString("id-ID")}{" "}
                            <span className="font-normal text-slate-400">({o.qty} Pcs)</span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom 5 Outlets */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">5 Outlet Perlu Perhatian (Omzet Lowest)</h2>

              <div className="space-y-3">
                {data.bottomOutlets.length === 0 ? (
                  <p className="py-6 text-center text-xs font-medium text-slate-400">Belum ada data toko.</p>
                ) : (
                  data.bottomOutlets.map((o, idx) => {
                    const maxTopRev = data.topOutlets[0]?.revenue || 1;
                    const barPct = Math.max(8, Math.round((o.revenue / maxTopRev) * 100));
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-50 text-[11px] font-bold text-amber-600">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                              {o.name}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900">
                            Rp {o.revenue.toLocaleString("id-ID")}{" "}
                            <span className="font-normal text-slate-400">({o.qty} Pcs)</span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {data && tab === "outlet" && <OutletBreakdown data={data} />}
    </div>
  );
}

function OutletBreakdown({ data }: { data: Extract<AnalyticsData, { success: true }> }) {
  const [query, setQuery] = useState("");
  const [col, setCol] = useState<"revenue" | "qty">("revenue");
  const [asc, setAsc] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = data.outletList
    .filter((o) => {
      const q = query.trim().toLowerCase();
      return (
        !q ||
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        o.area.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (asc ? a[col] - b[col] : b[col] - a[col]));

  const toggle = (c: "revenue" | "qty") => {
    if (col === c) setAsc((v) => !v);
    else {
      setCol(c);
      setAsc(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const achievementStyle = (pct: number) =>
    pct >= 100 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-rose-600";
  const achievementBar = (pct: number) =>
    pct >= 100
      ? "bg-emerald-500"
      : pct >= 70
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Breakdown Omzet per Toko</h2>
          <p className="text-[11px] font-medium text-slate-400">Klik nama toko utk lihat breakdown per SPG.</p>
        </div>
        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama / kode / area..."
            className="w-60 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-14 text-center text-xs font-medium text-slate-400">Tidak ada toko yang cocok.</div>
      ) : (
        <div className="max-h-[34rem] overflow-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5 font-semibold">#</th>
                <th className="px-3 py-2.5 font-semibold">Kode</th>
                <th className="px-3 py-2.5 font-semibold">Nama Toko</th>
                <th className="px-3 py-2.5 font-semibold">Area</th>
                <th className="px-3 py-2.5 font-semibold">GRSM</th>
                <th className="px-3 py-2.5 font-semibold">Channel</th>
                <th className="px-3 py-2.5 text-right font-semibold">
                  <button
                    type="button"
                    onClick={() => toggle("qty")}
                    className="inline-flex items-center justify-end gap-1 font-semibold hover:text-indigo-600"
                  >
                    Qty (Pcs)
                    {col === "qty" && (
                      <Icon name="chevronDown" size={12} className={asc ? "rotate-180" : ""} />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold">
                  <button
                    type="button"
                    onClick={() => toggle("revenue")}
                    className="inline-flex items-center justify-end gap-1 font-semibold hover:text-indigo-600"
                  >
                    Omzet (Rp)
                    {col === "revenue" && (
                      <Icon name="chevronDown" size={12} className={asc ? "rotate-180" : ""} />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right font-semibold">Target (Rp)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Achievement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((o) => {
                const open = expanded.has(o.id);
                return (
                  <Fragment key={o.id}>
                    <tr className="transition hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-400">{o.rank}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{o.code}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(o.id)}
                          className="inline-flex items-center gap-1.5 text-left font-semibold text-slate-900 transition hover:text-indigo-600"
                        >
                          <Icon
                            name="chevronRight"
                            size={14}
                            className={cn("text-slate-400 transition-transform", open && "rotate-90")}
                          />
                          {o.name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{o.area}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block whitespace-nowrap rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                          {o.grsm}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{o.channel}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-600">{o.qty}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-slate-900">
                        Rp {o.revenue.toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500">
                        Rp {o.target.toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("text-xs font-bold", achievementStyle(o.achievementPct))}>
                            {o.achievementPct}%
                          </span>
                          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={cn("h-full rounded-full", achievementBar(o.achievementPct))}
                              style={{ width: `${Math.min(100, o.achievementPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={10} className="px-6 py-3">
                          <div className="rounded-lg border border-slate-100 bg-white p-3">
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              Breakdown per SPG · {o.name}
                            </p>
                            {o.spgList.length === 0 ? (
                              <p className="py-4 text-center text-xs text-slate-400">Belum ada laporan SPG toko ini.</p>
                            ) : (
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                                    <th className="px-2 py-1.5 font-semibold">#</th>
                                    <th className="px-2 py-1.5 font-semibold">Nama SPG</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Qty (Pcs)</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Omzet (Rp)</th>
                                    <th className="px-2 py-1.5 text-right font-semibold">Share Toko</th>
                                    <th className="px-2 py-1.5 w-1/4"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {o.spgList.map((s) => (
                                    <tr key={s.rank}>
                                      <td className="px-2 py-2 font-mono text-[11px] text-slate-400">{s.rank}</td>
                                      <td className="px-2 py-2 font-semibold text-slate-800">{s.name}</td>
                                      <td className="px-2 py-2 text-right font-mono text-slate-600">{s.qty}</td>
                                      <td className="px-2 py-2 text-right font-mono text-slate-900">
                                        Rp {s.revenue.toLocaleString("id-ID")}
                                      </td>
                                      <td className="px-2 py-2 text-right font-bold text-indigo-600">{s.pctShare}%</td>
                                      <td className="px-2 py-2">
                                        <div className="h-1 overflow-hidden rounded-full bg-slate-200">
                                          <div
                                            className="h-full rounded-full bg-indigo-500"
                                            style={{ width: `${Math.min(100, s.pctShare)}%` }}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
