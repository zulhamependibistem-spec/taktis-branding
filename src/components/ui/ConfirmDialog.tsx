"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export type ConfirmRequest = {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type Pending = ConfirmRequest & { resolve: (ok: boolean) => void };

export function useConfirmDialog() {
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback((req: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => setPending({ ...req, resolve }));
  }, []);

  const close = useCallback((ok: boolean) => {
    setPending((cur) => {
      if (cur) cur.resolve(ok);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  const dialog = pending ? (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={() => close(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              pending.danger ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"
            }`}
          >
            <Icon name="warning" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold text-slate-900">{pending.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{pending.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <button
            type="button"
            autoFocus
            onClick={() => close(false)}
            className="rounded-lg border border-slate-500 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95"
          >
            {pending.cancelText ?? "Batal"}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition active:scale-95 ${
              pending.danger ? "bg-rose-600 hover:bg-rose-500" : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {pending.confirmText ?? "Konfirmasi"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, dialog };
}