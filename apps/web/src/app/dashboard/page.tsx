"use client";

import { useState, useEffect } from "react";
import { deriveProfitsFromInputs, deriveRouterDecisionsFromInputs, getCustomsAlerts, getFxRate, getSKUs } from "@/lib/api";
import { SKU, RouterDecision, CustomsAlert, ProfitResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Package, AlertTriangle, TrendingDown, BellRing, ArrowRight, Activity } from 'lucide-react';
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [decisions, setDecisions] = useState<RouterDecision[]>([]);
  const [alerts, setAlerts] = useState<CustomsAlert[]>([]);
  const [profits, setProfits] = useState<ProfitResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [_skus, _alerts, _rate] = await Promise.all([getSKUs(), getCustomsAlerts(), getFxRate()]);
        const derivedProfits = deriveProfitsFromInputs(_skus, _alerts, _rate);
        const derivedDecisions = deriveRouterDecisionsFromInputs(_skus, _alerts, _rate);

        setSkus(_skus);
        setDecisions(derivedDecisions.filter(d => d.priority === "URGENT"));
        setAlerts(_alerts.filter(a => a.is_active));
        setProfits(derivedProfits.filter((profit) => profit.alert));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRunAnalysis = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      window.location.reload();
    }, 2000);
  };

  const urgentDecision = decisions[0];
  const activeAlertsCount = alerts.length;
  const profitRiskCount = profits.length;

  if (loading) return <div className="space-y-6"><Skeleton className="h-24 w-full bg-slate-800/50 rounded-2xl"/><Skeleton className="h-64 w-full bg-slate-800/50 rounded-2xl"/></div>;

  return (
    <div className="space-y-8 text-slate-50 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Activity className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              System Dashboard
            </h1>
          </div>
          <p className="text-slate-400 text-lg">Cross-Border Trade Intelligence Overview</p>
        </div>
        <Button onClick={handleRunAnalysis} disabled={running} className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all font-bold px-6">
          <ShieldAlert className="w-4 h-4 mr-2" />
          {running ? "Scanning Network..." : "Run Full Analysis"}
        </Button>
      </div>

      {urgentDecision && (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl blur opacity-30 animate-pulse group-hover:opacity-50 transition duration-1000"></div>
          <Alert className="relative border border-red-500/30 bg-red-950/80 backdrop-blur-md text-red-50 shadow-2xl rounded-xl">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <AlertTitle className="font-extrabold text-red-400 text-lg uppercase tracking-widest ml-2 flex items-center gap-2">
              Critical Action Required
            </AlertTitle>
            <AlertDescription className="ml-2 mt-3 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="font-bold text-white text-base">{urgentDecision.action}</span>
                <p className="text-red-200/80">{urgentDecision.rationale}</p>
              </div>
              <Link href="/router" className="shrink-0">
                <Button className="bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_15px_rgba(220,38,38,0.4)] whitespace-nowrap">
                  Review in Smart Router <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Total Active SKUs</CardTitle>
            <Package className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-white">{skus.length}</div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Synchronized from catalogue</p>
          </CardContent>
        </Card>
        
        <Card className={`bg-slate-900/60 backdrop-blur-xl border relative overflow-hidden group transition-colors ${activeAlertsCount > 0 ? 'border-red-500/30 hover:border-red-500/50 bg-red-950/20' : 'border-white/5 hover:border-emerald-500/30'}`}>
          <div className={`absolute top-0 left-0 w-1 h-full ${activeAlertsCount > 0 ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]'}`}></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Policy Alerts</CardTitle>
            <BellRing className={`h-5 w-5 ${activeAlertsCount > 0 ? 'text-red-400 animate-bounce' : 'text-emerald-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-extrabold ${activeAlertsCount > 0 ? 'text-red-400' : 'text-white'}`}>{activeAlertsCount}</div>
            <p className={`text-xs mt-2 font-medium ${activeAlertsCount > 0 ? 'text-red-400/80' : 'text-emerald-500/80'}`}>
              {activeAlertsCount > 0 ? 'Awaiting acknowledgement' : 'No active threats'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/5 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Profit Warnings</CardTitle>
            <TrendingDown className="h-5 w-5 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-extrabold ${profitRiskCount > 0 ? 'text-orange-400' : 'text-white'}`}>{profitRiskCount}</div>
            <p className="text-xs text-slate-500 mt-2 font-medium">SKUs with negative margin</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-slate-900/40 backdrop-blur-xl border border-white/5">
          <CardHeader>
            <CardTitle className="text-xl font-bold">System Status</CardTitle>
            <CardDescription className="text-slate-400">Live intelligence modules overview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
               <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div> <span className="font-semibold">Policy Sentinel</span></div>
               <div className="text-xs font-mono text-slate-400">Listening to RSS</div>
             </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
               <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div> <span className="font-semibold">Compliance Scanner</span></div>
               <div className="text-xs font-mono text-slate-400">Idle</div>
             </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
               <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div> <span className="font-semibold">Profit Shield</span></div>
               <div className="text-xs font-mono text-slate-400">Last calc 10m ago</div>
             </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
               <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div> <span className="font-semibold text-blue-100">Smart Router</span></div>
               <div className="text-xs font-bold uppercase tracking-wide text-blue-400">Review Pending</div>
             </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-slate-900/40 backdrop-blur-xl border border-white/5">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col">
            <Link href="/compliance" className="w-full">
              <Button className="w-full justify-start h-14 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 transition-all">
                <ShieldAlert className="mr-3 h-5 w-5 text-blue-400"/> Scan Catalogue Compliance
              </Button>
            </Link>
            <Link href="/profit" className="w-full">
              <Button className="w-full justify-start h-14 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 transition-all">
                <TrendingDown className="mr-3 h-5 w-5 text-orange-400"/> Recalculate Margins
              </Button>
            </Link>
            <Link href="/alerts" className="w-full">
              <Button className="w-full justify-start h-14 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 transition-all">
                <BellRing className="mr-3 h-5 w-5 text-emerald-400"/> View Customs Intel
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
