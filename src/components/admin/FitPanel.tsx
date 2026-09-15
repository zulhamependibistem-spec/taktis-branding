"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function FitPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(min-width: 1024px)").matches) return;

    const fit = () => {
      if (!ref.current) return;
      const zoom =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--admin-zoom")) || 0.75;
      const top = ref.current.getBoundingClientRect().top;
      setHeight(Math.max(200, Math.round((window.innerHeight - top) / zoom - 40)));
    };

    fit();
    window.addEventListener("resize", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      window.removeEventListener("resize", fit);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={height != null ? { height: `${height}px` } : undefined}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}