"use server";

import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/date";

/* Area ditampilkan sebagai pengganti outlet; sort default tetap urut nama. */

type AttRow = {
  id: string;
  full_name: string;
  nip: string | null;
  status: "active" | "inactive";
  supervisor_id: string | null;
  role: string;
  area: string | null;
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
    .select("id, full_name, nip, status, supervisor_id, role, area")
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

  const g = (a: AttRow) => a.area ?? "";
  spgs.sort(
    (a, b) =>
      (a.role === "tl" ? 1 : 0) - (b.role === "tl" ? 1 : 0) ||
      g(a).localeCompare(g(b)) ||
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
      area: s.area ?? "—",
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

async function resolveNames(rows: {
  supervisor_id: string | null;
}[]): Promise<{ supervisor: (id: string | null) => string }> {
  const sup = new Map<string, string>();
  const supIds = [...new Set(rows.map((r) => r.supervisor_id).filter(Boolean))] as string[];

  const supabase = createServerClient();
  const supReq = supIds.length
    ? supabase.from("users").select("id, full_name").in("id", supIds)
    : Promise.resolve({ data: null });

  const { data: supData } = await supReq;
  (supData ?? []).forEach((s) => sup.set(s.id, s.full_name));

  return {
    supervisor: (id) => (id && sup.get(id)) || "-",
  };
}

export async function getUsers() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, nip, full_name, phone, role, status, supervisor_id")
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
    const { error } = await supabase.from("users").delete().in("id", ids);
    if (error) return { success: false as const, error: `Gagal menghapus: ${error.message}` };
  }

  return { success: true as const, deleted: ids.length };
}

// ---------- Import (User only) ----------

export type UserImportRow = {
  nip: string;
  nama: string;
  phone: string;
  area: string;
  regional: string;
  jabatan: string;
  nama_toko: string;
  pic?: string;
  project?: string;
  nama_tl?: string;
  status?: "active" | "backup";
};

const normName = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

function roleFromJabatan(jabatan: string): "tl" | "spg" {
  return /TL/i.test(jabatan) ? "tl" : "spg";
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
    .select("id, nip, full_name, role, status, phone, area, regional, jabatan, nama_toko, pic, project");

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
    pic: string | null;
    project: string | null;
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
        if ((cur.pic ?? "") !== (r.pic ?? "").trim() && (r.pic ?? "").trim())
          changes.push(`PIC: ${cur.pic || "-"} → ${(r.pic ?? "").trim()}`);
        if ((cur.project ?? "") !== (r.project ?? "").trim() && (r.project ?? "").trim())
          changes.push(`Project: ${cur.project || "-"} → ${(r.project ?? "").trim()}`);
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
        pic: (r.pic ?? "").trim(),
        project: (r.project ?? "").trim(),
        nama_tl: r.nama_tl ?? "",
        status: r.status ?? "active",
        role,
        mode: (cur ? "update" : "baru") as "update" | "baru",
        changes,
        hasChanges: changes.length > 0,
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

  return { success: true as const, preview, lepas };
}

