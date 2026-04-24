import { ComplianceReport, SKU } from "@/types";

type Guidance = {
  whyFlagged: string;
  recommendation: string;
  shipmentStatus: string;
  fixSteps: string[];
  replacementExamples: string[];
};

const CLAIM_REPLACEMENTS: Record<string, string[]> = {
  "medical grade": [
    "cosmetic exfoliating formula",
    "professional-use cosmetic peel",
    "resurfacing skincare formula",
  ],
  "fast whiten": [
    "brightening effect",
    "radiance-enhancing result",
    "helps improve skin appearance",
  ],
  cure: [
    "helps soothe the look of skin",
    "supports daily skincare",
    "comfort-focused cosmetic care",
  ],
  clinical: [
    "tested cosmetic formula",
    "premium skincare formula",
    "targeted cosmetic care",
  ],
};

function extractForbiddenTerms(violations: string[]): string[] {
  const joined = violations.join(" ").toLowerCase();
  return Object.keys(CLAIM_REPLACEMENTS).filter((term) => joined.includes(term));
}

export function buildComplianceGuidance(
  sku: SKU | null,
  report: ComplianceReport | null
): Guidance | null {
  if (!sku || !report) {
    return null;
  }

  if (report.compliant) {
    return {
      whyFlagged:
        report.why_flagged ?? "No BPOM or restricted-claim issues were detected for this SKU.",
      recommendation: report.recommendation ?? "Ready for shipment.",
      shipmentStatus: report.shipment_status ?? "Ready to ship",
      fixSteps:
        report.fix_steps && report.fix_steps.length > 0
          ? report.fix_steps
          : ["No changes needed. This SKU can proceed under the current compliance rules."],
      replacementExamples: [],
    };
  }

  const forbiddenTerms = extractForbiddenTerms(report.violations);
  const replacementExamples = forbiddenTerms.flatMap((term) =>
    (CLAIM_REPLACEMENTS[term] ?? []).map((replacement) => `Replace "${term}" with "${replacement}"`)
  );

  const fixSteps = [
    !sku.bpom_certified
      ? "Add valid BPOM certification details before listing or shipping this SKU to Indonesia."
      : null,
    forbiddenTerms.length > 0
      ? `Rewrite the product name and description so they stay cosmetic and avoid restricted claims like ${forbiddenTerms
          .map((term) => `"${term}"`)
          .join(", ")}.`
      : null,
    "Review the updated listing copy and run the compliance scan again before shipment.",
  ].filter(Boolean) as string[];

  return {
    whyFlagged:
      report.why_flagged ??
      "This SKU triggered one or more BPOM or customs compliance checks and needs correction before shipment.",
    recommendation:
      report.recommendation ??
      "Hold shipment until certification and listing copy are corrected.",
    shipmentStatus: report.shipment_status ?? "Blocked until fixed",
    fixSteps: report.fix_steps && report.fix_steps.length > 0 ? report.fix_steps : fixSteps,
    replacementExamples,
  };
}
