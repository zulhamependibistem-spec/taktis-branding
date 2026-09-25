export function todayWIB(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function dateWIB(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function timeWIB(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function dateWIBLabel(
  d: Date | string = new Date(),
  opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }
): string {
  return new Date(d).toLocaleDateString("id-ID", { ...opts, timeZone: "Asia/Jakarta" });
}