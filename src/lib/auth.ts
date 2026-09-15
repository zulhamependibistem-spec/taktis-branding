import { cookies } from "next/headers";
import { createServerClient } from "./supabase/server";
import { createSessionToken, verifySessionToken } from "./session";
import type { SessionUser } from "./session";

const SESSION_COOKIE = "taktis_tsj_session";

export async function createServerSupabase() {
  return createServerClient();
}

export async function loginService(identifier: string) {
  const raw = (identifier ?? "").trim();
  if (!raw)
    return { success: false, error: "NIP / No. HP tidak terdaftar." } as const;

  const supabase = await createServerSupabase();
  // Gunakan .eq() (nilai sebagai literal, aman dari injeksi filter) — jangan .or() yang
  // menempelkan input mentah ke ekspresi filter. Coba NIP, nomor HP apa adanya, dan 62-form.
  const digits = raw.replace(/\D/g, "");
  const phone = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  const base = () =>
    supabase
      .from("users")
      .select("id, full_name, nip, role, assigned_outlet_id, phone")
      .in("status", ["active", "backup"]);

  const [byNip, byDigits, byPhone] = await Promise.all([
    base().eq("nip", raw).maybeSingle(),
    base().eq("phone", digits).maybeSingle(),
    phone !== digits ? base().eq("phone", phone).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  const data = byNip.data ?? byDigits.data ?? byPhone.data;
  const error = byNip.error ?? byDigits.error ?? byPhone.error;
  if (error) {
    console.error("[loginService] error:", error);
    return { success: false, error: `Gagal login: ${error.message}` } as const;
  }
  if (!data)
    return { success: false, error: "NIP / No. HP tidak terdaftar." } as const;

  const user: SessionUser = {
    id: data.id,
    full_name: data.full_name,
    nip: data.nip,
    role: data.role as SessionUser["role"],
    assigned_outlet_id: data.assigned_outlet_id,
  };

  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return { success: true, user } as const;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const user = await verifySessionToken(token);
  if (!user) return null;

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, nip, role, assigned_outlet_id, status")
    .eq("id", user.id)
    .maybeSingle();
  if (!data || (data.status !== "active" && data.status !== "backup")) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }
  // Baca role & outlet langsung dari DB setiap request — demosi/perpindahan toko
  // berlaku seketika, tidak menunggu token 12 jam kedaluwarsa.
  return {
    id: data.id,
    full_name: data.full_name,
    nip: data.nip ?? "",
    role: data.role as SessionUser["role"],
    assigned_outlet_id: data.assigned_outlet_id,
  };
}

export async function logoutService() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
