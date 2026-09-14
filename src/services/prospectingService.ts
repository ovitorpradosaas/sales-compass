import type { Icp, IcpCriterion } from "@/lib/types";
import { searchGooglePlaces, type GoogleProspectCandidate } from "./prospecting.functions";

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

  const total = criteria.reduce(
    (sum, c) => (checks[c.key] ? sum + Number(c.weight) : sum),
    0,
  );
  return Math.max(0, Math.min(100, Math.round(total)));
}

export async function searchProspects(
  filters: ProspectFilters,
  criteria: IcpCriterion[],
): Promise<ProspectCandidate[]> {
  const candidates = await searchGooglePlaces({ data: filters });

  return candidates
    .map((candidate) => ({
      ...candidate,
      icp_score: computeIcpScore(candidate, filters, criteria),
    }))
    .sort((a, b) => b.icp_score - a.icp_score);
}
