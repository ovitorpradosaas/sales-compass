import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — ProspectFlow" },
      { name: "description", content: "Acesse sua conta ProspectFlow para prospectar, organizar e acompanhar clientes." },
      { property: "og:title", content: "Entrar — ProspectFlow" },
      { property: "og:description", content: "Acesse sua conta ProspectFlow." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "in" | "up" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("Conta criada. Confira seu e-mail para confirmar o acesso.");
      setMode("in");
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviamos um link de recuperação para seu e-mail.");
    setMode("in");
  }

  async function google() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) toast.error("Não foi possível entrar com o Google.");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full space-y-5">
          <Link to="/" className="flex items-center justify-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">P</span>
            <span className="font-display text-lg font-semibold">ProspectFlow</span>
          </Link>

          <Card className="glass-strong shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">{mode === "reset" ? "Recuperar acesso" : mode === "up" ? "Criar sua conta" : "Bem-vindo de volta"}</CardTitle>
              <CardDescription>
                {mode === "reset" ? "Informe seu e-mail para receber o link de recuperação." : mode === "up" ? "Comece a organizar sua prospecção em poucos minutos." : "Entre para continuar sua prospecção."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "reset" ? (
                <form className="space-y-4" onSubmit={resetPassword}>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">E-mail</Label>
                    <Input id="reset-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar recuperação"}</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("in")}>Voltar para entrar</Button>
                </form>
              ) : (
                <>
                  <Button variant="outline" className="w-full" onClick={() => void google()} disabled={loading}>Continuar com Google</Button>
                  <div className="my-4 text-center text-xs text-muted-foreground">ou com e-mail</div>
                  <Tabs value={mode} onValueChange={(value) => setMode(value as "in" | "up")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="in">Entrar</TabsTrigger>
                      <TabsTrigger value="up">Criar conta</TabsTrigger>
                    </TabsList>
                    <TabsContent value="in">
                      <form className="space-y-3 pt-3" onSubmit={signIn}>
                        <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label htmlFor="password">Senha</Label><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                        <div className="text-right"><button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setMode("reset")}>Esqueci minha senha</button></div>
                        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
                      </form>
                    </TabsContent>
                    <TabsContent value="up">
                      <form className="space-y-3 pt-3" onSubmit={signUp}>
                        <div className="space-y-1.5"><Label htmlFor="name">Nome</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label htmlFor="email2">E-mail</Label><Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label htmlFor="password2">Senha</Label><Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                        <div className="space-y-1.5"><Label htmlFor="password3">Confirmar senha</Label><Input id="password3" type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
                        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">Ao criar uma conta, você concorda com os termos de uso do serviço.</p>
        </div>
      </div>
    </div>
  );
}
