import { redirect } from "next/navigation";
import { loginService, getSessionUser } from "@/lib/auth";
import Logo from "@/components/brand/Logo";

async function loginAction(formData: FormData) {
  "use server";
  const nip = String(formData.get("nip") || "").trim();
  const result = await loginService(nip);
  if (!result.success) {
    redirect(`/login?error=${encodeURIComponent(result.error)}`);
  }
  const { role } = result.user;
  redirect(role === "admin" || role === "pic" ? "/admin" : role === "tl" ? "/tl" : "/spg");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const me = await getSessionUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-indigo-50/60 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-5">
          <Logo imgHeight={72} />
          <p className="text-sm text-slate-500">Sistem Absensi &amp; Laporan SPG</p>
        </div>

        <form
          action={loginAction}
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
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
          />

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
            >
              {error}
            </p>
          ) : me ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
              Sudah login sebagai {me.full_name}. Mengalihkan...
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-5 h-[52px] w-full rounded-xl bg-indigo-600 text-[15px] font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 active:scale-[0.99]"
          >
            Masuk
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          TAKTIS Branding · PT Bistem Jaya Mandiri
          <span className="mx-1.5 text-slate-300">·</span>
          © Projo Cabang Klender
        </p>
      </div>
    </main>
  );
}
