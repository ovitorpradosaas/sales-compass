import { supabase } from "@/integrations/supabase/client";

/** Id do usuário autenticado — usado para preencher `user_id` em inserts. */
export async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}
