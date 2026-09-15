"use client";

import { useState } from "react";
import CameraCapture from "@/components/ui/CameraCapture";
import { timeWIB } from "@/lib/date";
import { Icon } from "@/components/ui/Icon";

type Attendance = {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
} | null;

type Photo = { preview: string; blob: Blob } | null;

export default function CheckIn({ initial, userId }: { initial: Attendance; userId: string }) {
  void userId; // kept for prop compat
  const [attendance, setAttendance] = useState<Attendance>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [photo, setPhoto] = useState<Photo>(null);

  const isCheckedIn = !!attendance?.check_in_time;
  const isCheckedOut = !!attendance?.check_out_time;

  async function run(action: "in" | "out") {
    setBusy(true);
    setMessage(null);

    if (!photo) {
      setBusy(false);
      setMessage({ ok: false, text: "Foto selfie wajib diambil." });
      return;
    }

    let lat: number | null = null;
    let lng: number | null = null;

    if (action === "in" && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000, enableHighAccuracy: true })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // GPS offline or permission denied
      }
    }

    const form = new FormData();
    form.append("file", photo.blob, "photo.jpg");
    form.append("action", action);
    if (lat !== null) form.append("lat", String(lat));
    if (lng !== null) form.append("lng", String(lng));

    try {
      const res = await fetch("/api/upload-photo", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? "Gagal memproses absensi." });
        return;
      }

      setAttendance(json.attendance);
      setPhoto(null);
      setMessage({ ok: true, text: action === "in" ? "Berhasil check-in." : "Berhasil check-out." });
    } catch {
      setMessage({ ok: false, text: "Koneksi gagal, coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = isCheckedOut
    ? "Sudah Check-Out"
    : isCheckedIn
      ? "Sudah Check-In"
      : "Belum Check-In";

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/10 text-indigo-600">
              <Icon name="schedule" size={22} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900">Status Absensi</h2>
              <p className={`text-sm ${isCheckedIn ? "text-emerald-600" : "text-rose-500"}`}>
                {statusLabel}
              </p>
            </div>
          </div>
          <div className="text-right">
            {attendance?.check_in_time && (
              <p className="font-mono text-sm text-slate-500">In {timeWIB(attendance.check_in_time)}</p>
            )}
            {attendance?.check_out_time && (
              <p className="font-mono text-sm text-slate-500">Out {timeWIB(attendance.check_out_time)}</p>
            )}
          </div>
        </div>

        {isCheckedIn && !isCheckedOut && (
          <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-[12px] text-slate-500">
            Verifikasi absensi ditangani Team Leader dari foto &amp; timestamp Anda.
          </p>
        )}

        {!isCheckedOut && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-100/70 px-3.5 py-2">
            <span className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              GPS &amp; Geolocation
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
              High Accuracy Active
            </span>
          </div>
        )}

        {!isCheckedOut && (
          <>
            {photo ? (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-600">Foto live siap</p>
                  <p className="text-[11px] text-slate-400">dengan timestamp tervalidasi.</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="Selfie" className="h-12 w-12 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    Ulangi
                  </button>
                </div>
              </div>
            ) : (
              <CameraCapture
                key={String(isCheckedIn)}
                label={isCheckedIn ? "CHECK-OUT" : "CHECK-IN"}
                onPhoto={(preview, blob) => setPhoto({ preview, blob })}
              />
            )}

            {!isCheckedIn && (
              <button
                type="button"
                onClick={() => run("in")}
                disabled={busy}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[16px] font-semibold text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
              >
                <Icon name="camera" size={22} />
                {busy ? "Memproses..." : "CHECK IN SEKARANG"}
              </button>
            )}

            {isCheckedIn && !isCheckedOut && (
              <button
                type="button"
                onClick={() => run("out")}
                disabled={busy}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-[16px] font-semibold text-white transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
              >
                <Icon name="logout" size={22} />
                {busy ? "Memproses..." : "CHECK OUT"}
              </button>
            )}
          </>
        )}

        {isCheckedOut && (
          <p className="rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">
            Shift hari ini selesai.
          </p>
        )}

        {message && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              message.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </p>
        )}
      </section>
    </>
  );
}
