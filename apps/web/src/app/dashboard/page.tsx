"use client";

import { useState, useEffect } from "react";
import { getSKUs, getRouterDecisions, getCustomsAlerts, getProfits } from "@/lib/api";
import { SKU, RouterDecision, CustomsAlert, ProfitResult } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Package, AlertTriangle, TrendingDown, BellRing, ArrowRight } from 'lucide-react';
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
      const [_skus, _decisions, _alerts, _profits] = await Promise.all([
        getSKUs(), getRouterDecisions(), getCustomsAlerts(), getProfits()
      ]);
      setSkus(_skus);
      setDecisions(_decisions.filter(d => d.priority === "URGENT"));
      setAlerts(_alerts.filter(a => a.is_active));
      setProfits(_profits.filter((profit) => profit.alert));
      setLoading(false);
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

  if (loading) return <div className="space-y-6"><Skeleton className="h-24 w-full"/><Skeleton className="h-64 w-full"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
          <p className="text-muted-foreground mt-1">Cross-Border Trade Intelligence Overview</p>
        </div>
        <Button onClick={handleRunAnalysis} disabled={running} className="bg-blue-600 hover:bg-blue-700">
          <ShieldAlert className="w-4 h-4 mr-2" />
          {running ? "Scanning Network..." : "Run Full Analysis"}
        </Button>
      </div>

      {urgentDecision && (
        <Alert className="border-red-500 bg-red-500/10 text-red-500 shadow-sm animate-pulse relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-2 bg-red-500"></div>
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertTitle className="font-bold text-red-500 text-lg uppercase tracking-wider ml-2">Critical Action Required</AlertTitle>
          <AlertDescription className="ml-2 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-semibold">{urgentDecision.action}</span>
              <p className="mt-1 opacity-90">{urgentDecision.rationale}</p>
            </div>
            <Link href="/router">
              <Button variant="destructive" className="whitespace-nowrap shadow-md">Review in Smart Router <ArrowRight className="w-4 h-4 ml-2"/></Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active SKUs</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skus.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Synchronized from catalogue
            </p>
          </CardContent>
        </Card>
        
        <Card className={`border-l-4 shadow-sm ${activeAlertsCount > 0 ? 'border-l-red-500 bg-red-500/10' : 'border-l-green-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policy Alerts</CardTitle>
            <BellRing className={`h-4 w-4 ${activeAlertsCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlertsCount}</div>
            <p className="text-xs text-muted-foreground mt-1 text-red-600 font-medium">
              {activeAlertsCount > 0 ? 'Awaiting acknowledgement' : 'No active threats'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Risk Warnings</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitRiskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              SKUs flagged with negative margin
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              All intelligence modules are operational.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Policy Sentinel</div>
               <div className="text-sm text-slate-500">Listening to Beacukai RSS</div>
             </div>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Compliance Scanner</div>
               <div className="text-sm text-slate-500">Idle</div>
             </div>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Profit Shield</div>
               <div className="text-sm text-slate-500">Last calculated 10m ago</div>
             </div>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> Smart Router</div>
               <div className="text-sm text-blue-600 font-medium">Recommendation Pending Review</div>
             </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col">
            <Link href="/compliance"><Button variant="outline" className="w-full justify-start"><ShieldAlert className="mr-2 h-4 w-4"/> Scan Catalogue Compliance</Button></Link>
            <Link href="/profit"><Button variant="outline" className="w-full justify-start"><TrendingDown className="mr-2 h-4 w-4"/> Recalculate Margins</Button></Link>
            <Link href="/alerts"><Button variant="outline" className="w-full justify-start"><BellRing className="mr-2 h-4 w-4"/> View Customs Intel</Button></Link>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
