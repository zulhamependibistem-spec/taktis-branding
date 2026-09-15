"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const NAG_KEY = "taktis_branding_spg_checkin_nag";

export default function CheckInReminder({ isCheckedIn }: { isCheckedIn: boolean }) {
  const [show, setShow] = useState(() => {
    if (isCheckedIn) return false;
    try {
      if (sessionStorage.getItem(NAG_KEY)) return false;
    } catch {}
    return true;
  });

  function dismiss() {
    try {
      sessionStorage.setItem(NAG_KEY, "1");
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-3 px-6 pb-5 pt-7 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Icon name="schedule" size={28} />
          </span>
          <h2 className="text-[18px] font-bold text-slate-900">Belum Check-In Hari Ini</h2>
          <p className="text-[13px] leading-relaxed text-slate-500">
            Laporan sales &amp; stok baru bisa dikirim setelah kamu check-in dengan foto selfie
            dan lokasi GPS di toko.
          </p>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
          <Link
            href="/spg/absen"
            onClick={dismiss}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[15px] font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
          >
            <Icon name="camera" size={18} />
            Check-In Sekarang
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-95"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}