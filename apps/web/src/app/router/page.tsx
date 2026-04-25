"use client";

import { useState, useEffect } from "react";
import { getRouterDecisions } from "@/lib/api";
import { RouterDecision } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Anchor, ArrowRight, AlertTriangle, ShieldCheck, Route, Zap, RefreshCw, History, MapPin, CheckCircle2 } from 'lucide-react';

export default function RouterPage() {
  const [decisions, setDecisions] = useState<RouterDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getRouterDecisions();
        setDecisions(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const latestDecision = decisions[0];
  const historyDecisions = decisions.slice(1);
  const affectedSkus = latestDecision?.affected_skus ?? [];

  const handleAccept = () => {
    setExecuting(true);
    setTimeout(() => {
      setExecuting(false);
      setAccepted(true);
    }, 1000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Anchor className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Smart Router
            </h1>
          </div>
          <p className="text-slate-400 text-lg">AI-driven cross-border fulfillment optimization.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">AI Engine Status</span>
            <span className="text-sm font-mono text-emerald-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Analyzing Live Data</span>
          </div>
          <Button disabled={loading || executing} className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-white transition-all font-semibold px-6">
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-evaluate Network
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full bg-slate-800/50 rounded-2xl" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full bg-slate-800/50 rounded-2xl" />
            <Skeleton className="h-64 w-full bg-slate-800/50 rounded-2xl" />
          </div>
        </div>
      ) : !latestDecision ? (
        <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/5 py-12 text-center">
          <CardContent className="flex flex-col items-center">
            <ShieldCheck className="h-16 w-16 text-emerald-500/50 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Network Operating Optimally</h2>
            <p className="text-slate-400">All SKUs are currently routing via their default optimal paths. No overrides necessary.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Main Action Card */}
          <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"></div>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive" className="bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Override Recommended
                    </Badge>
                    <Badge variant="outline" className="border-white/10 text-slate-400 bg-black/20">
                      {latestDecision.priority} Priority
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono">
                      AI Confidence: 98.5%
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">{latestDecision.action}</CardTitle>
                  <CardDescription className="text-slate-400 text-base">{latestDecision.rationale}</CardDescription>
                </div>
                <Button 
                  onClick={handleAccept} 
                  disabled={accepted || executing} 
                  className={`shrink-0 transition-all font-bold px-6 py-6 ${accepted ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600/20 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'}`}
                >
                  {executing ? (
                    <><RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Synchronizing...</>
                  ) : accepted ? (
                    <><ShieldCheck className="h-5 w-5 mr-2" /> Route Active</>
                  ) : (
                    <>Execute Route Switch <ArrowRight className="h-5 w-5 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-[1fr_2fr] gap-4">
                <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Trigger Event</div>
                  <div className="text-sm text-slate-300 flex items-center gap-2">
                     <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                     {latestDecision.trigger_summary || "Customs intelligence flagged severe inspection rate spikes."}
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Affected Targeted SKUs</div>
                  <div className="flex flex-wrap gap-2">
                    {affectedSkus.length > 0 ? (
                      affectedSkus.map(sku => (
                        <span key={sku} className="px-2 py-1 bg-slate-800 border border-white/10 text-slate-300 font-mono text-xs rounded-md">
                          {sku}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 italic">Global routing update</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Sub-Optimal (Current) */}
            <Card className="bg-red-950/10 backdrop-blur-xl border border-red-500/20 relative overflow-hidden group">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10">Current Default</Badge>
                </div>
                <CardTitle className="text-xl font-bold text-red-100 flex items-center gap-2">
                  <Route className="h-5 w-5 text-red-400" /> Direct Shipping
                </CardTitle>
                <CardDescription className="text-red-200/60">Facing severe customs delay risks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-950/40 border border-red-500/10">
                  <span className="text-sm text-red-300/80">Projected SLA</span>
                  <span className="font-bold text-red-400">14-21 Days</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-950/40 border border-red-500/10">
                  <span className="text-sm text-red-300/80">Clearance Node</span>
                  <span className="font-bold text-red-400 flex items-center gap-1"><MapPin className="h-3 w-3"/> CGK Airport (Red Channel)</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-950/40 border border-red-500/10">
                  <span className="text-sm text-red-300/80">Delay Risk Factor</span>
                  <span className="font-bold text-red-500">Critical (95% Prob.)</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-950/40 border border-red-500/10">
                  <span className="text-sm text-red-300/80">Margin Impact</span>
                  <span className="font-bold text-red-500">Severe Loss</span>
                </div>
              </CardContent>
            </Card>

            {/* Optimal (Recommended) */}
            <Card className={`backdrop-blur-xl border relative overflow-hidden transition-all duration-500 ${accepted ? 'bg-emerald-950/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-blue-950/10 border-blue-500/30 hover:border-blue-500/50'}`}>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={`border font-bold tracking-wide ${accepted ? 'bg-emerald-500/30 border-emerald-500/50 text-emerald-100' : 'bg-blue-500/30 border-blue-500/50 text-blue-100'}`}>
                    {accepted ? 'Active Route' : 'AI Optimal'}
                  </Badge>
                </div>
                <CardTitle className={`text-xl font-bold flex items-center gap-2 ${accepted ? 'text-emerald-100' : 'text-blue-100'}`}>
                  <Zap className={`h-5 w-5 ${accepted ? 'text-emerald-400' : 'text-blue-400'}`} /> {latestDecision.action}
                </CardTitle>
                <CardDescription className={accepted ? 'text-emerald-200/60' : 'text-blue-200/60'}>Bypasses current inspection bottleneck safely.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`flex justify-between items-center p-3 rounded-lg border ${accepted ? 'bg-emerald-950/40 border-emerald-500/20' : 'bg-blue-950/40 border-blue-500/20'}`}>
                  <span className={`text-sm ${accepted ? 'text-emerald-300/80' : 'text-blue-300/80'}`}>Projected SLA</span>
                  <span className={`font-bold ${accepted ? 'text-emerald-400' : 'text-blue-400'}`}>1-3 Days</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-lg border ${accepted ? 'bg-emerald-950/40 border-emerald-500/20' : 'bg-blue-950/40 border-blue-500/20'}`}>
                  <span className={`text-sm ${accepted ? 'text-emerald-300/80' : 'text-blue-300/80'}`}>Clearance Node</span>
                  <span className={`font-bold flex items-center gap-1 ${accepted ? 'text-emerald-400' : 'text-blue-400'}`}><MapPin className="h-3 w-3"/> Local Dispatch (ID)</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-lg border ${accepted ? 'bg-emerald-950/40 border-emerald-500/20' : 'bg-blue-950/40 border-blue-500/20'}`}>
                  <span className={`text-sm ${accepted ? 'text-emerald-300/80' : 'text-blue-300/80'}`}>Delay Risk Factor</span>
                  <span className={`font-bold ${accepted ? 'text-emerald-400' : 'text-blue-400'}`}>Low (Stable)</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-lg border ${accepted ? 'bg-emerald-950/40 border-emerald-500/20' : 'bg-blue-950/40 border-blue-500/20'}`}>
                  <span className={`text-sm ${accepted ? 'text-emerald-300/80' : 'text-blue-300/80'}`}>Expected Outcome</span>
                  <span className={`font-bold text-right pl-4 ${accepted ? 'text-emerald-400' : 'text-blue-400'}`}>{latestDecision.expected_outcome || "Margin Preserved"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Decision History Log */}
          {historyDecisions.length > 0 && (
            <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5 mt-8">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-400" />
                  Routing Decision Log
                </CardTitle>
                <CardDescription className="text-slate-400">Past automated overrides enacted by the system.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-white/5 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-950/50">
                      <TableRow className="border-b border-white/5 hover:bg-transparent">
                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Date</TableHead>
                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Action Taken</TableHead>
                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Trigger Event</TableHead>
                        <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyDecisions.map((decision, i) => (
                        <TableRow key={i} className="border-b border-white/5 hover:bg-white/5">
                          <TableCell className="font-mono text-slate-300">{new Date(Date.now() - (i + 1) * 86400000 * 2).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium text-white">{decision.action}</TableCell>
                          <TableCell className="text-slate-400 max-w-[250px] truncate" title={decision.trigger_summary || decision.rationale}>
                            {decision.trigger_summary || decision.rationale}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