export async function applyUserImport(payload: {
  rows: UserImportRow[];
  deactivateNips: string[];
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
    if (u.role === "tl" && u.full_name) tlByName.set(normName(u.full_name), u.id);
  });
  const tlNameCache = new Map<string, string | null>();
  function tlIdByName(name: string): string | null {
    const clean = name.trim();
    if (!clean) return null;
    const key = normName(clean);
    if (tlNameCache.has(key)) return tlNameCache.get(key) ?? null;
    const foundId = tlByName.get(key) ?? null;
    tlNameCache.set(key, foundId);
    return foundId;
  }

  let inserted = 0;
  let updated = 0;
  const seen = new Set<string>();
  for (const r of payload.rows) {
    const nip = r.nip.trim();
    const nama = r.nama.trim();
    const key = nip || nama.toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const phone = r.phone.trim();
    const jabatan = r.jabatan.trim();
    const role = roleFromJabatan(jabatan);
    const namaToko = r.nama_toko.trim();
    const namaTl = (r.nama_tl ?? "").trim();
    const supervisorId = role === "spg" ? tlIdByName(namaTl) : null;

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
      if (r.pic?.trim()) patch.pic = r.pic.trim();
      if (r.project?.trim()) patch.project = r.project.trim();
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
        pic: r.pic?.trim() || null,
        project: r.project?.trim() || null,
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

// ---------- Import Absensi ----------

export type AttendanceImportRow = {
  nip: string;
  tanggal: string; // YYYY-MM-DD
  jamMasuk: string | null; // HH:MM
  jamKeluar: string | null; // HH:MM
  lokasi: string;
};

export type AttendancePreviewRow = AttendanceImportRow & {
  nama: string;
  mode: "baru" | "ada" | "tidak_ditemukan";
  error: string;
};

function wibToISO(dateStr: string, timeStr: string | null, addDays = 0): string | null {
  if (!timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00+07:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (addDays) d.setTime(d.getTime() + addDays * 86400000);
  return d.toISOString();
}

export async function getAttendanceImportPreview(rows: AttendanceImportRow[], dari: string, sampai: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { success: false as const, error: "Akses ditolak." };

  if (!dari || !sampai || dari > sampai)
    return { success: false as const, error: "Rentang tanggal tidak valid." };

  const supabase = createServerClient();

  const { data: users } = await supabase.from("users").select("id, nip, full_name, status");
  const byNip = new Map<string, { id: string; full_name: string; status: string }>();
  (users ?? []).forEach((u) => {
    if (u.nip) byNip.set(u.nip.trim(), u);
  });

  const within = rows.filter((r) => r.tanggal >= dari && r.tanggal <= sampai);
  const outside = rows.length - within.length;

  const preview: AttendancePreviewRow[] = [];
  const idSet = new Set<string>();
  for (const r of within) {
    const u = byNip.get(r.nip.trim());
    if (!u) {
      preview.push({ ...r, nama: "", mode: "tidak_ditemukan", error: "NIP tidak ditemukan" });
      continue;
    }
    idSet.add(u.id);
    preview.push({ ...r, nama: u.full_name, mode: "baru", error: "" });
  }

  if (idSet.size) {
    const { data: att } = await supabase
      .from("attendance")
      .select("user_id, report_date")
      .in("user_id", Array.from(idSet))
      .gte("report_date", dari)
      .lte("report_date", sampai);
    const existingKeys = new Set((att ?? []).map((a) => `${a.user_id}|${a.report_date}`));
    preview.forEach((p) => {
      const u = byNip.get(p.nip.trim());
      if (u && existingKeys.has(`${u.id}|${p.tanggal}`)) p.mode = "ada";
    });
  }

  return { success: true as const, preview, inRange: within.length, outside };
}

export async function applyAttendanceImport(rows: AttendanceImportRow[]) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { data: users } = await supabase.from("users").select("id, nip");
  const byNip = new Map<string, string>();
  (users ?? []).forEach((u) => {
    if (u.nip) byNip.set(u.nip.trim(), u.id);
  });

  let inserted = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of rows) {
    const userId = byNip.get(r.nip.trim());
    if (!userId) {
      failed++;
      continue;
    }

    const { data: ex } = await supabase
      .from("attendance")
      .select("id")
      .eq("user_id", userId)
      .eq("report_date", r.tanggal)
      .maybeSingle();
    if (ex) {
      skipped++;
      continue;
    }

    const checkIn = wibToISO(r.tanggal, r.jamMasuk);
    let checkOut = wibToISO(r.tanggal, r.jamKeluar);
    if (checkOut && checkIn && checkOut <= checkIn) checkOut = wibToISO(r.tanggal, r.jamKeluar, 1);

    const { error } = await supabase.from("attendance").insert({
      user_id: userId,
      report_date: r.tanggal,
      check_in_time: checkIn,
      check_out_time: checkOut,
      location_name: r.lokasi || null,
      status: checkOut ? "checked_out" : checkIn ? "checked_in" : "not_checked_in",
    });
    if (error) {
      failed++;
      continue;
    }
    inserted++;
  }

  return { success: true as const, inserted, skipped, failed };
}