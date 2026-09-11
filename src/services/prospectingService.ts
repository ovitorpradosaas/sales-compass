/**
 * =============================================================================
 * CAMADA DE INTEGRAÇÃO — FONTES DE PROSPECÇÃO
 * =============================================================================
 * Este arquivo é a ÚNICA fronteira entre a interface e a origem dos prospects.
 *
 * >>> INÍCIO DO MOCK <<<
 * Hoje `searchProspects` devolve dados FICTÍCIOS gerados localmente.
 * Para conectar uma API real (Apollo, Serper, Google Places, base própria...):
 *   1. Crie um createServerFn que chame a API externa usando um secret no servidor.
 *   2. Substitua o corpo de `searchProspects` pela chamada a esse serverFn.
 *   3. Mantenha o mesmo formato de retorno (`ProspectCandidate[]`) — nenhuma tela
 *      precisará ser alterada.
 * >>> FIM DO MOCK está marcado abaixo <<<
 */
import type { Icp, IcpCriterion } from "@/lib/types";

export interface ProspectFilters {
  niche: string;
  city: string;
  state: string;
  keywords: string;
  revenueMin?: number;
  revenueMax?: number;
  employeesMin?: number;
  employeesMax?: number;
  requiresWebsite: boolean;
  requiresInstagram: boolean;
}

export interface ProspectCandidate {
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
  contact_role: string | null
  revenue: number | null;
  employees: number | null;
  keywordHit: boolean;
  icp_score: number;
  source: string;
}

export function icpToFilters(icp: Icp): ProspectFilters {
  return {
    niche: icp.niche ?? "",
    city: icp.city ?? "",
    state: icp.state ?? "",
    keywords: (icp.keywords ?? []).join(", "),
    revenueMin: icp.revenue_min ?? undefined,
    revenueMax: icp.revenue_max ?? undefined,
    employeesMin: icp.employees_min ?? undefined,
    employeesMax: icp.employees_max ?? undefined,
    requiresWebsite: icp.requires_website,
    requiresInstagram: icp.requires_instagram,
  };
}

/**
 * Cálculo do ICP Score a partir dos critérios configuráveis do usuário
 * (tabela `icp_criteria`). Pesos editáveis em Configurações.
 */
export function computeIcpScore(
  candidate: Omit<ProspectCandidate, "icp_score">,
  filters: ProspectFilters,
  criteria: IcpCriterion[],
): number {
  const checks: Record<string, boolean> = {
    niche: !filters.niche || candidate.niche.toLowerCase().includes(filters.niche.toLowerCase()),
    region:
      (!filters.city || candidate.city.toLowerCase() === filters.city.toLowerCase()) &&
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

// ============================ >>> INÍCIO DO MOCK <<< =========================
const MOCK_COMPANIES = [
  ["Imobiliária Prime", "Imobiliária", "Curitiba", "PR", "João Silva", "Diretor Comercial"],
  ["Alto Padrão Imóveis", "Imobiliária", "Curitiba", "PR", "Marina Costa", "Sócia"],
  ["Clínica Vitalis", "Clínica", "Florianópolis", "SC", "Dra. Helena Braga", "Proprietária"],
  ["Odonto Sorriso Real", "Odontologia", "Joinville", "SC", "Rafael Muniz", "Gestor"],
  ["Studio Arq Nova", "Arquitetura", "São Paulo", "SP", "Carla Nunes", "Arquiteta Sócia"],
  ["Escola Horizonte", "Educação", "Campinas", "SP", "Pedro Almeida", "Diretor"],
  ["Vetor Contabilidade", "Contabilidade", "Porto Alegre", "RS", "Luiz Fontes", "Sócio"],
  ["Bella Estética Avançada", "Estética", "Belo Horizonte", "MG", "Fernanda Rocha", "CEO"],
  ["Construtora Âncora", "Construção", "Curitiba", "PR", "Marcelo Dias", "Diretor"],
  ["Pet Care Premium", "Pet", "Rio de Janeiro", "RJ", "Aline Prado", "Fundadora"],
  ["Advocacia Meireles", "Jurídico", "Brasília", "DF", "Sérgio Meireles", "Sócio"],
  ["Academia Movimento", "Fitness", "Goiânia", "GO", "Tiago Ramos", "Proprietário"],
];

function slug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * MOCK: simula uma consulta a uma fonte externa de dados.
 * Substituir por chamada real (serverFn → API) mantendo a assinatura.
 */
export async function searchProspects(
  filters: ProspectFilters,
  criteria: IcpCriterion[],
): Promise<ProspectCandidate[]> {
  await new Promise((r) => setTimeout(r, 700)); // latência simulada

  const keywords = filters.keywords
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const candidates = MOCK_COMPANIES.map(
    ([company, niche, city, state, contact, role], i) => {
      const hasSite = i % 5 !== 3;
      const hasInsta = i % 4 !== 2;
      const base: Omit<ProspectCandidate, "icp_score"> = {
        externalId: `mock-${slug(company!)}`,
        company: company!,
        niche: niche!,
        city: city!,
        state: state!,
        website: hasSite ? `https://www.${slug(company!)}.com.br` : null,
        instagram: hasInsta ? `@${slug(company!)}` : null,
        phone: `+55 ${41 + (i % 8)} 9${1000 + i}-${2000 + i * 7}`,
        whatsapp: `+55 ${41 + (i % 8)} 9${1000 + i}-${2000 + i * 7}`,
        email: `contato@${slug(company!)}.com.br`,
        contact_name: contact!,
        contact_role: role!,
        revenue: 40000 * (i + 2),
        employees: 4 + i * 3,
        keywordHit:
          keywords.length === 0
            ? false
            : keywords.some(
                (k) =>
                  company!.toLowerCase().includes(k) || niche!.toLowerCase().includes(k),
              ),
        source: "mock",
      };
      return base;
    },
  )
    .filter((c) => (filters.niche ? c.niche.toLowerCase().includes(filters.niche.toLowerCase()) : true))
    .filter((c) => (filters.city ? c.city.toLowerCase().includes(filters.city.toLowerCase()) : true))
    .filter((c) => (filters.state ? c.state.toLowerCase() === filters.state.toLowerCase() : true))
    .filter((c) => (filters.requiresWebsite ? Boolean(c.website) : true))
    .filter((c) => (filters.requiresInstagram ? Boolean(c.instagram) : true));

  return candidates
    .map((c) => ({ ...c, icp_score: computeIcpScore(c, filters, criteria) }))
    .sort((a, b) => b.icp_score - a.icp_score);
}
// ============================= >>> FIM DO MOCK <<< ===========================
