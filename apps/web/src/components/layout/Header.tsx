"use client";

import { useEffect, useState } from "react";
import { getFxRate } from "@/lib/api";

export default function Header() {
  const [rate, setRate] = useState(3350);

  useEffect(() => {
    let active = true;

    getFxRate().then((liveRate) => {
      if (active) {
        setRate(liveRate);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 shadow-sm">
      <div className="text-sm text-slate-500 font-medium">
        Cross-Border Intelligence
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Live Rate (MYR/IDR):</span>
          <span className="font-mono font-medium rounded bg-muted px-2 py-1">{rate.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-foreground">System Online</span>
        </div>
      </div>
    </header>
  );
}
