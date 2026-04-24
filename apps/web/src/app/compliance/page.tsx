"use client";

import { useState, useEffect } from "react";
import { getSKUs, getCompliance } from "@/lib/api";
import { buildComplianceGuidance } from "@/lib/complianceGuidance";
import { SKU, ComplianceReport } from "@/types";
import { ShieldAlert, ShieldCheck, Search, Info } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Radar</h1>
          <p className="text-muted-foreground mt-1">Spot blocked SKUs and fix them fast.</p>
        </div>
        <Button onClick={handleScan} disabled={scanning || loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Search className="h-4 w-4" />
          {scanning ? "AI Scanning..." : "Scan All SKUs"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SKU Inventory Analysis</CardTitle>
          <CardDescription>Click a row for issue, fix, and shipment status.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU ID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>BPOM Certified</TableHead>
                  <TableHead>Compliance Status</TableHead>
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
                      className={`cursor-pointer transition-colors ${isViolator ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20' : ''}`}
                      onClick={() => {
                        setSelectedSku(sku);
                        if (report) setSelectedReport(report);
                      }}
                    >
                      <TableCell className="font-mono">{sku.sku_id}</TableCell>
                      <TableCell className="font-medium">{sku.name}</TableCell>
                      <TableCell>{sku.category}</TableCell>
                      <TableCell>
                        {sku.bpom_certified ? (
                          <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/10">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isScanned ? (
                          <span className="text-slate-400 italic text-sm">Not Scanned</span>
                        ) : report.compliant ? (
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/20 shadow-none"><ShieldCheck className="w-3 h-3 mr-1"/> Compliant</Badge>
                        ) : (
                          <Badge variant="destructive" className="animate-pulse shadow-sm shadow-red-500/50"><ShieldAlert className="w-3 h-3 mr-1"/> Violations Detected</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedSku} onOpenChange={(open) => !open && setSelectedSku(null)}>
        <SheetContent className="!w-screen sm:!w-1/2 !max-w-none overflow-y-auto px-8">
          <SheetHeader className="mb-6">
            <SheetTitle>SKU Details</SheetTitle>
            <SheetDescription>
              {selectedSku?.sku_id} • {selectedSku?.name}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6 pb-6">
            <div>
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Listing copy</h4>
              <p className="text-sm text-foreground bg-muted p-3 rounded-md border">{selectedSku?.description}</p>
            </div>
            
            {selectedReport && (
              <div className={`p-5 rounded-lg border ${selectedReport.compliant ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <h4 className={`text-sm font-semibold flex items-center gap-2 ${selectedReport.compliant ? 'text-green-800' : 'text-red-800'}`}>
                  {selectedReport.compliant ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  AI Assessment
                </h4>
                
                {!selectedReport.compliant && (
                  <div className="mt-4">
                    <h5 className="text-xs font-semibold text-red-800 uppercase tracking-wider mb-2">Flags Found</h5>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                      {selectedReport.violations.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-700">Problem</h5>
                  <p className="text-sm leading-relaxed">{guidance?.whyFlagged ?? selectedReport.why_flagged ?? selectedReport.recommendation}</p>
                </div>

                <div className="mt-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-700">Fix now</h5>
                  {guidance?.fixSteps && guidance.fixSteps.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                      {guidance.fixSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium">No changes needed. This SKU is ready for shipment.</p>
                  )}
                </div>

                {guidance?.replacementExamples && guidance.replacementExamples.length > 0 ? (
                  <div className="mt-4">
                    <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-700">Use instead</h5>
                    <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
                      {guidance.replacementExamples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-700">Shipment status</h5>
                  <Badge variant="outline" className="text-sm font-medium">{guidance?.shipmentStatus ?? selectedReport.shipment_status ?? "Pending review"}</Badge>
                </div>

                <div className="mt-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-700">Next step</h5>
                  <p className="text-sm font-medium">{guidance?.recommendation ?? selectedReport.recommendation}</p>
                </div>
              </div>
            )}
            
            {!selectedReport && (
              <div className="p-4 rounded-lg border border-border bg-muted flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <p className="text-sm text-slate-600">This SKU has not been analyzed yet. Run a full scan on the main screen to assess compliance.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
