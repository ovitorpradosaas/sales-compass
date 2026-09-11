import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Kanban, MessageCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProspectFlow — prospecção comercial simples e organizada" },
      {
        name: "description",
        content:
          "Encontre clientes pelo seu ICP, organize prospects, converse no WhatsApp e acompanhe follow-ups num funil Kanban.",
      },
      { property: "og:title", content: "ProspectFlow — prospecção comercial simples" },
      {
        property: "og:description",
        content: "ICP, busca de prospects, WhatsApp e funil Kanban num só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Target, title: "ICPs sob medida", text: "Defina nicho, região, faturamento e palavras-chave. Salve quantos perfis quiser." },
  { icon: Kanban, title: "Funil Kanban", text: "Etapas personalizáveis, arraste e solte, próxima ação sempre visível." },
  { icon: MessageCircle, title: "WhatsApp no CRM", text: "Conversas, modelos de mensagem e sequências de follow-up ao lado da ficha." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            P
          </span>
          <span className="font-display text-lg font-semibold">ProspectFlow</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-16 md:py-24">
          <p className="text-sm font-medium text-primary">Prospecção diária, sem CRM gigante</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
            Encontre, organize e converse com seus próximos clientes.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Do ICP ao fechamento: busque prospects, adicione ao funil, inicie o contato no WhatsApp e
            nunca perca um follow-up.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Começar agora <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/dashboard">Ver meu painel</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-24 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass rounded-2xl p-6">
              <Icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-4 text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
