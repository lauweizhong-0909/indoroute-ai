import { ComplianceEvidence, ComplianceReport, CustomsAlert, ProfitAdvice, ProfitResult, RouterDecision, SKU } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DEFAULT_FX_RATE = 3350;

export const USE_MOCKS = false; // Set to true to force demo mocks

type RawSku = Partial<SKU> & {
  product_name?: string;
  selling_price_idr?: number;
  bpom_certified?: boolean | string | null;
};

type RawAlert = {
  id: string | number;
  news_text?: string;
  body?: string;
  title?: string;
  created_at?: string;
  date?: string;
  is_active?: boolean;
  severity?: string;
  risk_type?: string;
  impact_summary?: string;
  affected_targets?: string[];
  affected_skus?: string[];
  next_action?: string;
  triggered_modules?: string[];
  source?: string;
  source_url?: string;
};

type RawFxRate = {
  base?: string;
  target?: string;
  rate?: number;
  source?: string;
  updated_at?: string;
};

const FORBIDDEN_KEYWORDS = [
  "medical grade",
  "fast whiten",
  "instant skin bleaching",
  "scar cure",
  "cure",
  "treatment",
  "antibiotic",
  "steroid",
  "vision improvement",
  "fungus",
  "ingrown nail repair",
  "anti-septic",
  "hormonal",
  "isotretinoin",
  "botox",
  "whitening injection",
  "fat burning",
  "eczema",
  "psoriasis",
  "cellulite cure",
  "skin disease",
];

