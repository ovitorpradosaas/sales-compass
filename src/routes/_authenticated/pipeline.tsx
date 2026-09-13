import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GripVertical, Plus, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline Kanban — ProspectFlow" },
      { name: "description", content: "Acompanhe cada prospect nas etapas do seu funil comercial com arrastar e soltar." },
      { property: "og:title", content: "Pipeline Kanban — ProspectFlow" },
      { property: "og:description", content: "Etapas personalizáveis, arraste prospects e feche mais negócios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PipelinePage,
});

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
    if (error) {
      toast.error("Não foi possível mover o prospect.");
      return;
    }
    invalidate(["prospects"]);
  }

  async function addStage() {
    const name = newStage.trim();
    if (!name) return;
    try {
      const userId = await currentUserId();
      const color = STAGE_COLORS[stages.length % STAGE_COLORS.length]!;
      const { error } = await supabase.from("pipeline_stages").insert({
        user_id: userId,
        name,
        color,
        position: stages.length,
      });
      if (error) throw new Error(error.message);
      setNewStage("");
      invalidate(["stages"]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar etapa.");
    }
  }

  async function renameStage(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await supabase.from("pipeline_stages").update({ name: trimmed }).eq("id", id);
    if (error) toast.error("Não foi possível renomear.");
    else invalidate(["stages"]);
  }

  async function removeStage(id: string) {
    if (prospects.some((p) => p.stage_id === id)) {
      toast.error("Mova os prospects desta etapa antes de excluí-la.");
      return;
    }
    const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
    if (error) toast.error("Não foi possível excluir a etapa.");
    else invalidate(["stages"]);
  }

  async function reorder(id: string, direction: -1 | 1) {
    const index = stages.findIndex((s) => s.id === id);
    const target = stages[index + direction];
    const current = stages[index];
    if (!target || !current) return;
    await Promise.all([
      supabase.from("pipeline_stages").update({ position: target.position }).eq("id", current.id),
      supabase.from("pipeline_stages").update({ position: current.position }).eq("id", target.id),
    ]);
    invalidate(["stages"]);
  }

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-72 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões entre as etapas. Suas etapas são totalmente personalizáveis.
          </p>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void addStage();
          }}
        >
          <Input
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            placeholder="Nova etapa"
            aria-label="Nome da nova etapa"
            className="w-44"
          />
          <Button type="submit" size="sm">
            <Plus className="mr-1 size-4" /> Adicionar
          </Button>
        </form>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage, index) => {
          const cards = prospects.filter((p) => p.stage_id === stage.id);
          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.id);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
              onDrop={() => {
                if (dragId) void moveProspect(dragId, stage.id);
                setDragId(null);
                setOverStage(null);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3 transition-colors",
                overStage === stage.id && "border-primary bg-accent/40",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: stage.color }} aria-hidden />
                <Input
                  defaultValue={stage.name}
                  onBlur={(e) => void renameStage(stage.id, e.target.value)}
                  aria-label={`Nome da etapa ${stage.name}`}
                  className="h-8 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-input"
                />
                <span className="text-xs text-muted-foreground">{cards.length}</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Mover etapa para a esquerda"
                  disabled={index === 0}
                  onClick={() => void reorder(stage.id, -1)}
                >
                  ←
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Mover etapa para a direita"
                  disabled={index === stages.length - 1}
                  onClick={() => void reorder(stage.id, 1)}
                >
                  →
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-7 text-muted-foreground"
                  aria-label={`Excluir etapa ${stage.name}`}
                  onClick={() => void removeStage(stage.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {cards.map((p) => (
                  <article
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setSelected(p)}
                    className={cn(
                      "cursor-pointer rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
                      dragId === p.id && "opacity-60",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.company}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[p.contact_name, p.city].filter(Boolean).join(" · ") || "Sem contato"}
                        </p>
                      </div>
                      <ScoreBadge score={p.icp_score} />
                    </div>
                  </article>
                ))}
                {cards.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
                    Solte um prospect aqui.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ProspectSheet prospect={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
