"use server";

import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/date";

export async function getReportStatus() {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };

  const supabase = createServerClient();
  const today = todayWIB();
  const [sales, stock] = await Promise.all([
    supabase.from("daily_sales_reports").select("id").eq("user_id", user.id).eq("report_date", today).limit(1),
    supabase.from("daily_stock_reports").select("id").eq("user_id", user.id).eq("report_date", today).limit(1),
  ]);
  return {
    success: true as const,
    salesDone: (sales.data?.length ?? 0) > 0,
    stockDone: (stock.data?.length ?? 0) > 0,
  };
}

export async function getSalesHistory() {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("daily_sales_reports")
    .select("id, report_date, qty_sold, sampling_qty, unit_price, total_selling, status, ec, notes, product:products(variant), outlet:outlets(name)")
    .eq("user_id", user.id)
    .order("report_date", { ascending: false });

  if (error) return { success: false as const, error: "Gagal memuat riwayat." };
  return { success: true as const, reports: data };
}

export async function getReportFormData() {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };
  if (!user.assigned_outlet_id) return { success: false as const, error: "Tidak ada outlet yang ditugaskan." };

  const supabase = createServerClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, variant, default_price, image_url")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .order("variant", { ascending: true });

  if (error) return { success: false as const, error: "Gagal memuat produk." };

  const overrides = await supabase
    .from("outlet_product_prices")
    .select("product_id, price")
    .eq("outlet_id", user.assigned_outlet_id);

  const priceMap: Record<string, number> = {};
  overrides.data?.forEach((o) => {
    priceMap[o.product_id] = o.price;
  });

  const items = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    variant: p.variant,
    image_url: p.image_url,
    unit_price: priceMap[p.id] ?? p.default_price,
  }));

  return { success: true as const, items };
}

export async function submitSalesReport(payload: {
  items: { product_id: string; qty_sold: number; sampling_qty?: number; unit_price?: number }[];
  ec?: number;
}) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };
  if (!user.assigned_outlet_id) return { success: false as const, error: "Tidak ada outlet yang ditugaskan." };
  if (!payload.items?.length) return { success: false as const, error: "Tidak ada item dilaporkan." };

  const supabase = createServerClient();
  const today = todayWIB();

  const { data: attRows } = await supabase
    .from("attendance")
    .select("id, check_in_time")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .limit(1);
  const att = attRows?.[0];
  if (!att?.check_in_time)
    return { success: false as const, error: "Belum check-in hari ini." };

  // Cek belum ada laporan utk user+outlet+date
  const { data: existing } = await supabase
    .from("daily_sales_reports")
    .select("id")
    .eq("user_id", user.id)
    .eq("report_date", today);
  if (existing && existing.length > 0) {
    return { success: false as const, error: "Sudah ada laporan untuk tanggal ini." };
  }

  // Ambil harga
  const overrides = await supabase
    .from("outlet_product_prices")
    .select("product_id, price")
    .eq("outlet_id", user.assigned_outlet_id);
  const priceMap: Record<string, number> = {};
  overrides.data?.forEach((o) => (priceMap[o.product_id] = o.price));

  const pids = payload.items.map((i) => i.product_id);
  const totalSampling = payload.items.reduce((sum, i) => sum + (i.sampling_qty ?? 0), 0);
  if (totalSampling > 160) return { success: false as const, error: "Total sampling maksimal 160." };
  const { data: products } = await supabase.from("products").select("id, default_price").in("id", pids);
  const defMap: Record<string, number> = {};
  products?.forEach((p) => (defMap[p.id] = p.default_price));

  const rows = payload.items.map((i) => {
    // Harga dihitung server-side (override outlet, fallback default product).
    // Nilai unit_price dari client TIDAK dipercaya — mencegah inflasi omzet.
    const unit_price = Math.round(priceMap[i.product_id] ?? defMap[i.product_id] ?? 0);
    return {
      user_id: user.id,
      outlet_id: user.assigned_outlet_id!,
      product_id: i.product_id,
      report_date: today,
      qty_sold: i.qty_sold,
      sampling_qty: i.sampling_qty ?? 0,
      unit_price,
      status: "approved",
      ec: Number.isFinite(payload.ec as number) ? Math.max(0, Math.floor(payload.ec as number)) : 0,
    };
  });

  const { data, error } = await supabase.from("daily_sales_reports").insert(rows).select("id, product_id, status");
  if (error) return { success: false as const, error: "Gagal menyimpan laporan." };
  return { success: true as const, reports: data };
}
