import { SKU, ComplianceReport, ProfitResult, RouterDecision, CustomsAlert } from "@/types";

export const MOCK_SKUS: SKU[] = [
  {
    sku_id: "SKU-001",
    name: "GlowRadiance Vita Serum",
    category: "Cosmetics",
    bpom_certified: true,
    cost_myr: 45.0,
    price_idr: 250000,
    weight_g: 150,
    description: "Daily vitamin C serum for brightening.",
  },
  {
    sku_id: "VIL-001",
    name: "DoctorSkin Medical Grade Peel",
    category: "Cosmetics",
    bpom_certified: false,
    cost_myr: 30.0,
    price_idr: 450000,
    weight_g: 120,
    description: "Intense medical grade chemical peel. Fast whiten effect.",
  },
  {
    sku_id: "VIL-002",
    name: "Heavy Duty Blender",
    category: "Home Appliances",
    bpom_certified: true,
    cost_myr: 120.0,
    price_idr: 390000,
    weight_g: 2500,
    description: "High power blender. Negative margin due to shipping.",
  },
  {
    sku_id: "SKU-002",
    name: "Matte Lip Cream",
    category: "Cosmetics",
    bpom_certified: true,
    cost_myr: 15.0,
    price_idr: 110000,
    weight_g: 50,
    description: "Long lasting matte lip colour.",
  }
];

export const MOCK_COMPLIANCE: ComplianceReport[] = [
  {
    sku_id: "SKU-001",
    compliant: true,
    violations: [],
    recommendation: "Approved for direct shipping.",
    why_flagged: "No BPOM or claims issues were detected for this SKU.",
    fix_steps: [],
    shipment_status: "Ready to ship"
  },
  {
    sku_id: "VIL-001",
    compliant: false,
    violations: ["Uncertified Cosmetic", "Contains forbidden medical keyword: 'medical grade'"],
    recommendation: "Do not ship until listing claims are corrected and BPOM registration is completed.",
    why_flagged: "This cosmetic product is missing BPOM certification and uses prohibited medical-treatment wording that can trigger BPOM enforcement.",
    fix_steps: [
      "Remove prohibited claims such as 'medical grade' and 'fast whiten' from the product name and description.",
      "Update the listing copy to use non-medical cosmetic wording only.",
      "Submit or attach valid BPOM certification before exporting to Indonesia.",
      "Re-run compliance scan after the product copy and certification details are updated."
    ],
    shipment_status: "Blocked until fixed"
  },
  {
    sku_id: "VIL-002",
    compliant: true,
    violations: [],
    recommendation: "Compliant",
    why_flagged: "No BPOM or restricted-claim issues were detected for this SKU.",
    fix_steps: [],
    shipment_status: "Ready to ship"
  },
  {
    sku_id: "SKU-002",
    compliant: true,
    violations: [],
    recommendation: "Compliant",
    why_flagged: "No BPOM or restricted-claim issues were detected for this SKU.",
    fix_steps: [],
    shipment_status: "Ready to ship"
  }
];

export const MOCK_PROFIT: ProfitResult[] = [
  {
    sku_id: "SKU-001",
    net_profit_myr: 18.5,
    margin_pct: 0.25,
    alert: false,
    explanation: "Healthy margin after 10% duty and standard shipping."
  },
  {
    sku_id: "VIL-001",
    net_profit_myr: 85.0,
    margin_pct: 0.60,
    alert: false,
    explanation: "High margin, but blocked by compliance."
  },
  {
    sku_id: "VIL-002",
    net_profit_myr: -5.50,
    margin_pct: -0.04,
    alert: true,
    explanation: "High dimensional weight causes shipping fees to wipe out margin. Consider sea freight or Jakarta warehouse."
  },
  {
    sku_id: "SKU-002",
    net_profit_myr: 12.0,
    margin_pct: 0.35,
    alert: false,
    explanation: "Excellent margin due to low weight."
  }
];

export const MOCK_ROUTER_DECISIONS: RouterDecision[] = [
  {
    id: "DEC-002",
    action: "Switch affected SKUs to Jakarta Warehouse",
    rationale: "Profit Shield flagged VIL-002 as loss-making under direct shipping, and the active Lampu Merah inspection alert means direct parcels could be delayed up to 14 days. Routing the affected SKUs through Jakarta warehouse protects margin and reduces customs bottlenecks.",
    priority: "URGENT",
    trade_offs: "Warehouse fulfilment costs about RM2.50 more per unit, but it prevents delay-driven losses and protects the margin of the affected SKUs.",
    trigger_summary: "Triggered by Profit Shield negative margin on VIL-002 plus an active customs Lampu Merah inspection alert.",
    affected_skus: ["VIL-002", "SKU-001", "SKU-002"],
    expected_outcome: "Reduce customs delay risk, prevent further margin erosion on VIL-002, and keep healthy SKUs moving with more predictable delivery times.",
    created_at: new Date().toISOString()
  },
  {
    id: "DEC-001",
    action: "Halt Shipment - VIL-001",
    rationale: "Uncertified medical product detected. Prevents RM50,000 fine.",
    priority: "HIGH",
    trade_offs: "Loss of immediate revenue, but avoids severe BPOM penalty.",
    trigger_summary: "Triggered by Compliance Scanner after BPOM and keyword violations were detected.",
    affected_skus: ["VIL-001"],
    expected_outcome: "Avoid customs seizure and BPOM enforcement action while the seller resolves certification.",
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export const MOCK_ALERTS: CustomsAlert[] = [
  {
    id: "ALT-002",
    title: "Beacukai Implements 'Lampu Merah' 100% Inspection",
    body: "Effective immediately, all direct cross-border ecommerce parcels from Malaysia will undergo 100% manual inspection at Soekarno-Hatta due to a surge in uncertified medical devices. Expect delays of 7-14 days for direct channels.",
    date: new Date().toISOString(),
    is_active: true,
    impact_summary: "Direct shipping from Malaysia is at high delay risk for the next 7-14 days, especially for sensitive or high-volume parcels.",
    affected_targets: ["Direct shipping route", "VIL-002", "SKU-001", "SKU-002"],
    next_action: "Open Smart Router and move affected direct-shipping SKUs to Jakarta Warehouse.",
    triggered_modules: ["Policy Sentinel", "Smart Router"]
  },
  {
    id: "ALT-001",
    title: "Tariff Hike on Cosmetic Serums",
    body: "Import duties for HS Code 3304.99 (Beauty Serums) have been increased to 15%. All shipments arriving after Friday must declare under the new rate.",
    date: new Date(Date.now() - 86400000).toISOString(),
    is_active: false,
    impact_summary: "Cosmetic serum margins will tighten under the new import duty rate, especially on lower-margin SKUs.",
    affected_targets: ["Cosmetic serums", "GlowRadiance Vita Serum"],
    next_action: "Recalculate affected SKU margins in Profit Shield before the next shipment batch.",
    triggered_modules: ["Policy Sentinel", "Profit Shield"]
  }
];
