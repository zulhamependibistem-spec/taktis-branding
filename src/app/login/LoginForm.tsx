"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";
import Logo from "@/components/brand/Logo";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginAction(fd);
      if (!res.success) {
        setError(res.error);
        return;
      }
      // Hard navigation: reset Next router cache + bfcache agar state user
      // sebelumnya tidak "menumpang" ke user baru di device yang sama.
      window.location.assign(res.redirect);
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-indigo-50/60 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-5">
          <Logo imgHeight={72} />
          <p className="text-sm text-slate-500">Absensi SPG · TAKTIS Branding</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(79,70,229,0.06)]"
        >
          <label htmlFor="nip" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
            NIP / No. HP
          </label>
          <input
            id="nip"
            name="nip"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            required
            autoFocus
            placeholder="Masukkan NIP atau No. HP"
            className="h-12 w-full rounded-xl border border-slate-500 bg-white px-4 text-slate-900 placeholder:text-slate-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-5 h-[52px] w-full rounded-xl bg-indigo-600 text-[15px] font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 active:scale-[0.99] disabled:opacity-60"
          >
            {pending ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-500">
          TAKTIS Branding · PT Bistem Jaya Mandiri
          <span className="mx-1.5 text-slate-400">·</span>
          © Projo Cabang Klender
        </p>
      </div>
    </main>
  );
}