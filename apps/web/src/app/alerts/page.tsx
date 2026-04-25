"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCustomsAlerts, refreshCustomsAlerts } from "@/lib/api";
import { CustomsAlert } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioTower, AlertTriangle, ShieldAlert, ArrowRight, Activity } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<CustomsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getCustomsAlerts();
      setAlerts(data);
      setExpandedAlertId(data[0]?.id ?? null);
      setLoading(false);
    }
    load();
  }, []);

  const handleSimulate = async () => {
    setIngesting(true);
    setRefreshMessage(null);
    try {
      const result = await refreshCustomsAlerts();
      const data = await getCustomsAlerts();
      setAlerts(data);
      setExpandedAlertId((current) => current ?? data[0]?.id ?? null);
      setRefreshMessage(
        `Imported ${result.imported_count} alert${result.imported_count === 1 ? "" : "s"} from ${result.source}. Skipped ${result.skipped_count} duplicate${result.skipped_count === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setRefreshMessage(error instanceof Error ? error.message : "Alert refresh failed.");
    } finally {
      setIngesting(false);
    }
  };

  const getPrimaryAction = (alert: CustomsAlert) => {
    if ((alert.triggered_modules ?? []).includes("Smart Router")) {
      return { href: "/router", label: "Open Smart Router" };
    }
    if ((alert.triggered_modules ?? []).includes("Profit Shield")) {
      return { href: "/profit", label: "Recalculate Profit Shield" };
    }
    if ((alert.triggered_modules ?? []).includes("Compliance Radar")) {
      return { href: "/compliance", label: "Review Compliance Radar" };
    }
    return { href: "/dashboard", label: "Open Dashboard" };
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <RadioTower className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Risk Center
            </h1>
          </div>
          <p className="text-slate-400 text-lg">Live customs intelligence and threat response.</p>
        </div>
        <Button onClick={handleSimulate} disabled={ingesting || loading} className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-white transition-all font-semibold px-6">
          <RadioTower className={`h-4 w-4 mr-2 text-blue-400 ${ingesting ? 'animate-pulse' : ''}`} />
          {ingesting ? "Refreshing..." : "Refresh Live Alerts"}
        </Button>
      </div>

      {refreshMessage ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200 font-medium flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Activity className="h-5 w-5 text-emerald-400" />
          {refreshMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full bg-slate-800/50 rounded-xl" />
            <Skeleton className="h-32 w-full bg-slate-800/50 rounded-xl" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-16 text-center">
            <ShieldAlert className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl font-bold text-white">No live customs alerts</p>
            <p className="mt-2 text-slate-400">The backend did not return any current Beacukai announcements.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <Card key={alert.id} className={`bg-slate-900/60 backdrop-blur-xl transition-all duration-300 overflow-hidden ${alert.is_active ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] bg-gradient-to-b from-red-950/20 to-transparent' : 'border-white/5 hover:border-white/10'}`}>
              <CardHeader className="pb-3 px-6 pt-6">
                <button
                  type="button"
                  onClick={() => setExpandedAlertId((current) => current === alert.id ? null : alert.id)}
                  className="w-full text-left focus:outline-none"
                >
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                  <div className="space-y-2">
                    <CardTitle className={`text-xl md:text-2xl font-bold flex items-center gap-3 ${alert.is_active ? 'text-red-400' : 'text-slate-200'}`}>
                      {alert.is_active && <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />}
                      {alert.title}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <span>{new Date(alert.date).toLocaleDateString()}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                      <span>Source: {(alert.source ?? "manual").toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 mt-2 leading-relaxed max-w-4xl">
                      {alert.impact_summary ?? alert.body}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {alert.severity ? (
                      <Badge variant="outline" className="border-white/10 bg-black/40 text-slate-300 px-3 py-1 font-bold tracking-wider">{alert.severity}</Badge>
                    ) : null}
                    {alert.is_active ? (
                      <Badge variant="destructive" className="bg-red-500 border border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] px-3 py-1 font-bold tracking-wider animate-pulse">Active Threat</Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-700 text-slate-500 bg-transparent">Archived</Badge>
                    )}
                  </div>
                </div>
                </button>
              </CardHeader>
              
              {/* Expandable Content */}
              <div className={`transition-all duration-300 ease-in-out ${expandedAlertId === alert.id ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <CardContent className="px-6 pb-6 pt-2">
                  <div className="h-px w-full bg-white/5 mb-6"></div>
                  
                  <div className="bg-black/30 rounded-lg p-5 border border-white/5 text-slate-300 leading-relaxed text-sm font-medium">
                    {alert.body}
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Impact Analysis</div>
                      <p className="text-sm leading-relaxed text-slate-200">
                        {alert.impact_summary ?? "Impact analysis is being generated from the latest customs update."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/5 p-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Target Scope</div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(alert.affected_targets ?? []).map((target) => (
                          <span key={target} className="px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 uppercase tracking-wider">
                            {target}
                          </span>
                        ))}
                        {!(alert.affected_targets && alert.affected_targets.length) ? (
                          <span className="text-sm text-slate-500 italic">Targets pending analysis</span>
                        ) : null}
                      </div>
                      
                      {alert.affected_skus && alert.affected_skus.length > 0 ? (
                        <div>
                          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Affected SKUs</div>
                          <div className="flex flex-wrap gap-2">
                            {alert.affected_skus.map((skuId) => (
                              <span key={skuId} className="px-2.5 py-1 rounded-md bg-black/50 border border-white/10 text-slate-300 font-mono text-xs">
                                {skuId}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  {alert.is_active && (
                    <div className="mt-6 pt-6 border-t border-red-500/20 space-y-6">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4" /> Triggered Modules
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {(alert.triggered_modules ?? ["Policy Sentinel"]).map((module) => (
                            <div key={module} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 font-bold text-sm">
                              {module === "Policy Sentinel" ? <ShieldAlert className="h-4 w-4" /> : <RadioTower className="h-4 w-4" />}
                              {module}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-500/30 bg-blue-950/40 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black tracking-widest px-4 py-1 uppercase rounded-bl-xl shadow-lg">Action Required</div>
                        <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Next Step Recommendation</div>
                        <p className="text-sm leading-relaxed text-blue-100 mb-5 font-medium">
                          {alert.next_action ?? "Open the affected module to review the latest response."}
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <Link href={getPrimaryAction(alert).href}>
                            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                              {getPrimaryAction(alert).label} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                          {alert.source_url ? (
                            <Link href={alert.source_url} target="_blank">
                              <Button variant="outline" className="border-white/10 hover:bg-white/5 text-slate-300">Open Source</Button>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
