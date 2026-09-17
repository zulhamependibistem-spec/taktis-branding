"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";
import Logo from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";

export default function LoginForm({ notice = null }: { notice?: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await loginAction(fd);
        if (!res.success) {
          setError(res.error);
          return;
        }
        // Hard navigation: reset Next router cache + bfcache agar state user
        // sebelumnya tidak "menumpang" ke user baru di device yang sama.
        window.location.assign(res.redirect);
      } catch {
        setError("Koneksi gagal. Periksa sinyal lalu coba lagi.");
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-gradient-to-b from-slate-50 via-white to-indigo-50/60 px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-5">
          <Logo imgHeight={72} />
          <p className="text-sm text-slate-500">Absensi SPG · TAKTIS Branding</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(79,70,229,0.06)]"
        >
          {notice ? (
            <p className="mb-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">
              <Icon name="info" size={16} className="mt-0.5 text-slate-500" />
              {notice}
            </p>
          ) : null}

          <label htmlFor="nip" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            NIP / No. HP
          </label>
          <input
            id="nip"
            name="nip"
            type="text"
            inputMode="numeric"
            enterKeyHint="go"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            required
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "nip-error" : undefined}
            placeholder="Contoh: NIP 5 angka atau No. HP"
            className="h-[52px] w-full rounded-xl border border-slate-500 bg-white px-4 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />

          {error ? (
            <p
              id="nip-error"
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
            >
              <Icon name="warning" size={16} className="mt-0.5 shrink-0" />
              <span>
                {error}
                <span className="mt-0.5 block text-[13px] font-medium">
                  Hubungi Admin atau SPV jika NIP Anda belum terdaftar.
                </span>
              </span>
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="mt-5 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[15px] font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 active:scale-[0.99] disabled:cursor-wait"
          >
            {pending ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-500">
          PT Bistem Jaya Mandiri
          <span className="mx-1.5 text-slate-400">·</span>
          © Projo Cabang Klender
        </p>
      </div>
    </main>
  );
}
