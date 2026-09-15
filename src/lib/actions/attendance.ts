"use server";

import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/date";

export async function getAttendanceToday() {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };

  const supabase = createServerClient();
  const today = todayWIB();

  const { data, error } = await supabase
    .from("attendance")
    .select("id, check_in_time, check_out_time, check_in_photo_url, status")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .maybeSingle();

  if (error) return { success: false as const, error: "Gagal memuat absensi." };
  return { success: true as const, attendance: data };
}

export async function checkInService(payload: { photoPath: string | null; lat: number | null; lng: number | null }) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };
  if (user.role === "spg" && !user.assigned_outlet_id)
    return { success: false as const, error: "Tidak ada outlet yang ditugaskan." };

  const supabase = createServerClient();
  const today = todayWIB();

  const { data: existingRows } = await supabase
    .from("attendance")
    .select("id, check_in_time")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .limit(1);
  const existing = existingRows?.[0];

  if (existing?.check_in_time) {
    return { success: false as const, error: "Sudah check-in hari ini." };
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      user_id: user.id,
      outlet_id: user.assigned_outlet_id,
      report_date: today,
      check_in_time: new Date().toISOString(),
      check_in_photo_url: payload.photoPath,
      check_in_lat: payload.lat,
      check_in_lng: payload.lng,
      status: "checked_in",
    })
    .select("id, check_in_time, status")
    .single();

  if (error) return { success: false as const, error: "Gagal menyimpan absensi." };
  return { success: true as const, attendance: data };
}

export async function checkOutService(payload: { photoPath: string | null }) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };

  const supabase = createServerClient();
  const today = todayWIB();

  const { data: existingRows, error: getErr } = await supabase
    .from("attendance")
    .select("id, check_in_time, check_out_time")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .limit(1);
  const existing = existingRows?.[0];

  if (getErr || !existing?.check_in_time) return { success: false as const, error: "Belum check-in hari ini." };
  if (existing.check_out_time) return { success: false as const, error: "Sudah check-out hari ini." };

  const { data, error } = await supabase
    .from("attendance")
    .update({ check_out_time: new Date().toISOString(), check_out_photo_url: payload.photoPath, status: "checked_out" })
    .eq("id", existing.id)
    .select("check_out_time, status")
    .single();

  if (error) return { success: false as const, error: "Gagal menyimpan check-out." };
  return { success: true as const, attendance: data };
}
