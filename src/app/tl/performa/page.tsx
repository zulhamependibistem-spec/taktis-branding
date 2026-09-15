import BottomNav from "@/components/ui/BottomNav";
import { TL_NAV } from "@/components/ui/nav";
import { getTeamPerformance } from "@/lib/actions/tl";
import PerformanceList from "./PerformanceList";

export default async function TlPerforma() {
  const res = await getTeamPerformance("hari");
  const initial = res.success ? { omzet: res.omzet, spgs: res.spgs } : { omzet: 0, spgs: [] };

  return (
    <div className="mx-auto min-h-screen max-w-md pb-24 md:max-w-4xl">
      <header className="sticky top-0 z-nav border-b border-slate-200/60 bg-white/90 px-4 py-4 backdrop-blur">
        <h1 className="text-[20px] font-semibold text-slate-900">Performa SPG</h1>
      </header>
      <main className="flex flex-col gap-4 p-4">
        <PerformanceList initial={initial} />
      </main>
      <BottomNav active="performa" items={TL_NAV} />
    </div>
  );
}
