"use server";

import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/date";

export async function getStockHistory() {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("daily_stock_reports")
    .select("id, report_date, stock_awal, stock_akhir, selisih, other_qty, other_reason, status, product:products(variant), outlet:outlets(name)")
    .eq("user_id", user.id)
    .order("report_date", { ascending: false });

  if (error) return { success: false as const, error: "Gagal memuat riwayat." };
  return { success: true as const, reports: data };
}

export async function getStockFormData() {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };
  if (!user.assigned_outlet_id)
    return { success: false as const, error: "Tidak ada outlet yang ditugaskan." };

  const supabase = createServerClient();
  const [prod, sale] = await Promise.all([
    supabase
      .from("products")
      .select("id, variant, image_url")
      .eq("is_active", true)
      .not("name", "ilike", "WOW Spaghetti Paket%")
      .order("name", { ascending: true })
      .order("variant", { ascending: true }),
    supabase
      .from("daily_sales_reports")
      .select("product_id, qty_sold")
      .eq("user_id", user.id)
      .eq("report_date", todayWIB()),
  ]);
  if (prod.error) return { success: false as const, error: "Gagal memuat produk." };

  const sold: Record<string, number> = {};
  (sale.data ?? []).forEach((r) => {
    sold[r.product_id] = (sold[r.product_id] ?? 0) + (Number(r.qty_sold) || 0);
  });

  const items = (prod.data ?? []).map((p) => ({ id: p.id, variant: p.variant, image_url: p.image_url }));
  return { success: true as const, items, sold };
}

export async function submitStockReport(payload: {
  items: {
    product_id: string;
    stock_awal: number;
    stock_akhir: number;
    other_reason?: string;
  }[];
}) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };
  if (!user.assigned_outlet_id) return { success: false as const, error: "Tidak ada outlet yang ditugaskan." };

  const supabase = createServerClient();
  const today = todayWIB();

  const { data: att } = await supabase
    .from("attendance")
    .select("id, check_in_time")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .maybeSingle();
  if (!att?.check_in_time)
    return { success: false as const, error: "Belum check-in hari ini." };

  const { data: existing } = await supabase
    .from("daily_stock_reports")
    .select("id")
    .eq("user_id", user.id)
    .eq("report_date", today);
  if (existing && existing.length > 0) {
    return { success: false as const, error: "Sudah ada laporan untuk tanggal ini." };
  }

  const { data: sale } = await supabase
    .from("daily_sales_reports")
    .select("product_id, qty_sold")
    .eq("user_id", user.id)
    .eq("report_date", today);
  const sold: Record<string, number> = {};
  (sale ?? []).forEach((r) => {
    sold[r.product_id] = (sold[r.product_id] ?? 0) + (Number(r.qty_sold) || 0);
  });

  for (const item of payload.items) {
    const selisih = item.stock_awal - (sold[item.product_id] ?? 0) - item.stock_akhir;
    if (selisih !== 0 && !item.other_reason?.trim()) {
      return {
        success: false as const,
        error: `SKU ${item.product_id.slice(0, 8)}: ada selisih stok, wajib isi alasan.`,
      };
    }
  }

  const rows = payload.items.map((i) => {
    const selisih = i.stock_awal - (sold[i.product_id] ?? 0) - i.stock_akhir;
    return {
      user_id: user.id,
      outlet_id: user.assigned_outlet_id!,
      product_id: i.product_id,
      report_date: today,
      stock_awal: i.stock_awal,
      stock_akhir: i.stock_akhir,
      selisih,
      other_qty: selisih,
      other_reason: selisih !== 0 ? i.other_reason ?? null : null,
      status: "approved",
    };
  });

  const { data, error } = await supabase.from("daily_stock_reports").insert(rows).select("id, product_id, status");
  if (error) return { success: false as const, error: "Gagal menyimpan laporan stok." };
  return { success: true as const, reports: data };
}
