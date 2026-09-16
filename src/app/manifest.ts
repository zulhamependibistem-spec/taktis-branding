import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TAKTIS Branding · Absensi SPG",
    short_name: "TAKTIS Branding",
    description: "Sistem absensi SPG TAKTIS Branding",
    start_url: "/spg",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}