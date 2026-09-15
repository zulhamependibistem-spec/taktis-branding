"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { submitStockReport } from "@/lib/actions/stock";

type Item = { id: string; variant: string; image_url?: string | null };
type Row = { awal: number; akhir: number; reason: string; touched: boolean; akhirEdited: boolean };

function resolveSKUImage(variant: string, dbUrl?: string | null): string | null {
  const v = (variant || "").toLowerCase();
  if (v.includes("goreng")) return "/products/goreng.jpg";
  if (v.includes("bolognese")) return "/products/bolognese.jpg";
  if (v.includes("carbonara")) return "/products/carbonara.jpg";
  if (v.includes("aglio")) return "/products/aglio-olio.jpg";
  return dbUrl || null;
}

export default function StockForm({
  items,
  sold,
}: {
  items: Item[];
  sold: Record<string, number>;
}) {
  const router = useRouter();
  const fresh = (): Record<string, Row> =>
    Object.fromEntries(items.map((s) => [s.id, { awal: 0, akhir: 0, reason: "", touched: false, akhirEdited: false }]));

  const [stock, setStock] = useState<Record<string, Row>>(fresh);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const { ask, dialog } = useConfirmDialog();

  // Load saved offline draft on mount (must be an effect: localStorage only exists in browser)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("taktis_stock_draft");
      if (saved) {
        const data = JSON.parse(saved);
        if (data && typeof data === "object") {
          setStock((prev) => ({ ...prev, ...data }));
          setHasDraft(true);
        }
      }
    } catch {}
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-save draft on input change
  useEffect(() => {
    try {
      localStorage.setItem("taktis_stock_draft", JSON.stringify(stock));
    } catch {}
  }, [stock]);

  function setField(id: string, field: "awal" | "akhir" | "reason", val: string | number) {
    setStock((prev) => {
      const cur = prev[id] ?? fresh()[id];
      const next: Row = {
        ...cur,
        touched: true,
        [field]: field === "reason" ? String(val) : Math.max(0, Number(val) || 0),
      };
      if (field === "akhir") next.akhirEdited = true;
      // Isi otomatis akhir = awal − terjual, tapi hanya jika SPG belum mengetik stok akhir
      // (jangan timpa angka akhir yang sudah dimasukkan manual).
      if (field === "awal" && !next.akhirEdited) next.akhir = Math.max(0, next.awal - (sold[id] ?? 0));
      return { ...prev, [id]: next };
    });
  }

  const diff = (id: string) => {
    const r = stock[id];
    return (r?.awal ?? 0) - (sold[id] ?? 0) - (r?.akhir ?? 0);
  };
  const isDiff = (id: string) => stock[id]?.touched && diff(id) !== 0;
  const isValid = (id: string) => stock[id]?.touched && isDiff(id) === false;
  const diffCount = items.filter((s) => isDiff(s.id)).length;
  const hasDiff = diffCount > 0;

  async function submit() {
    setMessage(null);
    const toSubmit = items.map((s) => {
      const r = stock[s.id];
      return {
        product_id: s.id,
        stock_awal: r?.awal ?? 0,
        stock_akhir: r?.akhir ?? 0,
        other_reason: r?.reason?.trim() || undefined,
      };
    });

    const lines = items
      .map((sku) => {
        const r = stock[sku.id];
        if (!r?.touched) return null;
        const terjual = sold[sku.id] ?? 0;
        const d = diff(sku.id);
        return (
          <div
            key={sku.id}
            className="flex flex-wrap items-baseline justify-between gap-x-2 text-[12px]"
          >
            <span className="font-semibold text-slate-700">{sku.variant}</span>
            <span className="font-mono text-slate-500">
              Awal {r.awal} · Terjual {terjual} · Akhir {r.akhir}
              {d !== 0 && (
                <span className={d !== 0 ? "ml-1 font-bold text-amber-600" : ""}>
                  ({Math.abs(d)} pcs selisih{r.reason ? " — beri alasan" : ""})
                </span>
              )}
            </span>
          </div>
        );
      })
      .filter(Boolean);
    if (lines.length === 0) {
      setMessage({ ok: false, text: "Belum ada stok yang diisi." });
      return;
    }

    const ok = await ask({
      title: "Simpan Laporan Stok?",
      message: <div className="flex flex-col gap-1.5">{lines}</div>,
      confirmText: "Ya, Simpan",
    });
    if (!ok) return;

    setBusy(true);
    const res = await submitStockReport({ items: toSubmit });
    setBusy(false);
    if (!res.success) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    try {
      localStorage.removeItem("taktis_stock_draft");
    } catch {}
    setMessage({ ok: true, text: "Laporan stok terkirim." });
    router.replace("/spg");
  }

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
        {items.map((sku) => {
          const r = stock[sku.id] ?? { awal: 0, akhir: 0, reason: "", touched: false };
          const terjual = sold[sku.id] ?? 0;
          const d = diff(sku.id);
          const diffHere = isDiff(sku.id);
          const balanced = isValid(sku.id);
          const imgSrc = resolveSKUImage(sku.variant, sku.image_url);
          return (
            <div
              key={sku.id}
              className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {imgSrc && (
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={sku.variant}
                        className="h-full w-full rounded-lg object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-[14px] font-bold text-slate-900 leading-tight">{sku.variant}</h2>
                    <span className="inline-block mt-0.5 rounded-full bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-700">
                      Terjual {terjual} pcs
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-slate-100" />

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={r.awal}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setField(sku.id, "awal", e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 text-center font-mono text-[18px] font-bold text-slate-900 transition focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                    Stok Akhir{" "}
                    <span className="font-normal text-slate-400">(awal − terjual)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={r.akhir}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setField(sku.id, "akhir", e.target.value)}
                    className="h-10 w-full rounded-lg bg-slate-50 text-center font-mono text-[18px] font-bold text-slate-900 transition focus:bg-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2",
                  diffHere
                    ? "bg-amber-50"
                    : balanced
                      ? "bg-emerald-50"
                      : "bg-slate-100"
                )}
              >
                <span className="text-[12px] font-medium text-slate-500">
                  {diffHere
                    ? "Selisih (di luar penjualan)"
                    : balanced
                      ? "Stok seimbang"
                      : "Belum diisi"}
                </span>
                <span
                  className={cn(
                    "font-mono text-[14px] font-bold",
                    diffHere ? "text-amber-600" : balanced ? "text-emerald-600" : "text-slate-400"
                  )}
                >
                  {diffHere || balanced ? `${Math.abs(d)} pcs` : "0 pcs"}
                </span>
              </div>
              {diffHere && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="font-mono text-[11px] text-amber-700/80">
                    {r.awal} awal − {terjual} terjual − {r.akhir} akhir = {d} selisih
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-amber-700">
                    Ada {Math.abs(d)} unit tidak sesuai. Jelaskan:
                  </p>
                  <textarea
                    value={r.reason}
                    onChange={(e) => setField(sku.id, "reason", e.target.value)}
                    placeholder="Alasan (rusak, retur, hilang, dll)..."
                    className="mt-2 h-16 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-[13px] focus:ring-2 focus:ring-amber-300 focus:outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}

        {hasDiff && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <span className="mt-0.5 text-amber-600"><Icon name="warning" size={16} /></span>
            <p className="text-[13px] font-medium text-amber-700">
              Selisih stok di {diffCount} SKU. Isi alasan di kartu selisih sebelum menyimpan.
            </p>
          </div>
        )}

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

      {/* Fixed Bottom */}
      <div className="fixed inset-x-0 bottom-16 z-nav border-t border-slate-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-md p-4">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="h-[52px] w-full rounded-xl bg-indigo-600 text-[16px] font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
          >
            {busy ? "Menyimpan..." : "Simpan Laporan"}
          </button>
        </div>
      </div>
      {dialog}
    </>
  );
}