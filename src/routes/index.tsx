import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, MessageCircle, Search, Sparkles, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "ProspectFlow — encontre e converta seus próximos clientes" },
    { name: "description", content: "ICP, prospecção, pipeline, WhatsApp e follow-up em um só fluxo." },
    { property: "og:title", content: "ProspectFlow — prospecção sem CRM gigante" },
    { property: "og:description", content: "Do ICP ao follow-up, com foco no que realmente move sua prospecção." },
  ]}),
  component: Landing,
});

const FEATURES = [
  { icon: Target, title: "ICP que realmente filtra", text: "Defina nicho, região, porte e sinais digitais para encontrar empresas mais aderentes." },
  { icon: Search, title: "Prospecção prática", text: "Encontre empresas, elimine duplicados e envie os melhores resultados para o pipeline." },
  { icon: MessageCircle, title: "Contato no contexto", text: "Converse, registre histórico e acompanhe o próximo passo sem trocar de ferramenta." },
  { icon: Zap, title: "Follow-up sem esquecimento", text: "Crie sequências e mantenha a cadência ativa até receber uma resposta." },
];

const STEPS = [["01", "Defina seu ICP", "Diga quem é o cliente certo."], ["02", "Encontre prospects", "Busque e qualifique empresas."], ["03", "Entre em contato", "Leve o prospect para o funil."], ["04", "Faça follow-up", "Mantenha o próximo passo vivo."]];

function ProductPreview() {
  return <div className="w-full max-w-lg rounded-[1.75rem] border border-primary/15 bg-card/80 p-3 shadow-2xl shadow-primary/10 backdrop-blur-xl">
    <div className="rounded-[1.25rem] border border-border bg-background/90 p-4">
      <div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-[11px] font-medium text-muted-foreground">Visão geral</p><p className="mt-1 font-display text-xl font-semibold">Painel de prospecção</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">Ativo</span></div>
      <div className="mt-4 grid grid-cols-3 gap-3">{[["47", "Prospects"], ["12", "Contatos"], ["5", "Respostas"]].map(([n, l]) => <div key={l} className="rounded-2xl border border-border bg-card p-3"><p className="text-xl font-semibold tabular-nums">{n}</p><p className="mt-1 text-[10px] text-muted-foreground">{l}</p></div>)}</div>
      <div className="mt-4 rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Próximas ações</p><span className="text-[10px] text-muted-foreground">3 hoje</span></div><div className="mt-3 space-y-2">{[["Almeida Arquitetura", "Resposta recebida", "82"], ["Nexus Imóveis", "Enviar follow-up", "91"], ["Studio Atlas", "Primeiro contato", "76"]].map(([name, action, score]) => <div key={name} className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{name[0]}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{name}</p><p className="truncate text-[10px] text-muted-foreground">{action}</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{score}</span></div>)}</div></div>
    </div>
  </div>;
}

function Landing() {
  return <div className="min-h-screen overflow-hidden bg-background">
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8"><Link to="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">P</span><span className="font-display text-lg font-semibold tracking-tight">ProspectFlow</span></Link><div className="flex items-center gap-2"><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth">Entrar</Link></Button><Button asChild><Link to="/auth">Começar grátis <ArrowRight className="ml-2 size-4" /></Link></Button></div></header>
    <main>
      <section className="relative page-grid border-b border-border/70"><div className="pointer-events-none absolute left-[8%] top-20 size-72 rounded-full bg-primary/10 blur-3xl" /><div className="pointer-events-none absolute right-[8%] top-24 size-72 rounded-full bg-sky/10 blur-3xl" /><div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.02fr_.98fr] md:px-8 md:pb-24 md:pt-20"><div className="flex flex-col justify-center"><div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="size-3.5" />Prospecção sem CRM gigante</div><h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.03] sm:text-5xl md:text-6xl">Encontre quem importa. <span className="text-primary">Converse. Faça follow-up.</span></h1><p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">ICP, prospecção, pipeline, WhatsApp e follow-up em um fluxo simples para transformar busca em oportunidade.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="h-12 soft-glow"><Link to="/auth">Começar agora <ArrowRight className="ml-2 size-4" /></Link></Button><Button asChild size="lg" variant="outline" className="h-12"><Link to="/auth">Já tenho uma conta</Link></Button></div><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">{["Busca por ICP", "Pipeline Kanban", "Sequências"].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" />{item}</span>)}</div></div><div className="flex items-center justify-center md:justify-end"><ProductPreview /></div></div></section>
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Tudo em um fluxo</p><h2 className="mt-2 text-3xl font-semibold md:text-4xl">Menos abas abertas. Mais ação comercial.</h2><p className="mt-3 text-muted-foreground">Cada tela foi pensada para tirar o prospect da descoberta e levar ao próximo passo.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{FEATURES.map(({ icon: Icon, title, text }) => <div key={title} className="interactive-card glass rounded-2xl p-5"><div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></div><h3 className="mt-4 text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></section>
      <section className="border-y border-border/70 bg-card/40"><div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20"><p className="text-sm font-semibold text-primary">Como funciona</p><h2 className="mt-2 max-w-2xl text-3xl font-semibold md:text-4xl">Do primeiro filtro ao próximo follow-up.</h2><div className="mt-10 grid gap-7 md:grid-cols-4">{STEPS.map(([number,title,text]) => <div key={number}><span className="text-xs font-bold text-primary">{number}</span><h3 className="mt-3 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div></section>
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20"><div className="rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-sky/8 p-7 shadow-xl shadow-primary/5 md:p-10"><div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-sm font-semibold text-primary">Pronto para organizar sua prospecção?</p><h2 className="mt-2 max-w-2xl text-3xl font-semibold md:text-4xl">Pare de deixar oportunidades espalhadas em planilhas e conversas.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Comece pelo seu ICP e centralize o processo comercial.</p></div><Button asChild size="lg" className="h-12"><Link to="/auth">Criar minha conta <ArrowRight className="ml-2 size-4" /></Link></Button></div></div></section>
    </main>
    <footer className="border-t border-border/70 px-5 py-7 md:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span className="font-display text-sm font-semibold text-foreground">ProspectFlow</span><span>Prospecção simples para quem quer vender.</span></div></footer>
  </div>;
}
