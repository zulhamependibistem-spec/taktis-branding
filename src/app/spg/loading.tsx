export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-slate-50 px-6">
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="text-[13px] font-medium text-slate-500">Memuat halaman...</p>
      </div>
    </div>
  );
}
