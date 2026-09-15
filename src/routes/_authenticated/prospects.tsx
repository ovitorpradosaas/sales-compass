import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search, SlidersHorizontal, Trash2, Tags } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreBadge } from "@/components/app/ScoreBadge";
import { ProspectSheet } from "@/components/app/ProspectSheet";
import { useInvalidate, useProspectTags, useProspects, useStages, useTags } from "@/lib/queries";
import { PROSPECT_STATUSES, type Prospect } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/prospects")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q : "" }),
  head: () => ({ meta: [{ title: "Prospects — ProspectFlow" }, { name: "robots", content: "noindex" }] }),
  component: ProspectsPage,
});

type SortKey = "created_at" | "company" | "icp_score";

function ProspectsPage() {
  const { q } = Route.useSearch();
  const { data: prospects = [], isLoading } = useProspects();
  const { data: stages = [] } = useStages();
  const { data: tags = [] } = useTags();
  const { data: links = [] } = useProspectTags();
  const invalidate = useInvalidate();
  const [term, setTerm] = useState(q);
  const [status, setStatus] = useState("todos");
  const [sort, setSort] = useState<SortKey>("created_at");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Prospect | null>(null);

  const rows = useMemo(() => {
    const t = term.trim().toLowerCase();
    return prospects.filter((p) => t ? [p.company, p.contact_name, p.city, p.niche, p.state].filter(Boolean).some((v) => String(v).toLowerCase().includes(t)) : true)
      .filter((p) => status === "todos" ? true : p.status === status)
      .sort((a, b) => sort === "company" ? a.company.localeCompare(b.company) : sort === "icp_score" ? b.icp_score - a.icp_score : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [prospects, term, status, sort]);

  const toggle = (id: string) => setSelected((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const removeSelected = async () => {
    const ids = [...selected]; if (!ids.length) return;
    const { error } = await supabase.from("prospects").delete().in("id", ids);
    if (error) return void toast.error(error.message);
    setSelected(new Set()); invalidate(["prospects"]); toast.success(`${ids.length} prospect(s) excluído(s).`);
  };

  const applyTag = async (tagId: string) => {
    const ids = [...selected]; if (!ids.length) return;
    const { error } = await supabase.from("prospect_tags").upsert(ids.map((prospect_id) => ({ prospect_id, tag_id: tagId })), { onConflict: "prospect_id,tag_id" });
    if (error) return void toast.error(error.message);
    invalidate(["prospect_tags"]); toast.success("Tag aplicada.");
  };

  const exportCsv = () => {
    const list = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
    const header = "empresa,contato,cargo,telefone,whatsapp,site,instagram,cidade,estado,nicho,score,status";
    const body = list.map((p) => [p.company, p.contact_name, p.contact_role, p.phone, p.whatsapp, p.website, p.instagram, p.city, p.state, p.niche, p.icp_score, p.status].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "meus-prospects.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Base comercial</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Prospects</h1><p className="mt-1.5 text-sm text-muted-foreground">{prospects.length} empresas na sua base · abra uma linha para ver o histórico completo.</p></div>
      <Button asChild variant="outline" className="w-fit"><a href="/prospeccao"><Search className="mr-2 size-4" />Encontrar prospects</a></Button>
    </header>

    <Card className="glass rounded-2xl">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar empresa, contato, cidade ou nicho..." className="h-10 pl-9" aria-label="Buscar prospects" /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-10 w-full lg:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os status</SelectItem>{PROSPECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}><SelectTrigger className="h-10 w-full lg:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="created_at">Mais recentes</SelectItem><SelectItem value="company">Empresa (A-Z)</SelectItem><SelectItem value="icp_score">Maior ICP Score</SelectItem></SelectContent></Select>
          <div className="flex gap-2 lg:ml-auto">
            {selected.size > 0 && tags.length > 0 && <Select onValueChange={(v) => void applyTag(v)}><SelectTrigger className="h-10 w-40"><Tags className="mr-2 size-4" /><SelectValue placeholder="Adicionar tag" /></SelectTrigger><SelectContent>{tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>}
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-2 size-4" />Exportar</Button>
            <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => void removeSelected()} className="text-destructive hover:text-destructive"><Trash2 className="mr-2 size-4" />Excluir</Button>
          </div>
        </div>
        {selected.size > 0 && <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary/6 px-3 py-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5 text-primary" />{selected.size} selecionado(s) para ação em massa.</div>}
      </CardContent>
    </Card>

    <Card className="glass overflow-hidden rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-4 py-3"><CardTitle className="text-sm">Sua base</CardTitle><Badge variant="secondary" className="rounded-full">{rows.length} visíveis</Badge></CardHeader>
      <CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-muted/35"><TableHead className="w-10"></TableHead><TableHead>Empresa</TableHead><TableHead>Contato</TableHead><TableHead>WhatsApp</TableHead><TableHead>Cidade</TableHead><TableHead>Score</TableHead><TableHead>Etapa</TableHead><TableHead>Status</TableHead><TableHead>Próxima ação</TableHead></TableRow></TableHeader><TableBody>
        {isLoading && <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Carregando prospects...</TableCell></TableRow>}
        {!isLoading && !rows.length && <TableRow><TableCell colSpan={9} className="h-28 text-center text-muted-foreground">Nenhum prospect encontrado. Ajuste os filtros ou faça uma nova busca.</TableCell></TableRow>}
        {rows.map((p) => { const stage = stages.find((s) => s.id === p.stage_id); const ptags = links.filter((l) => l.prospect_id === p.id).map((l) => tags.find((t) => t.id === l.tag_id)?.name).filter(Boolean); return <TableRow key={p.id} className="cursor-pointer border-border/60 transition-colors hover:bg-primary/[.035]" onClick={() => setOpen(p)}>
          <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Selecionar ${p.company}`} /></TableCell>
          <TableCell><div className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{p.company?.[0]?.toUpperCase() ?? "P"}</span><div className="min-w-0"><p className="truncate font-medium">{p.company}</p>{ptags.length > 0 && <p className="truncate text-[11px] text-muted-foreground">{ptags.slice(0, 2).join(" · ")}</p>}</div></div></TableCell>
          <TableCell><p className="text-sm">{p.contact_name ?? "—"}</p><p className="text-[11px] text-muted-foreground">{p.contact_role ?? ""}</p></TableCell><TableCell className="text-muted-foreground">{p.whatsapp ?? p.phone ?? "—"}</TableCell><TableCell>{[p.city, p.state].filter(Boolean).join("/") || "—"}</TableCell><TableCell><ScoreBadge score={p.icp_score} /></TableCell><TableCell className="text-muted-foreground">{stage?.name ?? "—"}</TableCell><TableCell><Badge variant="outline" className="rounded-full">{p.status}</Badge></TableCell><TableCell className="text-muted-foreground">{p.next_action_at ? new Date(p.next_action_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
        </TableRow> })}
      </TableBody></Table></div></CardContent>
    </Card>
    <ProspectSheet prospect={open} onOpenChange={(o) => !o && setOpen(null)} />
  </div>;
}
