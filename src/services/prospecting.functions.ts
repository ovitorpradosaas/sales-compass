import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const QualificationRuleSchema = z.object({
  signal: z.enum(["website", "landing_page", "instagram", "meta_ads", "google_ads"]),
  operator: z.enum(["has", "not_has"]),
  mode: z.enum(["required", "preferred"]),
  weight: z.number().min(0).max(100),
});

const ProspectFiltersSchema = z.object({
  niche: z.string(), city: z.string(), state: z.string(), keywords: z.string(),
  revenueMin: z.number().nullable(), revenueMax: z.number().nullable(),
  employeesMin: z.number().nullable(), employeesMax: z.number().nullable(),
  requiresWebsite: z.boolean(), requiresInstagram: z.boolean(),
  qualificationRules: z.array(QualificationRuleSchema).default([]),
});

type ProspectFilters = z.infer<typeof ProspectFiltersSchema>;
type DigitalSignals = { website: boolean; landing_page: boolean | null; instagram: boolean; meta_ads: boolean | null; google_ads: boolean | null };

export interface GoogleProspectCandidate {
  externalId: string; company: string; niche: string; city: string; state: string;
  website: string | null; instagram: string | null; phone: string | null; whatsapp: string | null;
  email: string | null; contact_name: string | null; contact_role: string | null;
  revenue: number | null; employees: number | null; keywordHit: boolean;
  digitalSignals: DigitalSignals; source: "google_places";
}

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = ["places.id","places.displayName","places.formattedAddress","places.primaryTypeDisplayName","places.websiteUri","places.nationalPhoneNumber","places.internationalPhoneNumber","nextPageToken"].join(",");

function normalize(value: string | null | undefined) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function parseAddress(address: string | undefined, filters: ProspectFilters) {
  const parts = (address ?? "").split(",").map((part) => part.trim()).filter(Boolean);
  return { city: filters.city.trim() || parts.at(-3) || parts.at(-2) || "", state: filters.state.trim() || extractBrazilianState(parts) };
}
function extractBrazilianState(parts: string[]) { return parts.find((p) => /\b[A-Z]{2}\b/.test(p))?.match(/\b([A-Z]{2})\b/)?.[1] ?? ""; }
function buildTextQuery(filters: ProspectFilters) {
  const niche = filters.niche.trim();
  const keywords = filters.keywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 3).join(" ");
  const location = [filters.city.trim(), filters.state.trim(), "Brasil"].filter(Boolean).join(", ");
  const query = [niche || "empresas", keywords].filter(Boolean).join(" ");
  return location ? `${query} em ${location}` : `${query} no Brasil`;
}
function extractInstagram(html: string, baseUrl: string) {
  const matches = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._-]+\/?/gi) ?? [];
  const url = matches.find((value) => !/instagram\.com\/(?:p|reel|reels|stories|explore|accounts)\//i.test(value));
  if (!url) return null;
  try { return new URL(url, baseUrl).toString().replace(/\/$/, ""); } catch { return null; }
}
function extractLandingPageSignal(html: string, url: string) {
  const text = normalize(html); const path = normalize(new URL(url).pathname);
  return /(^|\/)(lp|landing|landing-page|captura|oferta|produto)(\/|$)/i.test(path) || (/<form\b/i.test(html) && /(fale conosco|agende|orcamento|solicite|quero saber|entre em contato|compre agora|saiba mais)/i.test(text));
}
async function inspectWebsite(website: string | null) {
  if (!website) return { instagram: null, landing_page: false };
  try {
    const response = await fetch(website, { headers: { "User-Agent": "Mozilla/5.0 SalesCompass/1.0" }, signal: AbortSignal.timeout(2500), redirect: "follow" });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return { instagram: null, landing_page: null };
    const html = await response.text();
    return { instagram: extractInstagram(html, response.url || website), landing_page: extractLandingPageSignal(html, response.url || website) };
  } catch { return { instagram: null, landing_page: null }; }
}
function matchesRule(candidate: GoogleProspectCandidate, rule: z.infer<typeof QualificationRuleSchema>) {
  const value = candidate.digitalSignals[rule.signal];
  if (value == null) return rule.mode !== "required";
  return rule.operator === "has" ? value : !value;
}
async function fetchGooglePage(apiKey: string, filters: ProspectFilters, pageToken?: string) {
  const body: Record<string, unknown> = { textQuery: buildTextQuery(filters), pageSize: 20, languageCode: "pt-BR", regionCode: "BR" };
  if (pageToken) body.pageToken = pageToken;
  const response = await fetch(GOOGLE_PLACES_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  const payload = (await response.json()) as { places?: Array<{ id?: string; displayName?: { text?: string }; formattedAddress?: string; primaryTypeDisplayName?: { text?: string }; websiteUri?: string; nationalPhoneNumber?: string; internationalPhoneNumber?: string }>; nextPageToken?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || `Google Places retornou HTTP ${response.status}.`);
  return payload;
}

async function mapWithConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency = 8) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export const searchGooglePlaces = createServerFn({ method: "POST" }).validator(ProspectFiltersSchema).handler(async ({ data }) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("A prospecção ainda não está configurada: falta GOOGLE_MAPS_API_KEY no ambiente do servidor.");

  const candidates: GoogleProspectCandidate[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;

  // Two pages give up to 40 companies while keeping the first search responsive.
  for (let page = 0; page < 2; page += 1) {
    const result = await fetchGooglePage(apiKey, data, pageToken);
    const places = (result.places ?? []).filter((place) => place.id && !seen.has(place.id));
    places.forEach((place) => seen.add(place.id!));

    const baseCandidates = places.map((place) => {
      const company = place.displayName?.text?.trim() || "Empresa sem nome";
      const address = parseAddress(place.formattedAddress, data);
      const niche = place.primaryTypeDisplayName?.text?.trim() || data.niche.trim() || "Empresa";
      const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || null;
      const keywords = data.keywords.split(",").map(normalize).filter(Boolean);
      return { place, company, address, niche, phone, keywords };
    }).filter(({ place }) => !data.requiresWebsite || Boolean(place.websiteUri));

    const enriched = await mapWithConcurrency(baseCandidates, async ({ place, company, address, niche, phone, keywords }) => {
      const web = await inspectWebsite(place.websiteUri ?? null);
      return {
        externalId: place.id!, company, niche, city: address.city, state: address.state,
        website: place.websiteUri ?? null, instagram: web.instagram, phone, whatsapp: phone,
        email: null, contact_name: null, contact_role: null, revenue: null, employees: null,
        keywordHit: keywords.length > 0 && keywords.some((keyword) => normalize(`${company} ${niche}`).includes(keyword)),
        digitalSignals: { website: Boolean(place.websiteUri), landing_page: web.landing_page, instagram: Boolean(web.instagram), meta_ads: null, google_ads: null },
        source: "google_places" as const,
      } satisfies GoogleProspectCandidate;
    }, 8);

    const requiredRules = data.qualificationRules.filter((rule) => rule.mode === "required");
    for (const candidate of enriched) {
      if (data.requiresInstagram && !candidate.instagram) continue;
      if (requiredRules.some((rule) => !matchesRule(candidate, rule))) continue;
      candidates.push(candidate);
    }

    if (!result.nextPageToken || candidates.length >= 40) break;
    pageToken = result.nextPageToken;
  }

  return candidates.slice(0, 40);
});
