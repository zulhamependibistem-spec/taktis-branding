import type { NavItem } from "./BottomNav";

export const SPG_NAV: NavItem[] = [
  { key: "home", label: "Beranda", icon: "home", href: "/spg" },
  { key: "absen", label: "Absen", icon: "schedule", href: "/spg/absen" },
  { key: "riwayat", label: "Riwayat", icon: "history", href: "/spg/riwayat" },
  { key: "profil", label: "Profil", icon: "person", href: "/spg/profil" },
];

export const TL_NAV: NavItem[] = [
  { key: "beranda", label: "Beranda", icon: "home", href: "/tl" },
  { key: "absen", label: "Absen", icon: "schedule", href: "/tl/absen" },
  { key: "absensi", label: "Tim", icon: "users", href: "/tl/attendance" },
];