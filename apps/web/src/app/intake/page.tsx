"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Plus, Upload, Database } from "lucide-react";

type IntakeRow = {
  sku_id: string;
  product_name: string;
  category: string;
  hs_code: string;
  cost_myr: string;
  selling_price_idr: string;
  weight_g: string;
  bpom_certified: string;
  description: string;
  balanced_qty: string;
  qty_sold: string;
};

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

type ValidatedRow = {
  id: string;
  source: "csv" | "manual";
  rowNumber: number;
  values: IntakeRow;
  errors: string[];
  warnings: string[];
  isValid: boolean;
};

type ImportPayloadRow = {
  sku_id: string;
  product_name: string;
  category: string;
  hs_code?: string;
  cost_myr: number;
  selling_price_idr: number;
  weight_g: number;
  bpom_certified: string;
  description: string;
  balanced_qty?: number;
  qty_sold?: number;
};

type ImportedSkuRecord = {
  sku_id?: string;
  name?: string;
  product_name?: string;
};

const CSV_COLUMNS: Array<keyof IntakeRow> = [
  "sku_id",
  "product_name",
  "category",
  "hs_code",
  "cost_myr",
  "selling_price_idr",
  "weight_g",
  "bpom_certified",
  "description",
  "balanced_qty",
  "qty_sold",
];

const REQUIRED_COLUMNS: Array<keyof IntakeRow> = [
  "sku_id",
  "product_name",
  "category",
  "cost_myr",
  "selling_price_idr",
  "weight_g",
  "bpom_certified",
  "description",
];

const OPTIONAL_COLUMNS: Array<keyof IntakeRow> = ["hs_code", "balanced_qty", "qty_sold"];

const EMPTY_ROW: IntakeRow = {
  sku_id: "",
  product_name: "",
  category: "",
  hs_code: "",
  cost_myr: "",
  selling_price_idr: "",
  weight_g: "",
  bpom_certified: "",
  description: "",
  balanced_qty: "",
  qty_sold: "",
};

function normalizeBpomValue(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes") return "Yes";
  if (normalized === "no") return "No";
  return value.trim();
}

function normalizeRow(row: IntakeRow): IntakeRow {
  return {
    sku_id: row.sku_id.trim(),
    product_name: row.product_name.trim(),
    category: row.category.trim(),
    hs_code: row.hs_code.trim(),
    cost_myr: row.cost_myr.trim(),
    selling_price_idr: row.selling_price_idr.trim(),
    weight_g: row.weight_g.trim(),
    bpom_certified: normalizeBpomValue(row.bpom_certified),
    description: row.description.trim(),
    balanced_qty: row.balanced_qty.trim(),
    qty_sold: row.qty_sold.trim(),
  };
}

function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim() !== "")) {
        rows.push(currentRow);
      }
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim() !== "")) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...dataRows] = rows;
  return {
    headers: headerRow.map((header) => header.trim()),
    rows: dataRows,
  };
}

function rowFromHeaders(headers: string[], values: string[]): IntakeRow {
  const row = { ...EMPTY_ROW };

  headers.forEach((header, index) => {
    if (header in row) {
      row[header as keyof IntakeRow] = values[index]?.trim() ?? "";
    }
  });

  return normalizeRow(row);
}

