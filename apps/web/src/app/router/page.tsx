"use client";

import { useState, useEffect } from "react";
import { getRouterDecisions } from "@/lib/api";
import { RouterDecision } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Anchor, ArrowRight, CheckCircle2, Clock, MapPin, Truck, AlertTriangle, Link2, PackageSearch } from 'lucide-react';

export default function RouterPage() {
  const [decisions, setDecisions] = useState<RouterDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getRouterDecisions();
      setDecisions(data);
      setLoading(false);
    }
    load();
  }, []);

  const latestDecision = decisions[0];
  const history = decisions.slice(1);
  const affectedSkus = latestDecision?.affected_skus ?? [];
  const triggerSummary = latestDecision?.trigger_summary ?? "Triggered by the latest profit and customs risk analysis.";
  const expectedOutcome = latestDecision?.expected_outcome ?? "Reduce operational risk and preserve margin on the affected catalogue.";
  const comparisonGridClass = "grid items-stretch gap-4 lg:grid-cols-2";

  const handleAccept = () => {
    setAccepted(true);
    setTimeout(() => alert("Decision synchronized with logistics provider."), 500);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Smart Router</h1>
        <p className="text-muted-foreground mt-1">See why this route is recommended and what it changes.</p>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : latestDecision ? (
        <Card className={`border-2 ${latestDecision.priority === 'URGENT' ? 'border-orange-500 shadow-orange-100' : 'border-blue-500'}`}>
          <CardHeader className={`${latestDecision.priority === 'URGENT' ? 'bg-orange-500/10' : 'bg-blue-500/10'} border-b px-5 py-5 flex flex-row items-start justify-between gap-4`}>
            <div className="space-y-2 text-left">
              <CardDescription className="text-foreground font-semibold uppercase tracking-wider">Primary Recommendation</CardDescription>
              <CardTitle className="text-2xl text-foreground flex items-center gap-2">
                <Anchor className="h-6 w-6 text-blue-600" />
                {latestDecision.action}
              </CardTitle>
            </div>
            <Badge variant="destructive" className="mt-1 text-sm py-1 px-3 bg-orange-600 shadow-sm shrink-0">
              {latestDecision.priority} PRIORITY
            </Badge>
          </CardHeader>
          
          <CardContent className="px-5 pt-6 pb-1 space-y-6">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-5 text-left">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-200">
                <Link2 className="h-4 w-4" /> Trigger
              </div>
              <p className="mt-3 text-sm leading-relaxed text-blue-50/90">{triggerSummary}</p>
            </div>

            <div className="rounded-lg border bg-muted p-5 text-left text-foreground leading-relaxed font-medium">
              <span className="font-bold text-foreground">Why this route: </span> {latestDecision.rationale}
            </div>

            <div className={comparisonGridClass}>
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-5 min-h-32 flex flex-col justify-start text-left">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  <PackageSearch className="h-4 w-4" /> Affected SKUs
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {affectedSkus.map((skuId) => (
                    <Badge key={skuId} variant="outline" className="border-slate-600 bg-slate-950 text-slate-100 font-mono">
                      {skuId}
                    </Badge>
                  ))}
                  {affectedSkus.length === 0 ? (
                    <p className="text-sm text-slate-400">Affected SKU list is being prepared from the latest analysis.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 min-h-32 flex flex-col justify-start text-left">
                <div className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Outcome</div>
                <p className="mt-3 text-sm leading-relaxed text-emerald-50/90">{expectedOutcome}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Route comparison</h4>
              <div className={comparisonGridClass}>
                <div className="border border-slate-200 rounded-lg p-5 space-y-4 opacity-60 min-h-44 text-left">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Truck className="h-5 w-5" /> Sub-Optimal: Direct Shipping
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-red-500"/> SLA: 14-21 days (Customs Delay)</li>
                    <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-slate-400"/> Fulfillment: MYR 12.00 / unit</li>
                    <li className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4"/> High risk of parcel return</li>
                  </ul>
                </div>
                
                <div className="border border-blue-500/20 rounded-lg p-5 space-y-4 bg-blue-500/10 shadow-sm relative overflow-hidden min-h-44 text-left">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 uppercase rounded-bl-lg">Recommended</div>
                  <div className="flex items-center gap-2 text-blue-900 font-semibold">
                    <MapPin className="h-5 w-5" /> Optimal: Jakarta Warehouse
                  </div>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-green-600"/> SLA: 1-3 days Local</li>
                    <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-400"/> Fulfillment: MYR 14.50 / unit</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600"/> Bypasses Red Light inspection</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-5 text-left text-sm text-yellow-500">
              <span className="font-bold">Trade-off: </span>
              {latestDecision.trade_offs}
            </div>

          </CardContent>
          <CardFooter className="bg-muted border-t px-5 py-5 flex justify-end gap-3">
            <Button variant="outline" className="text-slate-600">Dismiss</Button>
            <Button 
              onClick={handleAccept} 
              disabled={accepted} 
              className={`bg-blue-600 hover:bg-blue-700 shadow-md transition-all ${accepted ? 'bg-green-600 hover:bg-green-600 opacity-100' : ''}`}
              size="lg"
            >
              {accepted ? "Switch Executed ✓" : "Execute Recommendation"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card><CardContent className="p-6 text-slate-500">No active decisions available.</CardContent></Card>
      )}

      {history.length > 0 && (
        <div className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Decision History</h3>
          <div className="space-y-3">
            {history.map(decision => (
              <div key={decision.id} className="p-4 bg-card border rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{decision.action}</div>
                  <div className="text-sm text-slate-500">{new Date(decision.created_at).toLocaleString()}</div>
                </div>
                <Badge variant="secondary">{decision.priority}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
