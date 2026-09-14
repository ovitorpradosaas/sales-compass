/**
 * Camada de integração do WhatsApp.
 * A UI conhece somente este serviço; o provedor fica isolado aqui.
 * O adaptador atual é local e não dispara mensagens externas.
 */
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/session";

export interface ConnectionStatus { connected: boolean; phoneNumber: string | null; provider: "whatsapp_business_platform"; }
export interface WhatsappProvider { kind: "local" | "whatsapp_business_platform"; getConnectionStatus(): Promise<ConnectionStatus>; sendText(input: { phone: string; body: string }): Promise<{ providerMessageId: string | null }>; }

const localProvider: WhatsappProvider = {
  kind: "local",
  async getConnectionStatus() { return { connected: false, phoneNumber: null, provider: "whatsapp_business_platform" }; },
  async sendText() { return { providerMessageId: null }; },
};

function getProvider(): WhatsappProvider { return localProvider; }
export async function getConnectionStatus(): Promise<ConnectionStatus> { return getProvider().getConnectionStatus(); }

export function renderTemplate(body: string, vars: { nome?: string | null; empresa?: string | null; cidade?: string | null; nicho?: string | null; cargo?: string | null }): string {
  return body.replace(/\{\{\s*nome\s*\}\}/g, vars.nome ?? "").replace(/\{\{\s*empresa\s*\}\}/g, vars.empresa ?? "").replace(/\{\{\s*cidade\s*\}\}/g, vars.cidade ?? "").replace(/\{\{\s*nicho\s*\}\}/g, vars.nicho ?? "").replace(/\{\{\s*cargo\s*\}\}/g, vars.cargo ?? "");
}

export async function ensureConversation(prospectId: string): Promise<string> {
  const userId = await currentUserId();
  const { data: existing, error: findError } = await supabase.from("whatsapp_conversations").select("id").eq("prospect_id", prospectId).eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (findError) throw findError;
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase.from("whatsapp_conversations").insert({ user_id: userId, prospect_id: prospectId }).select("id").single();
  if (error || !created) throw error ?? new Error("Não foi possível criar a conversa.");
  return created.id;
}

export async function sendMessage(params: { conversationId?: string; prospectId: string; body: string }): Promise<void> {
  const userId = await currentUserId();
  const body = params.body.trim();
  if (!body) throw new Error("A mensagem não pode estar vazia.");
  const { data: prospect, error: prospectError } = await supabase.from("prospects").select("whatsapp,phone,contact_name,company,city,niche,contact_role").eq("id", params.prospectId).single();
  if (prospectError || !prospect) throw prospectError ?? new Error("Prospect não encontrado.");
  const phone = prospect.whatsapp ?? prospect.phone;
  if (!phone) throw new Error("Este prospect não possui WhatsApp ou telefone.");
  const conversationId = params.conversationId ?? await ensureConversation(params.prospectId);
  const providerResult = await getProvider().sendText({ phone, body });
  const { error } = await supabase.from("whatsapp_messages").insert({ user_id: userId, conversation_id: conversationId, body, direction: "out", status: providerResult.providerMessageId ? "enviada" : "registrada_local" });
  if (error) throw error;
  await supabase.from("whatsapp_conversations").update({ last_message_preview: body, last_message_at: new Date().toISOString(), unread_count: 0 }).eq("id", conversationId);
  await supabase.from("activities").insert({ user_id: userId, prospect_id: params.prospectId, type: "mensagem_enviada", description: body.slice(0, 180) });
  await supabase.from("prospects").update({ last_contact_at: new Date().toISOString(), status: "contatado" }).eq("id", params.prospectId);
}

export async function recordIncomingMessage(params: { conversationId: string; prospectId: string; body: string }): Promise<void> {
  const userId = await currentUserId();
  const body = params.body.trim();
  if (!body) throw new Error("A resposta não pode estar vazia.");
  const { error } = await supabase.from("whatsapp_messages").insert({ user_id: userId, conversation_id: params.conversationId, body, direction: "in", status: "recebida" });
  if (error) throw error;
  await supabase.from("whatsapp_conversations").update({ last_message_preview: body, last_message_at: new Date().toISOString(), unread_count: 1 }).eq("id", params.conversationId);
  await supabase.from("prospects").update({ status: "respondeu", next_action: "Responder mensagem recebida", next_action_at: new Date().toISOString() }).eq("id", params.prospectId);
  await supabase.from("activities").insert({ user_id: userId, prospect_id: params.prospectId, type: "resposta_recebida", description: body.slice(0, 180) });
  const { data: stopSequences } = await supabase.from("sequences").select("id").eq("stop_on_reply", true);
  const sequenceIds = (stopSequences ?? []).map((sequence) => sequence.id);
  if (sequenceIds.length) await supabase.from("scheduled_messages").update({ status: "cancelada" }).eq("prospect_id", params.prospectId).eq("status", "agendada").in("sequence_id", sequenceIds);
}
