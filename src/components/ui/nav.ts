import type { NavItem } from "./BottomNav";

export const SPG_NAV: NavItem[] = [
  { key: "absen", label: "Absen", icon: "schedule", href: "/spg/absen" },
];

export const TL_NAV: NavItem[] = [
  { key: "beranda", label: "Beranda", icon: "home", href: "/tl" },
  { key: "absen", label: "Absen", icon: "schedule", href: "/tl/absen" },
  { key: "absensi", label: "Tim", icon: "users", href: "/tl/attendance" },
];