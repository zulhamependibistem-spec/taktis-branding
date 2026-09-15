import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

export type NavItem = { key: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; href: string };

export default function BottomNav({
  items,
  active,
}: {
  items: NavItem[];
  active: string;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-overlay border-t border-slate-200/60 bg-white/90 backdrop-blur-2xl pb-safe">
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-2 pb-3 pt-1.5">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 text-[12px] font-semibold transition active:scale-90",
                isActive ? "bg-indigo-600/10 text-indigo-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon name={item.icon} size={22} filled={isActive} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
