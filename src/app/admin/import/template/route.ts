import * as XLSX from "xlsx";
import { getSessionUser } from "@/lib/auth";

const HEADERS = ["Nama GRSM", "AREA", "Nama Outlet", "KODE SUBDIST", "KODE OUTLET", "Channel"];

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return new Response("Akses ditolak", { status: 403 });
  }

  const ws = XLSX.utils.aoa_to_sheet([
    HEADERS,
    ["GRSM 1", "CONTOH AREA", "CONTOH NAMA TOKO", "0000", "0000001", "CONTINUE"],
    ["GRSM 2", "CONTOH AREA 2", "CONTOH TOKO KEDUA", "0001", "0000002", "GT"],
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KODE OUTLET TOKO");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-master-outlet.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
