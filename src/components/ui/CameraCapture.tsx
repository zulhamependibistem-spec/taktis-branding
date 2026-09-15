"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export default function CameraCapture({
  label,
  onPhoto,
}: {
  label: string;
  onPhoto: (preview: string, blob: Blob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setTimeout(() => setError("Kamera tidak tersedia di perangkat ini."), 0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setError("Akses kamera ditolak. Izinkan kamera di browser lalu coba lagi.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    if (busy) return;
    setBusy(true);
    const maxW = 800;
    const scale = Math.min(1, maxW / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    // Flip horizontally to fix camera mirroring on saved photo
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    // Reset transform so text timestamp overlay is NOT mirrored
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const stamp = `${label} · TAKTIS TSJ · ${new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })} WIB`;
    const fs = Math.max(16, Math.round(w / 30));
    ctx.font = `bold ${fs}px monospace`;
    const pad = fs * 0.6;
    const tw = ctx.measureText(stamp).width;
    const th = fs + fs * 1.2;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(pad, pad, tw + fs, th);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(stamp, pad + fs * 0.5, pad + th / 2 + fs * 0.05);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    canvas.toBlob(
      (blob) => {
        if (!blob) { setBusy(false); return; }
        const preview = URL.createObjectURL(blob);
        onPhoto(preview, blob);
        setBusy(false);
      },
      "image/jpeg",
      0.7,
    );
  }

  if (error) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
        <Icon name="warning" size={16} />
        {error}
      </div>
    );
  }

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="aspect-[3/4] w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Foto live · {label}
        </p>
        <button
          type="button"
          onClick={capture}
          disabled={busy || !ready}
          className="flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-bold text-slate-900 transition hover:bg-slate-100 active:scale-95 disabled:opacity-40"
        >
          <Icon name="camera" size={18} />
          {busy ? "Memproses..." : "Ambil"}
        </button>
      </div>
    </div>
  );
}