export default function Logo({
  imgHeight = 64,
}: {
  imgHeight?: number;
}) {
  const xSize = Math.round(imgHeight * 0.26);
  return (
    <div className="flex items-center gap-[13px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bistem-logo.jpg"
        alt="Bistem"
        style={{ height: imgHeight }}
        className="w-auto object-contain"
      />

      <span aria-hidden="true" className="inline-flex shrink-0 text-indigo-600">
        <svg
          viewBox="0 0 24 24"
          width={xSize}
          height={xSize}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          className="drop-shadow-[0_1px_2px_rgba(79,70,229,0.35)]"
        >
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      </span>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mayora.webp"
        alt="Mayora"
        style={{ height: imgHeight }}
        className="w-auto object-contain"
      />
    </div>
  );
}