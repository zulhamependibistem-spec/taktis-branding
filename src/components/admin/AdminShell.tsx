import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, logoutService } from "@/lib/auth";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const NAV = [
  { key: "attendance", href: "/admin/attendance", label: "Attendance", icon: "schedule" as const },
];

async function logoutAction() {
  "use server";
  await logoutService();
  redirect("/login");
}

export default async function AdminShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const desktopNav = NAV.map((item) => {
    const isActive = item.key === active;
    return (
      <Link
        key={item.key}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition",
          isActive ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
        )}
      >
        <Icon name={item.icon} size={20} />
        {item.label}
      </Link>
    );
  });

  const mobileNav = NAV.map((item) => {
    const isActive = item.key === active;
    return (
      <Link
        key={item.key}
        href={item.href}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition",
          isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
        )}
      >
        <Icon name={item.icon} size={15} />
        {item.label}
      </Link>
    );
  });

  return (
    <div className="admin-shell min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-nav hidden w-64 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-3 px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bistem-logo.jpg"
            alt="Bistem Logo"
            className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-200"
          />
          <div>
            <p className="text-[14px] font-bold text-slate-900 leading-tight">BISTEM JAYA MANDIRI</p>
            <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide">
              {me.role === "pic" ? "PIC Portal" : "Admin Portal"}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">{desktopNav}</nav>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-600">
              {me.full_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900">{me.full_name}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{me.role}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <Icon name="logout" size={20} />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      <div className="md:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg md:hidden">
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bistem-logo.jpg"
                alt="Bistem Logo"
                className="h-8 w-8 rounded-xl object-cover shadow-sm ring-1 ring-slate-200"
              />
              <span className="text-[14px] font-bold text-slate-900">BISTEM JAYA MANDIRI</span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600"
                title="Keluar"
              >
                <Icon name="logout" size={18} />
              </button>
            </form>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3">{mobileNav}</nav>
        </header>

        <main className="mx-auto w-full max-w-[100rem] p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}