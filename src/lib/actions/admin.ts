"use server";

import { getSessionUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/session";
import { createServerClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/date";
import { TARGET_SPG_PER_DAY } from "@/lib/target";

export async function getUsers() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, nip, full_name, phone, role, status, assigned_outlet_id, supervisor_id")
    .order("nip");

  if (error) return { success: false as const, error: "Gagal memuat users." };

  const names = await resolveNames(data ?? []);

  const list = (data ?? []).map((u) => ({
    id: u.id,
    nip: u.nip,
    nama: u.full_name,
    hp: u.phone,
    role: u.role,
    status: u.status,
    outletId: u.assigned_outlet_id,
    outlet: names.outlet(u.assigned_outlet_id),
    tlId: u.supervisor_id,
    tl: names.supervisor(u.supervisor_id),
  }));

  return { success: true as const, list };
}

function grsmRank(g: string): number {
  if (!g) return 999;
  const m = /GRSM\s*(\d+)A?/.exec(g);
  return m ? Number(m[1]) : 999;
}

type Resolved = {
  outlet(id: string | null): string;
  grsm(id: string | null): string;
  supervisor(id: string | null): string;
};

async function resolveNames(rows: {
  assigned_outlet_id: string | null;
  supervisor_id: string | null;
}[]): Promise<Resolved> {
  const outlet = new Map<string, string>();
  const grsm = new Map<string, string>();
  const sup = new Map<string, string>();
  const outletIds = [...new Set(rows.map((r) => r.assigned_outlet_id).filter(Boolean))] as string[];
  const supIds = [...new Set(rows.map((r) => r.supervisor_id).filter(Boolean))] as string[];

  const supabase = createServerClient();
  const outletReq = outletIds.length ? supabase.from("outlets").select("id, name, grsm").in("id", outletIds) : Promise.resolve({ data: null });
  const supReq = supIds.length ? supabase.from("users").select("id, full_name").in("id", supIds) : Promise.resolve({ data: null });

  const [{ data: outletData }, { data: supData }] = await Promise.all([outletReq, supReq]);

  (outletData ?? []).forEach((o) => {
    outlet.set(o.id, o.name);
    grsm.set(o.id, o.grsm ?? "");
  });
  (supData ?? []).forEach((s) => sup.set(s.id, s.full_name));

  return {
    outlet: (id) => (id && outlet.get(id)) || "-",
    grsm: (id) => (id && grsm.get(id)) || "",
    supervisor: (id) => (id && sup.get(id)) || "-",
  };
}

export async function toggleUserStatus(userId: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { success: false as const, error: "Akses ditolak." };
  const supabase = createServerClient();
  const { data: row } = await supabase
    .from("users")
    .select("id, status")
    .eq("id", userId)
    .single();
  if (!row) return { success: false as const, error: "User tidak ditemukan." };

  const next: "active" | "inactive" = row.status === "active" ? "inactive" : "active";
  const { error } = await supabase.from("users").update({ status: next }).eq("id", userId);
  if (error) return { success: false as const, error: "Gagal mengubah status." };
  return { success: true as const, status: next };
}

export async function deleteUserAction(userId: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin")
    return { success: false as const, error: "Akses ditolak." };

  if (userId === user.id)
    return { success: false as const, error: "Tidak dapat menghapus akun sendiri." };

  const supabase = createServerClient();
  const { error: refErr } = await supabase
    .from("monthly_planning")
    .update({ created_by: null })
    .eq("created_by", userId);
  if (refErr) return { success: false as const, error: `Gagal menghapus user: ${refErr.message}` };

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) return { success: false as const, error: `Gagal menghapus user: ${error.message}` };

  return { success: true as const };
}

export async function deleteInactiveUsersAction() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin")
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { data: list, error: fetchErr } = await supabase
    .from("users")
    .select("id")
    .eq("status", "inactive")
    .neq("id", user.id);
  if (fetchErr) return { success: false as const, error: `Gagal menghapus: ${fetchErr.message}` };

  const ids = (list ?? []).map((r) => r.id);
  if (ids.length > 0) {
    const { error: refErr } = await supabase
      .from("monthly_planning")
      .update({ created_by: null })
      .in("created_by", ids);
    if (refErr) return { success: false as const, error: `Gagal menghapus: ${refErr.message}` };

    const { error } = await supabase.from("users").delete().in("id", ids);
    if (error) return { success: false as const, error: `Gagal menghapus: ${error.message}` };
  }

  return { success: true as const, deleted: ids.length };
}

export async function getProducts() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, variant, default_price, is_active")
    .order("id");

  if (error) return { success: false as const, error: "Gagal memuat produk." };

  const list = (data ?? []).map((p) => ({
    id: p.id,
    nama: p.name,
    varian: p.variant,
    harga: Number(p.default_price),
    aktif: p.is_active,
  }));

  return { success: true as const, list };
}

export async function upsertProduct(payload: {
  id?: string;
  name: string;
  variant: string;
  default_price: number;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const record = {
    name: payload.name.trim(),
    variant: payload.variant.trim(),
    default_price: payload.default_price,
  };

  if (payload.id) {
    const { error } = await supabase.from("products").update(record).eq("id", payload.id);
    if (error) return { success: false as const, error: "Gagal memperbarui produk." };
    return { success: true as const };
  }

  const { error } = await supabase
    .from("products")
    .insert({ ...record, is_active: true });
  if (error) return { success: false as const, error: "Gagal menambah produk." };
  return { success: true as const };
}

export async function toggleProduct(productId: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { data: row } = await supabase
    .from("products")
    .select("id, is_active")
    .eq("id", productId)
    .single();
  if (!row) return { success: false as const, error: "Produk tidak ditemukan." };

  const { error } = await supabase
    .from("products")
    .update({ is_active: !row.is_active })
    .eq("id", productId);
  if (error) return { success: false as const, error: "Gagal mengubah status." };
  return { success: true as const };
}

async function getPicTlAndSpgUserIds(supabase: ReturnType<typeof createServerClient>, picId: string, picName?: string): Promise<Set<string>> {
  // 1. Get TLs assigned to this PIC
  let tls: { id: string }[] | null = null;
  {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "tl")
      .eq("supervisor_id", picId);
    tls = data;
  }

  // Fallback match by name if supervisor_id is not yet set
  if ((!tls || tls.length === 0) && picName) {
    const nameUpper = picName.toUpperCase();
    if (nameUpper.includes("SUCAHYONO")) {
      const { data } = await supabase.from("users").select("id").eq("role", "tl").ilike("full_name", "%fahmi%");
      tls = data;
    } else if (nameUpper.includes("NENDEN")) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("role", "tl")
        .or("full_name.ilike.%supriyati%,full_name.ilike.%martika%,full_name.ilike.%indrianing%");
      tls = data;
    }
  }

  const tlIds = (tls ?? []).map((t: { id: string }) => t.id);
  if (tlIds.length === 0) return new Set([picId]);

  // 2. Get SPGs under these TLs
  const { data: spgs } = await supabase
    .from("users")
    .select("id")
    .eq("role", "spg")
    .in("supervisor_id", tlIds);

  const spgIds = (spgs ?? []).map((s: { id: string }) => s.id);
  return new Set([...tlIds, ...spgIds]);
}