const OFFICIAL_COMPLIANCE_SOURCES = {
  bpomNotification: {
    title: "Direktorat Registrasi OTSKK BPOM - Layanan Notifikasi Kosmetik",
    url: "https://registrasiotskk.pom.go.id/layanan",
    kind: "official_service" as const,
    summary:
      "BPOM's cosmetics registration service states that cosmetics must obtain notification before circulation in Indonesia.",
  },
  cosmeticAdvertisingRule: {
    title: "Peraturan BPOM No. 18 Tahun 2024 tentang Penandaan, Promosi, dan Iklan Kosmetik",
    url: "https://jdih.pom.go.id/view/slide/1623/18/2024/07811dc6c422334ce36a09ff5cd6fe71",
    kind: "official_regulation" as const,
    summary:
      "Official BPOM regulation governing cosmetic labelling, promotion, and advertising, including notification and compliant promotional practices.",
  },
  misleadingClaimsEnforcement: {
    title: "BPOM enforcement on misleading cosmetic claims",
    url: "https://www.pom.go.id/siaran-pers/bpom-cabut-izin-edar-8-kosmetik-kewanitaan-yang-melanggar-norma-kesusilaan",
    kind: "official_enforcement" as const,
    summary:
      "Official BPOM press release showing enforcement against cosmetic products promoted with misleading or organ/function-changing claims.",
  },
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${path} (${res.status})`);
  }

  return res.json();
}

function normalizeBpom(value: boolean | string | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "yes" || value.toLowerCase() === "true";
  return false;
}

function normalizeSku(raw: RawSku): SKU {
  return {
    sku_id: String(raw.sku_id ?? ""),
    name: String(raw.name ?? raw.product_name ?? "Unnamed SKU"),
    category: String(raw.category ?? "Uncategorized"),
    bpom_certified: normalizeBpom(raw.bpom_certified),
    cost_myr: Number(raw.cost_myr ?? 0),
    price_idr: Number(raw.price_idr ?? raw.selling_price_idr ?? 0),
    weight_g: Number(raw.weight_g ?? 0),
    description: String(raw.description ?? ""),
  };
}

function extractMatchedKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  return FORBIDDEN_KEYWORDS.filter((keyword) => normalized.includes(keyword));
}

function extractKeywordEvidence(sku: SKU): ComplianceEvidence[] {
  const evidence: ComplianceEvidence[] = [];
  const nameLower = sku.name.toLowerCase();
  const descriptionLower = sku.description.toLowerCase();

  FORBIDDEN_KEYWORDS.forEach((keyword) => {
    const inName = nameLower.includes(keyword);
    const inDescription = descriptionLower.includes(keyword);

    if (!inName && !inDescription) {
      return;
    }

    const field = inName ? "name" : "description";
    evidence.push({
      id: `claim-${keyword}-${field}`,
      type: "claim",
      title: `Restricted cosmetic claim detected: "${keyword}"`,
      detail:
        field === "name"
          ? `The product name uses a medical-style or therapeutic term that can make the listing look like a treatment claim rather than a cosmetic claim.`
          : `The product description uses a medical-style or therapeutic term that can make the listing look like a treatment claim rather than a cosmetic claim.`,
      field,
      matched_text: keyword,
      source_title: OFFICIAL_COMPLIANCE_SOURCES.cosmeticAdvertisingRule.title,
      source_url: OFFICIAL_COMPLIANCE_SOURCES.cosmeticAdvertisingRule.url,
      source_kind: OFFICIAL_COMPLIANCE_SOURCES.cosmeticAdvertisingRule.kind,
    });
  });

  return evidence;
}

function buildComplianceEvidence(sku: SKU): ComplianceEvidence[] {
  const evidence: ComplianceEvidence[] = [];

  if (!sku.bpom_certified) {
    evidence.push({
      id: "bpom-missing",
      type: "bpom",
      title: "BPOM notification evidence is missing",
      detail:
        "This SKU is marked as not BPOM certified, so it should not be treated as shipment-ready for Indonesian circulation without valid notification evidence.",
      field: "bpom_certified",
      matched_text: "No",
      source_title: OFFICIAL_COMPLIANCE_SOURCES.bpomNotification.title,
      source_url: OFFICIAL_COMPLIANCE_SOURCES.bpomNotification.url,
      source_kind: OFFICIAL_COMPLIANCE_SOURCES.bpomNotification.kind,
    });
  }

  return [...evidence, ...extractKeywordEvidence(sku)];
}

function deriveComplianceReport(sku: SKU): ComplianceReport {
  const matchedKeywords = extractMatchedKeywords(`${sku.name} ${sku.description}`);
  const evidence = buildComplianceEvidence(sku);
  const violations: string[] = [];

  if (!sku.bpom_certified) {
    violations.push("Missing BPOM certification");
  }

  matchedKeywords.forEach((keyword) => {
    violations.push(`Contains restricted claim: "${keyword}"`);
  });

  const compliant = violations.length === 0;

  return {
    sku_id: sku.sku_id,
    compliant,
    violations,
    shipment_status: compliant ? "Ready to ship" : "Blocked until fixed",
    why_flagged: compliant
      ? "No BPOM or restricted-claim issues were detected."
      : "This SKU has missing certification or restricted medical-style claims that can trigger BPOM review.",
    fix_steps: compliant
      ? []
      : [
          !sku.bpom_certified ? "Add valid BPOM certification before shipping to Indonesia." : "Keep current BPOM documentation attached.",
          matchedKeywords.length > 0 ? "Replace medical or treatment wording with cosmetic-safe wording." : "Keep listing copy free from treatment claims.",
          "Run the scan again after updating the listing.",
        ],
    recommendation: compliant
      ? "Approved for shipment."
      : "Pause shipment until the listing and certification issues are resolved.",
    evidence,
  };
}

function shippingCostFor(weightG: number, hasDelayRisk: boolean): number {
  const base = 4 + weightG * 0.08;
  return Number((hasDelayRisk ? base + 2.5 : base).toFixed(2));
}

function dutyCostFor(revenueMyr: number): number {
  return Number((revenueMyr * 0.1).toFixed(2));
}

export function deriveProfitResult(sku: SKU, hasDelayRisk: boolean, fxRate: number): ProfitResult {
  const revenueMyr = sku.price_idr / fxRate;
  const duty = dutyCostFor(revenueMyr);
  const shipping = shippingCostFor(sku.weight_g, hasDelayRisk);
  const netProfit = Number((revenueMyr - sku.cost_myr - duty - shipping).toFixed(2));
  const marginPct = revenueMyr > 0 ? Number((netProfit / revenueMyr).toFixed(4)) : 0;
  const alert = netProfit < 0 || marginPct < 0.08;

  let explanation = "Stable margin under current duty and shipping assumptions.";
  if (netProfit < 0) {
    explanation = "Shipping and landed cost now exceed revenue. Review route or price before dispatch.";
  } else if (marginPct < 0.08) {
    explanation = "Margin is thin. A route or duty change could push this SKU into the red.";
  } else if (hasDelayRisk && sku.weight_g >= 100) {
    explanation = "Still profitable, but current customs delay risk makes heavier parcels more expensive to move.";
  }

  return {
    sku_id: sku.sku_id,
    net_profit_myr: netProfit,
    margin_pct: marginPct,
    alert,
    explanation,
  };
}

function normalizeAlert(raw: RawAlert): CustomsAlert {
  if (raw.title && raw.body && typeof raw.is_active === "boolean") {
    return {
      id: String(raw.id),
      title: String(raw.title),
      body: String(raw.body),
      date: String(raw.date ?? raw.created_at ?? new Date().toISOString()),
      is_active: raw.is_active,
      severity: raw.severity,
      risk_type: raw.risk_type,
      impact_summary: raw.impact_summary,
      affected_targets: raw.affected_targets ?? [],
      affected_skus: raw.affected_skus ?? [],
      next_action: raw.next_action,
      triggered_modules: raw.triggered_modules ?? [],
      source: raw.source,
      source_url: raw.source_url,
    };
  }

  const text = String(raw.news_text ?? raw.body ?? "");
  const title = String(raw.title ?? text.split(".")[0] ?? "Customs update").trim();
  const body = text || "Customs update received from backend.";
  const date = raw.created_at ?? raw.date ?? new Date().toISOString();
  const lowered = `${title} ${body}`.toLowerCase();
  const isActive =
    lowered.includes("lampu merah") ||
    lowered.includes("inspection") ||
    lowered.includes("delay") ||
    Date.now() - new Date(date).getTime() < 7 * 24 * 60 * 60 * 1000;

  const affectedTargets: string[] = [];
  if (lowered.includes("direct")) affectedTargets.push("Direct shipping route");
  if (lowered.includes("cosmetic")) affectedTargets.push("Cosmetic SKUs");
  if (lowered.includes("serum")) affectedTargets.push("Serum category");

  return {
    id: String(raw.id),
    title,
    body,
    date,
    is_active: isActive,
    impact_summary: lowered.includes("inspection")
      ? "Direct parcels are likely to see manual checks and slower clearance."
      : "This customs update may change landed cost or transit predictability.",
    affected_targets: affectedTargets,
    affected_skus: [],
    next_action: lowered.includes("inspection")
      ? "Review Smart Router before sending the next direct-shipping batch."
      : "Review affected SKU economics and shipping plans.",
    triggered_modules: lowered.includes("inspection")
      ? ["Policy Sentinel", "Smart Router"]
      : ["Policy Sentinel"],
    severity: lowered.includes("urgent") ? "URGENT" : lowered.includes("inspection") ? "HIGH" : "MEDIUM",
    risk_type: lowered.includes("inspection") ? "customs_delay" : "general_customs",
    source: "manual",
    source_url: "",
  };
}

export function deriveRouterDecisions(skus: SKU[], profits: ProfitResult[], compliance: ComplianceReport[], alerts: CustomsAlert[]): RouterDecision[] {
  const decisions: RouterDecision[] = [];
  const activeInspection = alerts.find((alert) => alert.is_active && /inspection|lampu merah/i.test(`${alert.title} ${alert.body}`));
  const lossMaking = profits.filter((profit) => profit.net_profit_myr < 0).map((profit) => profit.sku_id);
  const lowMargin = profits.filter((profit) => profit.margin_pct < 0.12).map((profit) => profit.sku_id);
  const blocked = compliance.filter((report) => !report.compliant).map((report) => report.sku_id);

  if (activeInspection || lossMaking.length > 0) {
    const affectedSkus = Array.from(new Set([...lossMaking, ...lowMargin])).slice(0, 4);
    decisions.push({
      id: "router-urgent",
      action: "Switch affected SKUs to Jakarta Warehouse",
      rationale: "Current direct-shipping economics are fragile, and the latest customs alert increases delay risk on sensitive parcels.",
      priority: "URGENT",
      trade_offs: "Warehouse fulfilment adds local handling cost, but it protects service level and reduces customs friction on the affected batch.",
      trigger_summary: activeInspection
        ? `Triggered by ${activeInspection.title} plus low-margin or loss-making SKUs under direct shipping.`
        : "Triggered by margin pressure detected on the current direct-shipping setup.",
      affected_skus: affectedSkus,
      expected_outcome: "Protect margin on vulnerable SKUs and avoid direct-lane delay risk.",
      created_at: new Date().toISOString(),
    });
  }

  if (blocked.length > 0) {
    decisions.push({
      id: "router-compliance",
      action: "Hold blocked SKUs until compliance issues are fixed",
      rationale: "Some SKUs are not shipment-ready because BPOM or restricted-claim issues are still open.",
      priority: "HIGH",
      trade_offs: "Short-term revenue is delayed, but this avoids seizure or enforcement risk at the border.",
      trigger_summary: "Triggered by Compliance Radar after blocked SKUs were detected in the live catalogue.",
      affected_skus: blocked.slice(0, 4),
      expected_outcome: "Prevent non-compliant stock from entering the shipment queue.",
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
  }

  if (decisions.length === 0 && skus.length > 0) {
    decisions.push({
      id: "router-steady",
      action: "Keep current route mix",
      rationale: "The current live catalogue is profitable and clear of urgent customs or compliance blockers.",
      priority: "LOW",
      trade_offs: "No routing change needed right now.",
      trigger_summary: "Triggered by the latest live SKU, profit, and customs review.",
      affected_skus: skus.slice(0, 3).map((sku) => sku.sku_id),
      expected_outcome: "Maintain predictable fulfilment without extra handling cost.",
      created_at: new Date().toISOString(),
    });
  }

  return decisions;
}

export async function getSKUs(): Promise<SKU[]> {
  if (USE_MOCKS) {
    return [];
  }

  try {
    const res = await fetchJson<RawSku[]>("/api/skus/");
    return res.map(normalizeSku).filter((sku) => sku.sku_id);
  } catch (err) {
    console.warn("Live SKU fetch failed.", err);
    return [];
  }
}

export async function getCustomsAlerts(): Promise<CustomsAlert[]> {
  if (USE_MOCKS) {
    return [];
  }

  try {
    const res = await fetchJson<RawAlert[]>("/api/alerts/");
    return res.map(normalizeAlert);
  } catch (err) {
    console.warn("Live alerts fetch failed.", err);
    return [];
  }
}

export async function getFxRate(): Promise<number> {
  if (USE_MOCKS) {
    return DEFAULT_FX_RATE;
  }

  try {
    const res = await fetchJson<RawFxRate>("/api/fx/rate");
    const rate = Number(res.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_FX_RATE;
  } catch (err) {
    console.warn("Live FX rate fetch failed.", err);
    return DEFAULT_FX_RATE;
  }
}

export async function getCompliance(): Promise<ComplianceReport[]> {
  const skus = await getSKUs();
  return skus.map(deriveComplianceReport);
}

export async function getProfits(): Promise<ProfitResult[]> {
  const [skus, alerts, fxRate] = await Promise.all([getSKUs(), getCustomsAlerts(), getFxRate()]);
  return deriveProfitsFromInputs(skus, alerts, fxRate);
}

export async function getRouterDecisions(): Promise<RouterDecision[]> {
  const [skus, alerts, fxRate] = await Promise.all([getSKUs(), getCustomsAlerts(), getFxRate()]);
  return deriveRouterDecisionsFromInputs(skus, alerts, fxRate);
}

export async function getProfitAdvice(skuId: string): Promise<ProfitAdvice | null> {
  try {
    return await fetchJson<ProfitAdvice>(`/api/skus/${encodeURIComponent(skuId)}/profit-advice`);
  } catch (err) {
    console.warn("Profit advice fetch failed.", err);
    return null;
  }
}

export async function refreshCustomsAlerts(): Promise<{ imported_count: number; skipped_count: number; source: string }> {
  return fetchJson<{ imported_count: number; skipped_count: number; source: string }>("/api/alerts/refresh", {
    method: "POST",
  });
}

export function deriveProfitsFromInputs(skus: SKU[], alerts: CustomsAlert[], fxRate: number): ProfitResult[] {
  const hasDelayRisk = alerts.some((alert) => alert.is_active && /inspection|delay|lampu merah/i.test(`${alert.title} ${alert.body}`));
  return skus.map((sku) => deriveProfitResult(sku, hasDelayRisk, fxRate));
}

export function deriveRouterDecisionsFromInputs(skus: SKU[], alerts: CustomsAlert[], fxRate: number): RouterDecision[] {
  const profits = deriveProfitsFromInputs(skus, alerts, fxRate);
  const compliance = skus.map(deriveComplianceReport);
  return deriveRouterDecisions(skus, profits, compliance, alerts);
}
