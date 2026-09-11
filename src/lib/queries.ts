import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Activity,
  Conversation,
  CustomField,
  Icp,
  IcpCriterion,
  Profile,
  Prospect,
  ScheduledMessage,
  Sequence,
  SequenceStep,
  Stage,
  Tag,
  Template,
  WhatsappMessage,
} from "@/lib/types";

/** Wrapper defensivo: qualquer erro de RLS/rede vira exceção tratável pela UI. */
async function run<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export function useProspects() {
  return useQuery({
    queryKey: ["prospects"],
    queryFn: () =>
      run<Prospect[]>(supabase.from("prospects").select("*").order("created_at", { ascending: false })),
  });
}

export function useStages() {
  return useQuery({
    queryKey: ["stages"],
    queryFn: () => run<Stage[]>(supabase.from("pipeline_stages").select("*").order("position")),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => run<Tag[]>(supabase.from("tags").select("*").order("name")),
  });
}

export function useProspectTags() {
  return useQuery({
    queryKey: ["prospect_tags"],
    queryFn: () =>
      run<{ prospect_id: string; tag_id: string }[]>(
        supabase.from("prospect_tags").select("prospect_id, tag_id"),
      ),
  });
}

export function useIcps() {
  return useQuery({
    queryKey: ["icps"],
    queryFn: () => run<Icp[]>(supabase.from("icps").select("*").order("created_at")),
  });
}

export function useCriteria() {
  return useQuery({
    queryKey: ["icp_criteria"],
    queryFn: () => run<IcpCriterion[]>(supabase.from("icp_criteria").select("*").order("position")),
  });
}

export function useActivities(prospectId?: string) {
  return useQuery({
    queryKey: ["activities", prospectId ?? "all"],
    queryFn: () => {
      const q = supabase.from("activities").select("*").order("created_at", { ascending: false });
      return run<Activity[]>(prospectId ? q.eq("prospect_id", prospectId) : q.limit(50));
    },
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => run<Template[]>(supabase.from("message_templates").select("*").order("name")),
  });
}

export function useSequences() {
  return useQuery({
    queryKey: ["sequences"],
    queryFn: () => run<Sequence[]>(supabase.from("sequences").select("*").order("created_at")),
  });
}

export function useSequenceSteps() {
  return useQuery({
    queryKey: ["sequence_steps"],
    queryFn: () => run<SequenceStep[]>(supabase.from("sequence_steps").select("*").order("position")),
  });
}

export function useScheduledMessages() {
  return useQuery({
    queryKey: ["scheduled_messages"],
    queryFn: () =>
      run<ScheduledMessage[]>(supabase.from("scheduled_messages").select("*").order("scheduled_at")),
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      run<Conversation[]>(
        supabase.from("whatsapp_conversations").select("*").order("last_message_at", { ascending: false }),
      ),
  });
}

export function useMessages(conversationId?: string) {
  return useQuery({
    enabled: Boolean(conversationId),
    queryKey: ["messages", conversationId],
    queryFn: () =>
      run<WhatsappMessage[]>(
        supabase
          .from("whatsapp_messages")
          .select("*")
          .eq("conversation_id", conversationId!)
          .order("created_at"),
      ),
  });
}

export function useCustomFields() {
  return useQuery({
    queryKey: ["custom_fields"],
    queryFn: () => run<CustomField[]>(supabase.from("custom_fields").select("*").order("position")),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Profile | null) ?? null;
    },
  });
}

/** Invalida um conjunto de chaves depois de mutações. */
export function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
}

export function useTableMutation<TVars>(
  keys: string[],
  fn: (vars: TVars) => Promise<unknown>,
) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate(keys),
  });
}