function isPositiveNumber(value: string): boolean {
  if (value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isPositiveInteger(value: string): boolean {
  if (value.trim() === "") return false;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function validateRows(rows: Array<{ source: "csv" | "manual"; rowNumber: number; values: IntakeRow }>): ValidatedRow[] {
  const skuCounts = new Map<string, number>();

  rows.forEach(({ values }) => {
    const skuId = values.sku_id.trim();
    if (!skuId) return;
    skuCounts.set(skuId, (skuCounts.get(skuId) ?? 0) + 1);
  });

  return rows.map(({ source, rowNumber, values }, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    REQUIRED_COLUMNS.forEach((field) => {
      if (!values[field].trim()) {
        errors.push(`${field} is required`);
      }
    });

    if (values.cost_myr && !isPositiveNumber(values.cost_myr)) {
      errors.push("cost_myr must be a number greater than or equal to 0");
    }

    if (values.selling_price_idr && !isPositiveNumber(values.selling_price_idr)) {
      errors.push("selling_price_idr must be a number greater than or equal to 0");
    }

    if (values.weight_g && !isPositiveInteger(values.weight_g)) {
      errors.push("weight_g must be a whole number greater than 0");
    }

    if (values.balanced_qty && !isPositiveNumber(values.balanced_qty)) {
      errors.push("balanced_qty must be a number greater than or equal to 0");
    }

    if (values.qty_sold && !isPositiveNumber(values.qty_sold)) {
      errors.push("qty_sold must be a number greater than or equal to 0");
    }

    if (values.bpom_certified && !["Yes", "No"].includes(values.bpom_certified)) {
      errors.push("bpom_certified must be Yes or No");
    }

    if (values.sku_id && (skuCounts.get(values.sku_id) ?? 0) > 1) {
      errors.push("sku_id must be unique");
    }

    if (!values.hs_code) {
      warnings.push("hs_code is recommended for route and tax accuracy");
    }

    if (!values.balanced_qty) {
      warnings.push("balanced_qty is missing");
    }

    if (!values.qty_sold) {
      warnings.push("qty_sold is missing");
    }

    return {
      id: `${source}-${rowNumber}-${index}`,
      source,
      rowNumber,
      values,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  });
}

function toCsv(rows: IntakeRow[]): string {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((row) =>
    CSV_COLUMNS.map((column) => `"${String(row[column] ?? "").replaceAll('"', '""')}"`).join(","),
  );
  return [header, ...body].join("\n");
}

export default function IntakePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const [uploadedRows, setUploadedRows] = useState<IntakeRow[]>([]);
  const [manualRows, setManualRows] = useState<IntakeRow[]>([]);
  const [draft, setDraft] = useState<IntakeRow>(EMPTY_ROW);
  const [lastFileName, setLastFileName] = useState("");
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const skuId = searchParams.get("sku_id");
    if (!skuId) return;

    setDraft({
      sku_id: skuId,
      product_name: searchParams.get("product_name") ?? "",
      category: searchParams.get("category") ?? "",
      hs_code: searchParams.get("hs_code") ?? "",
      cost_myr: searchParams.get("cost_myr") ?? "",
      selling_price_idr: searchParams.get("selling_price_idr") ?? "",
      weight_g: searchParams.get("weight_g") ?? "",
      bpom_certified: normalizeBpomValue(searchParams.get("bpom_certified") ?? ""),
      description: searchParams.get("description") ?? "",
      balanced_qty: searchParams.get("balanced_qty") ?? "",
      qty_sold: searchParams.get("qty_sold") ?? "",
    });
    setImportMessage(`Loaded ${skuId} into the manual editor. Update the fields, then add and import the row to save your fix.`);
    setImportError(null);
  }, []);

  const validatedRows = useMemo(() => {
    const allRows = [
      ...uploadedRows.map((values, index) => ({ source: "csv" as const, rowNumber: index + 2, values })),
      ...manualRows.map((values, index) => ({ source: "manual" as const, rowNumber: index + 1, values })),
    ];
    return validateRows(allRows);
  }, [manualRows, uploadedRows]);

  const stats = useMemo(() => {
    const validRows = validatedRows.filter((row) => row.isValid).length;
    const invalidRows = validatedRows.length - validRows;
    const warningRows = validatedRows.filter((row) => row.warnings.length > 0).length;
    return {
      total: validatedRows.length,
      valid: validRows,
      invalid: invalidRows,
      warnings: warningRows,
    };
  }, [validatedRows]);

  const hasLoadedRows = validatedRows.length > 0;
  const hasValidRows = stats.valid > 0;
  const hasInvalidRows = stats.invalid > 0;

  const prepareRowsForImport = (rows: ValidatedRow[]): ImportPayloadRow[] =>
    rows
      .filter((row) => row.isValid)
      .map((row) => ({
        sku_id: row.values.sku_id,
        product_name: row.values.product_name,
        category: row.values.category,
        hs_code: row.values.hs_code || undefined,
        cost_myr: Number(row.values.cost_myr),
        selling_price_idr: Number(row.values.selling_price_idr),
        weight_g: Number(row.values.weight_g),
        bpom_certified: row.values.bpom_certified,
        description: row.values.description,
        balanced_qty: row.values.balanced_qty ? Number(row.values.balanced_qty) : undefined,
        qty_sold: row.values.qty_sold ? Number(row.values.qty_sold) : undefined,
      }));

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsv(text);
    const missingRequiredHeaders = REQUIRED_COLUMNS.filter((column) => !parsed.headers.includes(column));

    if (missingRequiredHeaders.length > 0) {
      setUploadedRows([]);
      setLastFileName(file.name);
      setFileErrors([`Missing required columns: ${missingRequiredHeaders.join(", ")}`]);
      return;
    }

    const rows = parsed.rows.map((values) => rowFromHeaders(parsed.headers, values));
    setUploadedRows(rows);
    setLastFileName(file.name);
    setFileErrors([]);
    setImportMessage(null);
    setImportError(null);
    event.target.value = "";
  };

  const handleDraftChange = (field: keyof IntakeRow, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleAddManualRow = () => {
    setManualRows((current) => [...current, normalizeRow(draft)]);
    setDraft(EMPTY_ROW);
    setImportMessage(null);
    setImportError(null);
  };

  const handleImportValidRows = async () => {
    const rowsToImport = prepareRowsForImport(validatedRows);

    if (rowsToImport.length === 0) {
      setImportError("There are no valid rows to import yet.");
      setImportMessage(null);
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/skus/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows: rowsToImport }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Import failed with status ${response.status}`);
      }

      const result = (await response.json()) as {
        imported_count: number;
        created_count: number;
        updated_count: number;
      };

      const verifyResponse = await fetch(`${apiUrl}/api/skus/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!verifyResponse.ok) {
        throw new Error(`Import finished, but verification failed with status ${verifyResponse.status}`);
      }

      const importedSkuIds = new Set(rowsToImport.map((row) => row.sku_id));
      const storedRows = (await verifyResponse.json()) as ImportedSkuRecord[];
      const confirmedCount = storedRows.filter((row) => row.sku_id && importedSkuIds.has(row.sku_id)).length;

      setImportMessage(
        confirmedCount === rowsToImport.length
          ? `Confirmed in database: ${confirmedCount} row${confirmedCount === 1 ? "" : "s"} found after import (${result.created_count} created, ${result.updated_count} updated).`
          : `Import request finished, but only ${confirmedCount} of ${rowsToImport.length} row${rowsToImport.length === 1 ? "" : "s"} could be confirmed from the database.`,
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadPreparedCsv = () => {
    if (validatedRows.length === 0) return;

    const validOnly = validatedRows.filter((row) => row.isValid).map((row) => row.values);
    const rowsToExport = validOnly.length > 0 ? validOnly : validatedRows.map((row) => row.values);

    const blob = new Blob([toCsv(rowsToExport)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = validOnly.length > 0 ? "validated-skus.csv" : "prepared-skus.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    setUploadedRows([]);
    setManualRows([]);
    setDraft(EMPTY_ROW);
    setLastFileName("");
    setFileErrors([]);
    setImportMessage(null);
    setImportError(null);
  };

  return (
    <div className="space-y-8 pb-12 text-slate-50">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
            <Database className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Data Intake
          </h1>
        </div>
        <p className="text-slate-400 text-lg">
          Upload your SKU catalogue in CSV format, validate it, and prepare only the clean rows for the next analysis step.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total rows</CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400/80 font-bold uppercase tracking-widest text-xs">Ready to import</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-400">{stats.valid}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-red-400/80 font-bold uppercase tracking-widest text-xs">Need fixes</CardDescription>
            <CardTitle className="text-3xl font-bold text-red-400">{stats.invalid}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.8)]"></div>
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-500/80 font-bold uppercase tracking-widest text-xs">Warnings</CardDescription>
            <CardTitle className="text-3xl font-bold text-yellow-400">{stats.warnings}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <FileSpreadsheet className="h-5 w-5 text-blue-400" /> CSV Template
            </CardTitle>
            <CardDescription className="text-slate-400">Use the sample template so your column names match the expected schema exactly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-white/5 bg-slate-950/50 p-5 text-sm leading-relaxed">
              <p className="font-bold text-slate-300 uppercase tracking-widest text-xs mb-3">Required columns</p>
              <p className="font-mono text-xs sm:text-sm text-blue-300">{REQUIRED_COLUMNS.join(", ")}</p>
              <p className="font-bold text-slate-300 uppercase tracking-widest text-xs mt-5 mb-3">Optional columns</p>
              <p className="font-mono text-xs sm:text-sm text-slate-400">{OPTIONAL_COLUMNS.join(", ")}</p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 text-sm leading-relaxed">
              <p className="font-bold text-blue-400 uppercase tracking-widest text-xs mb-3">Input rules</p>
              <ul className="space-y-2 text-sm text-blue-100 font-medium">
                <li><span className="text-blue-300 font-mono">bpom_certified</span> must be Yes or No</li>
                <li><span className="text-blue-300 font-mono">cost_myr</span> and <span className="text-blue-300 font-mono">selling_price_idr</span> must be numbers</li>
                <li><span className="text-blue-300 font-mono">weight_g</span> must be a whole number &gt; 0</li>
                <li><span className="text-blue-300 font-mono">sku_id</span> must be unique across the uploaded batch</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-4">
              <a href="/sample-skus.csv" download>
                <Button className="bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] font-bold transition-all">
                  <Download className="mr-2 h-4 w-4" /> Download sample CSV
                </Button>
              </a>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-bold transition-all shadow-sm">
                <Upload className="h-4 w-4 text-emerald-400" />
                Upload CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <Button variant="outline" onClick={handleClearAll} disabled={stats.total === 0 && fileErrors.length === 0} className="border-white/10 text-slate-400 hover:text-white">
                Clear all
              </Button>
            </div>
            {lastFileName ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 font-medium">
                Loaded: {lastFileName}
              </Badge>
            ) : null}
            {fileErrors.length > 0 ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200 font-medium space-y-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                {fileErrors.map((error) => (
                  <p key={error} className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500" /> {error}</p>
                ))}
              </div>
            ) : null}
            {hasLoadedRows ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm">
                <p className="font-bold text-emerald-400 uppercase tracking-widest text-xs mb-3">After upload</p>
                <p className="mt-2 text-emerald-100/90 leading-relaxed">
                  Your CSV is parsed locally and shown in <span className="font-bold text-white">Prepared Rows</span> below.
                  Once the rows look good, you can import the valid ones directly into the backend.
                </p>
                <p className="mt-3 font-bold text-emerald-300">
                  {hasInvalidRows
                    ? `Fix the rows marked "Needs fix", then import or export the ${stats.valid} valid row${stats.valid === 1 ? "" : "s"}.`
                    : `All ${stats.valid} row${stats.valid === 1 ? "" : "s"} are valid. You can import them now.`}
                </p>
              </div>
            ) : null}
            {importMessage ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">{importMessage}</div>
            ) : null}
            {importError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm font-bold text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]">{importError}</div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Plus className="h-5 w-5 text-purple-400" /> Manual Test Entry
            </CardTitle>
            <CardDescription className="text-slate-400">Add one SKU manually when you want to test a specific scenario without editing a full CSV.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">SKU ID</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.sku_id} onChange={(e) => handleDraftChange("sku_id", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Product name</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.product_name} onChange={(e) => handleDraftChange("product_name", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Category</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.category} onChange={(e) => handleDraftChange("category", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">HS code</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.hs_code} onChange={(e) => handleDraftChange("hs_code", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Cost (MYR)</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.cost_myr} onChange={(e) => handleDraftChange("cost_myr", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Selling price (IDR)</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.selling_price_idr} onChange={(e) => handleDraftChange("selling_price_idr", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Weight (g)</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.weight_g} onChange={(e) => handleDraftChange("weight_g", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">BPOM certified</span>
                <select className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.bpom_certified} onChange={(e) => handleDraftChange("bpom_certified", e.target.value)}>
                  <option value="">Select status</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Balanced qty</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.balanced_qty} onChange={(e) => handleDraftChange("balanced_qty", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Qty sold</span>
                <input className="w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-2.5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none" value={draft.qty_sold} onChange={(e) => handleDraftChange("qty_sold", e.target.value)} />
              </label>
            </div>
            <label className="space-y-2 text-sm block">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Description</span>
              <textarea className="min-h-24 w-full rounded-lg border border-white/10 bg-black/40 text-white px-4 py-3 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all outline-none resize-y" value={draft.description} onChange={(e) => handleDraftChange("description", e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button onClick={handleAddManualRow} className="bg-purple-600 hover:bg-purple-500 font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                Add test SKU
              </Button>
              <Button onClick={handleImportValidRows} disabled={!hasValidRows || isImporting} className="bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all">
                <Upload className="mr-2 h-4 w-4" /> {isImporting ? "Importing..." : "Import valid rows"}
              </Button>
              <Button variant="outline" onClick={handleDownloadPreparedCsv} disabled={validatedRows.length === 0} className="border-white/10 bg-slate-800 hover:bg-slate-700 text-slate-200">
                <Download className="mr-2 h-4 w-4" /> Export valid rows
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/5">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Prepared Rows</CardTitle>
          <CardDescription className="text-slate-400">
            Review the parsed rows after upload. Invalid rows are highlighted and excluded from export, and valid rows can be downloaded as a clean CSV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validatedRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-6 py-12 text-center text-sm text-slate-500 font-medium">
              No rows loaded yet. Download the sample CSV or add one SKU manually.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-white/5 bg-black/40 px-5 py-4 text-sm text-slate-300">
                {hasValidRows ? (
                  <p>
                    Next step: click <span className="font-bold text-blue-400">Import valid rows</span> to send clean rows into the backend, or export them as CSV if you need a file.
                  </p>
                ) : (
                  <p>Next step: fix the rows marked below before exporting.</p>
                )}
              </div>
              <div className="rounded-md border border-white/5 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-950/50">
                    <TableRow className="border-b border-white/5 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Source</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">SKU ID</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Product Name</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Category</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Cost</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Price</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Weight</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">BPOM</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase tracking-wider text-xs">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validatedRows.map((row) => (
                      <TableRow key={row.id} className={`border-b border-white/5 ${row.isValid ? "hover:bg-white/5" : "bg-red-500/10 hover:bg-red-500/20"}`}>
                        <TableCell>
                          {row.isValid ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-sm">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400 border border-red-500/50 shadow-sm">
                              <AlertCircle className="mr-1 h-3 w-3" /> Needs fix
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-white/10 bg-black/40 text-slate-300">{row.source === "csv" ? `CSV row ${row.rowNumber}` : `Manual ${row.rowNumber}`}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-white">{row.values.sku_id || "-"}</TableCell>
                        <TableCell className="text-slate-300">{row.values.product_name || "-"}</TableCell>
                        <TableCell className="text-slate-300">{row.values.category || "-"}</TableCell>
                        <TableCell className="text-slate-300">{row.values.cost_myr || "-"}</TableCell>
                        <TableCell className="text-slate-300">{row.values.selling_price_idr || "-"}</TableCell>
                        <TableCell className="text-slate-300">{row.values.weight_g || "-"}</TableCell>
                        <TableCell className="text-slate-300">{row.values.bpom_certified || "Not provided"}</TableCell>
                        <TableCell className="max-w-sm align-top">
                          <div className="space-y-2 text-sm">
                            {row.errors.map((error) => (
                              <p key={error} className="text-red-400 font-medium">
                                {error}
                              </p>
                            ))}
                            {row.warnings.map((warning) => (
                              <p key={warning} className="text-yellow-400 font-medium">
                                {warning}
                              </p>
                            ))}
                            {row.errors.length === 0 && row.warnings.length === 0 ? (
                              <p className="text-emerald-400 font-medium">Ready for import.</p>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
