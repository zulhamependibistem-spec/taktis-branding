"use client";

import { useEffect, useState } from "react";
import { getOutletPriceItems, setOutletPrices } from "@/lib/actions/admin";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Item = {
  product_id: string;
  name: string;
  variant: string;
  default_price: number;
  price: number | null;
};

export default function HargaForm({
  outlets,
  initialOutletId,
}: {
  outlets: { id: string; name: string }[];
  initialOutletId: string;
}) {
  const [outletId, setOutletId] = useState(initialOutletId);
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (initialOutletId) load(initialOutletId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(id: string) {
    setBusy(true);
    setMsg(null);
    setOutletId(id);
    setDirty(false);
    const res = await getOutletPriceItems(id);
    setBusy(false);
    if (!res.success) {
      setMsg({ ok: false, text: res.error });
      setItems(null);
      return;
    }
    setItems(
      res.items.map((i) => ({
        product_id: i.product_id,
        name: i.name,
        variant: i.variant,
        default_price: Number(i.default_price),
        price: i.price === null ? null : Number(i.price),
      }))
    );
  }

  function edit(idx: number, value: string) {
    if (!items) return;
    const next = items.map((x, i) => (i === idx ? { ...x, price: value.trim() === "" ? null : Number(value) } : x));
    setItems(next);
    setDirty(true);
  }

  function resetToDefault(idx: number) {
    if (!items) return;
    const next = items.map((x, i) => (i === idx ? { ...x, price: x.default_price } : x));
    setItems(next);
    setDirty(true);
  }

  async function save() {
    if (!items) return;
    setSaving(true);
    setMsg(null);
    const res = await setOutletPrices(
      outletId,
      items.map((i) => ({ productId: i.product_id, price: i.price === null ? null : String(i.price) }))
    );
    setSaving(false);
    if (res.success) {
      setMsg({ ok: true, text: `Tersimpan. ${res.saved} SKU di-update.` });
      setDirty(false);
    } else {
      setMsg({ ok: false, text: res.error });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-[13px] font-semibold text-slate-600">Pilih Outlet</label>
        <select
          value={outletId}
          onChange={(e) => load(e.target.value)}
          className="h-11 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        >
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[12px] text-slate-400">
          Harga default berlaku jika kolom kosong. Kosongkan untuk memakai harga default.
        </p>
      </div>

      {msg && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] font-medium",
            msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          )}
        >
          <Icon name={msg.ok ? "check" : "warning"} size={16} />
          {msg.text}
        </div>
      )}

      {busy && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
          Memuat...
        </div>
      )}

      {items && !busy && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Produk</th>
                  <th className="px-4 py-2.5 font-semibold">Varian</th>
                  <th className="px-4 py-2.5 font-semibold">Harga Default</th>
                  <th className="px-4 py-2.5 font-semibold">Harga Outlet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i, idx) => (
                  <tr key={i.product_id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{i.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{i.variant}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-slate-500">
                      {i.default_price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={i.price === null ? "" : i.price}
                          onChange={(e) => edit(idx, e.target.value)}
                          placeholder={String(i.default_price)}
                          className="h-10 w-32 rounded-lg border border-slate-200 px-3 font-mono text-[13px] outline-none transition focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => resetToDefault(idx)}
                          title="Pakai harga default"
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                        >
                          Default
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-4 py-3">
            {dirty && <span className="text-[12px] font-semibold text-amber-600">Ada perubahan belum disimpan</span>}
            <button
              onClick={save}
              disabled={saving}
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-[14px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Icon name="check" size={18} />
              {saving ? "Menyimpan..." : "Simpan Harga"}
            </button>
          </div>
        </div>
      )}

      {!items && !busy && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-400">
          <Icon name="info" size={16} />
          Pilih outlet untuk memuat daftar harga SKU.
        </div>
      )}
    </div>
  );
}