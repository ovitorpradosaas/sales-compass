import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreBadge } from "@/components/app/ScoreBadge";
import { currentUserId } from "@/lib/session";
import { useCriteria, useIcps, useInvalidate, useStages } from "@/lib/queries";
import { icpToFilters, searchProspects, type ProspectCandidate, type ProspectFilters } from "@/services/prospectingService";

export const Route = createFileRoute("/_authenticated/prospeccao")({
  head: () => ({
    meta: [
      { title: "Prospecção — ProspectFlow" },
      { name: "description", content: "Busque potenciais clientes por ICP, nicho, região e presença digital." },
      { property: "og:title", content: "Prospecção — ProspectFlow" },
      { property: "og:description", content: "Busca de prospects por ICP e filtros." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProspeccaoPage,
});

const EMPTY: ProspectFilters = {
  niche: "", city: "", state: "", keywords: "",
  revenueMin: null, revenueMax: null, employeesMin: null, employeesMax: null,
  requiresWebsite: false, requiresInstagram: false, qualificationRules: [],
};

function ProspeccaoPage() {
  const { data: icps = [] } = useIcps();
  const { data: criteria = [] } = useCriteria();
  const { data: stages = [] } = useStages();
  const invalidate = useInvalidate();
  const [filters, setFilters] = useState<ProspectFilters>(EMPTY);
  const [icpId, setIcpId] = useState<string>("manual");
  const [results, setResults] = useState<ProspectCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProspectFilters>(key: K, value: ProspectFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const applyIcp = (id: string) => { setIcpId(id); const icp = icps.find((i) => i.id === id); setFilters(icp ? icpToFilters(icp) : EMPTY); };
  const run = async () => {
    setLoading(true);
    try { const found = await searchProspects(filters, criteria); setResults(found); setSelected(new Set()); if (found.length === 0) toast.info("Nenhum prospect com esses filtros."); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Falha na busca."); }
    finally { setLoading(false); }
  };
  const toggle = (id: string) => setSelected((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const chosen = (results ?? []).filter((r) => selected.has(r.externalId));
  const save = async (toPipeline: boolean) => {
    if (chosen.length === 0) return;
    setSaving(true);
    try {
      const userId = await currentUserId(); const firstStage = stages[0];
      const rows = chosen.map((c) => ({ user_id: userId, company: c.company, niche: c.niche, city: c.city, state: c.state, website: c.website, instagram: c.instagram, phone: c.phone, whatsapp: c.whatsapp, email: c.email, contact_name: c.contact_name, contact_role: c.contact_role, revenue: c.revenue, employees: c.employees, icp_score: c.icp_score, icp_id: icpId === "manual" ? null : icpId, source: c.source, status: toPipeline ? "contatar" : "novo", stage_id: toPipeline ? (firstStage?.id ?? null) : null }));
      const { data, error } = await supabase.from("prospects").insert(rows).select("id");
      if (error) throw new Error(error.message);
      await supabase.from("activities").insert((data ?? []).map((p) => ({ user_id: userId, prospect_id: p.id, type: "prospect_encontrado", description: toPipeline ? "Adicionado ao pipeline pela busca" : "Adicionado à base pela busca" })));
      invalidate(["prospects", "activities"]); toast.success(`${rows.length} prospect(s) salvo(s).`); setSelected(new Set());
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  };
  const exportCsv = () => {
    const list = chosen.length > 0 ? chosen : (results ?? []); if (list.length === 0) return;
    const header = "empresa,nicho,cidade,estado,site,instagram,telefone,contato,cargo,score";
    const body = list.map((c) => [c.company, c.niche, c.city, c.state, c.website ?? "", c.instagram ?? "", c.phone ?? "", c.contact_name ?? "", c.contact_role ?? "", c.icp_score].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "prospects.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-semibold">Prospecção</h1><p className="mt-1 text-sm text-muted-foreground">Escolha um ICP salvo ou ajuste os filtros manualmente.</p></div><Button onClick={() => void run()} disabled={loading}>{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}Encontrar prospects</Button></header>
      <Card className="glass"><CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="space-y-1.5"><Label>ICP</Label><Select value={icpId} onValueChange={applyIcp}><SelectTrigger><SelectValue placeholder="Filtros manuais" /></SelectTrigger><SelectContent><SelectItem value="manual">Filtros manuais</SelectItem>{icps.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select></div>
        <Text label="Nicho" value={filters.niche} onChange={(v) => set("niche", v)} /><Text label="Cidade" value={filters.city} onChange={(v) => set("city", v)} /><Text label="Estado" value={filters.state} onChange={(v) => set("state", v)} />
        <Num label="Faturamento mín." value={filters.revenueMin} onChange={(v) => set("revenueMin", v)} /><Num label="Faturamento máx." value={filters.revenueMax} onChange={(v) => set("revenueMax", v)} /><Num label="Funcionários mín." value={filters.employeesMin} onChange={(v) => set("employeesMin", v)} /><Num label="Funcionários máx." value={filters.employeesMax} onChange={(v) => set("employeesMax", v)} />
        <div className="md:col-span-2"><Text label="Palavras-chave (separadas por vírgula)" value={filters.keywords} onChange={(v) => set("keywords", v)} /></div>
        <div className="flex items-end gap-6 md:col-span-2"><label className="flex items-center gap-2 text-sm"><Checkbox checked={filters.requiresWebsite} onCheckedChange={(c) => set("requiresWebsite", c === true)} />Tem site</label><label className="flex items-center gap-2 text-sm"><Checkbox checked={filters.requiresInstagram} onCheckedChange={(c) => set("requiresInstagram", c === true)} />Tem Instagram</label></div>
      </CardContent></Card>
      {results && <><div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground">{results.length} resultado(s) · {selected.size} selecionado(s)</span><div className="ml-auto flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={saving || selected.size === 0} onClick={() => void save(false)}>Adicionar aos prospects</Button><Button size="sm" disabled={saving || selected.size === 0} onClick={() => void save(true)}>Adicionar ao pipeline</Button><Button size="sm" variant="ghost" onClick={exportCsv}>Exportar CSV</Button></div></div><Card className="glass overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>Empresa</TableHead><TableHead>Nicho</TableHead><TableHead>Cidade</TableHead><TableHead>UF</TableHead><TableHead>Site</TableHead><TableHead>Instagram</TableHead><TableHead>Telefone</TableHead><TableHead>Contato</TableHead><TableHead>Cargo</TableHead><TableHead>Score</TableHead></TableRow></TableHeader><TableBody>{results.map((r) => <TableRow key={r.externalId}><TableCell><Checkbox checked={selected.has(r.externalId)} onCheckedChange={() => toggle(r.externalId)} aria-label={`Selecionar ${r.company}`} /></TableCell><TableCell className="font-medium">{r.company}</TableCell><TableCell>{r.niche}</TableCell><TableCell>{r.city}</TableCell><TableCell>{r.state}</TableCell><TableCell className="max-w-40 truncate text-muted-foreground">{r.website ?? "—"}</TableCell><TableCell className="text-muted-foreground">{r.instagram ?? "—"}</TableCell><TableCell className="text-muted-foreground">{r.phone ?? "—"}</TableCell><TableCell>{r.contact_name ?? "—"}</TableCell><TableCell className="text-muted-foreground">{r.contact_role ?? "—"}</TableCell><TableCell><ScoreBadge score={r.icp_score} /></TableCell></TableRow>)}</TableBody></Table></Card></>}
    </div>
  );
}
function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <div className="space-y-1.5"><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} /></div>; }
function Num({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) { return <div className="space-y-1.5"><Label>{label}</Label><Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} /></div>; }
