"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Plus, Upload } from "lucide-react";

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
  const [uploadedRows, setUploadedRows] = useState<IntakeRow[]>([]);
  const [manualRows, setManualRows] = useState<IntakeRow[]>([]);
  const [draft, setDraft] = useState<IntakeRow>(EMPTY_ROW);
  const [lastFileName, setLastFileName] = useState("");
  const [fileErrors, setFileErrors] = useState<string[]>([]);

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
    event.target.value = "";
  };

  const handleDraftChange = (field: keyof IntakeRow, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleAddManualRow = () => {
    setManualRows((current) => [...current, normalizeRow(draft)]);
    setDraft(EMPTY_ROW);
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
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Data Intake</h1>
        <p className="text-muted-foreground">
          Upload your SKU catalogue in CSV format, validate it, and prepare only the clean rows for the next analysis step.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="border-l-4 border-l-slate-900">
          <CardHeader className="pb-2">
            <CardDescription>Total rows</CardDescription>
            <CardTitle>{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-2">
            <CardDescription>Ready to import</CardDescription>
            <CardTitle className="text-green-700">{stats.valid}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-red-600">
          <CardHeader className="pb-2">
            <CardDescription>Need fixes</CardDescription>
            <CardTitle className="text-red-700">{stats.invalid}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription>Rows with warnings</CardDescription>
            <CardTitle className="text-amber-700">{stats.warnings}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> CSV Template
            </CardTitle>
            <CardDescription>Use the sample template so your column names match the expected schema exactly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm leading-relaxed">
              <p className="font-medium">Required columns</p>
              <p className="mt-2 font-mono text-xs sm:text-sm">{REQUIRED_COLUMNS.join(", ")}</p>
              <p className="mt-4 font-medium">Optional columns</p>
              <p className="mt-2 font-mono text-xs sm:text-sm">{OPTIONAL_COLUMNS.join(", ")}</p>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-sm leading-relaxed text-blue-950">
              <p className="font-medium">Input rules</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>`bpom_certified` must be `Yes` or `No`</li>
                <li>`cost_myr` and `selling_price_idr` must be numbers</li>
                <li>`weight_g` must be a whole number greater than 0</li>
                <li>`sku_id` must be unique across the uploaded batch</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/sample-skus.csv" download>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Download className="mr-2 h-4 w-4" /> Download sample CSV
                </Button>
              </a>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                Upload CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <Button variant="outline" onClick={handleClearAll} disabled={stats.total === 0 && fileErrors.length === 0}>
                Clear all
              </Button>
            </div>
            {lastFileName ? (
              <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-600">
                Loaded: {lastFileName}
              </Badge>
            ) : null}
            {fileErrors.length > 0 ? (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
                {fileErrors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Manual Test Entry
            </CardTitle>
            <CardDescription>Add one SKU manually when you want to test a specific scenario without editing a full CSV.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span>SKU ID</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.sku_id} onChange={(e) => handleDraftChange("sku_id", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span>Product name</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.product_name} onChange={(e) => handleDraftChange("product_name", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span>Category</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.category} onChange={(e) => handleDraftChange("category", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span>HS code</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.hs_code} onChange={(e) => handleDraftChange("hs_code", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span>Cost (MYR)</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.cost_myr} onChange={(e) => handleDraftChange("cost_myr", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span>Selling price (IDR)</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.selling_price_idr} onChange={(e) => handleDraftChange("selling_price_idr", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span>Weight (g)</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.weight_g} onChange={(e) => handleDraftChange("weight_g", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span>BPOM certified</span>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.bpom_certified} onChange={(e) => handleDraftChange("bpom_certified", e.target.value)}>
                  <option value="">Select status</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span>Balanced qty</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.balanced_qty} onChange={(e) => handleDraftChange("balanced_qty", e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span>Qty sold</span>
                <input className="w-full rounded-md border border-border bg-background px-3 py-2" value={draft.qty_sold} onChange={(e) => handleDraftChange("qty_sold", e.target.value)} />
              </label>
            </div>
            <label className="space-y-2 text-sm block">
              <span>Description</span>
              <textarea className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2" value={draft.description} onChange={(e) => handleDraftChange("description", e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleAddManualRow} className="bg-blue-600 hover:bg-blue-700">
                Add test SKU
              </Button>
              <Button variant="outline" onClick={handleDownloadPreparedCsv} disabled={validatedRows.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export valid rows
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prepared Rows</CardTitle>
          <CardDescription>
            Review the parsed rows before you wire them into a backend import flow. Invalid rows are highlighted and excluded from export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validatedRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              No rows loaded yet. Download the sample CSV or add one SKU manually.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>SKU ID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>BPOM</TableHead>
                  <TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validatedRows.map((row) => (
                  <TableRow key={row.id} className={row.isValid ? "" : "bg-red-500/5"}>
                    <TableCell>
                      {row.isValid ? (
                        <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Valid
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="mr-1 h-3 w-3" /> Needs fix
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.source === "csv" ? `CSV row ${row.rowNumber}` : `Manual ${row.rowNumber}`}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{row.values.sku_id || "-"}</TableCell>
                    <TableCell>{row.values.product_name || "-"}</TableCell>
                    <TableCell>{row.values.category || "-"}</TableCell>
                    <TableCell>{row.values.cost_myr || "-"}</TableCell>
                    <TableCell>{row.values.selling_price_idr || "-"}</TableCell>
                    <TableCell>{row.values.weight_g || "-"}</TableCell>
                    <TableCell>{row.values.bpom_certified || "Not provided"}</TableCell>
                    <TableCell className="max-w-sm align-top">
                      <div className="space-y-2 text-sm">
                        {row.errors.map((error) => (
                          <p key={error} className="text-red-700">
                            {error}
                          </p>
                        ))}
                        {row.warnings.map((warning) => (
                          <p key={warning} className="text-amber-700">
                            {warning}
                          </p>
                        ))}
                        {row.errors.length === 0 && row.warnings.length === 0 ? (
                          <p className="text-green-700">Ready for import.</p>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
