import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConversations, useInvalidate, useMessages, useProspects } from "@/lib/queries";
import { ensureConversation, recordIncomingMessage, sendMessage } from "@/services/whatsappService";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Sales Compass" }, { name: "robots", content: "noindex" }] }),
  component: WhatsappPage,
});

function WhatsappPage() {
  const invalidate = useInvalidate();
  const { data: conversations = [] } = useConversations();
  const { data: prospects = [] } = useProspects();
  const [selectedId, setSelectedId] = useState<string>();
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const selected = conversations.find((conversation) => conversation.id === selectedId);
  const { data: messages = [] } = useMessages(selectedId);
  const prospect = prospects.find((item) => item.id === selected?.prospect_id);

  useEffect(() => {
    if (!selectedId && conversations[0]) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const conversationName = useMemo(() => prospect?.company ?? "Conversa", [prospect]);

  const startConversation = async (prospectId: string) => {
    try {
      const id = await ensureConversation(prospectId);
      setSelectedId(id);
      invalidate(["conversations", "messages"]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível abrir a conversa."); }
  };

  const handleSend = async () => {
    if (!selected || !body.trim()) return;
    setSending(true);
    try {
      await sendMessage({ conversationId: selected.id, prospectId: selected.prospect_id, body });
      setBody("");
      invalidate(["conversations", "messages", "prospects", "activities"]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao enviar mensagem."); }
    finally { setSending(false); }
  };

  const handleIncoming = async () => {
    if (!selected || !replyBody.trim()) return;
    try {
      await recordIncomingMessage({ conversationId: selected.id, prospectId: selected.prospect_id, body: replyBody });
      setReplyBody("");
      invalidate(["conversations", "messages", "prospects", "activities", "scheduled_messages"]);
      toast.success("Resposta registrada e follow-ups futuros interrompidos.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar a resposta."); }
  };

  return (
    <div className="space-y-6">
      <header><h1 className="font-display text-2xl font-semibold">WhatsApp</h1><p className="mt-1 text-sm text-muted-foreground">A interface conversa com o serviço de integração, sem depender do provedor.</p></header>
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="glass"><CardContent className="space-y-2 p-3">
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversas</p>
          {conversations.map((conversation) => { const item = prospects.find((p) => p.id === conversation.prospect_id); return <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedId === conversation.id ? "border-primary bg-primary/5" : "border-transparent hover:border-border"}`}><div className="font-medium">{item?.company ?? "Prospect"}</div><div className="mt-1 truncate text-xs text-muted-foreground">{conversation.last_message_preview ?? "Sem mensagens"}</div></button>; })}
          {conversations.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>}
          <div className="border-t pt-3"><p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abrir prospect</p><div className="space-y-2">{prospects.filter((p) => p.whatsapp || p.phone).slice(0, 12).map((p) => <Button key={p.id} size="sm" variant="outline" className="w-full justify-start" onClick={() => void startConversation(p.id)}><MessageCircle className="mr-2 size-4" />{p.company}</Button>)}</div></div>
        </CardContent></Card>

        <Card className="glass min-h-[620px]"><CardContent className="flex h-full min-h-[620px] flex-col p-0">
          <div className="border-b px-5 py-4"><p className="font-semibold">{conversationName}</p><p className="text-xs text-muted-foreground">{prospect?.whatsapp ?? prospect?.phone ?? "Sem telefone"}</p></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.length === 0 && <div className="py-20 text-center text-sm text-muted-foreground">Nenhuma mensagem registrada.</div>}{messages.map((message) => <div key={message.id} className={`flex ${message.direction === "out" ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${message.direction === "out" ? "bg-primary text-primary-foreground" : "bg-muted"}`}><p>{message.body}</p><p className="mt-1 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString("pt-BR")}</p></div></div>)}</div>
          <div className="border-t p-4 space-y-3"><div className="flex gap-2"><Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Digite uma mensagem..." rows={2} /><Button onClick={() => void handleSend()} disabled={!selected || !body.trim() || sending} className="self-end"><Send className="mr-2 size-4" />Enviar</Button></div><div className="rounded-lg border border-dashed p-3"><p className="mb-2 text-xs font-medium text-muted-foreground">Teste de resposta recebida</p><div className="flex gap-2"><Input value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="Registrar uma resposta do prospect" /><Button variant="outline" onClick={() => void handleIncoming()} disabled={!selected || !replyBody.trim()}>Registrar resposta</Button></div></div></div>
        </CardContent></Card>
      </div>
    </div>
  );
}
