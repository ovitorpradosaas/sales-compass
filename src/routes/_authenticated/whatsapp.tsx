import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Send, Search, UserPlus, Wifi, WifiOff, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useConversations, useInvalidate, useMessages, useProspects } from "@/lib/queries";
import { ensureConversation, getConnectionStatus, recordIncomingMessage, sendMessage } from "@/services/whatsappService";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  validateSearch: (search: Record<string, unknown>) => ({ prospectId: typeof search.prospectId === "string" ? search.prospectId : "" }),
  head: () => ({ meta: [{ title: "WhatsApp — ProspectFlow" }, { name: "robots", content: "noindex" }] }),
  component: WhatsappPage,
});

function WhatsappPage() {
  const { prospectId } = Route.useSearch();
  const invalidate = useInvalidate();
  const { data: conversations = [] } = useConversations();
  const { data: prospects = [] } = useProspects();
  const [selectedId, setSelectedId] = useState<string>();
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [connection, setConnection] = useState<{ connected: boolean; phoneNumber: string | null }>({ connected: false, phoneNumber: null });
  const selected = conversations.find((conversation) => conversation.id === selectedId);
  const { data: messages = [] } = useMessages(selectedId);
  const prospect = prospects.find((item) => item.id === selected?.prospect_id);
  const filteredConversations = useMemo(() => conversations.filter((conversation) => { const p = prospects.find((x) => x.id === conversation.prospect_id); const value = `${p?.company ?? ""} ${conversation.last_message_preview ?? ""}`.toLowerCase(); return !search.trim() || value.includes(search.trim().toLowerCase()); }), [conversations, prospects, search]);

  useEffect(() => {
    void getConnectionStatus().then((status) => setConnection({ connected: status.connected, phoneNumber: status.phoneNumber })).catch(() => setConnection({ connected: false, phoneNumber: null }));
  }, []);

  useEffect(() => {
    let active = true;
    const openRequested = async () => {
      if (!prospectId || !prospects.some((item) => item.id === prospectId)) return;
      const existing = conversations.find((conversation) => conversation.prospect_id === prospectId);
      try {
        const id = existing?.id ?? await ensureConversation(prospectId);
        if (active) setSelectedId(id);
        if (!existing) invalidate(["conversations"]);
      } catch (error) {
        if (active) toast.error(error instanceof Error ? error.message : "Não foi possível abrir a conversa.");
      }
    };
    void openRequested();
    return () => { active = false; };
  }, [prospectId, prospects, conversations, invalidate]);

  useEffect(() => {
    if (!prospectId && !selectedId && conversations[0]) setSelectedId(conversations[0].id);
  }, [conversations, prospectId, selectedId]);

  const conversationName = useMemo(() => prospect?.company ?? "Conversa", [prospect]);
  const startConversation = async (id: string) => { try { const conversationId = await ensureConversation(id); setSelectedId(conversationId); invalidate(["conversations", "messages"]); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível abrir a conversa."); } };
  const handleSend = async () => { if (!selected || !body.trim()) return; setSending(true); try { await sendMessage({ conversationId: selected.id, prospectId: selected.prospect_id, body }); setBody(""); invalidate(["conversations", "messages", "prospects", "activities"]); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao enviar mensagem."); } finally { setSending(false); } };
  const handleIncoming = async () => { if (!selected || !replyBody.trim()) return; try { await recordIncomingMessage({ conversationId: selected.id, prospectId: selected.prospect_id, body: replyBody }); setReplyBody(""); invalidate(["conversations", "messages", "prospects", "activities", "scheduled_messages"]); toast.success("Resposta registrada e follow-ups futuros interrompidos."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a resposta."); } };

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Central de conversas</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">WhatsApp</h1><p className="mt-1.5 text-sm text-muted-foreground">Envie mensagens e mantenha todo o histórico dentro do CRM.</p></div><div className="flex items-center gap-2"><Badge variant="outline" className={`w-fit rounded-full ${connection.connected ? "border-primary/30 bg-primary/10 text-primary" : ""}`}>{connection.connected ? <><Wifi className="mr-1.5 size-3" />Conectado{connection.phoneNumber ? ` · ${connection.phoneNumber}` : ""}</> : <><WifiOff className="mr-1.5 size-3" />Não conectado</>}</Badge>{!connection.connected && <Button asChild size="sm" variant="outline"><Link to="/configuracoes"><Settings2 className="mr-2 size-4" />Configurar</Link></Button>}</div></header>
    {!connection.connected && <div className="rounded-2xl border border-primary/15 bg-primary/[.04] px-4 py-3 text-sm text-muted-foreground">Seu WhatsApp ainda não está conectado. Configure a Z-API em <Link to="/configuracoes" className="font-medium text-primary hover:underline">Configurações</Link> para habilitar o envio real.</div>}
    <div className="grid min-h-[660px] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="glass overflow-hidden rounded-2xl"><CardHeader className="space-y-3 border-b border-border/70 p-4 pb-3"><CardTitle className="text-sm">Conversas <span className="ml-1 text-muted-foreground">{conversations.length}</span></CardTitle><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversa..." className="h-9 pl-9" /></div></CardHeader><CardContent className="space-y-1 p-2">{filteredConversations.map((conversation) => { const item = prospects.find((p) => p.id === conversation.prospect_id); const active = selectedId === conversation.id; return <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full rounded-xl p-3 text-left transition-all ${active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/70"}`}><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{item?.company?.[0]?.toUpperCase() ?? "P"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item?.company ?? "Prospect"}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{conversation.last_message_preview ?? "Sem mensagens"}</p></div>{conversation.unread_count > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{conversation.unread_count}</span>}</div></button>; })}{filteredConversations.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>}<div className="mt-3 border-t border-border/70 pt-3"><p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Novo atendimento</p>{prospects.filter((p) => p.whatsapp || p.phone).slice(0, 10).map((p) => <Button key={p.id} size="sm" variant="ghost" className="w-full justify-start rounded-lg" onClick={() => void startConversation(p.id)}><UserPlus className="mr-2 size-4" />{p.company}</Button>)}</div></CardContent></Card>
      <Card className="glass overflow-hidden rounded-2xl"><CardContent className="flex h-full min-h-[660px] flex-col p-0">{selected ? <><div className="flex items-center gap-3 border-b border-border/70 bg-card/60 px-5 py-4"><span className="grid size-10 place-items-center rounded-full bg-primary/10 font-bold text-primary">{conversationName[0]?.toUpperCase() ?? "C"}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{conversationName}</p><p className="text-xs text-muted-foreground">{prospect?.contact_name ?? "Sem contato"} · {prospect?.whatsapp ?? prospect?.phone ?? "Sem telefone"}</p></div><Badge variant="secondary" className="hidden rounded-full sm:inline-flex">Histórico salvo</Badge></div><div className="flex-1 space-y-3 overflow-y-auto bg-background/25 p-5">{messages.length === 0 && <div className="mx-auto max-w-sm py-24 text-center"><MessageCircle className="mx-auto size-8 text-primary/50" /><p className="mt-3 text-sm font-medium">Nenhuma mensagem ainda</p><p className="mt-1 text-xs text-muted-foreground">Comece enviando a primeira mensagem deste prospect.</p></div>}{messages.map((message) => <div key={message.id} className={`flex ${message.direction === "out" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${message.direction === "out" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border/70 bg-card"}`}><p className="whitespace-pre-wrap leading-5">{message.body}</p><p className="mt-1 text-[10px] opacity-65">{new Date(message.created_at).toLocaleString("pt-BR")}</p></div></div>)}</div><div className="border-t border-border/70 bg-card/60 p-4"><div className="flex gap-2"><Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={connection.connected ? "Digite sua mensagem..." : "Conecte o WhatsApp para enviar"} rows={2} className="min-h-20 resize-none rounded-xl" disabled={!connection.connected} /><Button onClick={() => void handleSend()} disabled={!connection.connected || !body.trim() || sending} className="self-end rounded-xl px-4"><Send className="mr-2 size-4" />{sending ? "Enviando" : "Enviar"}</Button></div><details className="mt-3"><summary className="cursor-pointer text-[11px] font-medium text-muted-foreground">Registrar resposta recebida</summary><div className="mt-2 flex gap-2"><Input value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="Resposta recebida do prospect" /><Button variant="outline" size="sm" onClick={() => void handleIncoming()} disabled={!replyBody.trim()}>Registrar</Button></div></details></div></> : <div className="m-auto max-w-sm text-center"><MessageCircle className="mx-auto size-9 text-primary/50" /><p className="mt-3 font-medium">Selecione uma conversa</p><p className="mt-1 text-sm text-muted-foreground">As mensagens e dados do prospect aparecerão aqui.</p></div>}</CardContent></Card>
    </div>
  </div>;
}
