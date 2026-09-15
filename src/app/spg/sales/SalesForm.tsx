"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { submitSalesReport } from "@/lib/actions/sales";

type Item = { id: string; name: string; variant: string; image_url: string | null; unit_price: number };

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function resolveSKUImage(variant: string, dbUrl?: string | null): string | null {
  const v = (variant || "").toLowerCase();
  if (v.includes("goreng")) return "/products/goreng.jpg";
  if (v.includes("bolognese")) return "/products/bolognese.jpg";
  if (v.includes("carbonara")) return "/products/carbonara.jpg";
  if (v.includes("aglio")) return "/products/aglio-olio.jpg";
  return dbUrl || null;
}

export default function SalesForm({ items }: { items: Item[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>(
    Object.fromEntries(items.map((s) => [s.id, 0]))
  );
  const [sampling, setSampling] = useState<Record<string, number>>(
    Object.fromEntries(items.map((s) => [s.id, 0]))
  );
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(items.map((s) => [s.id, s.unit_price]))
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [ec, setEc] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const { ask, dialog } = useConfirmDialog();

  // Load saved offline draft on mount (must be an effect: localStorage only exists in browser)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("taktis_sales_draft");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.qty) setQty((prev) => ({ ...prev, ...data.qty }));
        if (data.sampling) setSampling((prev) => ({ ...prev, ...data.sampling }));
        if (data.prices) setPrices((prev) => ({ ...prev, ...data.prices }));
        if (typeof data.ec === "number") setEc(data.ec);
        setHasDraft(true);
      }
    } catch {}
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-save draft on any input change
  useEffect(() => {
    try {
      localStorage.setItem("taktis_sales_draft", JSON.stringify({ qty, sampling, prices, ec }));
    } catch {}
  }, [qty, sampling, prices, ec]);

  const totalOmzet = items.reduce((sum, s) => sum + (prices[s.id] ?? 0) * (qty[s.id] ?? 0), 0);

  function dec(id: string) {
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) - 1) }));
  }
  function inc(id: string) {
    setQty((q) => ({ ...q, [id]: (q[id] ?? 0) + 1 }));
  }

  async function submit() {
    setMessage(null);
    const toSubmit = items
      .map((s) => ({
        product_id: s.id,
        qty_sold: qty[s.id] ?? 0,
        sampling_qty: sampling[s.id] ?? 0,
        unit_price: prices[s.id] ?? 0,
      }))
      .filter((i) => (i.qty_sold ?? 0) > 0);
    if (!toSubmit.length) {
      setMessage({ ok: false, text: "Belum ada qty yang diisi." });
      return;
    }
    const totalSampling = toSubmit.reduce((sum, i) => sum + (i.sampling_qty ?? 0), 0);
    if (totalSampling > 160) {
      setMessage({ ok: false, text: `Total sampling melebihi batas 160 (saat ini ${totalSampling}).` });
      return;
    }

    const ok = await ask({
      title: "Kirim Laporan Sales?",
      message: (
        <div className="flex flex-col gap-1.5">
          {toSubmit.map((i) => {
            const sku = items.find((s) => s.id === i.product_id);
            return (
              <div
                key={i.product_id}
                className="flex flex-wrap items-baseline justify-between gap-x-2 text-[12px]"
              >
                <span className="font-semibold text-slate-700">{sku?.variant ?? "?"}</span>
                <span className="font-mono text-slate-500">
                  {i.qty_sold} pcs · samp {i.sampling_qty} · {formatRp(i.qty_sold * i.unit_price)}
                </span>
              </div>
            );
          })}
          <div className="mt-1 flex items-baseline justify-between border-t border-slate-100 pt-1.5 text-[12px]">
            <span className="text-slate-500">EC</span>
            <span className="font-mono font-bold text-slate-700">{ec}</span>
          </div>
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-slate-800">Total Omzet</span>
            <span className="font-mono text-[15px] font-bold text-indigo-600">{formatRp(totalOmzet)}</span>
          </div>
        </div>
      ),
      confirmText: "Ya, Kirim",
    });
    if (!ok) return;

    setBusy(true);
    const res = await submitSalesReport({ items: toSubmit, ec });
    setBusy(false);
    if (!res.success) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    try {
      localStorage.removeItem("taktis_sales_draft");
    } catch {}
    router.replace("/spg/stock");
  }

  const regularItems = items.filter((s) => !s.name.includes("Paket") && !s.variant.toLowerCase().includes("buy"));
  const promoItems = items.filter((s) => s.name.includes("Paket") || s.variant.toLowerCase().includes("buy"));

  const renderCard = (sku: Item, isPromo = false) => {
    const imgSrc = resolveSKUImage(sku.variant, sku.image_url);
    return (
      <div
        key={sku.id}
        className={cn(
          "flex flex-col gap-2.5 rounded-xl border p-3 shadow-sm transition-all",
          isPromo
            ? "border-amber-200 bg-amber-50/40"
            : "border-slate-200 bg-white"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {imgSrc ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={sku.variant}
                  className="h-full w-full rounded-lg object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Icon name="storefront" size={20} />
              </div>
            )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-[14px] font-bold text-slate-900 leading-tight">{sku.variant}</h2>
              {isPromo && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                  PROMO
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              {formatRp(prices[sku.id] ?? 0)} / {isPromo ? "paket" : "pcs"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] font-semibold text-slate-400">Rp</span>
          <input
            type="number"
            min={1}
            value={prices[sku.id] ?? 0}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              setPrices((p) => ({ ...p, [sku.id]: Math.max(0, parseInt(e.target.value) || 0) }))
            }
            className="h-7 w-20 rounded-lg border border-slate-200 bg-slate-50 px-1.5 font-mono text-[12px] font-bold text-slate-800 outline-none transition focus:bg-white focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="h-px w-full bg-slate-100" />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dec(sku.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 transition hover:bg-slate-100 active:scale-95"
          >
            <Icon name="minus" size={16} />
          </button>
          <input
            type="number"
            min={0}
            value={qty[sku.id]}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              setQty((q) => ({ ...q, [sku.id]: Math.max(0, parseInt(e.target.value) || 0) }))
            }
            className="w-12 rounded-lg border border-slate-200 bg-white py-1 text-center font-mono text-[18px] font-bold text-indigo-600 outline-none transition focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => inc(sku.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600 transition hover:bg-slate-100 active:scale-95"
          >
            <Icon name="plus" size={16} />
          </button>
          <button
            type="button"
            onClick={() => setQty((q) => ({ ...q, [sku.id]: (q[sku.id] ?? 0) + 10 }))}
            className="flex h-8 items-center rounded-lg border border-indigo-200 bg-indigo-50/80 px-2 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100 active:scale-95"
          >
            +10
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-tight">
            Samp.
          </label>
          <input
            type="number"
            min={0}
            max={160}
            value={sampling[sku.id] ?? 0}
            onFocus={(e) => e.target.select()}
            onChange={(e) =>
              setSampling((s) => ({
                ...s,
                [sku.id]: Math.min(160, Math.max(0, parseInt(e.target.value) || 0)),
              }))
            }
            className="h-8 w-14 rounded-lg border border-slate-200 bg-slate-50 px-1 text-center font-mono text-[13px] font-bold text-slate-800 transition focus:bg-white focus:border-indigo-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
};

  return (
    <>
      <main className="space-y-4 p-4 pb-52">
        <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3.5 py-2 text-[12px] text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Auto-Save Offline Draft
          </span>
          <span className="font-mono text-[11px] font-semibold text-slate-500">
            {hasDraft ? "Draft Dipulihkan" : "Tersimpan Otomatis"}
          </span>
        </div>

        {/* Regular SKU Products */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              Varian Produk Regular
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {regularItems.map((sku) => renderCard(sku, false))}
        </div>

        {/* Promo / Paket Section Divider */}
        {promoItems.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                Paket Promo &amp; Bundling
              </span>
              <div className="h-px flex-1 bg-amber-200" />
            </div>
            {promoItems.map((sku) => renderCard(sku, true))}
          </div>
        )}

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
          <label className="mb-1 block text-[14px] font-bold text-slate-900">
            EC — Effective Call
          </label>
          <p className="mb-3 text-[12px] text-slate-500">
            Jumlah pelanggan yang membeli produk setelah mencoba sampling hari ini.
          </p>
          <input
            type="number"
            min={0}
            value={ec}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setEc(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-12 w-32 rounded-xl border border-slate-200 bg-white px-3 text-center font-mono text-[20px] font-semibold text-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
        </div>

        {message && (
          <p
            className={`rounded-lg px-3 py-2.5 text-sm ${
              message.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </p>
        )}
      </main>

      {/* Fixed Bottom Bar */}
      <div className="fixed inset-x-0 bottom-16 z-nav border-t border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total Omzet</span>
            <span className="font-mono text-[20px] font-semibold text-indigo-600">
              {formatRp(totalOmzet)}
            </span>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="h-12 w-full rounded-xl bg-indigo-600 text-[16px] font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
          >
            {busy ? "Mengirim..." : "Kirim Laporan"}
          </button>
        </div>
      </div>
      {dialog}
    </>
  );
}
