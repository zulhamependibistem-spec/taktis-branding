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