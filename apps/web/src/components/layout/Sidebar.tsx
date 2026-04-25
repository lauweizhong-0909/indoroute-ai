"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, TrendingUp, Anchor, AlertTriangle, Upload } from 'lucide-react';

const routes = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/compliance', label: 'Compliance Radar', icon: ShieldCheck },
  { href: '/profit', label: 'Profit Shield', icon: TrendingUp },
  { href: '/router', label: 'Smart Router', icon: Anchor },
  { href: '/alerts', label: 'Risk Center', icon: AlertTriangle },
  { href: '/intake', label: 'Data Intake', icon: Upload },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 min-h-screen flex flex-col z-20">
      <div className="p-6">
        <h1 className="text-xl font-extrabold flex items-center gap-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          <Anchor className="text-blue-500 h-6 w-6" />
          IndoRoute AI
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {routes.map((route) => {
          const active = pathname.startsWith(route.href);
          return (
            <Link key={route.href} href={route.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 font-medium ${active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <route.icon className={`h-5 w-5 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
              {route.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Demo Mode
        </div>
      </div>
    </aside>
  );
}
