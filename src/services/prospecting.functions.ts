import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ProspectFiltersSchema = z.object({
  niche: z.string(),
  city: z.string(),
  state: z.string(),
  keywords: z.string(),
  revenueMin: z.number().nullable(),
  revenueMax: z.number().nullable(),
  employeesMin: z.number().nullable(),
  employeesMax: z.number().nullable(),
  requiresWebsite: z.boolean(),
  requiresInstagram: z.boolean(),
});

type ProspectFilters = z.infer<typeof ProspectFiltersSchema>;

export interface GoogleProspectCandidate {
  externalId: string;
  company: string;
  niche: string;
  city: string;
  state: string;
  website: string | null;
  instagram: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  contact_name: string | null;
  contact_role: string | null;
  revenue: number | null;
  employees: number | null;
  keywordHit: boolean;
  source: "google_places";
}

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.primaryTypeDisplayName",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "nextPageToken",
].join(",");

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseAddress(address: string | undefined, filters: ProspectFilters) {
  const parts = (address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const city = filters.city.trim() || parts.at(-3) || parts.at(-2) || "";
  const state = filters.state.trim() || extractBrazilianState(parts);

  return { city, state };
}

function extractBrazilianState(parts: string[]) {
  const statePart = parts.find((part) => /\b[A-Z]{2}\b/.test(part));
  const match = statePart?.match(/\b([A-Z]{2})\b/);
  return match?.[1] ?? "";
}

function buildTextQuery(filters: ProspectFilters) {
  const niche = filters.niche.trim();
  const keywords = filters.keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  const location = [filters.city.trim(), filters.state.trim(), "Brasil"]
    .filter(Boolean)
    .join(", ");

  const query = [niche || "empresas", keywords].filter(Boolean).join(" ");
  return location ? `${query} em ${location}` : `${query} no Brasil`;
}

function extractInstagram(html: string, baseUrl: string) {
  const matches = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._-]+\/?/gi) ?? [];
  const url = matches.find((value) => !/instagram\.com\/(?:p|reel|reels|stories|explore|accounts)\//i.test(value));
  if (!url) return null;

  try {
    return new URL(url, baseUrl).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function enrichInstagram(website: string | null) {
  if (!website) return null;

  try {
    const response = await fetch(website, {
      headers: { "User-Agent": "Mozilla/5.0 SalesCompass/1.0" },
      signal: AbortSignal.timeout(3500),
      redirect: "follow",
    });

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await response.text();
    return extractInstagram(html, response.url || website);
  } catch {
    return null;
  }
}

async function fetchGooglePage(
  apiKey: string,
  filters: ProspectFilters,
  pageToken?: string,
) {
  const body: Record<string, unknown> = {
    textQuery: buildTextQuery(filters),
    pageSize: 20,
    languageCode: "pt-BR",
    regionCode: "BR",
  };

  if (pageToken) body.pageToken = pageToken;

  const response = await fetch(GOOGLE_PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      primaryTypeDisplayName?: { text?: string };
      websiteUri?: string;
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
    }>;
    nextPageToken?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `Google Places retornou HTTP ${response.status}.`);
  }

  return payload;
}

export const searchGooglePlaces = createServerFn({ method: "POST" })
  .validator(ProspectFiltersSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Google Places não está configurado. Defina GOOGLE_MAPS_API_KEY no ambiente do servidor.",
      );
    }

    const candidates: GoogleProspectCandidate[] = [];
    const seen = new Set<string>();
    let pageToken: string | undefined;

    for (let page = 0; page < 3; page += 1) {
      const result = await fetchGooglePage(apiKey, data, pageToken);

      for (const place of result.places ?? []) {
        if (!place.id || seen.has(place.id)) continue;
        seen.add(place.id);

        const company = place.displayName?.text?.trim() || "Empresa sem nome";
        const address = parseAddress(place.formattedAddress, data);
        const niche = place.primaryTypeDisplayName?.text?.trim() || data.niche.trim() || "Empresa";
        const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || null;
        const keywords = data.keywords
          .split(",")
          .map((keyword) => normalize(keyword))
          .filter(Boolean);
        const searchableText = normalize(`${company} ${niche}`);

        if (data.requiresWebsite && !place.websiteUri) continue;

        candidates.push({
          externalId: place.id,
          company,
          niche,
          city: address.city,
          state: address.state,
          website: place.websiteUri ?? null,
          instagram: null,
          phone,
          whatsapp: phone,
          email: null,
          contact_name: null,
          contact_role: null,
          revenue: null,
          employees: null,
          keywordHit: keywords.length > 0 && keywords.some((keyword) => searchableText.includes(keyword)),
          source: "google_places",
        });
      }

      if (!result.nextPageToken || candidates.length >= 60) break;
      pageToken = result.nextPageToken;
    }

    if (data.requiresInstagram) {
      const enriched = await Promise.all(
        candidates.map(async (candidate) => ({
          ...candidate,
          instagram: await enrichInstagram(candidate.website),
        })),
      );
      return enriched.filter((candidate) => Boolean(candidate.instagram)).slice(0, 60);
    }

    return candidates.slice(0, 60);
  });
