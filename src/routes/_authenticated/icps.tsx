import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Pencil, Plus, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCriteria, useIcps, useInvalidate } from "@/lib/queries";
import { currentUserId } from "@/lib/session";
import type { Icp } from "@/lib/types";
import {
  parseQualificationRules,
  serializeQualificationRules,
  type IcpQualificationRule,
  type QualificationMode,
  type QualificationOperator,
  type QualificationSignal,
} from "@/services/prospectingService";

export const Route = createFileRoute("/_authenticated/icps")({
  head: () => ({
    meta: [
      { title: "Perfis de cliente ideal (ICP) — ProspectFlow" },
      { name: "description", content: "Defina nichos, região, faturamento e critérios de qualificação do seu cliente ideal." },
      { property: "og:title", content: "Perfis de cliente ideal — ProspectFlow" },
      { property: "og:description", content: "Crie, duplique e ajuste ICPs para direcionar cada busca de prospects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IcpsPage,
});

type IcpForm = Partial<Icp> & { keywordsText?: string; qualificationRules?: IcpQualificationRule[]; notesText?: string };

const RULE_LABELS: Record<QualificationSignal, string> = {
  website: "Tem site",
  landing_page: "Tem landing page",
  instagram: "Tem Instagram",
  meta_ads: "Já anuncia no Meta Ads",
  google_ads: "Já anuncia no Google Ads",
};

const PRESETS: Record<string, { label: string; rules: IcpQualificationRule[] }> = {
  landing_page: {
    label: "Vender Landing Page",
    rules: [
      { signal: "website", operator: "not_has", mode: "required", weight: 25 },
      { signal: "landing_page", operator: "not_has", mode: "preferred", weight: 20 },
    ],
  },
  traffic_meta: {
    label: "Vender tráfego Meta",
    rules: [
      { signal: "meta_ads", operator: "has", mode: "preferred", weight: 25 },
      { signal: "website", operator: "has", mode: "preferred", weight: 10 },
      { signal: "instagram", operator: "has", mode: "preferred", weight: 10 },
    ],
  },
  traffic_google: {
    label: "Vender tráfego Google",
    rules: [
      { signal: "google_ads", operator: "has", mode: "preferred", weight: 25 },
      { signal: "website", operator: "has", mode: "preferred", weight: 10 },
    ],
  },
  social: {
    label: "Vender social media",
    rules: [
      { signal: "instagram", operator: "not_has", mode: "required", weight: 25 },
      { signal: "website", operator: "has", mode: "preferred", weight: 10 },
    ],
  },
};

function parseNotes(value: string | null | undefined) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as { notes?: string };
    return typeof parsed.notes === "string" ? parsed.notes : value;
  } catch {
    return value;
  }
}

function ruleKey(rule: IcpQualificationRule) {
  return `${rule.signal}:${rule.operator}`;
}

function IcpsPage() {
  const invalidate = useInvalidate();
  const { data: icps = [], isLoading } = useIcps();
  const { data: criteria = [] } = useCriteria();
  const [editing, setEditing] = useState<IcpForm | null>(null);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing({ name: "", requires_website: false, requires_instagram: false, keywordsText: "", qualificationRules: [], notesText: "" });
  }
  function openEdit(icp: Icp) {
    setEditing({ ...icp, keywordsText: (icp.keywords ?? []).join(", "), qualificationRules: parseQualificationRules(icp.other_criteria), notesText: parseNotes(icp.other_criteria) });
  }

  const save = async () => {
    if (!editing) return;
    const name = (editing.name ?? "").trim();
    if (!name) { toast.error("Dê um nome ao ICP."); return; }
    setSaving(true);
    try {
      const userId = await currentUserId();
      const rules = editing.qualificationRules ?? [];
      const payload = {
        user_id: userId, name, niche: editing.niche ?? null, subniche: editing.subniche ?? null,
        city: editing.city ?? null, state: editing.state ?? null, regions: editing.regions ?? null,
        country: editing.country ?? "BR", revenue_min: editing.revenue_min ?? null, revenue_max: editing.revenue_max ?? null,
        employees_min: editing.employees_min ?? null, employees_max: editing.employees_max ?? null,
        keywords: (editing.keywordsText ?? "").split(",").map((k) => k.trim()).filter(Boolean),
        requires_website: editing.requires_website ?? false, requires_instagram: editing.requires_instagram ?? false,
        other_criteria: serializeQualificationRules(rules, editing.notesText ?? ""),
      };
      const { error } = editing.id ? await supabase.from("icps").update(payload).eq("id", editing.id) : await supabase.from("icps").insert(payload);
      if (error) throw new Error(error.message);
      toast.success("ICP salvo."); setEditing(null); invalidate(["icps"]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar ICP."); }
    finally { setSaving(false); }
  };

  async function duplicate(icp: Icp) {
    try {
      const userId = await currentUserId();
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = icp;
      const { error } = await supabase.from("icps").insert({ ...rest, user_id: userId, name: `${icp.name} (cópia)` });
      if (error) throw new Error(error.message);
      invalidate(["icps"]); toast.success("ICP duplicado.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao duplicar."); }
  }
  async function remove(id: string) {
    const { error } = await supabase.from("icps").delete().eq("id", id);
    if (error) toast.error("Não foi possível excluir."); else { invalidate(["icps"]); toast.success("ICP excluído."); }
  }
  async function setWeight(id: string, weight: number) {
    const { error } = await supabase.from("icp_criteria").update({ weight }).eq("id", id);
    if (error) toast.error("Não foi possível salvar o peso."); else invalidate(["icp_criteria"]);
  }

  const setRule = (index: number, patch: Partial<IcpQualificationRule>) => {
    if (!editing?.qualificationRules) return;
    setEditing({ ...editing, qualificationRules: editing.qualificationRules.map((rule, i) => i === index ? { ...rule, ...patch } : rule) });
  };
  const toggleRule = (signal: QualificationSignal) => {
    if (!editing) return;
    const current = editing.qualificationRules ?? [];
    const existingIndex = current.findIndex((rule) => rule.signal === signal);
    if (existingIndex >= 0) {
      setEditing({ ...editing, qualificationRules: current.filter((_, i) => i !== existingIndex) });
    } else {
      setEditing({ ...editing, qualificationRules: [...current, { signal, operator: "has", mode: "preferred", weight: 10 }] });
    }
  };
  const applyPreset = (rules: IcpQualificationRule[]) => {
    if (!editing) return;
    setEditing({ ...editing, qualificationRules: rules.map((rule) => ({ ...rule })) });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-semibold">ICPs</h1><p className="text-sm text-muted-foreground">Perfis usados nas buscas e nas regras de qualificação do prospect.</p></div><Button onClick={openNew}><Plus className="mr-1 size-4" /> Novo ICP</Button></header>
      {isLoading ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div> : icps.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum ICP ainda. Crie o primeiro para começar a prospectar.</p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{icps.map((icp) => <article key={icp.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-2"><h2 className="font-medium">{icp.name}</h2><div className="flex gap-1"><Button variant="ghost" size="icon" className="size-8" aria-label="Editar" onClick={() => openEdit(icp)}><Pencil className="size-3.5" /></Button><Button variant="ghost" size="icon" className="size-8" aria-label="Duplicar" onClick={() => void duplicate(icp)}><Copy className="size-3.5" /></Button><Button variant="ghost" size="icon" className="size-8" aria-label="Excluir" onClick={() => void remove(icp.id)}><Trash2 className="size-3.5" /></Button></div></div><dl className="space-y-1 text-sm text-muted-foreground"><div>Nicho: {icp.niche ?? "—"}{icp.subniche ? ` / ${icp.subniche}` : ""}</div><div>Local: {[icp.city, icp.state, icp.regions].filter(Boolean).join(", ") || "—"}</div><div>Faturamento: {icp.revenue_min ?? "—"} a {icp.revenue_max ?? "—"}</div><div>Funcionários: {icp.employees_min ?? "—"} a {icp.employees_max ?? "—"}</div></dl><div className="flex flex-wrap gap-1">{(icp.keywords ?? []).map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}{icp.requires_website && <Badge variant="outline">site obrigatório</Badge>}{icp.requires_instagram && <Badge variant="outline">Instagram obrigatório</Badge>}{parseQualificationRules(icp.other_criteria).map((rule) => <Badge key={ruleKey(rule)} variant="outline">{rule.operator === "has" ? "Tem" : "Não tem"} {RULE_LABELS[rule.signal]}</Badge>)}</div></article>)}</div>}

      <section className="space-y-3"><div><h2 className="font-display text-lg font-semibold">Critérios do ICP Score</h2><p className="text-sm text-muted-foreground">Ajuste o peso de cada critério (0 a 100). A soma define a nota de cada prospect.</p></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{criteria.map((c) => <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><Label htmlFor={`w-${c.id}`} className="flex-1 text-sm">{c.label}</Label><Input id={`w-${c.id}`} type="number" min={0} max={100} defaultValue={c.weight} onBlur={(e) => void setWeight(c.id, Number(e.target.value))} className="w-20" /></div>)}</div></section>

      <Sheet open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{editing?.id ? "Editar ICP" : "Novo ICP"}</SheetTitle></SheetHeader>{editing && <div className="mt-4 space-y-5 px-4 pb-8">
        <Field label="Nome" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} />
        <div className="grid grid-cols-2 gap-3"><Field label="Nicho" value={editing.niche ?? ""} onChange={(v) => setEditing({ ...editing, niche: v })} /><Field label="Subnicho" value={editing.subniche ?? ""} onChange={(v) => setEditing({ ...editing, subniche: v })} /><Field label="Cidade" value={editing.city ?? ""} onChange={(v) => setEditing({ ...editing, city: v })} /><Field label="Estado" value={editing.state ?? ""} onChange={(v) => setEditing({ ...editing, state: v })} /></div>
        <Field label="Regiões" value={editing.regions ?? ""} onChange={(v) => setEditing({ ...editing, regions: v })} />
        <div className="grid grid-cols-2 gap-3"><Field label="Faturamento mínimo" type="number" value={editing.revenue_min?.toString() ?? ""} onChange={(v) => setEditing({ ...editing, revenue_min: v ? Number(v) : null })} /><Field label="Faturamento máximo" type="number" value={editing.revenue_max?.toString() ?? ""} onChange={(v) => setEditing({ ...editing, revenue_max: v ? Number(v) : null })} /><Field label="Funcionários mín." type="number" value={editing.employees_min?.toString() ?? ""} onChange={(v) => setEditing({ ...editing, employees_min: v ? Number(v) : null })} /><Field label="Funcionários máx." type="number" value={editing.employees_max?.toString() ?? ""} onChange={(v) => setEditing({ ...editing, employees_max: v ? Number(v) : null })} /></div>
        <Field label="Palavras-chave (separadas por vírgula)" value={editing.keywordsText ?? ""} onChange={(v) => setEditing({ ...editing, keywordsText: v })} />
        <div className="space-y-2"><div><Label>Presets de oferta</Label><p className="text-xs text-muted-foreground">Escolha a lógica de qualificação mais próxima do serviço que você quer vender.</p></div><div className="grid grid-cols-2 gap-2">{Object.entries(PRESETS).map(([key, preset]) => <Button key={key} type="button" variant="outline" className="justify-start gap-2" onClick={() => applyPreset(preset.rules)}><Target className="size-4" />{preset.label}</Button>)}</div></div>
        <div className="space-y-3 rounded-xl border border-border p-3"><div><Label>Critérios de qualificação</Label><p className="text-xs text-muted-foreground">Defina o que o prospect precisa ter — ou não ter — para entrar nesta busca.</p></div>{(["website","landing_page","instagram","meta_ads","google_ads"] as QualificationSignal[]).map((signal) => { const index = (editing.qualificationRules ?? []).findIndex((r) => r.signal === signal); const rule = index >= 0 ? editing.qualificationRules![index] : null; return <div key={signal} className="space-y-2 rounded-lg bg-muted/40 p-3"><div className="flex items-center gap-3"><Switch checked={Boolean(rule)} onCheckedChange={() => toggleRule(signal)} /><span className="flex-1 text-sm font-medium">{RULE_LABELS[signal]}</span>{rule && <Input className="w-20" type="number" min={0} max={100} value={rule.weight} onChange={(e) => setRule(index, { weight: Number(e.target.value) })} />}</div>{rule && <div className="grid grid-cols-2 gap-2"><select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={rule.operator} onChange={(e) => setRule(index, { operator: e.target.value as QualificationOperator })}><option value="has">Tem</option><option value="not_has">Não tem</option></select><select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={rule.mode} onChange={(e) => setRule(index, { mode: e.target.value as QualificationMode })}><option value="required">Obrigatório</option><option value="preferred">Priorizar</option></select></div>}</div>; })}</div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3"><Label htmlFor="req-site">Tem site obrigatório</Label><Switch id="req-site" checked={Boolean(editing.requires_website)} onCheckedChange={(v) => setEditing({ ...editing, requires_website: v })} /></div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3"><Label htmlFor="req-ig">Tem Instagram obrigatório</Label><Switch id="req-ig" checked={Boolean(editing.requires_instagram)} onCheckedChange={(v) => setEditing({ ...editing, requires_instagram: v })} /></div>
        <div className="space-y-1.5"><Label htmlFor="other">Observações / critérios adicionais</Label><Textarea id="other" value={editing.notesText ?? ""} onChange={(e) => setEditing({ ...editing, notesText: e.target.value })} placeholder="Ex.: equipe comercial própria, atende alto ticket..." /></div>
        <Button onClick={() => void save()} disabled={saving} className="w-full">{saving ? "Salvando..." : "Salvar ICP"}</Button>
      </div>}</SheetContent></Sheet>
    </div>
  );
}

interface FieldProps { label: string; value: string; type?: string; onChange: (value: string) => void; }
function Field({ label, value, type = "text", onChange }: FieldProps) { const id = label.toLowerCase().replace(/[^a-z]+/g, "-"); return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>; }
