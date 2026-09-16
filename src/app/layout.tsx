import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "TAKTIS Branding · Absensi SPG",
  description: "Sistem absensi SPG TAKTIS Branding",
  icons: { icon: "/bistemlogo.webp" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${jetbrains.variable} h-full`}
    >
      <body className="min-h-full bg-slate-50 font-jakarta text-slate-900 antialiased">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
