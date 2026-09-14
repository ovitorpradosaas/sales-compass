import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Play, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvalidate, useProspects, useScheduledMessages, useSequenceSteps, useSequences } from "@/lib/queries";
import { processDueFollowups, startSequence } from "@/services/followupService";

export const Route = createFileRoute("/_authenticated/sequencias")({
  head: () => ({ meta: [{ title: "Sequências — Sales Compass" }, { name: "robots", content: "noindex" }] }),
  component: SequencesPage,
});

function SequencesPage() {
  const invalidate = useInvalidate();
  const { data: sequences = [] } = useSequences();
  const { data: steps = [] } = useSequenceSteps();
  const { data: prospects = [] } = useProspects();
  const { data: scheduled = [] } = useScheduledMessages();
  const [selectedId, setSelectedId] = useState<string>();
  const [name, setName] = useState("");
  const [stopOnReply, setStopOnReply] = useState(true);
  const [prospectId, setProspectId] = useState("");
  const [working, setWorking] = useState(false);
  const selected = sequences.find((sequence) => sequence.id === selectedId) ?? sequences[0];
  const selectedSteps = useMemo(() => steps.filter((step) => step.sequence_id === selected?.id).sort((a, b) => a.position - b.position), [steps, selected?.id]);
  const selectedScheduled = useMemo(() => scheduled.filter((message) => message.sequence_id === selected?.id), [scheduled, selected?.id]);

  const createSequence = async () => {
    if (!name.trim()) return;
    const { data, error } = await supabase.from("sequences").insert({ name: name.trim(), status: "ativa", stop_on_reply: stopOnReply }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setName(""); setSelectedId(data.id); invalidate(["sequences"]); toast.success("Sequência criada.");
  };

  const updateSequence = async (field: "name" | "stop_on_reply" | "status", value: string | boolean) => {
    if (!selected) return;
    const { error } = await supabase.from("sequences").update({ [field]: value }).eq("id", selected.id);
    if (error) toast.error(error.message); else invalidate(["sequences"]);
  };

  const addStep = async () => {
    if (!selected) return;
    const nextPosition = selectedSteps.length ? Math.max(...selectedSteps.map((step) => step.position)) + 1 : 1;
    const { error } = await supabase.from("sequence_steps").insert({ sequence_id: selected.id, position: nextPosition, delay_days: nextPosition === 1 ? 0 : 2, body: "Nova mensagem..." });
    if (error) toast.error(error.message); else invalidate(["sequence_steps"]);
  };

  const updateStep = async (id: string, patch: { body?: string; delay_days?: number; position?: number }) => {
    const { error } = await supabase.from("sequence_steps").update(patch).eq("id", id);
    if (error) toast.error(error.message); else invalidate(["sequence_steps"]);
  };

  const removeStep = async (id: string) => {
    const { error } = await supabase.from("sequence_steps").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidate(["sequence_steps"]);
  };

  const enroll = async () => {
    if (!selected || !prospectId) return;
    setWorking(true);
    try { const count = await startSequence({ prospectId, sequenceId: selected.id }); invalidate(["scheduled_messages", "prospects", "activities"]); toast.success(`${count} etapa(s) agendada(s).`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a sequência."); }
    finally { setWorking(false); }
  };

  const runDue = async () => {
    setWorking(true);
    try { const count = await processDueFollowups(); invalidate(["scheduled_messages", "prospects", "activities", "conversations", "messages"]); toast.success(`${count} mensagem(ns) processada(s).`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao executar follow-ups."); }
    finally { setWorking(false); }
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-semibold">Sequências</h1><p className="mt-1 text-sm text-muted-foreground">Etapas → mensagens agendadas → execução. Respostas podem interromper automaticamente.</p></div><Button onClick={() => void runDue()} disabled={working}><Play className="mr-2 size-4" />Executar vencidas</Button></header>
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="glass"><CardHeader><CardTitle className="text-base">Minhas sequências</CardTitle></CardHeader><CardContent className="space-y-3"><div className="space-y-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da sequência" /><div className="flex items-center justify-between rounded-lg border p-2"><Label htmlFor="stop-reply" className="text-sm">Parar ao responder</Label><Switch id="stop-reply" checked={stopOnReply} onCheckedChange={setStopOnReply} /></div><Button className="w-full" size="sm" onClick={() => void createSequence()}><Plus className="mr-2 size-4" />Criar sequência</Button></div><div className="space-y-1">{sequences.map((sequence) => <button key={sequence.id} type="button" onClick={() => setSelectedId(sequence.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${selected?.id === sequence.id ? "bg-accent" : "hover:bg-accent/50"}`}><ListChecks className="size-4" /><span className="min-w-0 flex-1 truncate">{sequence.name}</span><Badge variant="outline">{sequence.status}</Badge></button>)}</div></CardContent></Card>
      <div className="space-y-4">
        {selected ? <>
          <Card className="glass"><CardHeader><CardTitle className="text-base">Configuração</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-1.5"><Label>Nome</Label><Input defaultValue={selected.name} onBlur={(e) => void updateSequence("name", e.target.value)} /></div><div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Parar ao responder</Label><p className="text-xs text-muted-foreground">Cancela os próximos follow-ups quando chega uma resposta.</p></div><Switch checked={selected.stop_on_reply} onCheckedChange={(checked) => void updateSequence("stop_on_reply", checked)} /></div><div className="space-y-1.5"><Label>Status</Label><Select value={selected.status} onValueChange={(value) => void updateSequence("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="pausada">Pausada</SelectItem><SelectItem value="arquivada">Arquivada</SelectItem></SelectContent></Select></div></CardContent></Card>
          <Card className="glass"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Etapas</CardTitle><Button size="sm" variant="outline" onClick={() => void addStep()}><Plus className="mr-2 size-4" />Adicionar etapa</Button></CardHeader><CardContent className="space-y-3">{selectedSteps.map((step, index) => <div key={step.id} className="rounded-xl border p-3"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Badge variant="outline">{index + 1}</Badge><span>Após {step.delay_days} dia(s)</span><Button className="ml-auto" size="icon" variant="ghost" onClick={() => void removeStep(step.id)} aria-label="Excluir etapa"><Trash2 className="size-4" /></Button></div><Textarea defaultValue={step.body} rows={3} onBlur={(e) => void updateStep(step.id, { body: e.target.value })} /><div className="mt-2 flex items-center gap-2"><Label className="text-xs text-muted-foreground">Delay desde a etapa anterior</Label><Input className="w-24" type="number" min={0} defaultValue={step.delay_days} onBlur={(e) => void updateStep(step.id, { delay_days: Number(e.target.value) || 0 })} /><Save className="size-4 text-muted-foreground" /></div></div>)}{selectedSteps.length === 0 && <p className="text-sm text-muted-foreground">Adicione a primeira etapa.</p>}</CardContent></Card>
          <Card className="glass"><CardHeader><CardTitle className="text-base">Iniciar para um prospect</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 md:flex-row md:items-end"><div className="flex-1 space-y-1.5"><Label>Prospect</Label><Select value={prospectId} onValueChange={setProspectId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{prospects.filter((p) => p.whatsapp || p.phone).map((p) => <SelectItem key={p.id} value={p.id}>{p.company} — {p.contact_name ?? "Sem contato"}</SelectItem>)}</SelectContent></Select></div><Button onClick={() => void enroll()} disabled={working || !prospectId}><Play className="mr-2 size-4" />Iniciar sequência</Button></CardContent></Card>
          <Card className="glass"><CardHeader><CardTitle className="text-base">Mensagens agendadas</CardTitle></CardHeader><CardContent className="space-y-2">{selectedScheduled.map((message) => <div key={message.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"><Badge>{message.status}</Badge><span className="text-muted-foreground">{new Date(message.scheduled_at).toLocaleString("pt-BR")}</span><span className="min-w-0 flex-1 truncate">{message.body}</span></div>)}{selectedScheduled.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mensagem agendada para esta sequência.</p>}</CardContent></Card>
        </> : <Card className="glass"><CardContent className="py-20 text-center text-sm text-muted-foreground">Crie ou selecione uma sequência para começar.</CardContent></Card>}
      </div>
    </div>
  </div>;
}
