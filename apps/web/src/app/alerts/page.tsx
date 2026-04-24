"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCustomsAlerts } from "@/lib/api";
import { CustomsAlert } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioTower, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<CustomsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getCustomsAlerts();
      setAlerts(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSimulate = async () => {
    setIngesting(true);
    // Simulate fetching new alert
    setTimeout(() => {
      setAlerts([{
        id: "ALT-SIM",
        title: "CRITICAL: Random Customs Strike",
        body: "A sudden strike has occurred. Expect heavy delays.",
        date: new Date().toISOString(),
        is_active: true,
        impact_summary: "Active customs disruption may delay every direct parcel lane today.",
        affected_targets: ["Direct shipping route", "All outbound parcels"],
        next_action: "Review Smart Router immediately and pause urgent direct shipments if needed.",
        triggered_modules: ["Policy Sentinel", "Smart Router"]
      }, ...alerts]);
      setIngesting(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Center</h1>
          <p className="text-muted-foreground mt-1">See what changed, what it affects, and what to do next.</p>
        </div>
        <Button onClick={handleSimulate} disabled={ingesting || loading} variant="outline" className="gap-2 border-slate-300 text-slate-700">
          <RadioTower className="h-4 w-4 text-blue-600" />
          {ingesting ? "Ingesting Beacukai RSS..." : "Simulate Live Alert (Dev)"}
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-lg font-medium">No live customs alerts</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The backend did not return any current Beacukai announcements yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          alerts.map(alert => (
            <Card key={alert.id} className={alert.is_active ? 'border-red-500/20 bg-red-500/10 shadow-sm' : ''}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className={`text-xl flex items-center gap-2 ${alert.is_active ? 'text-red-500' : 'text-foreground'}`}>
                      {alert.is_active && <AlertTriangle className="h-5 w-5 text-red-600" />}
                      {alert.title}
                    </CardTitle>
                    <CardDescription>
                      Broadcasted: {new Date(alert.date).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {alert.is_active ? (
                    <Badge variant="destructive" className="animate-pulse shadow-sm shadow-red-500/30">Active Threat</Badge>
                  ) : (
                    <Badge variant="secondary">Archived</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed text-sm">{alert.body}</p>

                <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Impact</div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">
                      {alert.impact_summary ?? "Impact analysis is being generated from the latest customs update."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Affected</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(alert.affected_targets ?? []).map((target) => (
                        <Badge key={target} variant="outline" className="bg-background text-foreground border-border">
                          {target}
                        </Badge>
                      ))}
                      {!(alert.affected_targets && alert.affected_targets.length) ? (
                        <span className="text-sm text-muted-foreground">Targets pending analysis</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                
                {alert.is_active && (
                  <div className="mt-4 pt-4 border-t border-red-100 space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase text-red-800 tracking-wider">Triggered modules</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(alert.triggered_modules ?? ["Policy Sentinel"]).map((module) => (
                          <Badge key={module} variant="outline" className="bg-background text-foreground gap-1 border-border">
                            {module === "Policy Sentinel" ? <ShieldAlert className="h-3 w-3" /> : <RadioTower className="h-3 w-3" />}
                            {module}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Next action</div>
                      <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-blue-900 space-y-1">
                        <li>{alert.next_action ?? "Open the affected module to review the latest response."}</li>
                      </ul>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href="/router">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            Review response <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
