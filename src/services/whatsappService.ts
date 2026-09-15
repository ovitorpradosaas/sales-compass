/**
 * Camada de integração do WhatsApp.
 * A UI conhece somente este serviço; o provedor fica isolado aqui.
 * As chamadas externas passam por server functions para evitar CORS no navegador.
 */
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/session";
import { checkWhatsappConnection, sendWhatsappText } from "./whatsapp.functions";

const CONFIG_STORAGE = "prospectflow.whatsapp";

export type WhatsappProviderId = "z-api" | "w-api" | "evolution";

export interface WhatsappConfig {
  provider: WhatsappProviderId;
  instanceId: string;
  token: string;
  clientToken: string;
  baseUrl: string;
}

export interface ConnectionStatus {
  connected: boolean;
  phoneNumber: string | null;
  provider: WhatsappProviderId | "none";
}

export interface WhatsappProvider {
  kind: WhatsappProviderId;
  getConnectionStatus(): Promise<ConnectionStatus>;
  sendText(input: { phone: string; body: string }): Promise<{ providerMessageId: string | null }>;
}

const EMPTY_CONFIG: WhatsappConfig = { provider: "z-api", instanceId: "", token: "", clientToken: "", baseUrl: "" };

export function getWhatsappConfig(): WhatsappConfig {
  if (typeof window === "undefined") return EMPTY_CONFIG;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONFIG_STORAGE) ?? "null") as Partial<WhatsappConfig> | null;
    return { ...EMPTY_CONFIG, ...parsed };
  } catch {
    return EMPTY_CONFIG;
  }
}

export function saveWhatsappConfig(config: WhatsappConfig): void {
  if (typeof window !== "undefined") window.localStorage.setItem(CONFIG_STORAGE, JSON.stringify(config));
}

function ensureConfig(config: WhatsappConfig): void {
  if (!config.instanceId.trim() || !config.token.trim()) throw new Error("Informe o ID da instância e o token do provedor.");
  if (config.provider === "evolution" && !config.baseUrl.trim()) throw new Error("Informe a URL da Evolution API.");
}

const providerAdapter: WhatsappProvider = {
  kind: "z-api",
  async getConnectionStatus() {
    const config = getWhatsappConfig();
    if (!config.instanceId.trim() || !config.token.trim() || (config.provider === "evolution" && !config.baseUrl.trim())) {
      return { connected: false, phoneNumber: null, provider: "none" };
    }
    const status = await checkWhatsappConnection({ data: config });
    return { connected: status.connected, phoneNumber: status.phoneNumber, provider: config.provider };
  },
  async sendText({ phone, body }) {
    const config = getWhatsappConfig();
    ensureConfig(config);
    return sendWhatsappText({ data: { ...config, phone, body } });
  },
};

export function getConfiguredProvider(): WhatsappProviderId {
  return getWhatsappConfig().provider;
}

export async function testWhatsappConnection(config = getWhatsappConfig()): Promise<ConnectionStatus> {
  ensureConfig(config);
  const status = await checkWhatsappConnection({ data: config });
  if (!status.connected) throw new Error(`${config.provider === "evolution" ? "Evolution API" : config.provider === "w-api" ? "W-API" : "Z-API"} respondeu, mas o WhatsApp não está conectado à instância.`);
  return { connected: true, phoneNumber: status.phoneNumber, provider: config.provider };
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  return providerAdapter.getConnectionStatus();
}

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
  const providerResult = await providerAdapter.sendText({ phone, body });
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
