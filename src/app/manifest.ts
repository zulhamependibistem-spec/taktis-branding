import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TAKTIS TSJ · Absensi & Laporan SPG",
    short_name: "TAKTIS TSJ",
    description: "Sistem absensi dan pelaporan SPG TAKTIS TSJ",
    start_url: "/spg",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}