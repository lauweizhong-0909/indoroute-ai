"use client";

import { useState, useEffect } from "react";
import { getSKUs, getCompliance } from "@/lib/api";
import { buildComplianceGuidance } from "@/lib/complianceGuidance";
import { SKU, ComplianceReport } from "@/types";
import { ShieldAlert, ShieldCheck, Search, Info, PackageOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompliancePage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  
  const [selectedSku, setSelectedSku] = useState<SKU | null>(null);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);

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

      <Sheet open={!!selectedSku} onOpenChange={(open) => !open && setSelectedSku(null)}>
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
                <h4 className={`text-lg font-bold flex items-center gap-2 mb-6 ${selectedReport.compliant ? 'text-emerald-400' : 'text-red-400'}`}>
                  {selectedReport.compliant ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                  AI Assessment Results
                </h4>
                
                {!selectedReport.compliant && (
                  <div className="mb-6 bg-red-950/40 p-4 rounded-lg border border-red-500/20">
                    <h5 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Red Flags Found</h5>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-red-200">
                      {selectedReport.violations.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400">Core Issue</h5>
                    <p className="text-sm leading-relaxed text-slate-200 font-medium bg-black/20 p-3 rounded-lg border border-white/5">
                      {guidance?.whyFlagged ?? selectedReport.why_flagged ?? selectedReport.recommendation}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400">Required Action</h5>
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

                  {guidance?.replacementExamples && guidance.replacementExamples.length > 0 ? (
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-widest mb-2 text-slate-400">AI Suggested Copy</h5>
                      <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-blue-300 font-mono bg-blue-950/20 p-3 rounded-lg border border-blue-500/20">
                        {guidance.replacementExamples.map((example, i) => (
                          <li key={i}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

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
              </div>
            )}
            
            {!selectedReport && (
              <div className="p-5 rounded-xl border border-white/5 bg-slate-900/50 flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-400 mt-0.5 shrink-0" />
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
