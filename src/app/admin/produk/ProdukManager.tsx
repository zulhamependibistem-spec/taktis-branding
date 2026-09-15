"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { upsertProduct, toggleProduct } from "@/lib/actions/admin";

type Produk = {
  id: string;
  nama: string;
  varian: string;
  harga: number;
  aktif: boolean;
};

const VARIAN_BADGE: Record<string, string> = {
  Carbonara: "bg-orange-50 text-orange-600",
  Bolognese: "bg-sky-50 text-sky-600",
  "Aglio Olio": "bg-emerald-50 text-emerald-600",
  Goreng: "bg-amber-50 text-amber-600",
};

const inputCls =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition",
        on ? "bg-indigo-600" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function ProdukManager({
  initial,
  loadError,
}: {
  initial: Produk[];
  loadError: string | null;
}) {
  const [items, setItems] = useState<Produk[]>(initial);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(loadError);
  const [addPanel, setAddPanel] = useState(false);
  const [form, setForm] = useState({ nama: "", varian: "Carbonara", harga: "" });

  const filtered = items.filter(
    (p) =>
      query.trim() === "" ||
      p.nama.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function toggleAktif(id: string) {
    const res = await toggleProduct(id);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setItems((p) => p.map((x) => (x.id === id ? { ...x, aktif: !x.aktif } : x)));
  }

  async function save() {
    setError(null);
    if (!form.nama.trim() || !form.harga) return;
    const res = await upsertProduct({
      name: form.nama,
      variant: form.varian,
      default_price: Number(form.harga),
    });
    if (!res.success) {
      setError(res.error);
      return;
    }
    setItems((p) => [
      ...p,
      {
        id: String(Date.now()),
        nama: form.nama.trim(),
        varian: form.varian,
        harga: Number(form.harga),
        aktif: true,
      },
    ]);
    setAddPanel(false);
    setForm({ nama: "", varian: "Carbonara", harga: "" });
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Produk & Harga</h1>
        </div>
        <button
          onClick={() => setAddPanel(true)}
          className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
        >
          <Icon name="plus" size={18} />
          Tambah Produk
        </button>
      </header>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama produk..."
            className={cn(inputCls, "pl-11")}
          />
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 && (
          <p className="col-span-full pt-10 text-center text-[13px] text-slate-400">
            Belum ada produk.
          </p>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-600">
                {p.nama.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold text-slate-900">{p.nama}</p>
                  <Toggle on={p.aktif} onClick={() => toggleAktif(p.id)} />
                </div>
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                    VARIAN_BADGE[Object.keys(VARIAN_BADGE).find((k) => p.varian.toLowerCase().includes(k.toLowerCase())) ?? ""] ??
                      "bg-slate-100 text-slate-500"
                  )}
                >
                  {p.varian || "Produk"}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Default Price</p>
                <p className="font-mono text-[15px] font-bold text-indigo-600">{rp(p.harga)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {addPanel ? (
        <div className="fixed inset-0 z-overlay">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setAddPanel(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">Tambah Produk</h3>
              <button
                onClick={() => setAddPanel(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="Tutup"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <Field label="Nama Produk">
                <input
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Masukkan nama produk"
                  className={inputCls}
                />
              </Field>
              <Field label="Varian">
                <div className="relative">
                  <select
                    value={form.varian}
                    onChange={(e) => setForm({ ...form, varian: e.target.value })}
                    className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-[14px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option>Carbonara</option>
                    <option>Bolognese</option>
                    <option>Aglio Olio</option>
                    <option>Goreng</option>
                  </select>
                  <Icon
                    name="chevronDown"
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </Field>
              <Field label="Default Price (Rp)">
                <input
                  type="number"
                  value={form.harga}
                  onChange={(e) => setForm({ ...form, harga: e.target.value })}
                  placeholder="Mis: 2000"
                  className={cn(inputCls, "font-mono")}
                />
              </Field>
            </div>
            <div className="border-t border-slate-200 p-5">
              <button
                onClick={save}
                className="h-12 w-full rounded-xl bg-indigo-600 text-[14px] font-semibold text-white transition hover:bg-indigo-700 active:scale-95"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
