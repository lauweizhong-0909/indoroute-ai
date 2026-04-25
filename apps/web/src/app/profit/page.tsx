"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { deriveProfitsFromInputs, deriveRouterDecisionsFromInputs, getCustomsAlerts, getFxRate, getSKUs } from "@/lib/api";
import { SKU, ProfitResult, RouterDecision, CustomsAlert } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, Calculator, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export default function ProfitPage() {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [profits, setProfits] = useState<ProfitResult[]>([]);
  const [alerts, setAlerts] = useState<CustomsAlert[]>([]);
  const [routerDecision, setRouterDecision] = useState<RouterDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [rate, setRate] = useState(3350.0);
  
  const [selectedProfit, setSelectedProfit] = useState<ProfitResult | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [_skus, _alerts, _rate] = await Promise.all([getSKUs(), getCustomsAlerts(), getFxRate()]);
        const derivedProfits = deriveProfitsFromInputs(_skus, _alerts, _rate);
        const derivedRouterDecisions = deriveRouterDecisionsFromInputs(_skus, _alerts, _rate);

        setSkus(_skus);
        setAlerts(_alerts);
        setProfits(derivedProfits);
        setRouterDecision(derivedRouterDecisions[0] ?? null);
        setRate(_rate);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const [_skus, _alerts, _rate] = await Promise.all([getSKUs(), getCustomsAlerts(), getFxRate()]);
      setSkus(_skus);
      setAlerts(_alerts);
      setRate(_rate);
      setProfits(deriveProfitsFromInputs(_skus, _alerts, _rate));
      setRouterDecision(deriveRouterDecisionsFromInputs(_skus, _alerts, _rate)[0] ?? null);
    } finally {
      setRecalculating(false);
    }
  };

  const formatIDR = (idr: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(idr);
  const formatMYR = (myr: number) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(myr);
  const lossProfits = profits
    .filter((profit) => profit.net_profit_myr < 0)
    .sort((a, b) => a.net_profit_myr - b.net_profit_myr);
  const lowMarginProfits = profits
    .filter((profit) => profit.net_profit_myr >= 0 && profit.margin_pct < 0.08)
    .sort((a, b) => a.margin_pct - b.margin_pct);
  const worstLossProfit = lossProfits[0] ?? null;
  const topLowMarginProfit = lowMarginProfits[0] ?? null;
  const selectedSkuRecord = selectedProfit ? skus.find((sku) => sku.sku_id === selectedProfit.sku_id) ?? null : null;
  const selectedRevenueMyr = selectedSkuRecord ? selectedSkuRecord.price_idr / rate : 0;
  const hasDelayRisk = alerts.some((alert) => alert.is_active && /inspection|delay|lampu merah/i.test(`${alert.title} ${alert.body}`));
  const selectedDutyCost = selectedSkuRecord ? Number((selectedRevenueMyr * 0.1).toFixed(2)) : 0;
  const selectedShippingCost = selectedSkuRecord
    ? Number(((hasDelayRisk ? 6.5 : 4) + selectedSkuRecord.weight_g * 0.08).toFixed(2))
    : 0;
  const selectedTotalCost = selectedSkuRecord ? Number((selectedSkuRecord.cost_myr + selectedDutyCost + selectedShippingCost).toFixed(2)) : 0;
  const isLossMaking = (selectedProfit?.net_profit_myr ?? 0) < 0;
  const isLowMarginWarning = !!selectedProfit && !isLossMaking && selectedProfit.alert;
  const selectedStatusTone = isLossMaking
    ? 'loss'
    : isLowMarginWarning
      ? 'warning'
      : 'healthy';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit Shield</h1>
          <p className="text-muted-foreground mt-1">See which SKUs are making money and which are not.</p>
        </div>
        <Card className="bg-slate-900 text-white border-0 shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-400">Live Rate (IDR/MYR)</p>
              <p className="font-mono text-xl">{rate.toFixed(2)}</p>
            </div>
            <Button onClick={handleRecalculate} disabled={recalculating} size="icon" variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
              <RefreshCw className={`h-5 w-5 ${recalculating ? 'animate-spin' : ''}`} />
            </Button>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : worstLossProfit ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600 font-semibold uppercase tracking-wide text-sm">
                <AlertTriangle className="h-4 w-4" /> Immediate margin risk
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {worstLossProfit.sku_id} is currently losing {formatMYR(Math.abs(worstLossProfit.net_profit_myr))} per unit
              </h2>
              <p className="text-muted-foreground max-w-3xl">
                Current direct-shipping costs are wiping out margin. Review the recommended routing response before dispatching the next batch.
              </p>
              {routerDecision ? (
                <p className="text-sm text-slate-600">
                  Next best step: <span className="font-semibold text-foreground">{routerDecision.action}</span>
                </p>
              ) : null}
            </div>
            <Link href="/router">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Review fix in Smart Router <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : topLowMarginProfit ? (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-600 font-semibold uppercase tracking-wide text-sm">
                <AlertTriangle className="h-4 w-4" /> Low margin warning
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {topLowMarginProfit.sku_id} is still profitable, but margin is only {(topLowMarginProfit.margin_pct * 100).toFixed(1)}%
              </h2>
              <p className="text-muted-foreground max-w-3xl">
                Margin is thin enough that duty, shipping, or routing changes could push this SKU into the red.
              </p>
              {routerDecision ? (
                <p className="text-sm text-slate-600">
                  Next best step: <span className="font-semibold text-foreground">{routerDecision.action}</span>
                </p>
              ) : null}
            </div>
            <Link href="/router">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Review fix in Smart Router <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5"/> Margin Analysis</CardTitle>
          <CardDescription>Click a row for result, cause, and next action.</CardDescription>
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
                  <TableHead>Selling Price (IDR)</TableHead>
                  <TableHead>Base Cost (MYR)</TableHead>
                  <TableHead>Net Profit (MYR)</TableHead>
                  <TableHead>Margin %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => {
                  const profit = profits.find(p => p.sku_id === sku.sku_id);
                  const rowTone = !profit
                    ? 'unknown'
                    : profit.net_profit_myr < 0
                      ? 'loss'
                      : profit.margin_pct < 0.08
                        ? 'warning'
                        : 'healthy';
                  const marginColor = !profit ? 'text-slate-500' :
                    rowTone === 'loss' ? 'text-red-600 font-bold' :
                    rowTone === 'warning' ? 'text-yellow-600 font-bold' :
                    'text-green-600 font-bold';
                  const rowClass = rowTone === 'loss'
                    ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20'
                    : rowTone === 'warning'
                      ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20'
                      : '';
                  
                  return (
                    <TableRow 
                      key={sku.sku_id} 
                      className={`cursor-pointer ${rowClass}`}
                      onClick={() => profit && setSelectedProfit(profit)}
                    >
                      <TableCell className="font-mono">{sku.sku_id}</TableCell>
                      <TableCell>{formatIDR(sku.price_idr)}</TableCell>
                      <TableCell>{formatMYR(sku.cost_myr)}</TableCell>
                      <TableCell>
                        {profit ? (
                          <span className={profit.net_profit_myr < 0 ? 'text-red-600' : ''}>
                            {formatMYR(profit.net_profit_myr)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className={marginColor}>
                        {profit ? `${(profit.margin_pct * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell>
                        {rowTone === 'loss' ? (
                          <Badge variant="destructive" className="animate-pulse shadow-sm shadow-red-500/50"><AlertTriangle className="w-3 h-3 mr-1"/> Margin Alert</Badge>
                        ) : rowTone === 'warning' ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">Low Margin</Badge>
                        ) : profit ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Healthy</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400">N/A</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedProfit} onOpenChange={(open) => !open && setSelectedProfit(null)}>
        <SheetContent className="overflow-y-auto px-8">
          <SheetHeader className="mb-6">
            <SheetTitle>Profit Review</SheetTitle>
            <SheetDescription>
              {selectedProfit?.sku_id} result
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6">
            <div className={`rounded-lg border p-5 ${
              selectedStatusTone === 'loss'
                ? 'bg-red-500/10 border-red-500/20'
                : selectedStatusTone === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/20'
                  : 'bg-blue-500/10 border-blue-500/20'
            }`}>
              <div className="flex items-start gap-3">
                <Info className={`w-5 h-5 mt-0.5 shrink-0 ${
                  selectedStatusTone === 'loss'
                    ? 'text-red-500'
                    : selectedStatusTone === 'warning'
                      ? 'text-yellow-600'
                      : 'text-blue-400'
                }`} />
                <div className="space-y-2">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${
                    selectedStatusTone === 'loss'
                      ? 'text-red-500'
                      : selectedStatusTone === 'warning'
                        ? 'text-yellow-700'
                        : 'text-blue-300'
                  }`}>Result</p>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {selectedProfit
                      ? isLossMaking
                        ? `${selectedProfit.sku_id} is losing ${formatMYR(Math.abs(selectedProfit.net_profit_myr))} per unit`
                        : isLowMarginWarning
                          ? `${selectedProfit.sku_id} is still profitable, but margin is only ${(selectedProfit.margin_pct * 100).toFixed(1)}%`
                          : `${selectedProfit.sku_id} is currently profitable`
                      : "No SKU selected"}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-foreground/90">{selectedProfit?.explanation}</p>
                </div>
              </div>
            </div>

            {selectedProfit?.alert && routerDecision ? (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Next action</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-blue-900 leading-relaxed space-y-1">
                  <li>{routerDecision.action}</li>
                  <li>{routerDecision.trigger_summary}</li>
                </ul>
                <Link href="/router">
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                    Open Smart Router <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</p>
                <p className="mt-2 text-lg font-semibold">{selectedSkuRecord ? formatIDR(selectedSkuRecord.price_idr) : "-"}</p>
                <p className="text-sm text-muted-foreground">{formatMYR(selectedRevenueMyr)} after FX.</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Costs</p>
                <p className="mt-2 text-lg font-semibold">{selectedSkuRecord ? formatMYR(selectedTotalCost) : "-"}</p>
                <p className="text-sm text-muted-foreground">Product, duty, shipping.</p>
              </div>
              <div className={`rounded-lg border p-4 ${
                selectedStatusTone === 'loss'
                  ? 'border-red-500/20 bg-red-500/10'
                  : selectedStatusTone === 'warning'
                    ? 'border-yellow-500/30 bg-yellow-500/10'
                    : 'border-green-500/20 bg-green-500/10'
              }`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  selectedStatusTone === 'loss'
                    ? 'text-red-500'
                    : selectedStatusTone === 'warning'
                      ? 'text-yellow-700'
                      : 'text-green-600'
                }`}>Net result</p>
                <p className="mt-2 text-lg font-semibold">{selectedProfit ? formatMYR(selectedProfit.net_profit_myr) : "-"}</p>
                <p className="text-sm text-muted-foreground">
                  Margin {selectedProfit ? `${(selectedProfit.margin_pct * 100).toFixed(1)}%` : "-"}
                </p>
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-lg border border-border">
              <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3">Calculation</h4>
              <div className="font-mono text-sm space-y-2 text-slate-700">
                <div className="flex justify-between"><span>Revenue (MYR):</span> <span>{selectedSkuRecord ? selectedRevenueMyr.toFixed(2) : "-"}</span></div>
                <div className="flex justify-between text-red-600"><span>- Product Cost:</span> <span>{selectedSkuRecord ? selectedSkuRecord.cost_myr.toFixed(2) : "-"}</span></div>
                <div className="flex justify-between text-red-600"><span>- Import Duty / VAT:</span> <span>{selectedDutyCost.toFixed(2)}</span></div>
                <div className="flex justify-between text-red-600 border-b border-slate-300 shadow-sm pb-2"><span>- Shipping / Fulfillment:</span> <span>{selectedShippingCost.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold pt-1"><span>Net Profit:</span> <span>{selectedProfit?.net_profit_myr.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