export async function getAdminStats() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic"))
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const today = todayWIB();

  const isPic = user.role === "pic";
  const picUserIds = isPic ? await getPicTlAndSpgUserIds(supabase, user.id, user.full_name) : null;
  const picUserArray = picUserIds ? Array.from(picUserIds) : [];

  let spgQuery = supabase
    .from("users")
    .select("id, full_name, nip, assigned_outlet_id, supervisor_id")
    .eq("role", "spg")
    .in("status", ["active", "backup"]);
  let tlQuery = supabase.from("users").select("id, full_name").eq("role", "tl").in("status", ["active", "backup"]);
  let attQuery = supabase
    .from("attendance")
    .select("user_id, status")
    .eq("report_date", today);
  let salesQuery = supabase.from("daily_sales_reports").select("user_id, total_selling").eq("report_date", today);
  let stockQuery = supabase.from("daily_stock_reports").select("user_id").eq("report_date", today);

  if (isPic) {
    spgQuery = spgQuery.in("id", picUserArray);
    tlQuery = tlQuery.in("id", picUserArray);
    attQuery = attQuery.in("user_id", picUserArray);
    salesQuery = salesQuery.in("user_id", picUserArray);
    stockQuery = stockQuery.in("user_id", picUserArray);
  }

  const [spgRes, tlRes, attRes, salesRes, stockRes] = await Promise.all([
    spgQuery,
    tlQuery,
    attQuery,
    salesQuery,
    stockQuery,
  ]);

  const spgs = spgRes.data ?? [];
  const names = await resolveNames(spgs);

  const hadir = new Set(
    (attRes.data ?? [])
      .filter((a) => a.status === "checked_in" || a.status === "checked_out")
      .map((a) => a.user_id)
  );
  const lapor = new Set([
    ...(salesRes.data ?? []).map((r) => r.user_id),
    ...(stockRes.data ?? []).map((r) => r.user_id),
  ]);
  const omzet = (salesRes.data ?? []).reduce((sum, r) => sum + Number(r.total_selling ?? 0), 0);

  type SpgUser = (typeof spgs)[number];
  const info = (u: SpgUser) => ({
    id: u.id,
    nama: u.full_name,
    nip: u.nip,
    outlet: names.outlet(u.assigned_outlet_id),
    tl: names.supervisor(u.supervisor_id),
  });

  const belumAbsen = spgs.filter((u) => !hadir.has(u.id)).map(info);
  const belumLapor = spgs.filter((u) => !lapor.has(u.id)).map(info);
  const tanpaOutlet = spgs.filter((u) => !u.assigned_outlet_id).map(info);
  const aktifTlIds = new Set((tlRes.data ?? []).map((t) => t.id));
  const tanpaTl = spgs.filter((u) => !u.supervisor_id || !aktifTlIds.has(u.supervisor_id)).map(info);
  const sortedByName = <T extends { nama: string }>(arr: T[]) =>
    [...arr].sort((a, b) => a.nama.localeCompare(b.nama));

  return {
    success: true as const,
    date: today,
    absen: { hadir: hadir.size, total: spgs.length },
    lapor: { jumlah: lapor.size, total: spgs.length },
    omzet: { nilai: omzet, target: spgs.length * TARGET_SPG_PER_DAY },
    perluAksi: {
      belumAbsen: sortedByName(belumAbsen).slice(0, 5),
      belumAbsenTotal: belumAbsen.length,
      belumLapor: sortedByName(belumLapor).slice(0, 5),
      belumLaporTotal: belumLapor.length,
      tanpaOutlet: sortedByName(tanpaOutlet).slice(0, 5),
      tanpaOutletTotal: tanpaOutlet.length,
      tanpaTl: sortedByName(tanpaTl).slice(0, 5),
      tanpaTlTotal: tanpaTl.length,
    },
  };
}

export type OutletRow = {
  id: string;
  code_outlet: string;
  name: string;
  grsm: string;
  area: string;
  channel_group: string;
  code_subdist: string;
};

export async function getOutlets(params: { q?: string; grsm?: string; page?: number; perPage?: number }) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic"))
    return { success: false as const, error: "Akses ditolak.", list: [], total: 0, grsmOptions: [] };

  const supabase = createServerClient();
  const q = params.q?.trim() || "";
  const grsm = (params.grsm ?? "").trim() || null;
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));

  let query = supabase
    .from("outlets")
    .select("id, code_outlet, name, grsm, area, channel_group, code_subdist", { count: "exact" });
  let grsmQuery = supabase.from("outlets").select("grsm").not("grsm", "is", null);

  if (q) {
    const pat = `%${q.replace(/[,()]/g, "")}%`;
    query = query.or(`name.ilike.${pat},area.ilike.${pat}`);
    grsmQuery = grsmQuery.or(`name.ilike.${pat},area.ilike.${pat}`);
  }
  if (grsm) {
    query = query.eq("grsm", grsm);
    grsmQuery = grsmQuery.eq("grsm", grsm);
  }

  const from = (page - 1) * perPage;
  const [{ data, error, count }, { data: g }] = await Promise.all([
    query.order("grsm").range(from, from + perPage - 1),
    grsmQuery,
  ]);

  if (error)
    return { success: false as const, error: "Gagal memuat outlet.", list: [], total: 0, grsmOptions: [] };

  const grsmOptions = [...new Set((g ?? []).map((r) => r.grsm as string))].sort((a, b) => grsmRank(a) - grsmRank(b));

  const list: OutletRow[] = (data ?? []).map((o) => ({
    id: o.id,
    code_outlet: o.code_outlet,
    name: o.name,
    grsm: o.grsm ?? "",
    area: o.area ?? "",
    channel_group: o.channel_group ?? "",
    code_subdist: o.code_subdist ?? "",
  }));

  return { success: true as const, list, total: count ?? 0, grsmOptions };
}

