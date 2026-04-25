"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { deriveProfitsFromInputs, deriveRouterDecisionsFromInputs, getCustomsAlerts, getFxRate, getProfitAdvice, getSKUs } from "@/lib/api";
import { SKU, ProfitResult, RouterDecision, CustomsAlert, ProfitAdvice } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, Calculator, RefreshCw, ArrowRight, TrendingUp } from 'lucide-react';
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
  const [profitAdvice, setProfitAdvice] = useState<ProfitAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

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

  useEffect(() => {
    let active = true;

    async function loadAdvice() {
      if (!selectedProfit?.alert) {
        setProfitAdvice(null);
        setAdviceLoading(false);
        return;
      }

      setAdviceLoading(true);
      const advice = await getProfitAdvice(selectedProfit.sku_id);
      if (active) {
        setProfitAdvice(advice);
        setAdviceLoading(false);
      }
    }

    loadAdvice();

    return () => {
      active = false;
    };
  }, [selectedProfit]);

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
  const bestAdviceOption = profitAdvice?.options.find((option) => option.option_id === profitAdvice.best_option_id) ?? null;
  const alternativeAdviceOptions = profitAdvice?.options.filter((option) => option.option_id !== profitAdvice.best_option_id) ?? [];
  const adviceSourceIsAi = profitAdvice?.source === "ai";
  const adviceSourceLabel = adviceSourceIsAi
    ? "AI engine"
    : profitAdvice?.source === "rule_engine"
      ? "Rule engine"
      : "Best available";

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Profit Shield
            </h1>
          </div>
          <p className="text-slate-400 text-lg">Real-time margin analysis and protection.</p>
        </div>
        <Button onClick={handleRecalculate} disabled={recalculating} className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold transition-all">
          <RefreshCw className={`mr-2 h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full bg-slate-800/50 rounded-2xl" />
      ) : worstLossProfit ? (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25"></div>
          <Card className="relative border border-red-500/30 bg-[#0f172a]/80 backdrop-blur-xl">
            <CardContent className="p-6 md:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs bg-red-500/10 w-fit px-3 py-1 rounded-full border border-red-500/20">
                  <AlertTriangle className="h-3.5 w-3.5" /> Immediate margin risk
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  <span className="text-red-400">{worstLossProfit.sku_id}</span> is currently losing {formatMYR(Math.abs(worstLossProfit.net_profit_myr))} per unit
                </h2>
                <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
                  Current direct-shipping costs are wiping out margin. Review the recommended routing response before dispatching the next batch.
                </p>
                {routerDecision ? (
                  <div className="bg-white/5 inline-block px-4 py-2 rounded-lg border border-white/5">
                    <p className="text-sm text-slate-300">
                      AI Action: <span className="font-bold text-blue-400">{routerDecision.action}</span>
                    </p>
                  </div>
                ) : null}
              </div>
              <Link href="/router" className="shrink-0">
                <Button size="lg" className="bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] font-bold transition-all">
                  Review fix in Smart Router <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : topLowMarginProfit ? (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur opacity-20"></div>
          <Card className="relative border border-yellow-500/30 bg-[#0f172a]/80 backdrop-blur-xl">
            <CardContent className="p-6 md:p-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-500 font-bold uppercase tracking-widest text-xs bg-yellow-500/10 w-fit px-3 py-1 rounded-full border border-yellow-500/20">
                  <AlertTriangle className="h-3.5 w-3.5" /> Low margin warning
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  <span className="text-yellow-400">{topLowMarginProfit.sku_id}</span> margin is critically low at {(topLowMarginProfit.margin_pct * 100).toFixed(1)}%
                </h2>
                <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
                  Margin is thin enough that duty, shipping, or routing changes could push this SKU into the red.
                </p>
                {routerDecision ? (
                  <div className="bg-white/5 inline-block px-4 py-2 rounded-lg border border-white/5">
                    <p className="text-sm text-slate-300">
                      AI Action: <span className="font-bold text-blue-400">{routerDecision.action}</span>
                    </p>
                  </div>
                ) : null}
              </div>
              <Link href="/router" className="shrink-0">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] font-bold transition-all">
                  Optimize Route <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold"><Calculator className="h-5 w-5 text-emerald-400"/> Margin Analysis Table</CardTitle>
          <CardDescription className="text-slate-400">Click a row for result, cause, and next action.</CardDescription>
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
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Selling Price</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Base Cost</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Net Profit</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Margin %</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Status</TableHead>
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
                      rowTone === 'loss' ? 'text-red-400 font-bold' :
                      rowTone === 'warning' ? 'text-yellow-400 font-bold' :
                      'text-emerald-400 font-bold';
                    const rowClass = rowTone === 'loss'
                      ? 'bg-red-500/5 hover:bg-red-500/10'
                      : rowTone === 'warning'
                        ? 'bg-yellow-500/5 hover:bg-yellow-500/10'
                        : 'hover:bg-white/5';
                    
                    return (
                      <TableRow 
                        key={sku.sku_id} 
                        className={`cursor-pointer border-b border-white/5 transition-colors ${rowClass}`}
                        onClick={() => profit && setSelectedProfit(profit)}
                      >
                        <TableCell className="font-mono text-white">{sku.sku_id}</TableCell>
                        <TableCell className="text-slate-300">{formatIDR(sku.price_idr)}</TableCell>
                        <TableCell className="text-slate-300">{formatMYR(sku.cost_myr)}</TableCell>
                        <TableCell className="font-medium">
                          {profit ? (
                            <span className={profit.net_profit_myr < 0 ? 'text-red-400 font-bold' : 'text-slate-100'}>
                              {formatMYR(profit.net_profit_myr)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className={marginColor}>
                          {profit ? `${(profit.margin_pct * 100).toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell>
                          {rowTone === 'loss' ? (
                            <Badge variant="destructive" className="animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-500/50 bg-red-500/20 text-red-300"><AlertTriangle className="w-3 h-3 mr-1"/> Margin Alert</Badge>
                          ) : rowTone === 'warning' ? (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Low Margin</Badge>
                          ) : profit ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Healthy</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 border-slate-700">N/A</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedProfit} onOpenChange={(open) => !open && setSelectedProfit(null)}>
        <SheetContent className="!w-screen sm:!w-1/2 !max-w-none overflow-y-auto px-8 bg-[#0f172a]/95 backdrop-blur-2xl border-l border-white/10">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-white font-bold">Profit Review</SheetTitle>
            <SheetDescription className="text-slate-400">
              {selectedProfit?.sku_id} result
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6">
            <div className={`rounded-xl border p-5 relative overflow-hidden ${
              selectedStatusTone === 'loss'
                ? 'bg-red-500/10 border-red-500/30'
                : selectedStatusTone === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${
                selectedStatusTone === 'loss' ? 'bg-red-500' :
                selectedStatusTone === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}></div>
              <div className="flex items-start gap-4">
                <Info className={`w-5 h-5 mt-0.5 shrink-0 ${
                  selectedStatusTone === 'loss' ? 'text-red-400' :
                  selectedStatusTone === 'warning' ? 'text-yellow-400' : 'text-emerald-400'
                }`} />
                <div className="space-y-2">
                  <p className={`text-xs font-bold uppercase tracking-widest ${
                    selectedStatusTone === 'loss' ? 'text-red-400' :
                    selectedStatusTone === 'warning' ? 'text-yellow-500' : 'text-emerald-400'
                  }`}>Analysis Result</p>
                  <h3 className="text-xl font-bold text-white">
                    {selectedProfit
                      ? isLossMaking
                        ? `${selectedProfit.sku_id} is losing ${formatMYR(Math.abs(selectedProfit.net_profit_myr))} / unit`
                        : isLowMarginWarning
                          ? `${selectedProfit.sku_id} margin is only ${(selectedProfit.margin_pct * 100).toFixed(1)}%`
                          : `${selectedProfit.sku_id} is currently profitable`
                      : "No SKU selected"}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-slate-300">{selectedProfit?.explanation}</p>
                </div>
              </div>
            </div>

            {selectedProfit?.alert ? (
              <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Best solution</p>
                  <Badge variant="outline" className={adviceSourceIsAi ? "border-blue-400/40 bg-blue-500/20 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "border-slate-500/40 bg-slate-500/20 text-slate-300"}>
                    {adviceSourceLabel}
                  </Badge>
                </div>
                {adviceLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full bg-slate-800/50 rounded-lg" />
                    <Skeleton className="h-20 w-full bg-slate-800/50 rounded-lg" />
                  </div>
                ) : bestAdviceOption && profitAdvice ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black tracking-widest px-3 py-1 uppercase rounded-bl-lg">Primary</div>
                      <p className="font-bold text-white mb-2">{bestAdviceOption.title}</p>
                      <p className="text-sm text-slate-300 leading-relaxed mb-4">{bestAdviceOption.detail}</p>
                      <div className="text-xs bg-black/30 p-3 rounded-md text-slate-400 border border-white/5 font-medium leading-relaxed mb-4">
                        {profitAdvice.rationale}
                      </div>
                      <Link href={bestAdviceOption.href} className="block">
                        <Button className="w-full bg-blue-600 hover:bg-blue-500 font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                          {bestAdviceOption.button_label} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>

                    {alternativeAdviceOptions.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Other optional solutions</p>
                        <div className="grid gap-3">
                          {alternativeAdviceOptions.map((option) => (
                            <div key={option.option_id} className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
                              <p className="font-semibold text-white">{option.title}</p>
                              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{option.detail}</p>
                              <Link href={option.href} className="mt-4 block">
                                <Button variant="outline" className="w-full border-white/10 bg-white/5 text-slate-100 hover:bg-white/10">
                                  {option.button_label} <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Advice unavailable. Try recalculating.</p>
                )}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-slate-900/50 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Revenue</p>
                <p className="mt-2 text-2xl font-extrabold text-white">{selectedSkuRecord ? formatIDR(selectedSkuRecord.price_idr) : "-"}</p>
                <p className="text-sm text-slate-400 mt-1 font-mono">{formatMYR(selectedRevenueMyr)} after FX</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-slate-900/50 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Costs</p>
                <p className="mt-2 text-2xl font-extrabold text-white">{selectedSkuRecord ? formatMYR(selectedTotalCost) : "-"}</p>
                <p className="text-sm text-slate-400 mt-1">Product, duty, shipping.</p>
              </div>
            </div>
            
            <div className="bg-slate-950 p-5 rounded-xl border border-white/5">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-4">Cost Breakdown</h4>
              <div className="font-mono text-sm space-y-3 text-slate-300">
                <div className="flex justify-between"><span>Revenue (MYR)</span> <span className="text-white">{selectedSkuRecord ? selectedRevenueMyr.toFixed(2) : "-"}</span></div>
                <div className="flex justify-between text-red-400"><span>- Product Cost</span> <span>{selectedSkuRecord ? selectedSkuRecord.cost_myr.toFixed(2) : "-"}</span></div>
                <div className="flex justify-between text-red-400"><span>- Import Duty/VAT</span> <span>{selectedDutyCost.toFixed(2)}</span></div>
                <div className="flex justify-between text-red-400 border-b border-white/10 pb-3"><span>- Shipping</span> <span>{selectedShippingCost.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span className="text-white">Net Profit</span> 
                  <span className={isLossMaking ? 'text-red-400' : 'text-emerald-400'}>{selectedProfit?.net_profit_myr.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
