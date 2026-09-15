import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, MessageSquareReply, Phone, Users, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/app/ScoreBadge";
import { useConversations, useProspects, useScheduledMessages, useStages } from "@/lib/queries";
import type { Prospect } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — ProspectFlow" },
    { name: "description", content: "Resumo da sua prospecção: ações de hoje, respostas e funil." },
    { property: "og:title", content: "Dashboard — ProspectFlow" },
    { property: "og:description", content: "Ações de hoje e resumo do funil de prospecção." },
    { name: "robots", content: "noindex" },
  ] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: stages = [] } = useStages();
  const { data: conversations = [] } = useConversations();
  const { data: scheduled = [] } = useScheduledMessages();
  const now = new Date();
  const byStatus = (s: string) => prospects.filter((p) => p.status === s);
  const toContact = prospects.filter((p) => p.status === "novo" || p.status === "contatar");
  const replies = byStatus("respondeu");
  const meetings = byStatus("reuniao");
  const pending = prospects.filter((p) => p.next_action_at && new Date(p.next_action_at) <= now);
  const upcomingSchedules = scheduled.filter((s) => s.status === "agendada" && new Date(s.scheduled_at) >= now).slice(0, 5);
  const unread = conversations.filter((c) => c.unread_count > 0);
  const metrics = [
    { label: "Prospects encontrados", value: prospects.length, icon: Users },
    { label: "Novos prospects", value: byStatus("novo").length, icon: Users },
    { label: "Contatos realizados", value: byStatus("contatado").length, icon: Phone },
    { label: "Respostas", value: replies.length, icon: MessageSquareReply },
    { label: "Reuniões", value: meetings.length, icon: CalendarClock },
    { label: "Follow-ups pendentes", value: pending.length, icon: CalendarClock },
  ];

  return <div className="space-y-8">
    <header><h1 className="font-display text-2xl font-semibold">Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">O essencial do dia: quem contatar, quem respondeu e o que está agendado.</p></header>
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{metrics.map(({ label, value, icon: Icon }) => <Card key={label} className="glass"><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className="size-4 text-muted-foreground" aria-hidden /></div><p className="mt-2 text-2xl font-semibold tabular-nums">{isLoading ? <Skeleton className="h-7 w-10" /> : value}</p></CardContent></Card>)}</section>
    <section className="grid gap-4 lg:grid-cols-2"><ActionList title="Contatar agora" empty="Nenhum prospect aguardando primeiro contato." items={toContact.slice(0, 6)} /><ActionList title="Respostas aguardando você" empty="Nenhuma resposta pendente." items={replies.slice(0, 6)} /><ActionList title="Follow-ups vencidos" empty="Você está em dia com os follow-ups." items={pending.slice(0, 6)} /><ActionList title="Reuniões próximas" empty="Nenhuma reunião marcada." items={meetings.slice(0, 6)} /></section>
    <section className="grid gap-4 lg:grid-cols-2">
      <Card className="glass"><CardHeader className="pb-2"><CardTitle className="text-sm">Resumo do funil</CardTitle></CardHeader><CardContent className="space-y-2">{stages.map((s) => { const count = prospects.filter((p) => p.stage_id === s.id).length; return <div key={s.id} className="flex items-center gap-3 text-sm"><span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden /><span className="flex-1 truncate">{s.name}</span><span className="tabular-nums text-muted-foreground">{count}</span></div>; })}<Link to="/pipeline" className="inline-flex items-center pt-2 text-sm font-medium text-primary hover:underline">Abrir pipeline<ArrowRight className="ml-1 size-3.5" /></Link></CardContent></Card>
      <Card className="glass"><CardHeader className="pb-2"><CardTitle className="text-sm">Mensagens agendadas</CardTitle></CardHeader><CardContent className="space-y-2">{upcomingSchedules.length === 0 && <p className="text-sm text-muted-foreground">Nada agendado.</p>}{upcomingSchedules.map((s) => { const p = prospects.find((x) => x.id === s.prospect_id); return <Link key={s.id} to="/whatsapp" search={{ prospectId: s.prospect_id }} className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm hover:bg-muted/50"><span className="flex-1 truncate">{p?.company ?? "Prospect"}</span><Badge variant="outline">{new Date(s.scheduled_at).toLocaleString("pt-BR")}</Badge></Link>; })}{unread.length > 0 && <Link to="/whatsapp" className="inline-flex items-center pt-2 text-sm font-medium text-primary hover:underline">{unread.length} conversa(s) não lida(s)<ArrowRight className="ml-1 size-3.5" /></Link>}</CardContent></Card>
    </section>
  </div>;
}

function ActionList({ title, items, empty }: { title: string; items: Prospect[]; empty: string }) {
  return <Card className="glass"><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="space-y-1.5">{items.length === 0 && <p className="px-1 py-1 text-sm text-muted-foreground">{empty}</p>}{items.map((p) => <Link key={p.id} to="/prospects" search={{ q: p.company }} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-muted/55"><div className="min-w-0 flex-1"><p className="truncate font-medium">{p.company}</p><p className="truncate text-xs text-muted-foreground">{p.contact_name ?? "sem contato"}{p.next_action ? ` · ${p.next_action}` : ""}</p></div><ScoreBadge score={p.icp_score} /><ArrowRight className="size-3.5 text-muted-foreground" /></Link>)}</CardContent></Card>;
}