export type OutletImportRow = {
  code_outlet: string;
  name: string;
  grsm: string;
  area: string;
  channel_group: string;
  code_subdist: string;
};

export async function getOutletCodes(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic")) return [];

  const supabase = createServerClient();
  const { data } = await supabase.from("outlets").select("code_outlet");
  return (data ?? []).map((r) => r.code_outlet);
}

async function tlTeamOutletIds(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data } = await supabase
    .from("users")
    .select("assigned_outlet_id")
    .eq("supervisor_id", userId)
    .eq("role", "spg");
  return new Set((data ?? []).map((u) => u.assigned_outlet_id).filter(Boolean));
}

// Admin: semua outlet. TL: outlet SPG binaannya. PIC: outlet TL/SPG bawahannya.
async function canManageOutlet(
  supabase: ReturnType<typeof createServerClient>,
  user: SessionUser,
  outletId: string
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (user.role === "tl") return (await tlTeamOutletIds(supabase, user.id)).has(outletId);
  const team = await getPicTlAndSpgUserIds(supabase, user.id, user.full_name);
  const { data } = await supabase
    .from("users")
    .select("assigned_outlet_id")
    .in("id", Array.from(team))
    .not("assigned_outlet_id", "is", null);
  return (data ?? []).some((u) => u.assigned_outlet_id === outletId);
}

export async function syncOutlets(rows: OutletImportRow[]) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin")
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const unique = new Map<string, OutletImportRow>();
  for (const r of rows) {
    const code = r.code_outlet.trim();
    if (!code) continue;
    if (!unique.has(code)) unique.set(code, { ...r, code_outlet: code });
  }

  const payload = [...unique.values()].map((r) => ({
    code_outlet: r.code_outlet,
    name: r.name.trim() || null,
    grsm: r.grsm.trim() || null,
    area: r.area.trim() || null,
    channel_group: r.channel_group.trim() || null,
    code_subdist: r.code_subdist.trim() || null,
  }));

  if (!payload.length) return { success: false as const, error: "Tidak ada baris valid." };

  const { error } = await supabase
    .from("outlets")
    .upsert(payload, { onConflict: "code_outlet" });

  if (error) return { success: false as const, error: `Gagal sinkronisasi: ${error.message}` };
  return { success: true as const, synced: payload.length };
}

export type UserImportRow = {
  nip: string;
  nama: string;
  phone: string;
  area: string;
  regional: string;
  jabatan: string;
  nama_toko: string;
  nama_tl?: string;
  status?: "active" | "backup";
};

function roleFromJabatan(jabatan: string): "tl" | "spg" {
  return /TL/i.test(jabatan) ? "tl" : "spg";
}

const normOutletName = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

async function loadOutletResolver(supabase: ReturnType<typeof createServerClient>) {
  const [{ data: outletData }, { data: aliasData }] = await Promise.all([
    supabase.from("outlets").select("id, name"),
    supabase.from("outlet_aliases").select("name, outlet_id"),
  ]);

  const exactUpper = new Map<string, string>();
  const byNorm = new Map<string, string>();
  const list: { id: string; name: string }[] = [];
  (outletData ?? []).forEach((o) => {
    exactUpper.set(o.name.trim().toUpperCase(), o.id);
    byNorm.set(normOutletName(o.name), o.id);
    list.push({ id: o.id, name: o.name.trim() });
  });
  (aliasData ?? []).forEach((a) => byNorm.set(a.name, a.outlet_id));

  function resolve(name: string): { id: string | null; kind: "exact" | "norm" | "contains" | "none" } {
    const clean = name.trim();
    if (!clean) return { id: null, kind: "none" };
    const up = clean.toUpperCase();
    if (exactUpper.has(up)) return { id: exactUpper.get(up)!, kind: "exact" };
    const normHit = byNorm.get(normOutletName(clean));
    if (normHit) return { id: normHit, kind: "norm" };
    const contains = list.find((o) => o.name.toUpperCase().includes(up));
    if (contains) return { id: contains.id, kind: "contains" };
    return { id: null, kind: "none" };
  }

  return { resolve, outletOptions: list.sort((a, b) => a.name.localeCompare(b.name)) };
}

export async function getUserImportPreview(rows: UserImportRow[]) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin")
    return { success: false as const, error: "Akses ditolak." };

  const nips = [...new Set(rows.map((r) => r.nip.trim()).filter(Boolean))];
  if (!nips.length) return { success: false as const, error: "Tidak ada baris dengan NIP valid." };

  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("users")
    .select("id, nip, full_name, role, status, phone, area, regional, jabatan, nama_toko");
  const outletResolver = await loadOutletResolver(supabase);

  type ExistingUser = {
    id: string;
    nip: string | null;
    full_name: string;
    role: string;
    status: string;
    phone: string | null;
    area: string | null;
    regional: string | null;
    jabatan: string | null;
    nama_toko: string | null;
  };

  const byNip = new Map<string, ExistingUser>();
  const byName = new Map<string, ExistingUser>();
  (existing ?? []).forEach((u) => {
    if (u.nip) byNip.set(u.nip.trim(), u);
    if (u.full_name) byName.set(u.full_name.trim().toUpperCase(), u);
  });

  const seen = new Set<string>();
  const preview = rows
    .filter((r) => {
      const nip = r.nip.trim();
      const nama = r.nama.trim().toUpperCase();
      const key = nip || nama;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => {
      const nip = r.nip.trim();
      const nama = r.nama.trim();
      const phone = r.phone.trim();
      const area = r.area.trim();
      const regional = r.regional.trim();
      const jabatan = r.jabatan.trim();
      const namaToko = r.nama_toko.trim();
      const role = roleFromJabatan(jabatan);
      const outlet = outletResolver.resolve(namaToko);

      const cur = (nip ? byNip.get(nip) : null) ?? byName.get(nama.toUpperCase());

      const changes: string[] = [];
      if (cur) {
        if (!cur.nip && nip) changes.push(`NIP: (kosong) → ${nip}`);
        else if (cur.nip && nip && cur.nip !== nip) changes.push(`NIP: ${cur.nip} → ${nip}`);

        if (cur.full_name !== nama && nama) changes.push(`Nama: ${cur.full_name} → ${nama}`);
        if ((cur.nama_toko ?? "") !== namaToko && namaToko)
          changes.push(`Toko: ${cur.nama_toko || "-"} → ${namaToko}`);
        if ((cur.phone ?? "") !== phone && phone)
          changes.push(`HP: ${cur.phone || "-"} → ${phone}`);
        if ((cur.jabatan ?? "") !== jabatan && jabatan)
          changes.push(`Jabatan: ${cur.jabatan || "-"} → ${jabatan}`);
        if ((cur.area ?? "") !== area && area)
          changes.push(`Area: ${cur.area || "-"} → ${area}`);
      } else {
        changes.push("User Baru (Insert)");
      }

      return {
        nip,
        nama,
        phone,
        area,
        regional,
        jabatan,
        nama_toko: namaToko,
        nama_tl: r.nama_tl ?? "",
        status: r.status ?? "active",
        role,
        mode: (cur ? "update" : "baru") as "update" | "baru",
        changes,
        hasChanges: changes.length > 0,
        outletId: outlet.id,
        outletMatch: outlet.kind,
      };
    });

  const activeNips = new Set(nips);
  const { data: actives } = await supabase
    .from("users")
    .select("nip, full_name")
    .in("role", ["spg", "tl"])
    .eq("status", "active");
  const lepas = (actives ?? [])
    .filter((u) => u.nip && !activeNips.has(u.nip))
    .map((u) => ({ nip: u.nip, nama: u.full_name }))
    .sort((a, b) => a.nip.localeCompare(b.nip));

  return { success: true as const, preview, lepas, outletOptions: outletResolver.outletOptions };
}

