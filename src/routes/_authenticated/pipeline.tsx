import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GripVertical, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/app/ScoreBadge";
import { ProspectSheet } from "@/components/app/ProspectSheet";
import { useInvalidate, useProspects, useStages } from "@/lib/queries";
import { currentUserId } from "@/lib/session";
import type { Prospect } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pipeline")({ head: () => ({ meta: [{ title: "Pipeline Kanban — ProspectFlow" }, { name: "robots", content: "noindex" }] }), component: PipelinePage });

const STAGE_COLORS = ["#93c5fd", "#a7f3d0", "#fde68a", "#fbcfe8", "#c7d2fe", "#bbf7d0", "#fecaca"];

function PipelinePage() {
  const invalidate = useInvalidate();
  const { data: stages = [], isLoading } = useStages();
  const { data: prospects = [] } = useProspects();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [newStage, setNewStage] = useState("");
  const [selected, setSelected] = useState<Prospect | null>(null);

  async function moveProspect(prospectId: string, stageId: string) {
    const { error } = await supabase.from("prospects").update({ stage_id: stageId }).eq("id", prospectId);
    if (error) return void toast.error("Não foi possível mover o prospect.");
    invalidate(["prospects"]);
  }
  async function addStage() { const name = newStage.trim(); if (!name) return; try { const userId = await currentUserId(); const color = STAGE_COLORS[stages.length % STAGE_COLORS.length]!; const { error } = await supabase.from("pipeline_stages").insert({ user_id: userId, name, color, position: stages.length }); if (error) throw new Error(error.message); setNewStage(""); invalidate(["stages"]); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao criar etapa."); } }
  async function renameStage(id: string, name: string) { const trimmed = name.trim(); if (!trimmed) return; const { error } = await supabase.from("pipeline_stages").update({ name: trimmed }).eq("id", id); if (error) toast.error("Não foi possível renomear."); else invalidate(["stages"]); }
  async function removeStage(id: string) { if (prospects.some((p) => p.stage_id === id)) return void toast.error("Mova os prospects desta etapa antes de excluí-la."); const { error } = await supabase.from("pipeline_stages").delete().eq("id", id); if (error) toast.error("Não foi possível excluir a etapa."); else invalidate(["stages"]); }
  async function reorder(id: string, direction: -1 | 1) { const index = stages.findIndex((s) => s.id === id); const target = stages[index + direction]; const current = stages[index]; if (!target || !current) return; await Promise.all([supabase.from("pipeline_stages").update({ position: target.position }).eq("id", current.id), supabase.from("pipeline_stages").update({ position: current.position }).eq("id", target.id)]); invalidate(["stages"]); }

  if (isLoading) return <div className="space-y-6"><div className="space-y-2"><Skeleton className="h-8 w-36" /><Skeleton className="h-4 w-72" /></div><div className="flex gap-4 overflow-hidden">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[28rem] w-72 shrink-0 rounded-2xl" />)}</div></div>;

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Visão do funil</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Pipeline</h1><p className="mt-1.5 text-sm text-muted-foreground">Arraste prospects entre etapas e mantenha a próxima ação visível.</p></div><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void addStage(); }}><Input value={newStage} onChange={(e) => setNewStage(e.target.value)} placeholder="Nova etapa" aria-label="Nome da nova etapa" className="w-44" /><Button type="submit"><Plus className="mr-2 size-4" />Adicionar etapa</Button></form></header>
    <div className="flex gap-4 overflow-x-auto pb-5">
      {stages.map((stage, index) => { const cards = prospects.filter((p) => p.stage_id === stage.id); return <section key={stage.id} onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }} onDragLeave={() => setOverStage((s) => s === stage.id ? null : s)} onDrop={() => { if (dragId) void moveProspect(dragId, stage.id); setDragId(null); setOverStage(null); }} className={cn("flex w-80 min-h-[32rem] shrink-0 flex-col rounded-2xl border border-border/80 bg-card/65 p-3 shadow-sm backdrop-blur-sm transition-all", overStage === stage.id && "border-primary/50 bg-primary/[.035] shadow-lg shadow-primary/5")}>
          <div className="flex items-center gap-2 px-1"><span className="size-2.5 rounded-full ring-4 ring-background" style={{ backgroundColor: stage.color }} /><Input defaultValue={stage.name} onBlur={(e) => void renameStage(stage.id, e.target.value)} aria-label={`Nome da etapa ${stage.name}`} className="h-8 flex-1 border-transparent bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:border-input" /><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{cards.length}</span></div>
          <div className="mt-2 flex items-center gap-1 border-b border-border/60 px-1 pb-2"><Button variant="ghost" size="icon" className="size-7" disabled={index === 0} onClick={() => void reorder(stage.id, -1)} aria-label="Mover etapa para a esquerda">←</Button><Button variant="ghost" size="icon" className="size-7" disabled={index === stages.length - 1} onClick={() => void reorder(stage.id, 1)} aria-label="Mover etapa para a direita">→</Button><Button variant="ghost" size="icon" className="ml-auto size-7 text-muted-foreground hover:text-destructive" onClick={() => void removeStage(stage.id)} aria-label={`Excluir etapa ${stage.name}`}><Trash2 className="size-3.5" /></Button></div>
          <div className="mt-3 flex flex-col gap-2.5">{cards.map((p) => <article key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragEnd={() => setDragId(null)} onClick={() => setSelected(p)} className={cn("group cursor-pointer rounded-xl border border-border/70 bg-background/75 p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md", dragId === p.id && "scale-[.98] opacity-50")}><div className="flex items-start gap-2.5"><GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold">{p.company}</p><ScoreBadge score={p.icp_score} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{[p.contact_name, p.city].filter(Boolean).join(" · ") || "Sem contato"}</p>{p.next_action && <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary"><ArrowRight className="size-3" />{p.next_action}</div>}</div></div></article>)}{cards.length === 0 && <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">Arraste um prospect para esta etapa.</div>}</div>
        </section>; })}
    </div>
    <ProspectSheet prospect={selected} onOpenChange={(open) => !open && setSelected(null)} />
  </div>;
}
