import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/integrations/supabase/authSessionCache";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const cachedSession = getCachedSession();
    if (cachedSession) return { user: cachedSession.user };

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  useEffect(() => {
    void supabase.rpc("bootstrap_workspace");
  }, []);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
