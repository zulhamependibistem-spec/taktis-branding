"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { uploadAvatar } from "@/lib/actions/avatar";

async function compressImageFile(file: File, maxW = 1000, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", quality);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function AvatarUpload({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);

    // Client-side compression: downscale 12MB gallery photos to ~200KB before network upload
    const compressedBlob = await compressImageFile(file, 1000, 0.8);

    const fd = new FormData();
    fd.append("file", compressedBlob, "avatar.jpg");
    const res = await uploadAvatar(fd);
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="group relative"
        aria-label="Ubah foto profil"
      >
        <div className="relative mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-indigo-600 text-[24px] font-bold text-white shadow-sm">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <Icon name="woman" size={38} filled />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        </div>
        {busy && (
          <span className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow ring-1 ring-slate-200">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPick}
        />
      </button>
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-600">
          {error}
        </p>
      )}
      <span className="text-[12px] font-medium text-indigo-600 underline-offset-2 group-hover:underline">
        {avatarUrl ? "Ganti foto" : "Upload foto profil"}
      </span>
    </div>
  );
}