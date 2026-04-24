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
    <aside className="w-64 bg-sidebar min-h-screen text-sidebar-foreground flex flex-col border-r">
      <div className="p-6">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Anchor className="text-blue-500" />
          IndoRoute AI
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {routes.map((route) => {
          const active = pathname.startsWith(route.href);
          return (
            <Link key={route.href} href={route.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${active ? 'bg-sidebar-primary/20 text-sidebar-primary font-medium' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
              <route.icon className="h-5 w-5" />
              {route.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        Demo Mode Active
      </div>
    </aside>
  );
}
