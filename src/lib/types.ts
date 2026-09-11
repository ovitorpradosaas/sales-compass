import type { Database } from "@/integrations/supabase/types";

export type Tables = Database["public"]["Tables"];

export type Prospect = Tables["prospects"]["Row"];
export type Icp = Tables["icps"]["Row"];
export type IcpCriterion = Tables["icp_criteria"]["Row"];
export type Stage = Tables["pipeline_stages"]["Row"];
export type Tag = Tables["tags"]["Row"];
export type Activity = Tables["activities"]["Row"];
export type Template = Tables["message_templates"]["Row"];
export type Sequence = Tables["sequences"]["Row"];
export type SequenceStep = Tables["sequence_steps"]["Row"];
export type ScheduledMessage = Tables["scheduled_messages"]["Row"];
export type Conversation = Tables["whatsapp_conversations"]["Row"];
export type WhatsappMessage = Tables["whatsapp_messages"]["Row"];
export type CustomField = Tables["custom_fields"]["Row"];
export type Profile = Tables["profiles"]["Row"];

export const PROSPECT_STATUSES = [
  "novo",
  "contatar",
  "contatado",
  "respondeu",
  "qualificado",
  "reuniao",
  "ganho",
  "perdido",
] as const;

export function scoreTone(score: number): "alto" | "medio" | "baixo" {
  if (score >= 80) return "alto";
  if (score >= 55) return "medio";
  return "baixo";
}
