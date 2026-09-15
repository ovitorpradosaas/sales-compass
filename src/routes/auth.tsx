import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Entrar — ProspectFlow" },
    { name: "description", content: "Acesse sua conta ProspectFlow." },
    { name: "robots", content: "noindex" },
  ] }),
  component: AuthPage,
});

type Mode = "in" | "up" | "reset";

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("provider is not enabled") || normalized.includes("provider_disabled")) return "O login com Google ainda não está habilitado no Supabase.";
  if (normalized.includes("redirect") && normalized.includes("url")) return "O endereço de retorno do Google não está autorizado no Supabase.";
  if (normalized.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.";
  if (normalized.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (normalized.includes("signup is disabled")) return "O cadastro de novos usuários está desativado no Supabase.";
  return message;
}

function PasswordField({ id, label, value, onChange, placeholder, minLength }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <Input id={id} type={visible ? "text" : "password"} required minLength={minLength} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-11" autoComplete={id.includes("confirm") ? "new-password" : id.includes("new") || id.includes("password2") || id.includes("password3") ? "new-password" : "current-password"} />
      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}>
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  </div>;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") ?? params.get("error");
    if (oauthError) {
      toast.error(authErrorMessage(oauthError));
      window.history.replaceState({}, "", window.location.pathname);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        void navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: nextEmail, password });
      if (error) throw new Error(error.message);
      if (data.session) await navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(authErrorMessage(error instanceof Error ? error.message : "Não foi possível entrar."));
    } finally {
      setLoading(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    const nextEmail = email.trim();
    const nextName = name.trim();
    if (!nextName) return void toast.error("Informe seu nome.");
    if (password.length < 6) return void toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirmPassword) return void toast.error("As senhas não coincidem.");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: nextEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: nextName } },
      });
      if (error) throw new Error(error.message);
      if (data.session) {
        await navigate({ to: "/dashboard", replace: true });
      } else {
        toast.success("Conta criada. Confirme seu e-mail para entrar.");
        setMode("in");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      toast.error(authErrorMessage(error instanceof Error ? error.message : "Não foi possível criar sua conta."));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth` });
      if (error) throw new Error(error.message);
      toast.success("Enviamos um link de recuperação para seu e-mail.");
      setMode("in");
    } catch (error) {
      toast.error(authErrorMessage(error instanceof Error ? error.message : "Não foi possível enviar a recuperação."));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth`, queryParams: { prompt: "select_account" } } });
      if (error) throw new Error(error.message);
      if (!data.url) throw new Error("O provedor Google não retornou a URL de autenticação.");
      window.location.assign(data.url);
    } catch (error) {
      setLoading(false);
      toast.error(authErrorMessage(error instanceof Error ? error.message : "Não foi possível abrir o Google."));
    }
  }

  const title = mode === "reset" ? "Recupere seu acesso" : mode === "up" ? "Comece sua prospecção" : "Volte para o seu pipeline";
  const description = mode === "reset" ? "Digite seu e-mail e enviaremos um link para criar uma nova senha." : mode === "up" ? "Crie sua conta e organize o processo comercial em poucos minutos." : "Acesse seu workspace e continue de onde parou.";

  return <div className="min-h-screen overflow-hidden bg-background"><div className="absolute inset-0 page-grid opacity-50" /><div className="pointer-events-none absolute left-[8%] top-[12%] size-64 rounded-full bg-primary/10 blur-3xl" /><div className="pointer-events-none absolute bottom-[10%] right-[8%] size-72 rounded-full bg-sky/10 blur-3xl" />
    <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-5 py-8 md:grid-cols-2 md:px-8">
      <div className="hidden md:block"><Link to="/" className="inline-flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">P</span><span className="font-display text-lg font-semibold">ProspectFlow</span></Link><p className="mt-12 max-w-xl text-sm font-semibold uppercase tracking-[.18em] text-primary">Seu processo comercial, no lugar certo.</p><h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[1.02]">Deixe o sistema lembrar. <span className="text-primary">Você vende.</span></h1><p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">ICP, prospects, pipeline, conversas e follow-up em uma experiência feita para ação.</p><div className="mt-7 space-y-3 text-sm text-muted-foreground">{["Busca orientada pelo seu ICP", "Pipeline simples e visual", "Histórico e follow-up centralizados"].map((item) => <div key={item} className="flex items-center gap-2.5"><CheckCircle2 className="size-4 text-primary" />{item}</div>)}</div></div>
      <div className="mx-auto w-full max-w-md"><Link to="/" className="mb-6 flex justify-center gap-2.5 md:hidden"><span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">P</span><span className="font-display text-lg font-semibold">ProspectFlow</span></Link><Card className="glass-strong rounded-[1.5rem] border-border/70"><CardHeader className="p-6 pb-3"><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><CardTitle className="text-2xl">{title}</CardTitle><CardDescription className="leading-6">{description}</CardDescription></CardHeader><CardContent className="p-6 pt-3">
        {mode === "reset" ? <form className="space-y-4" onSubmit={resetPassword}><div className="space-y-1.5"><Label htmlFor="reset-email">E-mail</Label><Input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div><Button type="submit" className="h-11 w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar recuperação"}</Button><Button type="button" variant="ghost" className="w-full" onClick={() => setMode("in")}>Voltar para entrar</Button></form> : <><Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => void google()} disabled={loading}>{loading ? "Abrindo Google..." : "Continuar com Google"}</Button><div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div><Tabs value={mode} onValueChange={(value) => setMode(value as "in" | "up")}><TabsList className="grid h-10 w-full grid-cols-2 rounded-xl"><TabsTrigger value="in">Entrar</TabsTrigger><TabsTrigger value="up">Criar conta</TabsTrigger></TabsList><TabsContent value="in"><form className="space-y-4 pt-4" onSubmit={signIn}><div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div><PasswordField id="password" label="Senha" value={password} onChange={setPassword} /><div className="text-right"><button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setMode("reset")}>Esqueci minha senha</button></div><Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>{loading ? "Entrando..." : "Entrar"}<ArrowRight className="ml-auto size-4" /></Button></form></TabsContent><TabsContent value="up"><form className="space-y-4 pt-4" onSubmit={signUp}><div className="space-y-1.5"><Label htmlFor="name">Nome</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div><div className="space-y-1.5"><Label htmlFor="email2">E-mail</Label><Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div><div className="grid gap-4 sm:grid-cols-2"><PasswordField id="password2" label="Senha" value={password} onChange={setPassword} minLength={6} /><PasswordField id="password3" label="Confirmar senha" value={confirmPassword} onChange={setConfirmPassword} minLength={6} /></div><Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>{loading ? "Criando..." : "Criar minha conta"}<ArrowRight className="ml-auto size-4" /></Button></form></TabsContent></Tabs></>}
      </CardContent></Card><p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Ao criar uma conta, você concorda com os termos de uso do serviço.</p></div>
    </div>
  </div>;
}
