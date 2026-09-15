import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsappConnectionCard } from "@/components/app/WhatsappConnectionCard";
import { useInvalidate, useProfile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — ProspectFlow" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

const GOOGLE_MAPS_KEY_STORAGE = "prospectflow.googleMapsApiKey";

function SettingsPage() {
  const { data: profile } = useProfile();
  const invalidate = useInvalidate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setGoogleMapsApiKey(window.localStorage.getItem(GOOGLE_MAPS_KEY_STORAGE) ?? "");
  }, [profile?.full_name]);

  async function saveName() {
    const next = name.trim();
    if (!next) return void toast.error("Informe seu nome.");
    setSavingName(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Sessão expirada. Entre novamente.");
      const [{ error: profileError }, { error: authError }] = await Promise.all([
        supabase.from("profiles").update({ full_name: next }).eq("id", user.id),
        supabase.auth.updateUser({ data: { full_name: next } }),
      ]);
      if (profileError) throw new Error(profileError.message);
      if (authError) throw new Error(authError.message);
      invalidate(["profile"]);
      toast.success("Perfil atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar seu perfil.");
    } finally {
      setSavingName(false);
    }
  }

  function saveGoogleMapsApiKey() {
    const key = googleMapsApiKey.trim();
    if (key) window.localStorage.setItem(GOOGLE_MAPS_KEY_STORAGE, key);
    else window.localStorage.removeItem(GOOGLE_MAPS_KEY_STORAGE);
    setGoogleMapsApiKey(key);
    toast.success(key ? "API Key do Google Maps salva neste navegador." : "API Key removida.");
  }

  async function changePassword() {
    if (password.length < 6) return void toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return void toast.error("As senhas não coincidem.");
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setPassword("");
      setConfirm("");
      toast.success("Senha alterada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/auth");
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Workspace</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Ajuste sua conta sem perder o ritmo da operação.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="glass rounded-2xl">
          <CardHeader className="border-b border-border/70 pb-3"><CardTitle className="text-sm">Seu perfil</CardTitle></CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-5" /></span><div className="min-w-0"><p className="truncate font-semibold">{profile?.full_name || "Minha conta"}</p><p className="truncate text-sm text-muted-foreground">{profile?.email ?? ""}</p></div></div>
            <div className="space-y-2"><Label htmlFor="profile-name">Nome</Label><div className="flex gap-2"><Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /><Button onClick={() => void saveName()} disabled={savingName}>{savingName ? "Salvando..." : "Salvar"}</Button></div></div>
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl">
          <CardHeader className="border-b border-border/70 pb-3"><CardTitle className="flex items-center gap-2 text-sm"><KeyRound className="size-4 text-primary" />Google Maps</CardTitle></CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="space-y-2"><Label htmlFor="google-maps-api-key">Google Maps API Key</Label><div className="flex gap-2"><div className="relative min-w-0 flex-1"><Input id="google-maps-api-key" type={showApiKey ? "text" : "password"} value={googleMapsApiKey} onChange={(e) => setGoogleMapsApiKey(e.target.value)} placeholder="Cole sua API Key aqui" className="pr-10" autoComplete="off" /><button type="button" aria-label={showApiKey ? "Ocultar API Key" : "Mostrar API Key"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground" onClick={() => setShowApiKey((value) => !value)}>{showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><Button onClick={saveGoogleMapsApiKey}>Salvar</Button></div><p className="text-xs leading-5 text-muted-foreground">Usada pela prospecção para consultar o Google Places. A chave fica salva apenas neste navegador.</p></div>
          </CardContent>
        </Card>
      </div>

      <WhatsappConnectionCard />

      <Card className="glass rounded-2xl">
        <CardHeader className="border-b border-border/70 pb-3"><CardTitle className="flex items-center gap-2 text-sm"><LockKeyhole className="size-4 text-primary" />Segurança</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /></div><div className="space-y-2"><Label htmlFor="confirm-password">Confirmar senha</Label><Input id="confirm-password" type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" /></div></div><Button variant="outline" onClick={() => void changePassword()} disabled={savingPassword}>{savingPassword ? "Atualizando..." : "Alterar senha"}<Check className="ml-2 size-4" /></Button></CardContent>
      </Card>

      <Card className="rounded-2xl border-destructive/20 bg-destructive/[.03]">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Sair da conta</p><p className="mt-1 text-xs text-muted-foreground">Encerra a sessão neste dispositivo.</p></div><Button variant="outline" onClick={() => void signOut()}><LogOut className="mr-2 size-4" />Sair</Button></CardContent>
      </Card>
    </div>
  );
}
