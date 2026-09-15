import Link from "next/link";
import { getOutlets, type OutletRow } from "@/lib/actions/admin";
import AdminShell from "@/components/admin/AdminShell";
import FitPanel from "@/components/admin/FitPanel";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const PER_PAGE = 20;

function paginateParams(q: string, grsm: string, page: number) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (grsm) p.set("grsm", grsm);
  if (page > 1) p.set("page", String(page));
  return p.toString();
}

export default async function AdminOutletPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grsm?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const grsm = sp.grsm ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const res = await getOutlets({ q, grsm, page, perPage: PER_PAGE });
  const list: OutletRow[] = res.success ? res.list : [];
  const total = res.success ? res.total : 0;
  const grsmOptions = res.success ? res.grsmOptions : [];

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <AdminShell active="outlet">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Master Outlet</h1>
          <p className="mt-1 text-[13px] text-slate-500">{total.toLocaleString("id-ID")} toko terdaftar</p>
        </div>
        <Link
          href="/admin/import"
          className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white transition hover:bg-indigo-700"
        >
          <Icon name="upload" size={16} />
          Import & Sync
        </Link>
      </header>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nama / area outlet..."
            className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-[13px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          name="grsm"
          defaultValue={grsm}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Semua GRSM</option>
          {grsmOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 rounded-xl bg-slate-900 px-5 text-[13px] font-semibold text-white transition hover:bg-slate-700"
        >
          Filter
        </button>
      </form>

      <FitPanel>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">GRSM</th>
                <th className="px-4 py-2.5 font-semibold">Kode Outlet</th>
                <th className="px-4 py-2.5 font-semibold">Kode Subdist</th>
                <th className="px-4 py-2.5 font-semibold">Nama Toko</th>
                <th className="px-4 py-2.5 font-semibold">Area</th>
                <th className="px-4 py-2.5 font-semibold">Channel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-400">
                    Tidak ada outlet.
                  </td>
                </tr>
              ) : (
                list.map((o) => (
                  <tr key={o.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold",
                          o.grsm ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                        )}
                      >
                        {o.grsm || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-500">{o.code_outlet}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-500">{o.code_subdist || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{o.name}</td>
                    <td className="px-4 py-3 text-slate-500">{o.area || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{o.channel_group || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-[12px] text-slate-500">Hal {page} dari {totalPages}</p>
          <div className="flex items-center gap-1">
            <Link
              href={`?${paginateParams(q, grsm, page - 1)}`}
              aria-disabled={page <= 1}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600",
                page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
              )}
              aria-label="Sebelumnya"
            >
              <Icon name="chevronRight" size={16} className="rotate-180" />
            </Link>
            <span className="px-2 text-[13px] font-semibold text-slate-700">{page}</span>
            <Link
              href={`?${paginateParams(q, grsm, page + 1)}`}
              aria-disabled={page >= totalPages}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600",
                page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
              )}
              aria-label="Berikutnya"
            >
              <Icon name="chevronRight" size={16} />
            </Link>
          </div>
        </div>
      </FitPanel>
    </AdminShell>
  );
}
