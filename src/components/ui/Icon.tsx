const paths: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />,
  assignment: <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Zm2 9h6v-2H9v2Zm0-4h6V6H9v2Zm0 8h6v-2H9v2Z" />,
  history: <path d="M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2 4.9l-1.4 1.4A9 9 0 1 0 13 3Zm-1 5v5l4 2 .8-1.3-3.3-1.7V8H12Z" />,
  person: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v2h16v-2c0-3.3-4.7-5-8-5Z" />,
  store: <path d="M4 4h16l1 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0l1-6Zm-1 8v8h18v-8a3.5 3.5 0 0 1-2 .8V20h-4v-5h-6v5H5v-7.2A3.5 3.5 0 0 1 3 12Z" />,
  calendar: <path d="M7 3h2v2h6V3h2v2h3v16H4V5h3V3Zm-1 6v9h12V9H6Z" />,
  camera: <path d="M9 3l-2 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-2-3H9Zm3 6a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />,
  schedule: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3v6l5 3 .8-1.3-4.2-2.4V7H11Z" />,
  analytics: <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v14h14V5H5Zm2 10v-5h2v5H7Zm4 0V9h2v6h-2Zm4 0V7h2v8h-2Z" />,
  edit: <path d="M4 20h4l11-11-4-4L4 16v4Zm4.5-2H6v-2.5l8.5-8.5 2.5 2.5L8.5 18ZM21 4l-2-2-1.5 1.5 2 2L21 4Z" />,
  chevronRight: <path d="m9 6 6 6-6 6 1.4 1.4L17.8 12 10.4 4.6 9 6Z" />,
  logout: <path d="M16 17l5-5-5-5-1.4 1.4 2.6 2.6H9v2h8.2l-2.6 2.6L16 17ZM4 5h7V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H4V5Z" />,
  check: <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" />,
  close: <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" />,
  info: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />,
  minus: <path d="M19 13H5v-2h14v2z" />,
  plus: <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />,
  storefront: <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />,
  warning: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  woman: (
    <>
      <circle cx="12" cy="6" r="3.6" />
      <path d="M12 11.5c-4.1 0-7.2 2.9-7.2 6.7V22h14.4v-3.8c0-3.8-3.1-6.7-7.2-6.7Z" />
    </>
  ),
  search: <path d="M10.5 3.5a7 7 0 1 0 4.4 12.4l4.2 4.2 1.4-1.4-4.2-4.2A7 7 0 0 0 10.5 3.5Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />,
  chevronDown: <path d="m6 9 6 6 6-6 1.4 1.4L12 17.8 4.6 10.4 6 9Z" />,
  users: <path d="M9 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v2h8.4a7 7 0 0 1-.4-2.3c0-1 .3-1.9.8-2.7H9Zm7.5-2a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm.6 5.6h4.9v-1.8c0-1.9-1.6-3.1-3.5-3.6l-.6-.1c-.9.7-1.5 1.8-1.6 3.1 0 .8.2 1.8.8 2.4Z" />,
  upload: <path d="M12 3l4 5h-3v8h-2V8H8l4-5Zm-7 14h14v3H5v-3Z" />,
  download: <path d="M12 21l-4-5h3V8h2v8h3l-4 5ZM5 4h14v3H5V4Z" />,
};

export function Icon({
  name,
  size = 24,
  className = "",
  filled = false,
}: {
  name: keyof typeof paths;
  size?: number;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
