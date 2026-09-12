import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreBadge } from "@/components/app/ScoreBadge";
import { ProspectSheet } from "@/components/app/ProspectSheet";
import { useInvalidate, useProspectTags, useProspects, useStages, useTags } from "@/lib/queries";
import { PROSPECT_STATUSES, type Prospect } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/prospects")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "Prospects — ProspectFlow" },
      { name: "description", content: "Base central de prospects com busca, filtros, tags e edição rápida." },
      { property: "og:title", content: "Prospects — ProspectFlow" },
      { property: "og:description", content: "Sua base central de prospects." },
      { name: "robots", content: "noindex" },
    ],
  }),
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
    return prospects
      .filter((p) =>
        t
          ? [p.company, p.contact_name, p.city, p.niche, p.state]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(t))
          : true,
      )
      .filter((p) => (status === "todos" ? true : p.status === status))
      .sort((a, b) => {
        if (sort === "company") return a.company.localeCompare(b.company);
        if (sort === "icp_score") return b.icp_score - a.icp_score;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [prospects, term, status, sort]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const removeSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const { error } = await supabase.from("prospects").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelected(new Set());
    invalidate(["prospects"]);
    toast.success(`${ids.length} prospect(s) excluído(s).`);
  };

  const applyTag = async (tagId: string) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("prospect_tags")
      .upsert(ids.map((prospect_id) => ({ prospect_id, tag_id: tagId })), {
        onConflict: "prospect_id,tag_id",
      });
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate(["prospect_tags"]);
    toast.success("Tag aplicada.");
  };

  const exportCsv = () => {
    const list = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
    const header = "empresa,contato,cargo,telefone,whatsapp,site,instagram,cidade,estado,nicho,score,status";
    const body = list
      .map((p) =>
        [p.company, p.contact_name, p.contact_role, p.phone, p.whatsapp, p.website, p.instagram, p.city, p.state, p.niche, p.icp_score, p.status]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-prospects.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Prospects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {prospects.length} na base. Clique numa linha para abrir a ficha completa.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar empresa, contato, cidade..."
          className="max-w-xs"
          aria-label="Buscar prospects"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {PROSPECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Mais recentes</SelectItem>
            <SelectItem value="company">Empresa (A-Z)</SelectItem>
            <SelectItem value="icp_score">Maior ICP Score</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex flex-wrap gap-2">
          {selected.size > 0 && tags.length > 0 && (
            <Select onValueChange={(v) => void applyTag(v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Adicionar tag" /></SelectTrigger>
              <SelectContent>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="ghost" onClick={exportCsv}>Exportar</Button>
          <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={() => void removeSelected()}>
            Excluir
          </Button>
        </div>
      </div>

      <Card className="glass overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Nicho</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Próxima ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={12} className="text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-muted-foreground">
                  Nenhum prospect encontrado. Faça uma busca em Prospecção.
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => {
              const stage = stages.find((s) => s.id === p.stage_id);
              const ptags = links
                .filter((l) => l.prospect_id === p.id)
                .map((l) => tags.find((t) => t.id === l.tag_id)?.name)
                .filter(Boolean);
              return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpen(p)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                      aria-label={`Selecionar ${p.company}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{p.company}</TableCell>
                  <TableCell>{p.contact_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.contact_role ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.whatsapp ?? "—"}</TableCell>
                  <TableCell>{[p.city, p.state].filter(Boolean).join("/") || "—"}</TableCell>
                  <TableCell>{p.niche ?? "—"}</TableCell>
                  <TableCell><ScoreBadge score={p.icp_score} /></TableCell>
                  <TableCell className="text-muted-foreground">{stage?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                  <TableCell className="max-w-32 truncate text-muted-foreground">
                    {ptags.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.next_action_at ? new Date(p.next_action_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <ProspectSheet prospect={open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
