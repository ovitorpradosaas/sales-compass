import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Contact, Kanban, LayoutDashboard, ListChecks, LogOut, MessageCircle, Search, Settings, Target, Telescope } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile, useProspects } from "@/lib/queries";
import { processDueFollowups } from "@/services/followupService";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/prospeccao", label: "Prospecção", icon: Telescope },
  { to: "/prospects", label: "Prospects", icon: Contact },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/sequencias", label: "Sequências", icon: ListChecks },
  { to: "/icps", label: "ICPs", icon: Target },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export interface AppShellProps { children: ReactNode; }

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: prospects = [] } = useProspects();
  const [term, setTerm] = useState("");
  const pending = prospects.filter((p) => p.next_action_at && new Date(p.next_action_at) <= new Date()).length;

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      try {
        const count = await processDueFollowups();
        if (count > 0) {
          await queryClient.invalidateQueries({ queryKey: ["prospects"] });
          await queryClient.invalidateQueries({ queryKey: ["scheduled_messages"] });
          await queryClient.invalidateQueries({ queryKey: ["conversations"] });
          await queryClient.invalidateQueries({ queryKey: ["activities"] });
        }
      } catch { /* non-blocking */ }
    };
    void run();
    const timer = window.setInterval(() => void run(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [queryClient]);

  async function handleSignOut() { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }
  const initials = (profile?.full_name ?? profile?.email ?? "PF").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return <div className="min-h-screen bg-background">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar/95 px-3 py-4 shadow-[8px_0_35px_rgba(40,20,80,.04)] backdrop-blur-xl md:flex">
      <Link to="/dashboard" className="mb-7 flex items-center gap-2.5 px-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">P</span><span className="font-display text-lg font-semibold tracking-tight">ProspectFlow</span></Link>
      <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Workspace</p>
      <nav className="flex flex-col gap-1">{NAV.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"><Icon className="size-[17px] transition-transform group-hover:scale-105" aria-hidden />{label}</Link>)}</nav>
      <div className="mt-auto rounded-2xl border border-primary/12 bg-primary/[.04] p-3"><p className="text-xs font-semibold">Seu fluxo</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">ICP → busca → pipeline → conversa → follow-up</p></div>
    </aside>
    <div className="md:pl-64">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/80 bg-background/85 px-4 backdrop-blur-xl md:px-7">
        <form className="relative w-full max-w-xl" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/prospects", search: { q: term } }); }}><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar empresa, contato ou cidade..." aria-label="Busca global" className="h-10 rounded-xl border-border/80 bg-card/70 pl-10 shadow-sm" /></form>
        <div className="ml-auto flex items-center gap-1.5"><Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Notificações" className="relative rounded-xl"> <Bell className="size-4" />{pending > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />}</Button></PopoverTrigger><PopoverContent align="end" className="w-72 rounded-2xl p-4"><p className="text-sm font-semibold">Notificações</p><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{pending > 0 ? `${pending} ação(ões) vencida(s) aguardando você.` : "Nada pendente agora."}</p><Link to="/dashboard" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Ver ações de hoje</Link></PopoverContent></Popover>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="gap-2 rounded-xl px-2"><Avatar className="size-8 ring-2 ring-primary/10"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback></Avatar><span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{profile?.full_name ?? profile?.email ?? "Minha conta"}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60 rounded-2xl"><DropdownMenuLabel className="truncate">{profile?.email ?? ""}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link to="/configuracoes">Configurações</Link></DropdownMenuItem><DropdownMenuItem onClick={() => void handleSignOut()}><LogOut className="mr-2 size-4" />Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
      </header>
      <nav className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-border/70 bg-background/80 px-3 py-2 md:hidden">{NAV.map(({ to, label }) => <Link key={to} to={to} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary">{label}</Link>)}</nav>
      <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-7 md:py-8">{children}</main>
    </div>
  </div>;
}
