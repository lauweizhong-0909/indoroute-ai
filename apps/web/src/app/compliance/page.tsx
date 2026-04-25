"use client";

import { useState, useEffect } from "react";
import { getSKUs, getCompliance, getComplianceAdvice } from "@/lib/api";
import { buildComplianceGuidance } from "@/lib/complianceGuidance";
import { SKU, ComplianceAdvice, ComplianceReport } from "@/types";
import { ShieldAlert, ShieldCheck, Search, PackageOpen, FileText, Link as LinkIcon, ShieldQuestion } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function CompliancePage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "action">("overview");
  const [aiAdvice, setAiAdvice] = useState<ComplianceAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const adviceSourceLabel =
    aiAdvice?.source === "ai"
      ? "AI engine"
      : aiAdvice?.source === "ai_assisted"
        ? "AI-assisted"
      : aiAdvice?.source === "rule_engine"
        ? "Rule engine"
        : "Best available";

  useEffect(() => {
    async function load() {
      const data = await getSKUs();
      setSkus(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    const mappedReports = await getCompliance();
    setReports(mappedReports);
    setScanning(false);
  };

  const getReportForSku = (skuId: string) => reports.find(r => r.sku_id === skuId);
  const guidance = buildComplianceGuidance(selectedSku, selectedReport);
  const evidence = selectedReport?.evidence ?? [];
  const officialSources = Array.from(
    new Map(
      evidence.map((item) => [
        item.source_url,
        {
          title: item.source_title,
          url: item.source_url,
          kind: item.source_kind,
        },
      ]),
    ).values(),
  );

  useEffect(() => {
    let active = true;

    async function loadAdvice() {
      if (!selectedSku || !selectedReport) {
        setAiAdvice(null);
        setAdviceLoading(false);
        return;
      }

      setAdviceLoading(true);
      const advice = await getComplianceAdvice(selectedSku.sku_id);
      if (active) {
        setAiAdvice(advice);
        setAdviceLoading(false);
      }
    }

    loadAdvice();

    return () => {
      active = false;
    };
  }, [selectedSku, selectedReport]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
              Compliance Radar
            </h1>
          </div>
          <p className="text-slate-400 text-lg">AI-powered SKU regulation & risk scanner.</p>
        </div>
        <Button onClick={handleScan} disabled={scanning || loading} className="bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all font-bold px-6">
          <Search className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? "AI Scanning..." : "Scan All SKUs"}
        </Button>
      </div>

      <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-slate-400" />
            SKU Inventory Analysis
          </CardTitle>
          <CardDescription className="text-slate-400">Click a row for issue, fix, and shipment status.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full bg-slate-800/50" />
              <Skeleton className="h-16 w-full bg-slate-800/50" />
              <Skeleton className="h-16 w-full bg-slate-800/50" />
            </div>
          ) : (
            <div className="rounded-md border border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">SKU ID</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Product Name</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Category</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">BPOM Certified</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Compliance Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skus.map((sku) => {
                    const report = getReportForSku(sku.sku_id);
                    const isScanned = !!report;
                    const isViolator = isScanned && !report.compliant;
                    
                    return (
                      <TableRow 
                        key={sku.sku_id} 
                        className={`cursor-pointer transition-colors border-b border-white/5 ${isViolator ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-white/5'}`}
                        onClick={() => {
                          setSelectedSku(sku);
                          if (report) setSelectedReport(report);
                          setAiAdvice(null);
                          setActiveTab("overview");
                        }}
                      >
                        <TableCell className="font-mono text-white">{sku.sku_id}</TableCell>
                        <TableCell className="font-medium text-slate-300">{sku.name}</TableCell>
                        <TableCell className="text-slate-400">{sku.category}</TableCell>
                        <TableCell>
                          {sku.bpom_certified ? (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]">Yes</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-white/10 bg-black/20">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isScanned ? (
                            <span className="text-slate-500 italic text-sm font-medium">Not Scanned</span>
                          ) : report.compliant ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"><ShieldCheck className="w-3 h-3 mr-1"/> Compliant</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]"><ShieldAlert className="w-3 h-3 mr-1"/> Violations Detected</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={!!selectedSku}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSku(null);
            setSelectedReport(null);
            setAiAdvice(null);
          }
        }}
      >
        <SheetContent className="!w-screen sm:!w-1/2 !max-w-none overflow-y-auto px-8 bg-[#0f172a]/95 backdrop-blur-2xl border-l border-white/10">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-white font-bold text-2xl">SKU Compliance Profile</SheetTitle>
            <SheetDescription className="text-slate-400 text-base">
              <span className="font-mono text-white">{selectedSku?.sku_id}</span> • {selectedSku?.name}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6 pb-6">
            <div className="bg-slate-950 p-5 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Original Listing Copy</h4>
              <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{selectedSku?.description}</p>
            </div>
            
            {selectedReport && (
              <div className={`p-6 rounded-xl border relative overflow-hidden ${selectedReport.compliant ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${selectedReport.compliant ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                  <h4 className={`text-lg font-bold flex items-center gap-2 ${selectedReport.compliant ? 'text-emerald-400' : 'text-red-400'}`}>
                    {selectedReport.compliant ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                    Compliance Assessment
                  </h4>
                  <div className="flex gap-2 flex-wrap bg-black/20 p-1 rounded-full border border-white/5">
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("overview")} className={`rounded-full px-4 h-8 text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Overview</Button>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("evidence")} className={`rounded-full px-4 h-8 text-xs font-bold transition-all ${activeTab === 'evidence' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Evidence & Basis</Button>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("action")} className={`rounded-full px-4 h-8 text-xs font-bold transition-all ${activeTab === 'action' ? 'bg-white/15 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Action Plan</Button>
                  </div>
                </div>
                
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-white/10 bg-black/20 text-slate-200">
                        Rule evidence
                      </Badge>
                      <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-200">
                        AI interpretation
                      </Badge>
                    </div>

                    {!selectedReport.compliant && (
                      <div className="bg-red-950/40 p-4 rounded-lg border border-red-500/20">
                        <h5 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Red Flags Found</h5>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-red-200">
                          {selectedReport.violations.map((v, i) => (
                            <li key={i}>{v}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400">Core Issue</h5>
                      <p className="text-sm leading-relaxed text-slate-200 font-medium bg-black/20 p-3 rounded-lg border border-white/5">
                        {guidance?.whyFlagged ?? selectedReport.why_flagged ?? selectedReport.recommendation}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400">Shipment Status</h5>
                        <Badge variant="outline" className={`text-sm font-bold px-3 py-1 ${selectedReport.compliant ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-red-500/20 border-red-500/50 text-red-300'}`}>
                          {guidance?.shipmentStatus ?? selectedReport.shipment_status ?? "Pending review"}
                        </Badge>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400">System Recommendation</h5>
                        <p className="text-sm font-bold text-slate-200">{guidance?.recommendation ?? selectedReport.recommendation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'evidence' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {evidence.length > 0 ? (
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400">Evidence</h5>
                        <div className="space-y-3">
                          {evidence.map((item) => (
                            <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-white">{item.title}</p>
                                <Badge variant="outline" className="border-white/10 bg-background/30 text-slate-300">
                                  {item.field === "bpom_certified" ? "SKU record" : item.field}
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.detail}</p>
                              {item.matched_text ? (
                                <p className="mt-2 text-xs font-mono text-orange-300">
                                  Matched text: {item.matched_text}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : <p className="text-slate-400 italic text-sm">No specific evidence recorded.</p>}

                    {officialSources.length > 0 ? (
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400">Official Basis</h5>
                        <div className="space-y-3">
                          {officialSources.map((source) => (
                            <div key={source.url} className="rounded-lg border border-blue-500/20 bg-blue-950/20 p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-300" />
                                    <p className="text-sm font-semibold text-blue-100">{source.title}</p>
                                  </div>
                                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-200">
                                    {source.kind === "official_regulation"
                                      ? "Official regulation"
                                      : source.kind === "official_service"
                                        ? "Official service guidance"
                                        : "Official enforcement example"}
                                  </Badge>
                                </div>
                                <Link href={source.url} target="_blank">
                                  <Button variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20">
                                    Open source <LinkIcon className="ml-2 h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {activeTab === 'action' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-lg border border-blue-500/20 bg-blue-950/20 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h5 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                          {aiAdvice?.source === "ai" || aiAdvice?.source === "ai_assisted" ? "AI Action Plan" : "Rule-Based Action Plan"}
                        </h5>
                        <Badge variant="outline" className={aiAdvice?.source === "ai" || aiAdvice?.source === "ai_assisted" ? "border-blue-500/30 bg-blue-500/10 text-blue-200" : "border-slate-500/30 bg-slate-500/10 text-slate-300"}>
                          {adviceSourceLabel}
                        </Badge>
                      </div>
                      {adviceLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-16 w-full bg-slate-800/50" />
                          <Skeleton className="h-24 w-full bg-slate-800/50" />
                        </div>
                      ) : aiAdvice ? (
                        <>
                          <p className="mb-4 text-sm text-slate-200 leading-relaxed">{aiAdvice.summary}</p>
                          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-blue-100">
                            {aiAdvice.action_plan.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-slate-300">
                          AI advice is unavailable right now. The rule guardrails below are still safe to follow.
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h5 className="text-xs font-bold uppercase tracking-widest text-slate-400">Rule Guardrails</h5>
                        <Badge variant="outline" className="border-white/10 bg-background/30 text-slate-300">
                          Must fix
                        </Badge>
                      </div>
                      <p className="mb-4 text-sm text-slate-400">
                        These deterministic steps come from BPOM status and matched restricted claims, so they remain the safety baseline even when AI suggestions vary.
                      </p>
                      {guidance?.fixSteps && guidance.fixSteps.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-slate-300">
                          {guidance.fixSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm font-medium text-emerald-400">✓ No changes needed. This SKU is ready for shipment.</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-blue-500/20 bg-blue-950/20 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h5 className="text-xs font-bold uppercase tracking-widest text-slate-300">Suggested Listing Copy</h5>
                        <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-200">
                          Optional
                        </Badge>
                      </div>
                      <p className="mb-4 text-sm text-slate-300/80">
                        These rewrite examples help you edit the listing faster. They are not the compliance decision itself.
                      </p>
                      {aiAdvice?.rewrite_examples && aiAdvice.rewrite_examples.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-blue-300 font-mono bg-blue-950/20 p-3 rounded-lg border border-blue-500/20">
                          {aiAdvice.rewrite_examples.map((example, i) => (
                            <li key={i}>{example}</li>
                          ))}
                        </ul>
                      ) : guidance?.replacementExamples && guidance.replacementExamples.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-blue-300 font-mono bg-blue-950/20 p-3 rounded-lg border border-blue-500/20">
                          {guidance.replacementExamples.map((example, i) => (
                            <li key={i}>{example}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-300">
                          No direct rewrite examples are available for the matched wording yet, but the rule-based action plan above is still the required fix.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!selectedReport && (
              <div className="p-5 rounded-xl border border-white/5 bg-slate-900/50 flex items-start gap-4">
                <ShieldQuestion className="w-6 h-6 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  This SKU has not been analyzed yet. Run a full scan on the main screen to assess compliance using the AI engine.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
