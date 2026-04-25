"use client";

import { useEffect, useState } from "react";
import { getFxRate } from "@/lib/api";
import { Activity } from "lucide-react";

export default function Header() {
  const [rate, setRate] = useState(3350);

  useEffect(() => {
    let active = true;
    const refreshRate = () => {
      getFxRate().then((liveRate) => {
        if (active) {
          setRate(liveRate);
        }
      });
    };

    refreshRate();
    const intervalId = window.setInterval(refreshRate, 2000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <header className="h-16 border-b border-white/5 bg-slate-900/30 backdrop-blur-md flex items-center justify-between px-6 shadow-sm z-20 sticky top-0">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
        <Activity className="h-4 w-4 text-blue-500" />
        Cross-Border Intelligence
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm bg-slate-900/50 border border-white/10 px-3 py-1.5 rounded-md">
          <span className="text-slate-400 text-xs font-medium uppercase">IDR/MYR</span>
          <span className="font-mono font-bold text-blue-400">{rate.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">System Online</span>
        </div>
      </div>
    </header>
  );
}