export async function applyUserImport(payload: {
  rows: UserImportRow[];
  deactivateNips: string[];
  outletResolve?: (string | null)[];
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin")
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();

  // 1. Fetch all existing active/inactive users to match by NIP or Full Name
  const { data: existingAll, error: exErr } = await supabase
    .from("users")
    .select("id, nip, full_name, role");
  if (exErr) return { success: false as const, error: "Gagal memuat users." };

  const byNip = new Map<string, { id: string; role: string }>();
  const byName = new Map<string, { id: string; role: string }>();
  (existingAll ?? []).forEach((u) => {
    if (u.nip) byNip.set(u.nip.trim(), u);
    if (u.full_name) byName.set(u.full_name.trim().toUpperCase(), u);
  });

  // TL lookup by name (normalized: uppercase, no spaces/punctuation) for supervisor assignment
  const tlByName = new Map<string, string>();
  (existingAll ?? []).forEach((u) => {
    if (u.role === "tl" && u.full_name) tlByName.set(normOutletName(u.full_name), u.id);
  });
  const tlNameCache = new Map<string, string | null>();
  function tlIdByName(name: string): string | null {
    const clean = name.trim();
    if (!clean) return null;
    const key = normOutletName(clean);
    if (tlNameCache.has(key)) return tlNameCache.get(key) ?? null;
    const foundId = tlByName.get(key) ?? null;
    tlNameCache.set(key, foundId);
    return foundId;
  }

  const outletResolver = await loadOutletResolver(supabase);
  async function saveAlias(namaToko: string, outletId: string) {
    if (!namaToko.trim()) return;
    await supabase.from("outlet_aliases").upsert(
      { name: normOutletName(namaToko), outlet_id: outletId },
      { onConflict: "name" }
    );
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set<string>();
  for (let i = 0; i < payload.rows.length; i++) {
    const r = payload.rows[i];
    const nip = r.nip.trim();
    const nama = r.nama.trim();
    const key = nip || nama.toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const phone = r.phone.trim();
    const jabatan = r.jabatan.trim();
    const role = roleFromJabatan(jabatan);
    const namaToko = r.nama_toko.trim();
    const auto = outletResolver.resolve(namaToko);
    const override = payload.outletResolve?.[i] ?? null;
    const outletId = override ?? auto.id;
    const namaTl = (r.nama_tl ?? "").trim();
    const supervisorId = role === "spg" ? tlIdByName(namaTl) : null;

    if (namaToko && outletId && (override || auto.kind === "contains")) await saveAlias(namaToko, outletId);

    // Match by NIP first, fallback to Name
    const cur = (nip ? byNip.get(nip) : null) ?? byName.get(nama.toUpperCase());

    if (cur) {
      const patch: Record<string, unknown> = { status: r.status ?? "active" };
      if (nip) patch.nip = nip;
      if (nama) patch.full_name = nama;
      if (phone) patch.phone = phone;
      if (jabatan) {
        patch.jabatan = jabatan;
        if (cur.role !== "admin" && cur.role !== "pic") patch.role = role;
      }
      if (r.area.trim()) patch.area = r.area.trim();
      if (r.regional.trim()) patch.regional = r.regional.trim();
      if (namaToko) patch.nama_toko = namaToko;
      if (outletId) patch.assigned_outlet_id = outletId;
      if (supervisorId) patch.supervisor_id = supervisorId;

      const { error } = await supabase.from("users").update(patch).eq("id", cur.id);
      if (error) return { success: false as const, error: `Gagal update ${nama}: ${error.message}` };
      updated++;
    } else {
      const { error } = await supabase.from("users").insert({
        full_name: nama,
        nip: nip || null,
        phone: phone || null,
        role,
        status: r.status ?? "active",
        area: r.area.trim() || null,
        regional: r.regional.trim() || null,
        jabatan: jabatan || null,
        nama_toko: namaToko || null,
        assigned_outlet_id: outletId,
        supervisor_id: supervisorId,
      });
      if (error) return { success: false as const, error: `Gagal insert ${nama}: ${error.message}` };
      inserted++;
    }
  }

  // 2. nonaktifkan yang dikonfirmasi (dari sheet NON AKTIF / lepas)
  const deactivate = [...new Set(payload.deactivateNips.map((n) => n.trim()).filter(Boolean))].filter(
    (n) => !seen.has(n)
  );
  let deactivated = 0;
  for (const nip of deactivate) {
    const { error } = await supabase
      .from("users")
      .update({ status: "inactive" })
      .eq("nip", nip)
      .in("role", ["spg", "tl"]);
    if (error) return { success: false as const, error: `Gagal nonaktifkan ${nip}: ${error.message}` };
    deactivated++;
  }

  return { success: true as const, inserted, updated, deactivated };
}

// ---------- Export ----------

export async function getExportData(payload: { from: string; to: string }) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin")
    return { success: false as const, error: "Akses ditolak. Fitur export khusus Admin." };
  if (!payload.from || !payload.to || payload.from > payload.to)
    return { success: false as const, error: "Rentang tanggal tidak valid." };

  const supabase = createServerClient();
  const salesSelector =
    "report_date, qty_sold, sampling_qty, unit_price, total_selling, user:users!user_id(full_name, supervisor:supervisor_id(full_name)), product:products(name, variant), outlet:outlets(name, code_outlet, code_subdist, channel_group, grsm, area)";
  const stockSelector =
    "report_date, stock_awal, stock_akhir, selisih, other_qty, other_reason, user:users!user_id(full_name, supervisor:supervisor_id(full_name)), product:products(name, variant), outlet:outlets(name, code_outlet, code_subdist, channel_group, grsm, area)";
  const attSelector =
    "report_date, check_in_time, check_out_time, check_in_photo_url, check_out_photo_url, status, check_in_lat, check_in_lng, location_name, user:users!user_id(full_name, nip, supervisor:supervisor_id(full_name)), outlet:outlets(name, code_outlet, code_subdist, channel_group, grsm, area)";

  const salesQuery = supabase
    .from("daily_sales_reports")
    .select(salesSelector)
    .gte("report_date", payload.from)
    .lte("report_date", payload.to);
  const stockQuery = supabase
    .from("daily_stock_reports")
    .select(stockSelector)
    .gte("report_date", payload.from)
    .lte("report_date", payload.to);
  const attQuery = supabase
    .from("attendance")
    .select(attSelector)
    .gte("report_date", payload.from)
    .lte("report_date", payload.to);

  const [saleRes, stockRes, attRes] = await Promise.all([
    salesQuery.order("report_date", { ascending: true }),
    stockQuery.order("report_date", { ascending: true }),
    attQuery.order("report_date", { ascending: true }),
  ]);

  if (saleRes.error) {
    console.error("[getExportData] sales query error:", saleRes.error);
    return { success: false as const, error: `Gagal sales: ${saleRes.error.message}` };
  }
  if (stockRes.error) {
    console.error("[getExportData] stock query error:", stockRes.error);
    return { success: false as const, error: `Gagal stock: ${stockRes.error.message}` };
  }
  if (attRes.error) {
    console.error("[getExportData] attendance query error:", attRes.error);
    return { success: false as const, error: `Gagal attendance: ${attRes.error.message}` };
  }

  const atts = attRes.data ?? [];
  const photoPaths = atts
    .flatMap((a) => [a.check_in_photo_url, a.check_out_photo_url])
    .filter((p): p is string => Boolean(p));

  const urlMap = new Map<string, string>();
  if (photoPaths.length > 0) {
    photoPaths.forEach((p) => {
      if (p.startsWith("http://") || p.startsWith("https://")) {
        urlMap.set(p, p);
      } else {
        const { data } = supabase.storage.from("attendance-photos").getPublicUrl(p);
        if (data?.publicUrl) urlMap.set(p, data.publicUrl);
      }
    });
  }

  const attendanceFormatted = atts.map((a) => ({
    ...a,
    check_in_photo_url: a.check_in_photo_url ? (urlMap.get(a.check_in_photo_url) ?? null) : null,
    check_out_photo_url: a.check_out_photo_url ? (urlMap.get(a.check_out_photo_url) ?? null) : null,
  }));

  return {
    success: true as const,
    sales: saleRes.data ?? [],
    stock: stockRes.data ?? [],
    attendance: attendanceFormatted,
  };
}

// ---------- Analytics ----------

export async function getAnalyticsData(payload: { from: string; to: string }) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic"))
    return { success: false as const, error: "Akses ditolak." };

  if (!payload.from || !payload.to || payload.from > payload.to)
    return { success: false as const, error: "Rentang tanggal tidak valid." };

  const supabase = createServerClient();
  const isPic = user.role === "pic";
  const picUserIds = isPic ? await getPicTlAndSpgUserIds(supabase, user.id, user.full_name) : null;
  const picUserArray = picUserIds ? Array.from(picUserIds) : [];

  let salesQuery = supabase
    .from("daily_sales_reports")
    .select("report_date, user_id, qty_sold, sampling_qty, unit_price, total_selling, user:users!user_id(full_name, supervisor:supervisor_id(full_name)), product:products(name, variant), outlet:outlets(id, name, code_outlet, channel_group, area, grsm)")
    .gte("report_date", payload.from)
    .lte("report_date", payload.to);

  let stockQuery = supabase
    .from("daily_stock_reports")
    .select("report_date, stock_awal, stock_akhir, selisih, other_qty, other_reason, product:products(name, variant), outlet:outlets(id, name, code_outlet)")
    .gte("report_date", payload.from)
    .lte("report_date", payload.to);

  if (isPic) {
    salesQuery = salesQuery.in("user_id", picUserArray);
    stockQuery = stockQuery.in("user_id", picUserArray);
  }

  const [saleRes, stockRes] = await Promise.all([
    salesQuery.order("report_date", { ascending: true }),
    stockQuery.order("report_date", { ascending: true }),
  ]);

  if (saleRes.error || stockRes.error)
    return { success: false as const, error: "Gagal memuat data analytics." };

  const sales = saleRes.data ?? [];
  const stock = stockRes.data ?? [];

  let totalRevenue = 0;
  let totalQtySold = 0;
  let totalSampling = 0;
  let totalPromoRevenue = 0;
  let totalPromoQty = 0;

  const variantMap = new Map<string, { qty: number; revenue: number }>();
  const packageMap = new Map<string, { qty: number; revenue: number }>();
  const outletMap = new Map<string, { id: string; name: string; code: string; revenue: number; qty: number; area: string; grsm: string; channel: string }>();
  const outletSpgMap = new Map<string, Map<string, { name: string; revenue: number; qty: number }>>();
  const dailyMap = new Map<string, { revenue: number; qty: number }>();
  const tlMap = new Map<string, { revenue: number; qty: number; spgSet: Set<string> }>();
  const channelMap = new Map<string, { revenue: number; qty: number }>();

  sales.forEach((s) => {
    const rev = Number(s.total_selling ?? 0);
    const qty = Number(s.qty_sold ?? 0);
    const samp = Number(s.sampling_qty ?? 0);
    const date = s.report_date;

    totalRevenue += rev;
    totalQtySold += qty;
    totalSampling += samp;

    const dCurr = dailyMap.get(date) ?? { revenue: 0, qty: 0 };
    dailyMap.set(date, { revenue: dCurr.revenue + rev, qty: dCurr.qty + qty });

    const product = (Array.isArray(s.product) ? s.product[0] : s.product) as { name?: string; variant?: string } | null;
    const outlet = (Array.isArray(s.outlet) ? s.outlet[0] : s.outlet) as
      | { id?: string; name?: string; code_outlet?: string; channel_group?: string; area?: string; grsm?: string }
      | null;
    const userRow = (Array.isArray(s.user) ? s.user[0] : s.user) as
      | { full_name?: string; supervisor?: { full_name?: string }[] }
      | null;
    const pName = (product?.name ?? "").toUpperCase();
    const vName = (product?.variant ?? "LAINNYA").toUpperCase();
    const isPaket = pName.includes("PAKET") || vName.includes("BUY") || vName.includes("PAKET") || vName.includes("PROMO");

    if (isPaket) {
      totalPromoRevenue += rev;
      totalPromoQty += qty;
      const curr = packageMap.get(vName) ?? { qty: 0, revenue: 0 };
      packageMap.set(vName, { qty: curr.qty + qty, revenue: curr.revenue + rev });
    } else {
      const curr = variantMap.get(vName) ?? { qty: 0, revenue: 0 };
      variantMap.set(vName, { qty: curr.qty + qty, revenue: curr.revenue + rev });
    }

    if (outlet?.id) {
      const oCurr = outletMap.get(outlet.id) ?? {
        id: outlet.id,
        name: outlet.name ?? "-",
        code: outlet.code_outlet ?? "-",
        revenue: 0,
        qty: 0,
        area: outlet.area ?? "-",
        grsm: outlet.grsm ?? "-",
        channel: (outlet.channel_group ?? "LAINNYA").toUpperCase(),
      };
      outletMap.set(outlet.id, { ...oCurr, revenue: oCurr.revenue + rev, qty: oCurr.qty + qty });

      if (s.user_id) {
        let spgM = outletSpgMap.get(outlet.id);
        if (!spgM) {
          spgM = new Map();
          outletSpgMap.set(outlet.id, spgM);
        }
        const spgCurr = spgM.get(s.user_id) ?? { name: (userRow?.full_name ?? "-").toUpperCase(), revenue: 0, qty: 0 };
        spgM.set(s.user_id, { ...spgCurr, revenue: spgCurr.revenue + rev, qty: spgCurr.qty + qty });
      }

      const chName = (outlet.channel_group || "LAINNYA").toUpperCase();
      const chCurr = channelMap.get(chName) ?? { revenue: 0, qty: 0 };
      channelMap.set(chName, { revenue: chCurr.revenue + rev, qty: chCurr.qty + qty });
    }

    const supervisor = (Array.isArray(userRow?.supervisor) ? userRow?.supervisor[0] : userRow?.supervisor) as
      | { full_name?: string }
      | null
      | undefined;
    const tlName = (supervisor?.full_name || "TANPA TEAM LEADER").toUpperCase();
    const tlCurr = tlMap.get(tlName) ?? { revenue: 0, qty: 0, spgSet: new Set() };
    if (s.user_id) tlCurr.spgSet.add(s.user_id);
    tlMap.set(tlName, { revenue: tlCurr.revenue + rev, qty: tlCurr.qty + qty, spgSet: tlCurr.spgSet });
  });

  const dailyTrends = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, revenue: d.revenue, qty: d.qty }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let totalStockAwal = 0;
  let totalStockAkhir = 0;
  let totalSelisih = 0;

  stock.forEach((st) => {
    totalStockAwal += Number(st.stock_awal ?? 0);
    totalStockAkhir += Number(st.stock_akhir ?? 0);
    totalSelisih += Number(st.selisih ?? 0);
  });

  const regQtyTotal = totalQtySold - totalPromoQty;

  const variantList = Array.from(variantMap.entries()).map(([variant, data]) => ({
    variant,
    qty: data.qty,
    revenue: data.revenue,
    pctQty: regQtyTotal > 0 ? Math.round((data.qty / regQtyTotal) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const packageList = Array.from(packageMap.entries()).map(([variant, data]) => ({
    variant,
    qty: data.qty,
    revenue: data.revenue,
    pctQty: totalPromoQty > 0 ? Math.round((data.qty / totalPromoQty) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const tlList = Array.from(tlMap.entries()).map(([tl, data]) => ({
    tl,
    revenue: data.revenue,
    qty: data.qty,
    spgCount: data.spgSet.size,
    pctRev: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const channelList = Array.from(channelMap.entries()).map(([channel, data]) => ({
    channel,
    revenue: data.revenue,
    qty: data.qty,
    pctRev: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const sortedOutlets = Array.from(outletMap.values()).sort((a, b) => b.revenue - a.revenue);
  const topOutlets = sortedOutlets.slice(0, 5);
  const bottomOutlets = sortedOutlets.slice(-5).reverse();
  // ponytail: target harian 4jt hardcode; pindah ke outlets.target_sellout_value kalau beda per toko.
  const TARGET_DAY = 4_000_000;
  const daysInRange =
    Math.max(0, Math.floor((new Date(payload.to).getTime() - new Date(payload.from).getTime()) / 86_400_000)) + 1;
  const outletList = sortedOutlets.map((o, i) => {
    const spgList = Array.from(outletSpgMap.get(o.id)?.values() ?? [])
      .sort((a, b) => b.revenue - a.revenue)
      .map((s, j) => ({
        ...s,
        rank: j + 1,
        pctShare: o.revenue > 0 ? Math.round((s.revenue / o.revenue) * 100) : 0,
      }));
    const target = TARGET_DAY * daysInRange;
    return {
      ...o,
      rank: i + 1,
      pctRev: totalRevenue > 0 ? Math.round((o.revenue / totalRevenue) * 100) : 0,
      target,
      achievementPct: target > 0 ? Math.round((o.revenue / target) * 100) : 0,
      spgList,
    };
  });

  return {
    success: true as const,
    summary: {
      totalRevenue,
      totalQtySold,
      totalSampling,
      totalStockAwal,
      totalStockAkhir,
      totalSelisih,
      totalPromoRevenue,
      totalPromoQty,
      promoRevPct: totalRevenue > 0 ? Math.round((totalPromoRevenue / totalRevenue) * 100) : 0,
    },
    dailyTrends,
    variantList,
    packageList,
    tlList,
    channelList,
    topOutlets,
    bottomOutlets,
    outletList,
  };
}

// ---------- Harga per Outlet ----------

export async function getOutletPriceItems(outletId: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic" && user.role !== "tl"))
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  if (!(await canManageOutlet(supabase, user, outletId)))
    return { success: false as const, error: "Outlet bukan bagian dari tim Anda." };

  const [outletRes, productRes, priceRes] = await Promise.all([
    supabase.from("outlets").select("id, name").eq("id", outletId).maybeSingle(),
    supabase.from("products").select("id, name, variant, default_price").eq("is_active", true).order("name"),
    supabase.from("outlet_product_prices").select("product_id, price").eq("outlet_id", outletId),
  ]);

  if (outletRes.error || productRes.error || priceRes.error)
    return { success: false as const, error: "Gagal memuat data." };
  if (!outletRes.data) return { success: false as const, error: "Outlet tidak ditemukan." };

  const priceMap = new Map<string, number>();
  (priceRes.data ?? []).forEach((p) => priceMap.set(p.product_id, p.price));

  const items = (productRes.data ?? []).map((p) => ({
    product_id: p.id,
    name: p.name,
    variant: p.variant,
    default_price: p.default_price,
    price: priceMap.has(p.id) ? priceMap.get(p.id)! : null,
  }));

  return { success: true as const, outlet: outletRes.data, items };
}

export async function setOutletPrices(
  outletId: string,
  prices: { productId: string; price: string | null }[]
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic" && user.role !== "tl"))
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  if (!(await canManageOutlet(supabase, user, outletId)))
    return { success: false as const, error: "Outlet bukan bagian dari tim Anda." };

  const products = prices
    .map((p) => ({
      productId: p.productId,
      price: p.price === null || p.price.trim() === "" ? null : Number(p.price.replace(/[^\d]/g, "")),
    }))
    .filter((p) => p.price !== null && Number.isFinite(p.price) && p.price > 0);

  for (const p of products) {
    const { error } = await supabase
      .from("outlet_product_prices")
      .upsert({ outlet_id: outletId, product_id: p.productId, price: p.price, set_by: user.id }, { onConflict: "outlet_id,product_id" });
    if (error) return { success: false as const, error: `Gagal simpan: ${error.message}` };
  }

  for (const p of prices) {
    const price = p.price === null || p.price.trim() === "" ? null : Number(p.price.replace(/[^\d]/g, ""));
    if (price === null || !Number.isFinite(price) || price <= 0) {
      const { error } = await supabase
        .from("outlet_product_prices")
        .delete()
        .eq("outlet_id", outletId)
        .eq("product_id", p.productId);
      if (error) return { success: false as const, error: `Gagal hapus: ${error.message}` };
    }
  }

  return { success: true as const, saved: products.length };
}

export async function getOutletOptions() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic"))
    return { success: false as const, error: "Akses ditolak." };
  const supabase = createServerClient();
  let query = supabase.from("outlets").select("id, name").order("name");
  if (user.role === "pic") {
    const team = await getPicTlAndSpgUserIds(supabase, user.id, user.full_name);
    const { data: teamOutlets } = await supabase
      .from("users")
      .select("assigned_outlet_id")
      .in("id", Array.from(team))
      .not("assigned_outlet_id", "is", null);
    const ids = [...new Set((teamOutlets ?? []).map((u) => u.assigned_outlet_id).filter(Boolean))] as string[];
    query = supabase.from("outlets").select("id, name").in("id", ids).order("name");
  }
  const { data } = await query;
  return { success: true as const, outlets: data ?? [] };
}

// ---------- Attendance (admin/pic: semua SPG, tl: tim sendiri) ----------

type AttRow = {
  id: string;
  full_name: string;
  nip: string | null;
  status: "active" | "inactive";
  supervisor_id: string | null;
  assigned_outlet_id: string | null;
  role: string;
  outlets: { name: string; grsm: string } | { name: string } | null;
  supervisor: { full_name: string } | null;
};

export async function getAttendanceOverview() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic" && user.role !== "tl"))
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const today = todayWIB();

  let query = supabase
    .from("users")
    .select(
      "id, full_name, nip, status, supervisor_id, assigned_outlet_id, role, outlets(name, grsm)"
    )
    .in("role", ["spg", "tl"])
    .in("status", ["active", "backup"]);

  if (user.role === "tl") {
    query = query.eq("supervisor_id", user.id);
  } else if (user.role === "pic") {
    const picUserIds = await getPicTlAndSpgUserIds(supabase, user.id, user.full_name);
    query = query.in("id", Array.from(picUserIds));
  }

  const { data, error } = await query;
  if (error) return { success: false as const, error: "Gagal memuat SPG." };
  const spgs = (data ?? []) as unknown as AttRow[];

  const supNames = new Map<string, string>();
  const supIds = [...new Set(spgs.map((s) => s.supervisor_id).filter((x): x is string => Boolean(x)))];
  if (supIds.length) {
    const { data: sups } = await supabase.from("users").select("id, full_name").in("id", supIds);
    sups?.forEach((s) => supNames.set(s.id, s.full_name));
  }
  spgs.forEach((s) => {
    s.supervisor = s.supervisor_id && supNames.has(s.supervisor_id)
      ? { full_name: supNames.get(s.supervisor_id)! }
      : null;
  });

  const g = (o: AttRow["outlets"]) => (o && "grsm" in o ? (o.grsm ?? "") : "");
  spgs.sort(
    (a, b) =>
      (a.role === "tl" ? 1 : 0) - (b.role === "tl" ? 1 : 0) ||
      grsmRank(g(a.outlets)) - grsmRank(g(b.outlets)) ||
      a.outlets?.name?.localeCompare(b.outlets?.name ?? "") ||
      a.full_name.localeCompare(b.full_name)
  );

  const attMap: Record<string, { [k: string]: unknown }> = {};
  if (spgs.length) {
    const ids = spgs.map((s) => s.id);
    const { data: atts } = await supabase
      .from("attendance")
      .select("id, user_id, status, check_in_time, check_out_time, check_in_photo_url, check_out_photo_url, check_in_lat, check_in_lng")
      .eq("report_date", today)
      .in("user_id", ids);
    (atts ?? []).forEach((a) => (attMap[a.user_id] = a));
  }

  const paths = (Object.values(attMap) as { check_in_photo_url: string | null; check_out_photo_url: string | null }[])
    .flatMap((a) => [a.check_in_photo_url, a.check_out_photo_url])
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    const urlMap = new Map<string, string>();
    paths.forEach((p) => {
      const { data } = supabase.storage.from("attendance-photos").getPublicUrl(p);
      if (data?.publicUrl) urlMap.set(p, data.publicUrl);
    });
    (Object.values(attMap) as { check_in_photo_url: string | null; check_out_photo_url: string | null }[]).forEach((a) => {
      const inUrl = a.check_in_photo_url ? urlMap.get(a.check_in_photo_url) : null;
      const outUrl = a.check_out_photo_url ? urlMap.get(a.check_out_photo_url) : null;
      a.check_in_photo_url = inUrl ?? null;
      a.check_out_photo_url = outUrl ?? null;
    });
  }

  const list = spgs.map((s) => {
    const a = attMap[s.id] as
      | {
          id: string;
          status: string;
          check_in_time: string | null;
          check_out_time: string | null;
          check_in_photo_url: string | null;
          check_out_photo_url: string | null;
          check_in_lat: number | null;
          check_in_lng: number | null;
        }
      | undefined;
    return {
      id: s.id,
      attendanceId: a?.id ?? null,
      role: s.role,
      name: s.full_name,
      nip: s.nip,
      outlet: s.outlets?.name ?? "—",
      grsm: g(s.outlets),
      tl: user.role === "tl" ? user.full_name : (s.supervisor?.full_name ?? "—"),
      status: a?.status ?? "not_checked_in",
      checkInTime: a?.check_in_time ?? null,
      checkOutTime: a?.check_out_time ?? null,
      checkInPhoto: a?.check_in_photo_url ?? null,
      checkOutPhoto: a?.check_out_photo_url ?? null,
      lat: a?.check_in_lat ?? null,
      lng: a?.check_in_lng ?? null,
    };
  });

  return { success: true as const, date: today, list };
}

export async function resetAttendanceAction(attendanceId: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "tl")) {
    return { success: false as const, error: "Akses ditolak." };
  }

  const supabase = createServerClient();
  const { data: att } = await supabase
    .from("attendance")
    .select("user_id, check_in_photo_url, check_out_photo_url")
    .eq("id", attendanceId)
    .maybeSingle();
  if (!att) return { success: false as const, error: "Absensi tidak ditemukan." };

  if (user.role === "tl") {
    const { data: owner } = await supabase
      .from("users")
      .select("supervisor_id")
      .eq("id", att.user_id)
      .single();
    if (owner?.supervisor_id !== user.id)
      return { success: false as const, error: "Akses ditolak: SPG bukan binaan Anda." };
  }

  {
    const photos = [att.check_in_photo_url, att.check_out_photo_url].filter(Boolean) as string[];
    if (photos.length > 0) {
      await supabase.storage.from("attendance-photos").remove(photos);
    }
  }

  const { error } = await supabase.from("attendance").delete().eq("id", attendanceId);
  if (error) return { success: false as const, error: "Gagal menghapus absensi." };

  return { success: true as const };
}

// ---------- Planning ----------

export type PlanningOutlet = {
  id: string;
  code_outlet: string;
  name: string;
  grsm: string;
  area: string;
  channel_group: string;
};

export type PlanningSummary = {
  month: string;
  count: number;
  updatedAt: string | null;
};

export async function getPlanningList() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic"))
    return { success: false as const, error: "Akses ditolak.", list: [] as PlanningSummary[] };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("monthly_planning")
    .select("month, outlet_id, created_at")
    .order("month", { ascending: false });

  if (error) return { success: false as const, error: "Gagal memuat daftar planning.", list: [] as PlanningSummary[] };

  const byMonth = new Map<string, { count: number; updatedAt: string | null }>();
  for (const row of data ?? []) {
    const cur = byMonth.get(row.month!) ?? { count: 0, updatedAt: null };
    cur.count += 1;
    if (row.created_at) cur.updatedAt = row.created_at as string;
    byMonth.set(row.month!, cur);
  }

  const list: PlanningSummary[] = [...byMonth.entries()].map(([month, v]) => ({
    month,
    count: v.count,
    updatedAt: v.updatedAt,
  }));

  return { success: true as const, list };
}

export async function getPlanningMonth(month: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic"))
    return { success: false as const, error: "Akses ditolak.", outlets: [], plannedIds: [] };

  const supabase = createServerClient();

  const [masterRes, plannedRes] = await Promise.all([
    supabase.from("outlets").select("id, code_outlet, name, grsm, area, channel_group").order("name"),
    supabase.from("monthly_planning").select("outlet_id").eq("month", month),
  ]);

  if (masterRes.error || plannedRes.error)
    return { success: false as const, error: "Gagal memuat data planning.", outlets: [], plannedIds: [] };

  const outlets: PlanningOutlet[] = (masterRes.data ?? []).map((o) => ({
    id: o.id,
    code_outlet: o.code_outlet,
    name: o.name,
    grsm: o.grsm ?? "",
    area: o.area ?? "",
    channel_group: o.channel_group ?? "",
  }));

  const plannedIds = (plannedRes.data ?? []).map((r) => r.outlet_id as string);

  return { success: true as const, outlets, plannedIds };
}

export async function savePlanning(month: string, outletIds: string[]) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic"))
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();

  // Delete existing planning for this month, then insert the new set (replace)
  const { error: delErr } = await supabase.from("monthly_planning").delete().eq("month", month);
  if (delErr) return { success: false as const, error: "Gagal menyimpan planning." };

  if (outletIds.length === 0) return { success: true as const };

  const rows = outletIds.map((outlet_id) => ({
    month,
    outlet_id,
    created_by: user.id,
  }));

  const { error: insErr } = await supabase.from("monthly_planning").insert(rows);
  if (insErr) return { success: false as const, error: "Gagal menyimpan planning." };

  return { success: true as const };
}

export async function deletePlanning(month: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic"))
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { error } = await supabase.from("monthly_planning").delete().eq("month", month);
  if (error) return { success: false as const, error: "Gagal menghapus planning." };

  return { success: true as const };
}

