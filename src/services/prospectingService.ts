import type { Icp, IcpCriterion } from "@/lib/types";
import { searchGooglePlaces, type GoogleProspectCandidate } from "./prospecting.functions";

export type QualificationSignal = "website" | "landing_page" | "instagram" | "meta_ads" | "google_ads";
export type QualificationOperator = "has" | "not_has";
export type QualificationMode = "required" | "preferred";

export interface IcpQualificationRule {
  signal: QualificationSignal;
  operator: QualificationOperator;
  mode: QualificationMode;
  weight: number;
}

export const DEFAULT_QUALIFICATION_RULES: IcpQualificationRule[] = [];

export function parseQualificationRules(value: string | null | undefined): IcpQualificationRule[] {
  if (!value) return DEFAULT_QUALIFICATION_RULES;
  try {
    const parsed = JSON.parse(value) as { qualificationRules?: IcpQualificationRule[] };
    return Array.isArray(parsed.qualificationRules) ? parsed.qualificationRules : DEFAULT_QUALIFICATION_RULES;
  } catch {
    return DEFAULT_QUALIFICATION_RULES;
  }
}

export function serializeQualificationRules(rules: IcpQualificationRule[], notes?: string | null) {
  return JSON.stringify({ qualificationRules: rules, notes: notes ?? "" });
}

export interface ProspectFilters {
  niche: string;
  city: string;
  state: string;
  keywords: string;
  revenueMin: number | null;
  revenueMax: number | null;
  employeesMin: number | null;
  employeesMax: number | null;
  requiresWebsite: boolean;
  requiresInstagram: boolean;
  qualificationRules: IcpQualificationRule[];
}

export interface ProspectCandidate extends GoogleProspectCandidate {
  icp_score: number;
}

export function icpToFilters(icp: Icp): ProspectFilters {
  return {
    niche: icp.niche ?? "",
    city: icp.city ?? "",
    state: icp.state ?? "",
    keywords: (icp.keywords ?? []).join(", "),
    revenueMin: icp.revenue_min,
    revenueMax: icp.revenue_max,
    employeesMin: icp.employees_min,
    employeesMax: icp.employees_max,
    requiresWebsite: icp.requires_website,
    requiresInstagram: icp.requires_instagram,
    qualificationRules: parseQualificationRules(icp.other_criteria),
  };
}

export function computeIcpScore(
  candidate: Omit<ProspectCandidate, "icp_score">,
  filters: ProspectFilters,
  criteria: IcpCriterion[],
): number {
  const checks: Record<string, boolean> = {
    niche: !filters.niche || candidate.niche.toLowerCase().includes(filters.niche.toLowerCase()),
    region:
      (!filters.city || candidate.city.toLowerCase().includes(filters.city.toLowerCase())) &&
      (!filters.state || candidate.state.toLowerCase() === filters.state.toLowerCase()),
    revenue:
      candidate.revenue != null &&
      (filters.revenueMin == null || candidate.revenue >= filters.revenueMin) &&
      (filters.revenueMax == null || candidate.revenue <= filters.revenueMax),
    instagram: Boolean(candidate.instagram),
    website: Boolean(candidate.website),
    employees:
      candidate.employees != null &&
      (filters.employeesMin == null || candidate.employees >= filters.employeesMin) &&
      (filters.employeesMax == null || candidate.employees <= filters.employeesMax),
    keyword: candidate.keywordHit,
  };

  for (const rule of filters.qualificationRules) {
    const value = candidate.digitalSignals?.[rule.signal];
    if (value != null) checks[rule.signal] = rule.operator === "has" ? value : !value;
  }

  const total = criteria.reduce((sum, c) => (checks[c.key] ? sum + Number(c.weight) : sum), 0);
  const ruleBonus = filters.qualificationRules.reduce((sum, rule) => {
    const value = candidate.digitalSignals?.[rule.signal];
    if (rule.mode !== "preferred" || value == null) return sum;
    return rule.operator === "has" ? sum + (value ? rule.weight : 0) : sum + (!value ? rule.weight : 0);
  }, 0);

  return Math.max(0, Math.min(100, Math.round(total + ruleBonus)));
}

export async function searchProspects(
  filters: ProspectFilters,
  criteria: IcpCriterion[],
): Promise<ProspectCandidate[]> {
  const candidates = await searchGooglePlaces({ data: filters });
  return candidates
    .map((candidate) => ({ ...candidate, icp_score: computeIcpScore(candidate, filters, criteria) }))
    .sort((a, b) => b.icp_score - a.icp_score);
}
