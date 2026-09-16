"use server";

import { getSessionUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

const MAX_FILE = 5 * 1024 * 1024;

export async function uploadAvatar(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { success: false as const, error: "Sesi berakhir." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { success: false as const, error: "Pilih file foto." };
  if (!file.type.startsWith("image/"))
    return { success: false as const, error: "File harus berupa gambar." };
  if (file.size > MAX_FILE) return { success: false as const, error: "Maksimal 5MB." };

  const buf = Buffer.from(await file.arrayBuffer());
  const supabase = createServerClient();

  const { data: bucket } = await supabase.storage.getBucket("avatars");
  if (!bucket) {
    const created = await supabase.storage.createBucket("avatars", { public: true });
    if (created.error) return { success: false as const, error: "Gagal menyiapkan penyimpanan." };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `avatar-${user.id}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return { success: false as const, error: "Gagal mengunggah foto." };

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error: uErr } = await supabase
    .from("users")
    .update({ avatar_url: `${publicUrl}?v=${Date.now()}` })
    .eq("id", user.id);
  if (uErr) return { success: false as const, error: "Gagal menyimpan foto." };

  return { success: true as const };
}