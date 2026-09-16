"use server";

import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/date";

function grsmRank(g: string): number {
  if (!g) return 999;
  const m = /GRSM\s*(\d+)A?/.exec(g);
  return m ? Number(m[1]) : 999;
}

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

async function picTeamUserIds(supabase: ReturnType<typeof createServerClient>, picId: string): Promise<Set<string>> {
  const { data: tls } = await supabase
    .from("users")
    .select("id")
    .eq("role", "tl")
    .eq("supervisor_id", picId);
  const tlIds = (tls ?? []).map((t: { id: string }) => t.id);
  if (tlIds.length === 0) return new Set([picId]);

  const { data: spgs } = await supabase
    .from("users")
    .select("id")
    .eq("role", "spg")
    .in("supervisor_id", tlIds);
  return new Set([picId, ...tlIds, ...(spgs ?? []).map((s: { id: string }) => s.id)]);
}

export async function getAttendanceOverview() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "pic" && user.role !== "tl"))
    return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const today = todayWIB();

  let query = supabase
    .from("users")
    .select("id, full_name, nip, status, supervisor_id, assigned_outlet_id, role, outlets(name, grsm)")
    .in("role", ["spg", "tl"])
    .in("status", ["active", "backup"]);

  if (user.role === "tl") {
    query = query.eq("supervisor_id", user.id);
  } else if (user.role === "pic") {
    const ids = await picTeamUserIds(supabase, user.id);
    query = query.in("id", Array.from(ids));
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
    s.supervisor =
      s.supervisor_id && supNames.has(s.supervisor_id) ? { full_name: supNames.get(s.supervisor_id)! } : null;
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
      .select(
        "id, user_id, status, check_in_time, check_out_time, check_in_photo_url, check_out_photo_url, check_in_lat, check_in_lng"
      )
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
    (Object.values(attMap) as { check_in_photo_url: string | null; check_out_photo_url: string | null }[]).forEach(
      (a) => {
        const inUrl = a.check_in_photo_url ? urlMap.get(a.check_in_photo_url) : null;
        const outUrl = a.check_out_photo_url ? urlMap.get(a.check_out_photo_url) : null;
        a.check_in_photo_url = inUrl ?? null;
        a.check_out_photo_url = outUrl ?? null;
      }
    );
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

// ---------- User Management ----------

type Resolved = {
  outlet(id: string | null): string;
  supervisor(id: string | null): string;
};

async function resolveNames(rows: {
  assigned_outlet_id: string | null;
  supervisor_id: string | null;
}[]): Promise<Resolved> {
  const outlet = new Map<string, string>();
  const sup = new Map<string, string>();
  const outletIds = [...new Set(rows.map((r) => r.assigned_outlet_id).filter(Boolean))] as string[];
  const supIds = [...new Set(rows.map((r) => r.supervisor_id).filter(Boolean))] as string[];

  const supabase = createServerClient();
  const outletReq = outletIds.length
    ? supabase.from("outlets").select("id, name").in("id", outletIds)
    : Promise.resolve({ data: null });
  const supReq = supIds.length
    ? supabase.from("users").select("id, full_name").in("id", supIds)
    : Promise.resolve({ data: null });

  const [{ data: outletData }, { data: supData }] = await Promise.all([outletReq, supReq]);

  (outletData ?? []).forEach((o) => outlet.set(o.id, o.name));
  (supData ?? []).forEach((s) => sup.set(s.id, s.full_name));

  return {
    outlet: (id) => (id && outlet.get(id)) || "-",
    supervisor: (id) => (id && sup.get(id)) || "-",
  };
}

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

// ---------- Import (Outlet & User) ----------

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