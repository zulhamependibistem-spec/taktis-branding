"use server";

import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { dateWIB, todayWIB } from "@/lib/date";
import { TARGET_SPG_PER_DAY } from "@/lib/target";

export async function getTeamOutletOptions() {
  const user = await getSessionUser();
  if (!user || user.role !== "tl") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { data: spgs } = await supabase
    .from("users")
    .select("assigned_outlet_id")
    .eq("supervisor_id", user.id)
    .eq("status", "active");
  const outletIds = [
    ...new Set((spgs ?? []).map((s) => s.assigned_outlet_id).filter((v) => v !== null)),
  ];
  if (!outletIds.length) return { success: true as const, outlets: [] };

  const { data } = await supabase.from("outlets").select("id, name").in("id", outletIds).order("name");
  return { success: true as const, outlets: data ?? [] };
}

export async function getTeamAttendanceToday() {
  const user = await getSessionUser();
  if (!user || user.role !== "tl") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const today = todayWIB();

  const { data: spgs, error } = await supabase
    .from("users")
    .select("id, full_name, assigned_outlet_id, outlets(name)")
    .eq("supervisor_id", user.id)
    .eq("status", "active")
    .order("full_name");

  if (error) return { success: false as const, error: "Gagal memuat tim." };
  if (!spgs?.length) return { success: true as const, list: [] };

  const ids = spgs.map((s) => s.id);
  const [attRes, salesRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("user_id, status, check_in_time, check_out_time, check_in_lat, check_in_lng")
      .eq("report_date", today)
      .in("user_id", ids),
    supabase
      .from("daily_sales_reports")
      .select("user_id, qty_sold, total_selling")
      .eq("report_date", today)
      .in("user_id", ids),
  ]);

  if (attRes.error) return { success: false as const, error: "Gagal memuat absensi." };

  const attMap: Record<string, (typeof attRes.data)[number]> = {};
  attRes.data?.forEach((a) => (attMap[a.user_id] = a));

  const salesMap: Record<string, { omzet: number; qty: number }> = {};
  let totalOmzet = 0;
  let totalQty = 0;
  salesRes.data?.forEach((r) => {
    const omzet = Number(r.total_selling ?? 0);
    const qty = Number(r.qty_sold ?? 0);
    totalOmzet += omzet;
    totalQty += qty;
    if (!salesMap[r.user_id]) salesMap[r.user_id] = { omzet: 0, qty: 0 };
    salesMap[r.user_id].omzet += omzet;
    salesMap[r.user_id].qty += qty;
  });

  const list = spgs.map((s) => {
    const att = attMap[s.id];
    const sales = salesMap[s.id] ?? { omzet: 0, qty: 0 };
    const outlet = s.outlets as unknown as { name: string } | null;
    return {
      id: s.id,
      name: s.full_name,
      initials: String(s.full_name)
        .split(" ")
        .map((p: string) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      outlet: outlet?.name ?? "—",
      status: att?.status ?? "not_checked_in",
      check_in_time: att?.check_in_time ?? null,
      check_out_time: att?.check_out_time ?? null,
      lat: att?.check_in_lat ?? null,
      lng: att?.check_in_lng ?? null,
      omzet: sales.omzet,
      qty: sales.qty,
    };
  });

  return { success: true as const, list, summary: { totalOmzet, totalQty } };
}

export type PerfPeriod = "hari" | "minggu" | "bulan";

function periodRange(period: PerfPeriod): { from: string; to: string } {
  const now = new Date();
  const iso = dateWIB;
  const to = iso(now);
  if (period === "hari") return { from: to, to };
  if (period === "minggu") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: iso(from), to };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: iso(from), to };
}

export async function getTeamPerformance(period: PerfPeriod = "hari") {
  const user = await getSessionUser();
  if (!user || user.role !== "tl") return { success: false as const, error: "Akses ditolak." };

  const supabase = createServerClient();
  const { from, to } = periodRange(period);

  const { data: spgs, error: err } = await supabase
    .from("users")
    .select("id, full_name, assigned_outlet_id, outlets(name)")
    .eq("supervisor_id", user.id)
    .eq("status", "active")
    .order("full_name");
  if (err) return { success: false as const, error: "Gagal memuat tim." };
  if (!spgs?.length) return { success: true as const, omzet: 0, spgs: [] };

  const ids = spgs.map((s) => s.id);

  const [sales, stock] = await Promise.all([
    supabase
      .from("daily_sales_reports")
      .select("user_id, report_date, qty_sold, sampling_qty, total_selling, ec")
      .in("user_id", ids)
      .gte("report_date", from)
      .lte("report_date", to),
    supabase
      .from("daily_stock_reports")
      .select("user_id, report_date")
      .in("user_id", ids)
      .gte("report_date", from)
      .lte("report_date", to),
  ]);
  if (sales.error || stock.error)
    return { success: false as const, error: "Gagal memuat performa." };

  const omzetBy = new Map<string, number>();
  const samplingBy = new Map<string, number>();
  const ecBy = new Map<string, number>();
  const laporDays = new Map<string, Set<string>>();
  const add = (m: Map<string, number>, k: string, v: number) =>
    m.set(k, (m.get(k) ?? 0) + v);
  const markDay = (uid: string, d: string) => {
    if (!laporDays.has(uid)) laporDays.set(uid, new Set());
    laporDays.get(uid)!.add(d);
  };

  for (const r of sales.data ?? []) {
    markDay(r.user_id, r.report_date);
    add(omzetBy, r.user_id, Number(r.total_selling ?? 0));
    add(samplingBy, r.user_id, Number(r.sampling_qty ?? 0));
    ecBy.set(r.user_id, Math.max(ecBy.get(r.user_id) ?? 0, Number(r.ec ?? 0)));
  }
  for (const r of stock.data ?? []) {
    markDay(r.user_id, r.report_date);
  }

  let totalOmzet = 0;
  const list = spgs.map((s) => {
    const o = s.outlets as unknown as { name: string } | null;
    const omzet = omzetBy.get(s.id) ?? 0;
    totalOmzet += omzet;
    const ec = ecBy.get(s.id) ?? 0;
    const sampling = samplingBy.get(s.id) ?? 0;
    const target = period === "hari" ? TARGET_SPG_PER_DAY : null;
    return {
      id: s.id,
      name: s.full_name,
      initials: String(s.full_name).split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase(),
      outlet: o?.name ?? "—",
      omzet,
      laporan: laporDays.get(s.id)?.size ?? 0,
      ec,
      konvSampling: ec > 0 ? Math.round((sampling / ec) * 100) : null,
      konvSelling: ec > 0 ? Math.round(omzet / ec) : null,
      target,
      pct: target ? Math.round((omzet / target) * 100) : null,
      sisa: target ? Math.max(0, target - omzet) : null,
    };
  });

  list.sort((a, b) => b.omzet - a.omzet);
  return { success: true as const, omzet: totalOmzet, spgs: list };
}
