/**
 * =============================================================================
 * CAMADA DE INTEGRAÇÃO — WHATSAPP
 * =============================================================================
 * Interface isolada para envio de mensagens. Hoje a mensagem é apenas gravada
 * no banco (registro local do CRM) — NENHUM envio real acontece.
 *
 * >>> INÍCIO DO MOCK <<<
 * Para conectar a WhatsApp Business Platform (API OFICIAL da Meta):
 *   1. Guarde o token/phone number id como secret do backend.
 *   2. Crie um createServerFn `sendWhatsappMessage` que faça POST em
 *      https://graph.facebook.com/v20.0/{phone_number_id}/messages
 *   3. Chame esse serverFn dentro de `sendMessage` antes de gravar no banco.
 *   4. Receba status/respostas por webhook em src/routes/api/public/whatsapp.ts
 * Métodos não oficiais de automação NÃO são suportados por decisão de projeto.
 * >>> FIM DO MOCK está marcado abaixo <<<
 */
import { supabase } from "@/integrations/supabase/client";

export interface ConnectionStatus {
  connected: boolean;
  phoneNumber: string | null;
  provider: "whatsapp_business_platform";
}

export function getConnectionStatus(): ConnectionStatus {
  // Substituir por leitura real da configuração da conta quando a API for ligada.
  return { connected: false, phoneNumber: null, provider: "whatsapp_business_platform" };
}

export function renderTemplate(
  body: string,
  vars: { nome?: string | null; empresa?: string | null; cidade?: string | null; nicho?: string | null; cargo?: string | null },
): string {
  return body
    .replace(/\{\{\s*nome\s*\}\}/g, vars.nome ?? "")
    .replace(/\{\{\s*empresa\s*\}\}/g, vars.empresa ?? "")
    .replace(/\{\{\s*cidade\s*\}\}/g, vars.cidade ?? "")
    .replace(/\{\{\s*nicho\s*\}\}/g, vars.nicho ?? "")
    .replace(/\{\{\s*cargo\s*\}\}/g, vars.cargo ?? "");
}

// ============================ >>> INÍCIO DO MOCK <<< =========================
export async function sendMessage(params: {
  conversationId: string;
  prospectId: string;
  body: string;
}): Promise<void> {
  // AQUI entra a chamada à API oficial (via serverFn). Hoje só registra local.
  const { error } = await supabase.from("whatsapp_messages").insert({
    conversation_id: params.conversationId,
    body: params.body,
    direction: "out",
    status: "registrada_local",
  });
  if (error) throw error;

  await supabase
    .from("whatsapp_conversations")
    .update({ last_message_preview: params.body, last_message_at: new Date().toISOString(), unread_count: 0 })
    .eq("id", params.conversationId);

  await supabase.from("activities").insert({
    prospect_id: params.prospectId,
    type: "mensagem_enviada",
    description: params.body.slice(0, 180),
  });

  await supabase
    .from("prospects")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", params.prospectId);
}
// ============================= >>> FIM DO MOCK <<< ===========================
