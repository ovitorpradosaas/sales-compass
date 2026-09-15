import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/session";
import { renderTemplate, sendMessage } from "./whatsappService";

export async function startSequence(params: { prospectId: string; sequenceId: string }): Promise<number> {
  const userId = await currentUserId();
  const { data: sequence, error: sequenceError } = await supabase.from("sequences").select("id,name,status,stop_on_reply").eq("id", params.sequenceId).single();
  if (sequenceError || !sequence) throw sequenceError ?? new Error("Sequência não encontrada.");
  if (!["ativa", "active"].includes(sequence.status)) throw new Error("Ative a sequência antes de iniciá-la.");
  const { data: prospect, error: prospectError } = await supabase.from("prospects").select("id,whatsapp,phone").eq("id", params.prospectId).single();
  if (prospectError || !prospect) throw prospectError ?? new Error("Prospect não encontrado.");
  if (!prospect.whatsapp && !prospect.phone) throw new Error("O prospect não possui WhatsApp ou telefone.");
  const { data: steps, error: stepsError } = await supabase.from("sequence_steps").select("id,position,delay_days,body").eq("sequence_id", params.sequenceId).order("position", { ascending: true });
  if (stepsError) throw stepsError;
  if (!steps?.length) throw new Error("A sequência não possui etapas.");

  await supabase.from("scheduled_messages").update({ status: "cancelada" }).eq("user_id", userId).eq("prospect_id", params.prospectId).eq("sequence_id", params.sequenceId).eq("status", "agendada");
  let cursor = Date.now();
  const rows = steps.map((step) => {
    cursor += Math.max(0, Number(step.delay_days) || 0) * 86400000;
    return { user_id: userId, prospect_id: params.prospectId, sequence_id: params.sequenceId, step_id: step.id, scheduled_at: new Date(cursor).toISOString(), status: "agendada", body: step.body };
  });
  const { error: insertError } = await supabase.from("scheduled_messages").insert(rows);
  if (insertError) throw insertError;
  await supabase.from("prospects").update({ status: "contatar", next_action: `Executar sequência: ${sequence.name}`, next_action_at: rows[0]?.scheduled_at ?? null }).eq("id", params.prospectId);
  await supabase.from("activities").insert({ user_id: userId, prospect_id: params.prospectId, type: "sequencia_iniciada", description: `Sequência iniciada: ${sequence.name}.` });
  return rows.length;
}

export async function cancelPendingSequenceMessages(prospectId: string, sequenceId?: string): Promise<number> {
  const userId = await currentUserId();
  let query = supabase.from("scheduled_messages").update({ status: "cancelada" }).eq("user_id", userId).eq("prospect_id", prospectId).eq("status", "agendada");
  if (sequenceId) query = query.eq("sequence_id", sequenceId);
  const { data, error } = await query.select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

async function hasReplyAfterScheduled(prospectId: string, scheduledAt: string): Promise<boolean> {
  const { data: conversations } = await supabase.from("whatsapp_conversations").select("id").eq("prospect_id", prospectId);
  const ids = (conversations ?? []).map((conversation) => conversation.id);
  if (!ids.length) return false;
  const { data: replies } = await supabase.from("whatsapp_messages").select("id").in("conversation_id", ids).eq("direction", "in").gt("created_at", scheduledAt).limit(1);
  return Boolean(replies?.length);
}

async function updateNextAction(prospectId: string) {
  const { data: pending } = await supabase.from("scheduled_messages").select("scheduled_at").eq("prospect_id", prospectId).eq("status", "agendada").order("scheduled_at", { ascending: true }).limit(1).maybeSingle();
  if (pending) await supabase.from("prospects").update({ next_action: "Próximo follow-up da sequência", next_action_at: pending.scheduled_at }).eq("id", prospectId);
  else await supabase.from("prospects").update({ next_action: null, next_action_at: null }).eq("id", prospectId);
}

export async function processDueFollowups(limit = 50): Promise<number> {
  const userId = await currentUserId();
  const now = new Date().toISOString();
  const { data: due, error } = await supabase.from("scheduled_messages").select("id,prospect_id,sequence_id,scheduled_at,body,step_id").eq("user_id", userId).eq("status", "agendada").lte("scheduled_at", now).order("scheduled_at", { ascending: true }).limit(limit);
  if (error) throw error;
  let processed = 0;
  for (const message of due ?? []) {
    const { data: sequence } = await supabase.from("sequences").select("id,name,status,stop_on_reply").eq("id", message.sequence_id ?? "").maybeSingle();
    if (!sequence || !["ativa", "active"].includes(sequence.status)) { await supabase.from("scheduled_messages").update({ status: "cancelada" }).eq("id", message.id); continue; }
    if (sequence.stop_on_reply && await hasReplyAfterScheduled(message.prospect_id, message.scheduled_at)) { await cancelPendingSequenceMessages(message.prospect_id, message.sequence_id ?? undefined); continue; }
    const { data: prospect } = await supabase.from("prospects").select("id,contact_name,company,city,niche,contact_role,whatsapp,phone").eq("id", message.prospect_id).single();
    if (!prospect || (!prospect.whatsapp && !prospect.phone)) { await supabase.from("scheduled_messages").update({ status: "cancelada" }).eq("id", message.id); await updateNextAction(message.prospect_id); continue; }
    const body = renderTemplate(message.body ?? "", { nome: prospect.contact_name, empresa: prospect.company, cidade: prospect.city, nicho: prospect.niche, cargo: prospect.contact_role });
    await sendMessage({ prospectId: message.prospect_id, body });
    await supabase.from("scheduled_messages").update({ status: "registrada_local" }).eq("id", message.id);
    await supabase.from("activities").insert({ user_id: userId, prospect_id: message.prospect_id, type: "followup_enviado", description: `Etapa ${message.step_id ?? ""} da sequência ${sequence.name} registrada no modo local.` });
    await updateNextAction(message.prospect_id);
    processed += 1;
  }
  return processed;
}
