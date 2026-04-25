export interface SKU {
  sku_id: string;
  name: string;
  category: string;
  bpom_certified: boolean;
  cost_myr: number;
  price_idr: number;
  weight_g: number;
  description: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ComplianceEvidence {
  id: string;
  type: "bpom" | "claim";
  title: string;
  detail: string;
  field?: "name" | "description" | "bpom_certified";
  matched_text?: string;
  source_title: string;
  source_url: string;
  source_kind: "official_regulation" | "official_service" | "official_enforcement";
}

export interface ComplianceReport {
  sku_id: string;
  compliant: boolean;
  violations: string[];  
  recommendation: string;
  why_flagged?: string;
  fix_steps?: string[];
  shipment_status?: string;
  evidence?: ComplianceEvidence[];
}

export interface ComplianceAdvice {
  sku_id: string;
  source: string;
  summary: string;
  action_plan: string[];
  rewrite_examples: string[];
}

export interface ProfitResult {
  sku_id: string;
  net_profit_myr: number;
  margin_pct: number;
  alert: boolean;
  explanation: string;
}

export interface RouterDecision {
  id: string;
  action: string;
  rationale: string;
  priority: RiskLevel;
  trade_offs: string;
  trigger_summary: string;
  affected_skus: string[];
  expected_outcome: string;
  created_at: string;
}

export interface CustomsAlert {
  id: string;
  title: string;
  body: string;
  date: string;
  is_active: boolean;
  severity?: RiskLevel | string;
  risk_type?: string;
  impact_summary?: string;
  affected_targets?: string[];
  affected_skus?: string[];
  next_action?: string;
  triggered_modules?: string[];
  source?: string;
  source_url?: string;
}

export interface ProfitAdviceOption {
  option_id: string;
  title: string;
  detail: string;
  button_label: string;
  href: string;
}

export interface ProfitAdvice {
  sku_id: string;
  best_option_id: string;
  headline: string;
  rationale: string;
  source: string;
  options: ProfitAdviceOption[];
}
