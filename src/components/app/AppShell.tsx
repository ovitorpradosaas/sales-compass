import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Contact,
  Kanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Target,
  Telescope,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile, useProspects } from "@/lib/queries";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/prospeccao", label: "Prospecção", icon: Telescope },
  { to: "/prospects", label: "Prospects", icon: Contact },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/icps", label: "ICPs", icon: Target },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: prospects = [] } = useProspects();
  const [term, setTerm] = useState("");

  const pending = prospects.filter(
    (p) => p.next_action_at && new Date(p.next_action_at) <= new Date(),
  ).length;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name ?? profile?.email ?? "PF")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar px-3 py-4 md:flex">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            P
          </span>
          <span className="font-display text-lg font-semibold">ProspectFlow</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-foreground"
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto px-3 text-xs text-muted-foreground">
          Fluxo: ICP → busca → pipeline → conversa → follow-up
        </p>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <form
            className="relative w-full max-w-sm"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/prospects", search: { q: term } });
            }}
          >
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar empresa, contato, cidade..."
              aria-label="Busca global"
              className="pl-9"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
                  <Bell className="size-4" />
                  {pending > 0 && (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <p className="text-sm font-medium">Notificações</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {pending > 0
                    ? `${pending} ação(ões) vencida(s) aguardando você.`
                    : "Nada pendente agora."}
                </p>
                <Link
                  to="/dashboard"
                  className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Ver ações de hoje
                </Link>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:inline">
                    {profile?.full_name ?? profile?.email ?? "Minha conta"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.email ?? ""}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes">Configurações</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleSignOut()}>
                  <LogOut className="mr-2 size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
