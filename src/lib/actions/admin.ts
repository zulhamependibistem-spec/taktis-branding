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