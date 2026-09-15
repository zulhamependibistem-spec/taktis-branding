import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { todayWIB } from "@/lib/date";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sesi berakhir." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const action = form.get("action") as string | null; // "in" | "out"
  const latStr = form.get("lat") as string | null;
  const lngStr = form.get("lng") as string | null;
  const lat = latStr ? Number(latStr) : null;
  const lng = lngStr ? Number(lngStr) : null;

  if (!file || !action || !["in", "out"].includes(action)) {
    return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
  }
  if (file.size > 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran foto terlalu besar (maks 1 MB)." }, { status: 400 });
  }
  if (latStr && !Number.isFinite(lat)) {
    return NextResponse.json({ error: "Koordinat GPS tidak valid." }, { status: 400 });
  }
  if (lngStr && !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Koordinat GPS tidak valid." }, { status: 400 });
  }

  const supabase = createServerClient();
  const today = todayWIB();

  // Validasi absensi dulu SEBELUM upload — absen yang ditolak tidak meninggalkan foto yatim di storage.
  if (action === "in") {
    if (user.role === "spg" && !user.assigned_outlet_id) {
      return NextResponse.json({ error: "Tidak ada outlet yang ditugaskan." }, { status: 400 });
    }
    const { data } = await supabase
      .from("attendance")
      .select("id, check_in_time")
      .eq("user_id", user.id)
      .eq("report_date", today)
      .limit(1);
    if (data?.[0]?.check_in_time) {
      return NextResponse.json({ error: "Sudah check-in hari ini." }, { status: 409 });
    }
  } else {
    const { data } = await supabase
      .from("attendance")
      .select("id, check_in_time, check_out_time")
      .eq("user_id", user.id)
      .eq("report_date", today)
      .limit(1);
    const existing = data?.[0];
    if (!existing?.check_in_time) {
      return NextResponse.json({ error: "Belum check-in hari ini." }, { status: 400 });
    }
    if (existing.check_out_time) {
      return NextResponse.json({ error: "Sudah check-out hari ini." }, { status: 409 });
    }
  }

  // Upload foto
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${action}/${user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("attendance-photos")
    .upload(path, file, { contentType: file.type });
  if (upErr) {
    return NextResponse.json({ error: `Gagal mengunggah foto. ${upErr.message}` }, { status: 500 });
  }

  if (action === "in") {
    let outletId = user.assigned_outlet_id;
    if (!outletId) {
      // TL / user tanpa outlet: ambil outlet pertama dari SPG binaan atau master outlet
      const { data: spgOutlet } = await supabase
        .from("users")
        .select("assigned_outlet_id")
        .eq("supervisor_id", user.id)
        .not("assigned_outlet_id", "is", null)
        .limit(1)
        .maybeSingle();
      outletId = spgOutlet?.assigned_outlet_id ?? null;

      if (!outletId) {
        const { data: firstOutlet } = await supabase
          .from("outlets")
          .select("id")
          .limit(1)
          .maybeSingle();
        outletId = firstOutlet?.id ?? null;
      }
    }

    if (!outletId) {
      return NextResponse.json({ error: "Tidak ada outlet terdaftar di sistem." }, { status: 400 });
    }

    let locationName: string | null = null;
    if (lat !== null && lng !== null) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          {
            headers: { "User-Agent": "TaktisBranding-SPG-App/1.0" },
            signal: AbortSignal.timeout(3000),
          }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          locationName = geoData.display_name ?? null;
        }
      } catch {
        // Geocoding timeout fallback
      }
    }

    const { data, error } = await supabase
      .from("attendance")
      .insert({
        user_id: user.id,
        outlet_id: outletId,
        report_date: today,
        check_in_time: new Date().toISOString(),
        check_in_photo_url: path,
        check_in_lat: lat,
        check_in_lng: lng,
        location_name: locationName,
        status: "checked_in",
      })
      .select("id, check_in_time, check_out_time, status, location_name")
      .single();

    if (error) return NextResponse.json({ error: "Gagal menyimpan absensi." }, { status: 500 });
    return NextResponse.json({ attendance: data });
  }

  // Check-out
  const { data: outRows, error: getErr } = await supabase
    .from("attendance")
    .select("id, check_in_time, check_out_time")
    .eq("user_id", user.id)
    .eq("report_date", today)
    .limit(1);
  const existing = outRows?.[0];

  if (getErr || !existing?.check_in_time) {
    return NextResponse.json({ error: "Belum check-in hari ini." }, { status: 400 });
  }
  if (existing.check_out_time) {
    return NextResponse.json({ error: "Sudah check-out hari ini." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("attendance")
    .update({ check_out_time: new Date().toISOString(), check_out_photo_url: path, status: "checked_out" })
    .eq("id", existing.id)
    .select("id, check_in_time, check_out_time, status")
    .single();

  if (error) return NextResponse.json({ error: "Gagal menyimpan check-out." }, { status: 500 });
  return NextResponse.json({ attendance: data });
}
