"use client";

import { useEffect, useState } from "react";
import { timeWIB } from "@/lib/date";

export default function LiveClock() {
  const [now, setNow] = useState<string>(() => timeWIB(new Date().toISOString()));

  useEffect(() => {
    const id = setInterval(() => setNow(timeWIB(new Date().toISOString())), 1000);
    return () => clearInterval(id);
  }, []);

  return <span>{now} WIB</span>;
}